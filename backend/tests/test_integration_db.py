import time
import uuid
import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.db.database import SessionLocal
from app.db.models import User, ServiceRequest
from app.core.config import settings


@pytest.fixture(scope="module")
def live_client():
    """Client for testing against the live configured database."""
    with TestClient(app) as c:
        yield c


def is_live_db_available():
    """Checks if the configured DATABASE_URL is accessible."""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1;"))
        db.close()
        return True
    except Exception:
        return False


live_db_required = pytest.mark.skipif(
    not is_live_db_available(),
    reason="Live PostgreSQL / Supabase database is not reachable",
)


@live_db_required
def test_live_db_health(live_client: TestClient):
    """Verify live database connectivity endpoint."""
    response = live_client.get("/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


@live_db_required
def test_live_skills_count(live_client: TestClient):
    """Verify all 14 canonical skills are retrievable from live database."""
    response = live_client.get("/skills")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 14
    assert len(data["items"]) == 14


@live_db_required
def test_live_skills_grouped(live_client: TestClient):
    """Verify skills grouped by domain category in live database."""
    response = live_client.get("/skills/grouped")
    assert response.status_code == 200
    data = response.json()
    assert data["total_categories"] == 6
    categories = [cat["category"] for cat in data["categories"]]
    assert "Plumbing" in categories
    assert "Electrical" in categories


@live_db_required
def test_live_workers_count_and_pagination(live_client: TestClient):
    """Verify all 10 workers and pagination against live database."""
    response = live_client.get("/workers?limit=5&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 10
    assert len(data["items"]) == 5
    assert data["limit"] == 5
    assert data["offset"] == 0


@live_db_required
def test_live_workers_category_filtering(live_client: TestClient):
    """Verify filtering workers by category against live database."""
    response = live_client.get("/workers?category=Plumbing")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    for worker in data["items"]:
        categories = [s["category"] for s in worker["skills"]]
        assert "Plumbing" in categories


@live_db_required
def test_live_worker_detail_lookup(live_client: TestClient):
    """Verify single worker lookup by ID against live database."""
    list_res = live_client.get("/workers?limit=1")
    assert list_res.status_code == 200
    first_worker = list_res.json()["items"][0]
    worker_id = first_worker["id"]

    detail_res = live_client.get(f"/workers/{worker_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == worker_id
    assert detail["full_name"] == first_worker["full_name"]
    assert "email" in detail


@live_db_required
def test_live_service_request_lifecycle(live_client: TestClient):
    """Verify full service request lifecycle: creation, AI extraction, and deterministic PostGIS worker matching."""
    db = SessionLocal()
    existing_user = db.query(User).first()
    if not existing_user:
        db.close()
        pytest.skip("No users found in live database to test service requests")

    customer_id = existing_user.id
    original_role = existing_user.role

    # Temporarily allow customer role for this integration test
    existing_user.role = "customer"
    db.commit()

    # Generate valid test JWT
    now = int(time.time())
    payload = {
        "sub": str(customer_id),
        "email": existing_user.email,
        "role": "authenticated",
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
    }
    secret = settings.SUPABASE_JWT_SECRET or "test-secret"
    token = jwt.encode(payload, secret, algorithm="HS256")
    headers = {"Authorization": f"Bearer {token}"}

    created_request_id = None
    try:
        # 1. POST /service-requests
        create_payload = {
            "description": "Live DB integration test: Pipe leaking under kitchen sink",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "urgency": "high",
            "address_text": "MG Road, Bengaluru",
        }
        create_res = live_client.post("/service-requests", json=create_payload, headers=headers)
        assert create_res.status_code == 201
        data = create_res.json()
        assert data["customer_id"] == str(customer_id)
        assert data["status"] == "open"
        assert data["latitude"] == 12.9716
        assert data["longitude"] == 77.5946
        created_request_id = data["id"]

        # 2. GET /service-requests
        list_res = live_client.get("/service-requests", headers=headers)
        assert list_res.status_code == 200
        assert list_res.json()["total"] >= 1

        # 3. GET /service-requests/{id}
        get_res = live_client.get(f"/service-requests/{created_request_id}", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == created_request_id

        # 4. POST /service-requests/{id}/extract (AI Intent Extraction)
        extract_res = live_client.post(f"/service-requests/{created_request_id}/extract", headers=headers)
        assert extract_res.status_code == 200
        extract_data = extract_res.json()
        assert extract_data["request_id"] == created_request_id
        assert extract_data["category"] == "Plumbing"
        assert len(extract_data["skills"]) >= 1
        assert "Pipe Repair" in extract_data["skills"] or "Leak Fixing" in extract_data["skills"]
        assert extract_data["confidence"] >= 0.7

        # 5. Verify database record has updated extracted columns in PostgreSQL
        updated_record = db.query(ServiceRequest).filter(ServiceRequest.id == uuid.UUID(created_request_id)).first()
        assert updated_record.extracted_category == "Plumbing"
        assert "Pipe Repair" in updated_record.extracted_skills or "Leak Fixing" in updated_record.extracted_skills

        # 6. GET /service-requests/{id}/matches (Deterministic PostGIS Worker Matching)
        matches_res = live_client.get(f"/service-requests/{created_request_id}/matches", headers=headers)
        assert matches_res.status_code == 200
        matches_data = matches_res.json()
        assert matches_data["request_id"] == created_request_id
        assert matches_data["total_matches"] >= 1
        top_match = matches_data["matches"][0]
        assert "worker_id" in top_match
        assert top_match["category"] == "Plumbing"
        assert len(top_match["matched_skills"]) >= 1
        assert top_match["distance_km"] > 0
        assert top_match["match_score"] > 50.0

    finally:
        # Cleanup created records and restore user role
        if created_request_id:
            db.query(ServiceRequest).filter(ServiceRequest.id == uuid.UUID(created_request_id)).delete()
        user_to_restore = db.query(User).filter(User.id == customer_id).first()
        if user_to_restore:
            user_to_restore.role = original_role
        db.commit()
        db.close()
