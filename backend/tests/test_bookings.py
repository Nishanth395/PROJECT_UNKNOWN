import time
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import jwt

from app.core.config import settings
from app.db.models import User, Worker, Skill, WorkerSkill, ServiceRequest, Booking


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
def setup_booking_data(db_session: Session):
    # 1. Clean previous data
    db_session.query(Booking).delete()
    db_session.query(ServiceRequest).delete()
    db_session.query(WorkerSkill).delete()
    db_session.query(Skill).delete()
    db_session.query(Worker).delete()
    db_session.query(User).delete()
    db_session.commit()

    # 2. Create Skill
    skill = Skill(id=uuid.uuid4(), name="Pipe Repair", category="Plumbing")
    db_session.add(skill)
    db_session.commit()

    # 3. Create Worker 1 (Assigned plumber)
    worker_user1 = User(id=uuid.uuid4(), full_name="Worker One", email="w1@example.com", role="worker")
    db_session.add(worker_user1)
    db_session.commit()

    worker1 = Worker(
        id=uuid.uuid4(),
        user_id=worker_user1.id,
        description="Plumber 1",
        experience_years=5.0,
        is_available=True,
        service_radius_km=15.0,
        location="SRID=4326;POINT(77.6412 12.9716)",
    )
    db_session.add(worker1)
    db_session.commit()

    ws1 = WorkerSkill(worker_id=worker1.id, skill_id=skill.id, experience_years=5.0)
    db_session.add(ws1)
    db_session.commit()

    # 4. Create Worker 2 (Competitor plumber)
    worker_user2 = User(id=uuid.uuid4(), full_name="Worker Two", email="w2@example.com", role="worker")
    db_session.add(worker_user2)
    db_session.commit()

    worker2 = Worker(
        id=uuid.uuid4(),
        user_id=worker_user2.id,
        description="Plumber 2",
        experience_years=7.0,
        is_available=True,
        service_radius_km=15.0,
        location="SRID=4326;POINT(77.6412 12.9716)",
    )
    db_session.add(worker2)
    db_session.commit()

    ws2 = WorkerSkill(worker_id=worker2.id, skill_id=skill.id, experience_years=7.0)
    db_session.add(ws2)
    db_session.commit()

    # 5. Create Customer 1 (Owner of request)
    customer_user1 = User(id=uuid.uuid4(), full_name="Customer One", email="c1@example.com", role="customer")
    db_session.add(customer_user1)
    db_session.commit()

    # 6. Create Customer 2 (Unrelated customer)
    customer_user2 = User(id=uuid.uuid4(), full_name="Customer Two", email="c2@example.com", role="customer")
    db_session.add(customer_user2)
    db_session.commit()

    # 7. Create Service Request for Customer 1
    sr = ServiceRequest(
        id=uuid.uuid4(),
        customer_id=customer_user1.id,
        raw_description="My sink drain is broken",
        extracted_category="Plumbing",
        extracted_skills=["Pipe Repair"],
        urgency="high",
        status="open",
        location="SRID=4326;POINT(77.6387 12.9610)",
    )
    db_session.add(sr)
    db_session.commit()

    yield {
        "worker_user1": worker_user1,
        "worker1": worker1,
        "worker_user2": worker_user2,
        "worker2": worker2,
        "customer_user1": customer_user1,
        "customer_user2": customer_user2,
        "service_request": sr,
    }

    db_session.query(Booking).delete()
    db_session.query(ServiceRequest).delete()
    db_session.query(WorkerSkill).delete()
    db_session.query(Skill).delete()
    db_session.query(Worker).delete()
    db_session.query(User).delete()
    db_session.commit()


def test_create_booking_unauthenticated(client: TestClient):
    res = client.post("/api/v1/bookings", json={"worker_id": str(uuid.uuid4()), "service_request_id": str(uuid.uuid4())})
    assert res.status_code == 401


