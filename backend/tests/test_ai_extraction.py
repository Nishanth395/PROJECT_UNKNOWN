import time
import uuid
import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import User, Skill, ServiceRequest
from app.ai.base import AIProvider
from app.ai.schemas import ServiceRequirementExtraction, ExtractionUrgency
from app.ai.service import AIExtractionService
from app.ai.providers.fallback_provider import FallbackProvider

TEST_JWT_SECRET = settings.SUPABASE_JWT_SECRET or "test-secret-key-for-local-testing-123456"


def create_token(
    sub: str,
    email: str = "customer@example.com",
    role: str = "authenticated",
    exp_seconds: int = 3600,
) -> str:
    """Helper to generate test JWT."""
    now = int(time.time())
    payload = {
        "sub": sub,
        "email": email,
        "role": role,
        "aud": "authenticated",
        "iat": now,
        "exp": now + exp_seconds,
        "app_metadata": {"provider": "email"},
        "user_metadata": {"full_name": "Test Customer"},
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


@pytest.fixture(autouse=True)
def ensure_canonical_skills(db_session: Session):
    """Ensures test database has canonical skills for AI extraction tests."""
    existing = {s.name for s in db_session.query(Skill).all()}
    canonical = [
        ("Pipe Repair", "Plumbing", "Fixing burst, leaking, or damaged pipes"),
        ("Leak Fixing", "Plumbing", "Sealing under-sink dripping and joint seepage"),
        ("Drain Cleaning", "Plumbing", "Unblocking kitchen sinks and drains"),
        ("Faucet & Tap Installation", "Plumbing", "Installing and repairing taps"),
        ("House Wiring", "Electrical", "Complete residential wiring"),
        ("Short Circuit Diagnosis", "Electrical", "Tracing tripping MCBs"),
        ("Switchboard Repair", "Electrical", "Repairing sockets and switches"),
        ("Furniture Assembly", "Carpentry", "Assembling furniture"),
        ("Door Lock & Latch Fixing", "Carpentry", "Fixing locks and handles"),
        ("AC Repair & Gas Refill", "Appliance Repair", "AC servicing and gas refill"),
        ("Washing Machine Diagnosis", "Appliance Repair", "Washing machine repair"),
        ("Two-Wheeler Servicing", "Mechanic", "Two-wheeler maintenance"),
        ("Car Battery Jumpstart", "Mechanic", "Battery jumpstart"),
        ("Mathematics Tutoring", "Tutoring", "Math coaching"),
    ]
    for name, cat, desc in canonical:
        if name not in existing:
            db_session.add(Skill(id=uuid.uuid4(), name=name, category=cat, description=desc))
    db_session.commit()


# ==============================================================================
# Unit Tests for Fallback & Provider Abstraction
# ==============================================================================

@pytest.mark.asyncio
async def test_fallback_provider_keyword_matching():
    """Test deterministic fallback provider extracts correct canonical categories and skills."""
    catalogue = [
        {"name": "Pipe Repair", "category": "Plumbing", "description": "Fixing leaking pipes"},
        {"name": "Leak Fixing", "category": "Plumbing", "description": "Sealing drips"},
        {"name": "Switchboard Repair", "category": "Electrical", "description": "Repairing switches"},
        {"name": "Door Lock & Latch Fixing", "category": "Carpentry", "description": "Fixing locks"},
        {"name": "AC Repair & Gas Refill", "category": "Appliance Repair", "description": "AC servicing"},
        {"name": "Mathematics Tutoring", "category": "Tutoring", "description": "Math coaching"},
    ]

    provider = FallbackProvider()

    # 1. Plumbing description
    res_plumb = await provider.extract_service_requirements("The bathroom pipe is leaking water all over the floor", catalogue)
    assert res_plumb.category == "Plumbing"
    assert "Pipe Repair" in res_plumb.skills or "Leak Fixing" in res_plumb.skills
    assert res_plumb.confidence >= 0.7

    # 2. Electrical description with emergency keywords
    res_elec = await provider.extract_service_requirements("Switchboard is sparking, emergency danger", catalogue)
    assert res_elec.category == "Electrical"
    assert "Switchboard Repair" in res_elec.skills
    assert res_elec.urgency == ExtractionUrgency.emergency

    # 3. Carpentry description
    res_carp = await provider.extract_service_requirements("Main door lock is completely jammed", catalogue)
    assert res_carp.category == "Carpentry"
    assert "Door Lock & Latch Fixing" in res_carp.skills

    # 4. Unknown/ambiguous description
    res_unknown = await provider.extract_service_requirements("Something random happened today", catalogue)
    assert res_unknown.confidence <= 0.3


# ==============================================================================
# Endpoint Tests for POST /service-requests/{id}/extract
# ==============================================================================

def test_extract_service_request_unauthenticated(client: TestClient):
    """Test POST /service-requests/{id}/extract rejects unauthenticated calls with 401."""
    random_id = str(uuid.uuid4())
    res = client.post(f"/service-requests/{random_id}/extract")
    assert res.status_code == 401
    assert res.json()["detail"]["error_code"] == "MISSING_CREDENTIALS"


def test_extract_service_request_worker_forbidden(client: TestClient, db_session: Session, monkeypatch):
    """Test POST /service-requests/{id}/extract rejects worker users with 403."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    worker_id = uuid.uuid4()
    worker = User(id=worker_id, full_name="Worker Bob", role="worker", email="bob.worker@example.com")
    db_session.add(worker)
    db_session.commit()

    token = create_token(sub=str(worker_id), email="bob.worker@example.com")
    res = client.post(f"/service-requests/{uuid.uuid4()}/extract", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert res.json()["detail"]["error_code"] == "FORBIDDEN"


def test_extract_service_request_success_and_preserves_raw_description(
    client: TestClient, db_session: Session, monkeypatch
):
    """Test successful extraction updates extracted_category and extracted_skills while preserving raw_description."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    customer_id = uuid.uuid4()
    customer = User(id=customer_id, full_name="Customer Alice", role="customer", email="alice.cust@example.com")
    db_session.add(customer)
    db_session.commit()

    token = create_token(sub=str(customer_id), email="alice.cust@example.com")

    # 1. Create service request
    create_res = client.post(
        "/service-requests",
        json={
            "description": "Kitchen PVC water pipe burst and leaking heavily",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "urgency": "high",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_res.status_code == 201
    request_id = create_res.json()["id"]

    # 2. Call extract endpoint
    extract_res = client.post(
        f"/service-requests/{request_id}/extract",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert extract_res.status_code == 200
    data = extract_res.json()
    assert data["request_id"] == request_id
    assert data["category"] == "Plumbing"
    assert "Pipe Repair" in data["skills"] or "Leak Fixing" in data["skills"]
    assert data["urgency"] == "high"  # Preserved customer request urgency
    assert 0.0 <= data["confidence"] <= 1.0

    # 3. Verify in database that raw_description is untouched and extracted fields are populated
    db_record = db_session.query(ServiceRequest).filter(ServiceRequest.id == uuid.UUID(request_id)).first()
    assert db_record.raw_description == "Kitchen PVC water pipe burst and leaking heavily"
    assert db_record.extracted_category == "Plumbing"
    assert len(db_record.extracted_skills) >= 1


def test_extract_service_request_idempotent_repeated_calls(
    client: TestClient, db_session: Session, monkeypatch
):
    """Test repeated extraction calls are safe, do not duplicate skills, and return consistent results."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    customer_id = uuid.uuid4()
    customer = User(id=customer_id, full_name="Customer Dan", role="customer", email="dan.cust@example.com")
    db_session.add(customer)
    db_session.commit()

    token = create_token(sub=str(customer_id), email="dan.cust@example.com")

    create_res = client.post(
        "/service-requests",
        json={
            "description": "Switchboard button is broken and modular switches not working",
            "latitude": 12.95,
            "longitude": 77.63,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    request_id = create_res.json()["id"]

    # First extraction
    res1 = client.post(f"/service-requests/{request_id}/extract", headers={"Authorization": f"Bearer {token}"})
    assert res1.status_code == 200

    # Second extraction (idempotent)
    res2 = client.post(f"/service-requests/{request_id}/extract", headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 200
    assert res2.json()["skills"] == res1.json()["skills"]
    assert res2.json()["category"] == res1.json()["category"]


def test_extract_another_customers_request_returns_404(
    client: TestClient, db_session: Session, monkeypatch
):
    """Test attempting extraction on another customer's request returns 404."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    cust1_id = uuid.uuid4()
    cust2_id = uuid.uuid4()
    user1 = User(id=cust1_id, full_name="Cust 1", role="customer", email="c1@example.com")
    user2 = User(id=cust2_id, full_name="Cust 2", role="customer", email="c2@example.com")
    db_session.add_all([user1, user2])
    db_session.commit()

    token1 = create_token(sub=str(cust1_id), email="c1@example.com")
    token2 = create_token(sub=str(cust2_id), email="c2@example.com")

    # Cust 1 creates request
    create_res = client.post(
        "/service-requests",
        json={"description": "Water leaking from ceiling", "latitude": 12.9, "longitude": 77.6},
        headers={"Authorization": f"Bearer {token1}"},
    )
    request_id = create_res.json()["id"]

    # Cust 2 attempts extraction on Cust 1's request -> 404
    res_attack = client.post(
        f"/service-requests/{request_id}/extract",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert res_attack.status_code == 404
    assert res_attack.json()["detail"]["error_code"] == "REQUEST_NOT_FOUND"


# ==============================================================================
# Mock Provider Tests: Invalid Skill / Category Filtering & Failover
# ==============================================================================

class MockFaultyAIProvider(AIProvider):
    """Mock provider returning hallucinated/invented skills and categories."""

    def __init__(self, hallucinate: bool = True, raise_error: bool = False):
        self.hallucinate = hallucinate
        self.raise_error = raise_error

    async def extract_service_requirements(self, description: str, canonical_catalogue):
        if self.raise_error:
            raise TimeoutError("AI Provider upstream timeout")

        if self.hallucinate:
            return ServiceRequirementExtraction(
                category="Cosmic Teleportation",  # Non-existent category
                skills=["Super Magic Fix 9000", "Pipe Repair"],  # 1 hallucinated, 1 real
                urgency=ExtractionUrgency.normal,
                confidence=0.88,
            )
        return ServiceRequirementExtraction(
            category="Plumbing",
            skills=["Pipe Repair"],
            urgency=ExtractionUrgency.normal,
            confidence=0.95,
        )


@pytest.mark.asyncio
async def test_ai_service_filters_non_canonical_skills_and_categories(db_session: Session):
    """Test AIExtractionService safely filters out hallucinated categories/skills not in public.skills."""
    customer_id = uuid.uuid4()
    customer = User(id=customer_id, full_name="Customer Test", role="customer", email="t@example.com")
    db_session.add(customer)
    db_session.commit()

    sr = ServiceRequest(
        id=uuid.uuid4(),
        customer_id=customer_id,
        raw_description="My pipe broke",
        urgency="normal",
        status="open",
    )
    db_session.add(sr)
    db_session.commit()

    # Run extraction with mock hallucinating provider
    mock_provider = MockFaultyAIProvider(hallucinate=True)
    res = await AIExtractionService.extract_and_update_request(
        db=db_session,
        request_id=sr.id,
        customer_id=customer_id,
        provider=mock_provider,
    )

    # Verified: Hallucinated skill "Super Magic Fix 9000" was stripped out
    assert "Super Magic Fix 9000" not in res.skills
    assert res.skills == ["Pipe Repair"]
    # Category was inferred from valid skill "Pipe Repair" -> "Plumbing"
    assert res.category == "Plumbing"


@pytest.mark.asyncio
async def test_ai_service_graceful_failover_on_provider_error(db_session: Session):
    """Test AIExtractionService automatically falls back to deterministic provider if primary provider fails."""
    customer_id = uuid.uuid4()
    customer = User(id=customer_id, full_name="Customer Test 2", role="customer", email="t2@example.com")
    db_session.add(customer)
    db_session.commit()

    sr = ServiceRequest(
        id=uuid.uuid4(),
        customer_id=customer_id,
        raw_description="Kitchen pipe is burst and leaking water",
        urgency="normal",
        status="open",
    )
    db_session.add(sr)
    db_session.commit()

    # Provider that raises TimeoutError
    failing_provider = MockFaultyAIProvider(raise_error=True)
    res = await AIExtractionService.extract_and_update_request(
        db=db_session,
        request_id=sr.id,
        customer_id=customer_id,
        provider=failing_provider,
    )

    # Succeeded via fallback extraction
    assert res.category == "Plumbing"
    assert "Pipe Repair" in res.skills
