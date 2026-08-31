import time
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import jwt

from app.core.config import settings
from app.db.models import User, Worker, Skill, WorkerSkill


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
def worker_user(db_session: Session) -> User:
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        full_name="Rajesh Worker",
        email="rajesh.worker@example.com",
        role="worker",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def customer_user(db_session: Session) -> User:
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        full_name="Pooja Customer",
        email="pooja.customer@example.com",
        role="customer",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_skills(db_session: Session):
    s1 = Skill(id=uuid.uuid4(), name="Test Pipe Repair", category="Plumbing", description="Fixing pipes")
    s2 = Skill(id=uuid.uuid4(), name="Test Leak Fixing", category="Plumbing", description="Fixing leaks")
    db_session.add_all([s1, s2])
    db_session.commit()
    db_session.refresh(s1)
    db_session.refresh(s2)
    return [s1, s2]


def test_unauthenticated_worker_endpoint_returns_401(client: TestClient):
    # 4. Unauthenticated -> 401
    resp = client.get("/api/v1/workers/me")
    assert resp.status_code == 401
    assert resp.json()["detail"]["error_code"] == "MISSING_CREDENTIALS"


def test_customer_accessing_worker_endpoint_returns_403(client: TestClient, customer_user: User):
    # 5. Customer attempting worker endpoint -> 403
    token = generate_test_jwt(str(customer_user.id), email=customer_user.email)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/workers/me", headers=headers)
    assert resp.status_code == 403
    assert resp.json()["detail"]["error_code"] == "FORBIDDEN"

    post_resp = client.post(
        "/api/v1/workers/me",
        json={
            "bio": "I am a customer trying to be a worker",
            "experience_years": 5.0,
            "service_radius_km": 10.0,
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers=headers,
    )
    assert post_resp.status_code == 403


def test_worker_profile_get_when_not_created_returns_404(client: TestClient, worker_user: User):
    token = generate_test_jwt(str(worker_user.id), email=worker_user.email)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/workers/me", headers=headers)
    assert resp.status_code == 404
    assert resp.json()["detail"]["error_code"] == "WORKER_PROFILE_NOT_FOUND"


def test_worker_profile_creation_success(client: TestClient, worker_user: User):
    # 1. Worker profile creation
    token = generate_test_jwt(str(worker_user.id), email=worker_user.email)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "bio": "Experienced certified plumber in Bengaluru",
        "experience_years": 6.5,
        "service_radius_km": 12.0,
        "latitude": 12.9500,
        "longitude": 77.6300,
        "is_available": True,
        "address_text": "Indiranagar, Bengaluru",
    }

    resp = client.post("/api/v1/workers/me", json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()

    assert data["user_id"] == str(worker_user.id)
    assert data["full_name"] == "Rajesh Worker"
    assert data["bio"] == "Experienced certified plumber in Bengaluru"
    assert data["experience_years"] == 6.5
    assert data["service_radius_km"] == 12.0
    assert data["latitude"] == 12.95
    assert data["longitude"] == 77.63
    assert data["is_available"] is True
    assert data["is_verified"] is False
    assert data["rating"] == 0.0
    assert data["total_reviews"] == 0


def test_worker_profile_duplicate_creation_rejected(client: TestClient, worker_user: User):
    token = generate_test_jwt(str(worker_user.id), email=worker_user.email)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "bio": "First creation",
        "experience_years": 4.0,
        "service_radius_km": 10.0,
        "latitude": 12.95,
        "longitude": 77.63,
    }

    resp1 = client.post("/api/v1/workers/me", json=payload, headers=headers)
    assert resp1.status_code == 201

    resp2 = client.post("/api/v1/workers/me", json=payload, headers=headers)
    assert resp2.status_code == 409
    assert resp2.json()["detail"]["error_code"] == "WORKER_PROFILE_EXISTS"