def test_create_booking_worker_forbidden(client: TestClient, setup_booking_data):
    token = generate_test_jwt(str(setup_booking_data["worker_user1"].id))
    payload = {
        "worker_id": str(setup_booking_data["worker1"].id),
        "service_request_id": str(setup_booking_data["service_request"].id),
    }
    res = client.post("/api/v1/bookings", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_create_booking_customer_success(client: TestClient, setup_booking_data):
    token = generate_test_jwt(str(setup_booking_data["customer_user1"].id))
    payload = {
        "worker_id": str(setup_booking_data["worker1"].id),
        "service_request_id": str(setup_booking_data["service_request"].id),
        "notes": "Please come before 4 PM",
    }
    res = client.post("/api/v1/bookings", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    data = res.json()

    assert data["customer_id"] == str(setup_booking_data["customer_user1"].id)
    assert data["worker_id"] == str(setup_booking_data["worker1"].id)
    assert data["status"] == "pending"
    assert data["notes"] == "Please come before 4 PM"
    assert data["worker_name"] == "Worker One"
    assert data["customer_name"] == "Customer One"


def test_create_booking_cannot_book_another_customers_request(client: TestClient, setup_booking_data):
    # Customer 2 attempts to book Customer 1's request
    token = generate_test_jwt(str(setup_booking_data["customer_user2"].id))
    payload = {
        "worker_id": str(setup_booking_data["worker1"].id),
        "service_request_id": str(setup_booking_data["service_request"].id),
    }
    res = client.post("/api/v1/bookings", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 404


def test_create_booking_duplicate_rejected(client: TestClient, setup_booking_data):
    token = generate_test_jwt(str(setup_booking_data["customer_user1"].id))
    payload = {
        "worker_id": str(setup_booking_data["worker1"].id),
        "service_request_id": str(setup_booking_data["service_request"].id),
    }
    res1 = client.post("/api/v1/bookings", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res1.status_code == 201

    # Second identical booking attempt
    res2 = client.post("/api/v1/bookings", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 409
    assert res2.json()["detail"]["error_code"] == "DUPLICATE_BOOKING"


def test_list_bookings_customer_and_worker_scoping(client: TestClient, setup_booking_data):
    # 1. Customer 1 books Worker 1
    token_c1 = generate_test_jwt(str(setup_booking_data["customer_user1"].id))
    res = client.post(
        "/api/v1/bookings",
        json={
            "worker_id": str(setup_booking_data["worker1"].id),
            "service_request_id": str(setup_booking_data["service_request"].id),
        },
        headers={"Authorization": f"Bearer {token_c1}"},
    )
    assert res.status_code == 201

    # 2. Customer 1 lists bookings -> sees 1 booking
    res_c1 = client.get("/api/v1/bookings/me", headers={"Authorization": f"Bearer {token_c1}"})
    assert res_c1.status_code == 200
    assert res_c1.json()["total"] == 1

    # 3. Customer 2 lists bookings -> sees 0 bookings
    token_c2 = generate_test_jwt(str(setup_booking_data["customer_user2"].id))
    res_c2 = client.get("/api/v1/bookings/me", headers={"Authorization": f"Bearer {token_c2}"})
    assert res_c2.status_code == 200
    assert res_c2.json()["total"] == 0

    # 4. Worker 1 lists bookings -> sees 1 booking
    token_w1 = generate_test_jwt(str(setup_booking_data["worker_user1"].id))
    res_w1 = client.get("/api/v1/bookings/me", headers={"Authorization": f"Bearer {token_w1}"})
    assert res_w1.status_code == 200
    assert res_w1.json()["total"] == 1

    # 5. Worker 2 lists bookings -> sees 0 bookings
    token_w2 = generate_test_jwt(str(setup_booking_data["worker_user2"].id))
    res_w2 = client.get("/api/v1/bookings/me", headers={"Authorization": f"Bearer {token_w2}"})
    assert res_w2.status_code == 200
    assert res_w2.json()["total"] == 0


def test_worker_accept_booking_and_updates_service_request(client: TestClient, db_session: Session, setup_booking_data):
    token_c = generate_test_jwt(str(setup_booking_data["customer_user1"].id))
    res_create = client.post(
        "/api/v1/bookings",
        json={
            "worker_id": str(setup_booking_data["worker1"].id),
            "service_request_id": str(setup_booking_data["service_request"].id),
        },
        headers={"Authorization": f"Bearer {token_c}"},
    )
    booking_id = res_create.json()["booking_id"]

    # Worker 1 accepts booking
    token_w1 = generate_test_jwt(str(setup_booking_data["worker_user1"].id))
    res_accept = client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"status": "accepted"},
        headers={"Authorization": f"Bearer {token_w1}"},
    )
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "accepted"

    # Verify ServiceRequest status changed to 'booked'
    sr = db_session.query(ServiceRequest).filter(ServiceRequest.id == setup_booking_data["service_request"].id).first()
    assert sr.status == "booked"


def test_worker_reject_booking(client: TestClient, setup_booking_data):
    token_c = generate_test_jwt(str(setup_booking_data["customer_user1"].id))
    res_create = client.post(
        "/api/v1/bookings",
        json={
            "worker_id": str(setup_booking_data["worker1"].id),
            "service_request_id": str(setup_booking_data["service_request"].id),
        },
        headers={"Authorization": f"Bearer {token_c}"},
    )
    booking_id = res_create.json()["booking_id"]

    token_w1 = generate_test_jwt(str(setup_booking_data["worker_user1"].id))
    res_reject = client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"status": "rejected"},
        headers={"Authorization": f"Bearer {token_w1}"},
    )
    assert res_reject.status_code == 200
    assert res_reject.json()["status"] == "rejected"


def test_worker_cannot_modify_another_workers_booking(client: TestClient, setup_booking_data):
    token_c = generate_test_jwt(str(setup_booking_data["customer_user1"].id))
    res_create = client.post(
        "/api/v1/bookings",
        json={
            "worker_id": str(setup_booking_data["worker1"].id),
            "service_request_id": str(setup_booking_data["service_request"].id),
        },
        headers={"Authorization": f"Bearer {token_c}"},
    )
    booking_id = res_create.json()["booking_id"]

    # Worker 2 attempts to accept Worker 1's booking
    token_w2 = generate_test_jwt(str(setup_booking_data["worker_user2"].id))
    res_hack = client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"status": "accepted"},
        headers={"Authorization": f"Bearer {token_w2}"},
    )
    assert res_hack.status_code == 404


def test_invalid_state_transition_returns_409(client: TestClient, setup_booking_data):
    token_c = generate_test_jwt(str(setup_booking_data["customer_user1"].id))
    res_create = client.post(
        "/api/v1/bookings",
        json={
            "worker_id": str(setup_booking_data["worker1"].id),
            "service_request_id": str(setup_booking_data["service_request"].id),
        },
        headers={"Authorization": f"Bearer {token_c}"},
    )
    booking_id = res_create.json()["booking_id"]

    token_w1 = generate_test_jwt(str(setup_booking_data["worker_user1"].id))
    # Accept once
    client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"status": "accepted"},
        headers={"Authorization": f"Bearer {token_w1}"},
    )

    # Try to reject an already accepted booking -> 409
    res_invalid = client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"status": "rejected"},
        headers={"Authorization": f"Bearer {token_w1}"},
    )
    assert res_invalid.status_code == 409
    assert res_invalid.json()["detail"]["error_code"] == "INVALID_STATE_TRANSITION"
