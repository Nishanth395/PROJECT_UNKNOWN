import time
import uuid
from datetime import datetime, timezone
import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import User, Worker, ServiceRequest, Booking, Review

TEST_JWT_SECRET = settings.SUPABASE_JWT_SECRET or "test-secret-key-for-local-testing-123456"


def create_test_jwt(
    sub: str,
    email: str = "customer@example.com",
    role: str = "customer",
    full_name: str = "Test Customer",
) -> str:
    now = int(time.time())
    payload = {
        "sub": sub,
        "email": email,
        "role": role,
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
        "user_metadata": {"full_name": full_name, "role": role},
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


@pytest.fixture
def review_setup(db_session: Session):
    """Sets up a customer, a second customer, a worker, and a service request."""
    customer_id = uuid.uuid4()
    customer = User(
        id=customer_id,
        full_name="Anjali Nair",
        email="anjali@example.com",
        role="customer",
    )

    other_customer_id = uuid.uuid4()
    other_customer = User(
        id=other_customer_id,
        full_name="Kavita Iyer",
        email="kavita@example.com",
        role="customer",
    )

    worker_user_id = uuid.uuid4()
    worker_user = User(
        id=worker_user_id,
        full_name="Manoj Sharma",
        email="manoj@example.com",
        role="worker",
    )

    worker_id = uuid.uuid4()
    worker = Worker(
        id=worker_id,
        user_id=worker_user_id,
        description="Expert Carpenter",
        experience_years=7.0,
        service_radius_km=15.0,
        is_available=True,
    )

    sr_id = uuid.uuid4()
    sr = ServiceRequest(
        id=sr_id,
        customer_id=customer_id,
        raw_description="Fix wooden wardrobe door hinges",
        extracted_category="Carpentry",
        extracted_skills=["Door Repair", "Carpentry"],
        urgency="normal",
        status="completed",
    )

    db_session.add_all([customer, other_customer, worker_user, worker, sr])
    db_session.commit()

    return {
        "customer": customer,
        "other_customer": other_customer,
        "worker_user": worker_user,
        "worker": worker,
        "service_request": sr,
    }


def test_create_review_unauthenticated(client: TestClient):
    """Test POST /api/v1/reviews without JWT returns 401 Unauthorized."""
    response = client.post(
        "/api/v1/reviews",
        json={"booking_id": str(uuid.uuid4()), "rating": 5, "comment": "Great!"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["status"] == "error"
    assert data["detail"]["error_code"] == "MISSING_CREDENTIALS"


def test_create_review_worker_forbidden(client: TestClient, review_setup, monkeypatch):
    """Test worker role cannot submit customer reviews (HTTP 403)."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)
    worker_token = create_test_jwt(
        sub=str(review_setup["worker_user"].id),
        email=review_setup["worker_user"].email,
        role="worker",
    )

    response = client.post(
        "/api/v1/reviews",
        json={"booking_id": str(uuid.uuid4()), "rating": 5},
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["error_code"] == "FORBIDDEN"


def test_create_review_nonexistent_booking(client: TestClient, review_setup, monkeypatch):
    """Test reviewing a non-existent booking returns 404 Not Found."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)
    cust_token = create_test_jwt(
        sub=str(review_setup["customer"].id),
        email=review_setup["customer"].email,
        role="customer",
    )

    response = client.post(
        "/api/v1/reviews",
        json={"booking_id": str(uuid.uuid4()), "rating": 5, "comment": "Nice job"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "BOOKING_NOT_FOUND"


def test_create_review_other_customer_booking_forbidden(
    client: TestClient, db_session: Session, review_setup, monkeypatch
):
    """Test customer cannot submit a review for another customer's booking."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    # Booking belongs to other_customer
    booking = Booking(
        id=uuid.uuid4(),
        customer_id=review_setup["other_customer"].id,
        worker_id=review_setup["worker"].id,
        service_request_id=review_setup["service_request"].id,
        scheduled_time=datetime.now(timezone.utc),
        status="completed",
    )
    db_session.add(booking)
    db_session.commit()

    cust_token = create_test_jwt(
        sub=str(review_setup["customer"].id),
        email=review_setup["customer"].email,
        role="customer",
    )

    response = client.post(
        "/api/v1/reviews",
        json={"booking_id": str(booking.id), "rating": 4},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["error_code"] == "FORBIDDEN"


@pytest.mark.parametrize("invalid_status", ["pending", "accepted", "rejected", "cancelled"])
def test_create_review_non_completed_booking_lifecycle_conflict(
    client: TestClient, db_session: Session, review_setup, invalid_status, monkeypatch
):
    """Test reviews cannot be submitted for pending, accepted, rejected, or cancelled bookings."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    booking = Booking(
        id=uuid.uuid4(),
        customer_id=review_setup["customer"].id,
        worker_id=review_setup["worker"].id,
        service_request_id=review_setup["service_request"].id,
        scheduled_time=datetime.now(timezone.utc),
        status=invalid_status,
    )
    db_session.add(booking)
    db_session.commit()

    cust_token = create_test_jwt(
        sub=str(review_setup["customer"].id),
        email=review_setup["customer"].email,
        role="customer",
    )

    response = client.post(
        "/api/v1/reviews",
        json={"booking_id": str(booking.id), "rating": 5, "comment": "Good job"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["error_code"] == "BOOKING_NOT_COMPLETED"


def test_create_review_success(
    client: TestClient, db_session: Session, review_setup, monkeypatch
):
    """Test customer successfully submits review for completed booking."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    booking = Booking(
        id=uuid.uuid4(),
        customer_id=review_setup["customer"].id,
        worker_id=review_setup["worker"].id,
        service_request_id=review_setup["service_request"].id,
        scheduled_time=datetime.now(timezone.utc),
        status="completed",
    )
    db_session.add(booking)
    db_session.commit()

    cust_token = create_test_jwt(
        sub=str(review_setup["customer"].id),
        email=review_setup["customer"].email,
        role="customer",
        full_name="Anjali Nair",
    )

    response = client.post(
        "/api/v1/reviews",
        json={
            "booking_id": str(booking.id),
            "rating": 5,
            "comment": "Manoj did an exceptional job repairing our wardrobe doors!",
        },
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["booking_id"] == str(booking.id)
    assert data["worker_id"] == str(review_setup["worker"].id)
    assert data["rating"] == 5
    assert data["comment"] == "Manoj did an exceptional job repairing our wardrobe doors!"
    assert data["customer_name"] == "Anjali Nair"
    assert "id" in data


def test_create_review_duplicate_rejected(
    client: TestClient, db_session: Session, review_setup, monkeypatch
):
    """Test duplicate review for the same booking is rejected with 409 Conflict."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    booking = Booking(
        id=uuid.uuid4(),
        customer_id=review_setup["customer"].id,
        worker_id=review_setup["worker"].id,
        service_request_id=review_setup["service_request"].id,
        scheduled_time=datetime.now(timezone.utc),
        status="completed",
    )
    db_session.add(booking)
    db_session.commit()

    cust_token = create_test_jwt(
        sub=str(review_setup["customer"].id),
        email=review_setup["customer"].email,
        role="customer",
    )

    # First review succeeds
    res1 = client.post(
        "/api/v1/reviews",
        json={"booking_id": str(booking.id), "rating": 5, "comment": "First review"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert res1.status_code == 201

    # Second review fails
    res2 = client.post(
        "/api/v1/reviews",
        json={"booking_id": str(booking.id), "rating": 4, "comment": "Duplicate review"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert res2.status_code == 409
    assert res2.json()["detail"]["error_code"] == "DUPLICATE_REVIEW"


@pytest.mark.parametrize("invalid_rating", [0, 6, -1, 10])
def test_create_review_rating_validation_errors(
    client: TestClient, review_setup, invalid_rating, monkeypatch
):
    """Test ratings outside 1-5 fail schema validation with HTTP 422."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)
    cust_token = create_test_jwt(
        sub=str(review_setup["customer"].id),
        email=review_setup["customer"].email,
        role="customer",
    )

    response = client.post(
        "/api/v1/reviews",
        json={"booking_id": str(uuid.uuid4()), "rating": invalid_rating},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert response.status_code == 422


def test_get_worker_reviews_nonexistent_worker(client: TestClient):
    """Test querying reviews for non-existent worker returns 404."""
    response = client.get(f"/api/v1/reviews/worker/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "WORKER_NOT_FOUND"


def test_get_worker_reviews_list_and_sanitization(
    client: TestClient, db_session: Session, review_setup, monkeypatch
):
    """Test retrieving worker reviews returns paginated list with average rating and sanitized names."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    # Create 2 completed bookings and reviews
    b1 = Booking(
        id=uuid.uuid4(),
        customer_id=review_setup["customer"].id,
        worker_id=review_setup["worker"].id,
        service_request_id=review_setup["service_request"].id,
        scheduled_time=datetime.now(timezone.utc),
        status="completed",
    )
    b2 = Booking(
        id=uuid.uuid4(),
        customer_id=review_setup["other_customer"].id,
        worker_id=review_setup["worker"].id,
        service_request_id=review_setup["service_request"].id,
        scheduled_time=datetime.now(timezone.utc),
        status="completed",
    )
    db_session.add_all([b1, b2])
    db_session.commit()

    cust1_token = create_test_jwt(
        sub=str(review_setup["customer"].id),
        email=review_setup["customer"].email,
        role="customer",
    )
    cust2_token = create_test_jwt(
        sub=str(review_setup["other_customer"].id),
        email=review_setup["other_customer"].email,
        role="customer",
    )

    client.post(
        "/api/v1/reviews",
        json={"booking_id": str(b1.id), "rating": 5, "comment": "Splendid work"},
        headers={"Authorization": f"Bearer {cust1_token}"},
    )
    client.post(
        "/api/v1/reviews",
        json={"booking_id": str(b2.id), "rating": 4, "comment": "Good timing"},
        headers={"Authorization": f"Bearer {cust2_token}"},
    )

    response = client.get(f"/api/v1/reviews/worker/{review_setup['worker'].id}")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["average_rating"] == 4.5
    # Verify customer names are included without sensitive data
    names = [item["customer_name"] for item in data["items"]]
    assert "Anjali Nair" in names
    assert "Kavita Iyer" in names
    for item in data["items"]:
        assert "email" not in item
        assert "phone" not in item