def test_worker_profile_retrieval_and_update(client: TestClient, worker_user: User):
    # 2. Worker profile retrieval & 3. Worker profile update
    token = generate_test_jwt(str(worker_user.id), email=worker_user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Setup profile
    client.post(
        "/api/v1/workers/me",
        json={
            "bio": "Initial bio",
            "experience_years": 3.0,
            "service_radius_km": 8.0,
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers=headers,
    )

    # Retrieve
    get_resp = client.get("/api/v1/workers/me", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["bio"] == "Initial bio"

    # Update (PATCH)
    patch_payload = {
        "bio": "Updated Master Electrician",
        "experience_years": 5.5,
        "service_radius_km": 20.0,
        "is_available": False,
        "latitude": 12.9600,
        "longitude": 77.6000,
    }
    patch_resp = client.patch("/api/v1/workers/me", json=patch_payload, headers=headers)
    assert patch_resp.status_code == 200
    updated = patch_resp.json()

    assert updated["bio"] == "Updated Master Electrician"
    assert updated["experience_years"] == 5.5
    assert updated["service_radius_km"] == 20.0
    assert updated["is_available"] is False
    assert updated["latitude"] == 12.96
    assert updated["longitude"] == 77.60


def test_worker_immutable_fields_protected(client: TestClient, worker_user: User):
    # 8. Rating, 9. Total Reviews, 10. Is Verified cannot be modified by client
    token = generate_test_jwt(str(worker_user.id), email=worker_user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Create profile
    client.post(
        "/api/v1/workers/me",
        json={
            "bio": "Normal Worker",
            "experience_years": 2.0,
            "service_radius_km": 5.0,
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers=headers,
    )

    # Attempt to spoof rating and verified status via patch
    spoof_payload = {
        "rating": 5.0,
        "total_reviews": 100,
        "is_verified": True,
        "user_id": str(uuid.uuid4()),
        "worker_id": str(uuid.uuid4()),
        "bio": "Legit Bio",
    }
    patch_resp = client.patch("/api/v1/workers/me", json=spoof_payload, headers=headers)
    assert patch_resp.status_code == 200
    res = patch_resp.json()

    assert res["rating"] == 0.0
    assert res["total_reviews"] == 0
    assert res["is_verified"] is False
    assert res["user_id"] == str(worker_user.id)


def test_worker_location_and_radius_validations(client: TestClient, worker_user: User):
    # 12. Invalid lat, 13. Invalid lon, 15. Invalid radius
    token = generate_test_jwt(str(worker_user.id), email=worker_user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Invalid latitude > 90
    resp_lat = client.post(
        "/api/v1/workers/me",
        json={"latitude": 95.0, "longitude": 77.5946, "service_radius_km": 10.0},
        headers=headers,
    )
    assert resp_lat.status_code == 422

    # Invalid longitude < -180
    resp_lon = client.post(
        "/api/v1/workers/me",
        json={"latitude": 12.9716, "longitude": -190.0, "service_radius_km": 10.0},
        headers=headers,
    )
    assert resp_lon.status_code == 422

    # Invalid radius <= 0
    resp_radius = client.post(
        "/api/v1/workers/me",
        json={"latitude": 12.9716, "longitude": 77.5946, "service_radius_km": 0.0},
        headers=headers,
    )
    assert resp_radius.status_code == 422


def test_worker_skills_management_and_deduplication(client: TestClient, worker_user: User, sample_skills: list):
    # 16. Skill selection, 17. Invalid skill ID, 18. Duplicate skills, 19. Skill experience
    token = generate_test_jwt(str(worker_user.id), email=worker_user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Create profile
    client.post(
        "/api/v1/workers/me",
        json={
            "bio": "Plumber",
            "experience_years": 5.0,
            "service_radius_km": 10.0,
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers=headers,
    )

    s1, s2 = sample_skills

    # 1. Update skills with valid skills + duplicate skill_id
    put_skills_payload = {
        "skills": [
            {"skill_id": str(s1.id), "experience_years": 4.0},
            {"skill_id": str(s2.id), "experience_years": 2.5},
            {"skill_id": str(s1.id), "experience_years": 5.0},  # Duplicate s1 ID, safely deduplicated
        ]
    }

    skills_resp = client.put("/api/v1/workers/me/skills", json=put_skills_payload, headers=headers)
    assert skills_resp.status_code == 200
    skills_data = skills_resp.json()

    assert len(skills_data["skills"]) == 2
    skill_names = [s["skill_name"] for s in skills_data["skills"]]
    assert "Test Pipe Repair" in skill_names
    assert "Test Leak Fixing" in skill_names

    # 2. Get skills
    get_skills_resp = client.get("/api/v1/workers/me/skills", headers=headers)
    assert get_skills_resp.status_code == 200
    assert len(get_skills_resp.json()["skills"]) == 2

    # 3. Invalid skill ID -> 400
    invalid_payload = {
        "skills": [
            {"skill_id": str(uuid.uuid4()), "experience_years": 1.0}
        ]
    }
    invalid_resp = client.put("/api/v1/workers/me/skills", json=invalid_payload, headers=headers)
    assert invalid_resp.status_code == 400
    assert invalid_resp.json()["detail"]["error_code"] == "INVALID_SKILL_ID"


def test_worker_availability_update(client: TestClient, worker_user: User):
    # 20. Worker availability update
    token = generate_test_jwt(str(worker_user.id), email=worker_user.email)
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/workers/me",
        json={
            "bio": "Plumber",
            "experience_years": 5.0,
            "service_radius_km": 10.0,
            "latitude": 12.9716,
            "longitude": 77.5946,
            "is_available": True,
        },
        headers=headers,
    )

    # Toggle to False
    patch_resp1 = client.patch("/api/v1/workers/me", json={"is_available": False}, headers=headers)
    assert patch_resp1.status_code == 200
    assert patch_resp1.json()["is_available"] is False

    # Toggle to True
    patch_resp2 = client.patch("/api/v1/workers/me", json={"is_available": True}, headers=headers)
    assert patch_resp2.status_code == 200
    assert patch_resp2.json()["is_available"] is True
