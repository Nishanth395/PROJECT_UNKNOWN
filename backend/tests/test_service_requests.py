import time
import uuid
import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import User, ServiceRequest
from app.schemas.service_request import UrgencyLevel

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


# ==============================================================================
# POST /service-requests Tests
# ==============================================================================

def test_create_service_request_unauthenticated(client: TestClient):
    """Test POST /service-requests rejects unauthenticated requests with 401."""
    payload = {
        "description": "Ceiling fan wiring repair needed",
        "latitude": 12.9500,
        "longitude": 77.6300,
        "urgency": "normal",
    }
    res = client.post("/service-requests", json=payload)
    assert res.status_code == 401
    assert res.json()["detail"]["error_code"] == "MISSING_CREDENTIALS"


def test_create_service_request_worker_rejected(client: TestClient, db_session: Session, monkeypatch):
    """Test POST /service-requests rejects worker accounts with 403 Forbidden."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    worker_id = uuid.uuid4()
    worker = User(id=worker_id, full_name="Worker Dave", role="worker", email="worker.dave@example.com")
    db_session.add(worker)
    db_session.commit()

    token = create_token(sub=str(worker_id), email="worker.dave@example.com")
    payload = {
        "description": "Ceiling fan wiring repair needed",
        "latitude": 12.9500,
        "longitude": 77.6300,
        "urgency": "normal",
    }
    res = client.post("/service-requests", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert res.json()["detail"]["error_code"] == "FORBIDDEN"


def test_create_service_request_customer_success(client: TestClient, db_session: Session, monkeypatch):
    """Test POST /service-requests successfully creates request for authenticated customer."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    customer_id = uuid.uuid4()
    customer = User(id=customer_id, full_name="Customer Jane", role="customer", email="jane@example.com")
    db_session.add(customer)
    db_session.commit()

    token = create_token(sub=str(customer_id), email="jane@example.com")
    payload = {
        "description": "My kitchen sink is leaking heavily from the drain pipe",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "urgency": "high",
        "address_text": "100ft Road, Indiranagar, Bengaluru",
    }
    res = client.post("/service-requests", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["customer_id"] == str(customer_id)
    assert data["raw_description"] == payload["description"]
    assert data["urgency"] == "high"
    assert data["status"] == "open"
    assert data["address_text"] == "100ft Road, Indiranagar, Bengaluru"
    assert data["latitude"] == 12.9784
    assert data["longitude"] == 77.6408
    assert "id" in data
    assert "created_at" in data

    # Verify versioned endpoint /api/v1/service-requests also functions identically
    res_v1 = client.post("/api/v1/service-requests", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res_v1.status_code == 201


def test_create_service_request_ignores_client_provided_customer_id(
    client: TestClient, db_session: Session, monkeypatch
):
    """Test client cannot spoof customer_id in request body; JWT identity is sole source of truth."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    customer_id = uuid.uuid4()
    victim_id = uuid.uuid4()
    customer = User(id=customer_id, full_name="Honest Customer", role="customer", email="honest@example.com")
    victim = User(id=victim_id, full_name="Victim Customer", role="customer", email="victim@example.com")
    db_session.add_all([customer, victim])
    db_session.commit()

    token = create_token(sub=str(customer_id), email="honest@example.com")
    payload = {
        "customer_id": str(victim_id),  # Attempted spoof
        "description": "Main circuit breaker keeps tripping repeatedly",
        "latitude": 12.9352,
        "longitude": 77.6245,
        "urgency": "emergency",
    }
    res = client.post("/service-requests", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    data = res.json()
    # Verified: Bound to JWT customer_id, NOT the spoofed victim_id
    assert data["customer_id"] == str(customer_id)
    assert data["customer_id"] != str(victim_id)


def test_create_service_request_validation_errors(client: TestClient, db_session: Session, monkeypatch):
    """Test validation errors for empty description, coordinates out of range, and invalid urgency."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    customer_id = uuid.uuid4()
    customer = User(id=customer_id, full_name="Customer Val", role="customer", email="val@example.com")
    db_session.add(customer)
    db_session.commit()
    token = create_token(sub=str(customer_id), email="val@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Empty / whitespace description
    res = client.post("/service-requests", json={"description": "   ", "latitude": 12.95, "longitude": 77.63}, headers=headers)
    assert res.status_code == 422

    # 2. Too short description (< 5 chars)
    res = client.post("/service-requests", json={"description": "help", "latitude": 12.95, "longitude": 77.63}, headers=headers)
    assert res.status_code == 422

    # 3. Invalid latitude (> 90)
    res = client.post("/service-requests", json={"description": "Valid problem description", "latitude": 95.0, "longitude": 77.63}, headers=headers)
    assert res.status_code == 422

    # 4. Invalid longitude (< -180)
    res = client.post("/service-requests", json={"description": "Valid problem description", "latitude": 12.95, "longitude": -190.0}, headers=headers)
    assert res.status_code == 422

    # 5. Invalid urgency value
    res = client.post("/service-requests", json={"description": "Valid problem description", "latitude": 12.95, "longitude": 77.63, "urgency": "super_urgent"}, headers=headers)
    assert res.status_code == 422


# ==============================================================================
# GET /service-requests & GET /service-requests/{id} Tests
# ==============================================================================

def test_customer_list_only_own_requests(client: TestClient, db_session: Session, monkeypatch):
    """Test customer can only list their own requests with pagination and status filters."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    cust1_id = uuid.uuid4()
    cust2_id = uuid.uuid4()
    user1 = User(id=cust1_id, full_name="User One", role="customer", email="one@example.com")
    user2 = User(id=cust2_id, full_name="User Two", role="customer", email="two@example.com")
    db_session.add_all([user1, user2])
    db_session.commit()

    token1 = create_token(sub=str(cust1_id), email="one@example.com")
    token2 = create_token(sub=str(cust2_id), email="two@example.com")

    # Cust1 creates 2 requests
    client.post("/service-requests", json={"description": "Request 1 for Cust1", "latitude": 12.9, "longitude": 77.6}, headers={"Authorization": f"Bearer {token1}"})
    client.post("/service-requests", json={"description": "Request 2 for Cust1", "latitude": 12.9, "longitude": 77.6}, headers={"Authorization": f"Bearer {token1}"})

    # Cust2 creates 1 request
    client.post("/service-requests", json={"description": "Request 1 for Cust2", "latitude": 12.9, "longitude": 77.6}, headers={"Authorization": f"Bearer {token2}"})

    # Cust1 lists requests -> should see exactly 2
    res1 = client.get("/service-requests", headers={"Authorization": f"Bearer {token1}"})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["total"] == 2
    assert len(data1["items"]) == 2
    for item in data1["items"]:
        assert item["customer_id"] == str(cust1_id)

    # Cust2 lists requests -> should see exactly 1
    res2 = client.get("/service-requests", headers={"Authorization": f"Bearer {token2}"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["total"] == 1
    assert len(data2["items"]) == 1
    assert data2["items"][0]["customer_id"] == str(cust2_id)


def test_customer_cannot_retrieve_another_customers_request(client: TestClient, db_session: Session, monkeypatch):
    """Test customer attempting to get another customer's request receives 404 (preventing existence leak)."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    cust1_id = uuid.uuid4()
    cust2_id = uuid.uuid4()
    user1 = User(id=cust1_id, full_name="Alice", role="customer", email="alice@example.com")
    user2 = User(id=cust2_id, full_name="Bob", role="customer", email="bob@example.com")
    db_session.add_all([user1, user2])
    db_session.commit()

    token1 = create_token(sub=str(cust1_id), email="alice@example.com")
    token2 = create_token(sub=str(cust2_id), email="bob@example.com")

    # Alice creates a request
    create_res = client.post(
        "/service-requests",
        json={"description": "Alice's AC is not cooling properly", "latitude": 12.92, "longitude": 77.61},
        headers={"Authorization": f"Bearer {token1}"},
    )
    request_id = create_res.json()["id"]

    # Alice can retrieve her own request -> 200 OK
    res_alice = client.get(f"/service-requests/{request_id}", headers={"Authorization": f"Bearer {token1}"})
    assert res_alice.status_code == 200
    assert res_alice.json()["id"] == request_id

    # Bob attempts to retrieve Alice's request -> 404 Not Found (no existence leak)
    res_bob = client.get(f"/service-requests/{request_id}", headers={"Authorization": f"Bearer {token2}"})
    assert res_bob.status_code == 404
    assert res_bob.json()["detail"]["error_code"] == "REQUEST_NOT_FOUND"


def test_get_nonexistent_service_request_returns_404(client: TestClient, db_session: Session, monkeypatch):
    """Test GET /service-requests/{id} with nonexistent UUID returns 404."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    cust_id = uuid.uuid4()
    user = User(id=cust_id, full_name="Customer Zoe", role="customer", email="zoe@example.com")
    db_session.add(user)
    db_session.commit()
    token = create_token(sub=str(cust_id), email="zoe@example.com")

    random_id = str(uuid.uuid4())
    res = client.get(f"/service-requests/{random_id}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 404
    assert res.json()["detail"]["error_code"] == "REQUEST_NOT_FOUND"


def test_worker_cannot_list_or_get_service_requests(client: TestClient, db_session: Session, monkeypatch):
    """Test worker accounts receive 403 when attempting to access service request endpoints."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    worker_id = uuid.uuid4()
    worker = User(id=worker_id, full_name="Worker Mike", role="worker", email="mike@example.com")
    db_session.add(worker)
    db_session.commit()
    token = create_token(sub=str(worker_id), email="mike@example.com")

    # List requests
    res_list = client.get("/service-requests", headers={"Authorization": f"Bearer {token}"})
    assert res_list.status_code == 403

    # Get single request
    res_get = client.get(f"/service-requests/{uuid.uuid4()}", headers={"Authorization": f"Bearer {token}"})
    assert res_get.status_code == 403
