import time
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import jwt

from app.core.config import settings
from app.db.models import User, Worker, Skill, WorkerSkill, ServiceRequest


def generate_test_jwt(user_id: str, email: str = "test@example.com", role: str = "authenticated") -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
        "user_metadata": {"full_name": "Test User"},
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")


@pytest.fixture
def setup_feed_data(db_session: Session):
    # 1. Clean previous data
    db_session.query(ServiceRequest).delete()
    db_session.query(WorkerSkill).delete()
    db_session.query(Skill).delete()
    db_session.query(Worker).delete()
    db_session.query(User).delete()
    db_session.commit()

    # 2. Create Skills
    plumbing_skill = Skill(id=uuid.uuid4(), name="Pipe Repair", category="Plumbing")
    electrical_skill = Skill(id=uuid.uuid4(), name="House Wiring", category="Electrical")
    carpentry_skill = Skill(id=uuid.uuid4(), name="Furniture Assembly", category="Carpentry")
    db_session.add_all([plumbing_skill, electrical_skill, carpentry_skill])
    db_session.commit()

    # 3. Create Worker (Plumber in Indiranagar Bengaluru: 12.9716, 77.6412, radius 15km)
    worker_user = User(
        id=uuid.uuid4(),
        full_name="Ramesh Plumber",
        email="ramesh.feed@example.com",
        role="worker",
    )
    db_session.add(worker_user)
    db_session.commit()

    worker = Worker(
        id=uuid.uuid4(),
        user_id=worker_user.id,
        description="Certified plumber",
        experience_years=8.0,
        is_available=True,
        service_radius_km=15.0,
        location="SRID=4326;POINT(77.6412 12.9716)",
        address_text="Indiranagar, Bengaluru",
    )
    db_session.add(worker)
    db_session.commit()

    # Assign Pipe Repair to worker
    ws = WorkerSkill(worker_id=worker.id, skill_id=plumbing_skill.id, experience_years=8.0)
    db_session.add(ws)
    db_session.commit()

    # 4. Create Customer
    customer_user = User(
        id=uuid.uuid4(),
        full_name="Anita Customer",
        email="anita.feed@example.com",
        role="customer",
    )
    db_session.add(customer_user)
    db_session.commit()

    # 5. Create Service Requests
    # Request 1: Matching Plumbing request, emergency, 2km away (Domlur: 12.9610, 77.6387)
    req1 = ServiceRequest(
        id=uuid.uuid4(),
        customer_id=customer_user.id,
        raw_description="Emergency pipe burst in kitchen",
        extracted_category="Plumbing",
        extracted_skills=["Pipe Repair"],
        urgency="emergency",
        status="open",
        location="SRID=4326;POINT(77.6387 12.9610)",
    )

    # Request 2: Matching Plumbing request, normal urgency, 4km away (Koramangala: 12.9352, 77.6245)
    req2 = ServiceRequest(
        id=uuid.uuid4(),
        customer_id=customer_user.id,
        raw_description="Leaking tap in bathroom",
        extracted_category="Plumbing",
        extracted_skills=["Pipe Repair"],
        urgency="normal",
        status="open",
        location="SRID=4326;POINT(77.6245 12.9352)",
    )

    # Request 3: Electrical request (skill & category mismatch)
    req3 = ServiceRequest(
        id=uuid.uuid4(),
        customer_id=customer_user.id,
        raw_description="Fan sparking in bedroom",
        extracted_category="Electrical",
        extracted_skills=["House Wiring"],
        urgency="high",
        status="open",
        location="SRID=4326;POINT(77.6387 12.9610)",
    )

    # Request 4: Far away plumbing request (> 25km away: Whitefield / Hoskote 13.0700, 77.7900)
    req4 = ServiceRequest(
        id=uuid.uuid4(),
        customer_id=customer_user.id,
        raw_description="Out of radius plumbing repair",
        extracted_category="Plumbing",
        extracted_skills=["Pipe Repair"],
        urgency="emergency",
        status="open",
        location="SRID=4326;POINT(77.7900 13.0700)",
    )

    # Request 5: Already completed/booked request
    req5 = ServiceRequest(
        id=uuid.uuid4(),
        customer_id=customer_user.id,
        raw_description="Already booked pipe repair",
        extracted_category="Plumbing",
        extracted_skills=["Pipe Repair"],
        urgency="high",
        status="booked",
        location="SRID=4326;POINT(77.6387 12.9610)",
    )

    db_session.add_all([req1, req2, req3, req4, req5])
    db_session.commit()

    yield {
        "worker_user": worker_user,
        "worker": worker,
        "customer_user": customer_user,
        "req1_id": req1.id,
        "req2_id": req2.id,
    }

    db_session.query(ServiceRequest).delete()
    db_session.query(WorkerSkill).delete()
    db_session.query(Skill).delete()
    db_session.query(Worker).delete()
    db_session.query(User).delete()
    db_session.commit()


def test_worker_feed_unauthenticated(client: TestClient):
    res = client.get("/api/v1/workers/me/feed")
    assert res.status_code == 401


def test_worker_feed_customer_forbidden(client: TestClient, setup_feed_data):
    token = generate_test_jwt(str(setup_feed_data["customer_user"].id))
    res = client.get("/api/v1/workers/me/feed", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_worker_feed_retrieves_relevant_requests(client: TestClient, setup_feed_data):
    token = generate_test_jwt(str(setup_feed_data["worker_user"].id))
    res = client.get("/api/v1/workers/me/feed", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()

    assert data["total_requests"] == 2
    assert len(data["requests"]) == 2

    # Verify deterministic ordering: Emergency before Normal
    assert data["requests"][0]["urgency"] == "emergency"
    assert data["requests"][0]["request_id"] == str(setup_feed_data["req1_id"])
    assert data["requests"][0]["category"] == "Plumbing"
    assert "Pipe Repair" in data["requests"][0]["matched_skills"]
    assert data["requests"][0]["distance_km"] > 0

    assert data["requests"][1]["urgency"] == "normal"
    assert data["requests"][1]["request_id"] == str(setup_feed_data["req2_id"])


def test_worker_feed_unavailable_worker_returns_empty(client: TestClient, db_session: Session, setup_feed_data):
    worker = setup_feed_data["worker"]
    worker.is_available = False
    db_session.commit()

    token = generate_test_jwt(str(setup_feed_data["worker_user"].id))
    res = client.get("/api/v1/workers/me/feed", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_requests"] == 0
    assert data["requests"] == []


def test_worker_feed_pagination(client: TestClient, setup_feed_data):
    token = generate_test_jwt(str(setup_feed_data["worker_user"].id))
    # Limit to 1
    res1 = client.get("/api/v1/workers/me/feed?limit=1&offset=0", headers={"Authorization": f"Bearer {token}"})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["total_requests"] == 2
    assert len(data1["requests"]) == 1
    assert data1["requests"][0]["request_id"] == str(setup_feed_data["req1_id"])

    # Offset by 1
    res2 = client.get("/api/v1/workers/me/feed?limit=1&offset=1", headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2["requests"]) == 1
    assert data2["requests"][0]["request_id"] == str(setup_feed_data["req2_id"])
