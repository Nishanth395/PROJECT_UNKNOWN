import time
import uuid
import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    verify_supabase_jwt,
    get_current_auth_user,
    get_current_user,
    require_customer,
    require_worker,
)
from app.db.models import User
from app.schemas.auth import AuthenticatedUser

# Test secret used for deterministic unit test token signing
TEST_JWT_SECRET = settings.SUPABASE_JWT_SECRET or "test-secret-key-for-local-testing-123456"


def create_test_jwt(
    sub: str,
    email: str = "test@example.com",
    role: str = "authenticated",
    exp_seconds: int = 3600,
    secret: str = TEST_JWT_SECRET,
    algorithm: str = "HS256",
    aud: str = "authenticated",
) -> str:
    """Creates a controlled JWT token for unit testing."""
    now = int(time.time())
    payload = {
        "sub": sub,
        "email": email,
        "role": role,
        "aud": aud,
        "iat": now,
        "exp": now + exp_seconds,
        "app_metadata": {"provider": "email"},
        "user_metadata": {"full_name": "Test User"},
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


# ==============================================================================
# Authentication Endpoint Tests (/auth/me)
# ==============================================================================

def test_auth_me_missing_authorization_header(client: TestClient):
    """Test GET /auth/me rejects requests with no Authorization header (HTTP 401)."""
    response = client.get("/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert data["status"] == "error"
    assert data["detail"]["error_code"] == "MISSING_CREDENTIALS"


def test_auth_me_missing_authorization_header_v1(client: TestClient):
    """Test GET /api/v1/auth/me rejects requests with no Authorization header (HTTP 401)."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert data["status"] == "error"
    assert data["detail"]["error_code"] == "MISSING_CREDENTIALS"


def test_auth_me_invalid_bearer_token(client: TestClient):
    """Test GET /auth/me rejects malformed or invalid JWT tokens (HTTP 401)."""
    headers = {"Authorization": "Bearer invalid.jwt.token"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 401
    data = response.json()
    assert data["status"] == "error"
    assert data["detail"]["error_code"] == "INVALID_TOKEN"


def test_auth_me_malformed_auth_header_scheme(client: TestClient):
    """Test GET /auth/me rejects non-Bearer authorization schemes (HTTP 401)."""
    headers = {"Authorization": "Basic dXNlcjpwYXNz"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 401
    data = response.json()
    assert data["status"] == "error"
    assert data["detail"]["error_code"] == "INVALID_AUTH_SCHEME"


def test_auth_me_expired_token(client: TestClient, monkeypatch):
    """Test GET /auth/me rejects expired JWT tokens (HTTP 401)."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)
    expired_token = create_test_jwt(
        sub=str(uuid.uuid4()),
        exp_seconds=-60,  # Expired 60s ago
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 401
    data = response.json()
    assert data["status"] == "error"
    assert data["detail"]["error_code"] == "TOKEN_EXPIRED"


def test_auth_me_valid_jwt_with_existing_customer_profile(client: TestClient, db_session: Session, monkeypatch):
    """Test GET /auth/me returns authenticated identity and full public.users profile."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    # 1. Create customer user in test database
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        full_name="Pooja Hegde",
        phone="+919876543210",
        email="pooja.customer@example.com",
        role="customer",
    )
    db_session.add(user)
    db_session.commit()

    # 2. Generate valid JWT for this user
    token = create_test_jwt(sub=str(user_id), email="pooja.customer@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Request /auth/me
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(user_id)
    assert data["email"] == "pooja.customer@example.com"
    assert data["role"] == "customer"
    assert data["full_name"] == "Pooja Hegde"
    assert data["phone"] == "+919876543210"
    assert data["profile_exists"] is True


def test_auth_me_valid_jwt_without_db_profile(client: TestClient, monkeypatch):
    """Test GET /auth/me handles valid JWT user who does not have a public.users profile yet."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    unregistered_uuid = str(uuid.uuid4())
    token = create_test_jwt(sub=unregistered_uuid, email="newuser@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == unregistered_uuid
    assert data["email"] == "newuser@example.com"
    assert data["role"] is None
    assert data["full_name"] is None
    assert data["profile_exists"] is False


# ==============================================================================
# Role-based Authorization Guard Tests (require_customer & require_worker)
# ==============================================================================

@pytest.fixture
def role_test_app(db_session: Session):
    """Creates a temporary test router with protected role routes."""
    from fastapi import APIRouter
    from app.main import app
    from app.db.database import get_db

    router = APIRouter(prefix="/test-roles", tags=["Role Testing"])

    @router.get("/customer-only")
    def customer_only_endpoint(user: User = Depends(require_customer)):
        return {"access": "granted", "role": user.role, "user_id": str(user.id)}

    @router.get("/worker-only")
    def worker_only_endpoint(user: User = Depends(require_worker)):
        return {"access": "granted", "role": user.role, "user_id": str(user.id)}

    app.include_router(router)
    yield app


def test_require_customer_allows_customer_and_rejects_worker(
    client: TestClient,
    db_session: Session,
    role_test_app,
    monkeypatch,
):
    """Test require_customer grants access to customer accounts and returns 403 to worker accounts."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    # 1. Create a customer user
    customer_id = uuid.uuid4()
    customer = User(id=customer_id, full_name="Customer Alice", role="customer", email="alice@example.com")
    # 2. Create a worker user
    worker_id = uuid.uuid4()
    worker = User(id=worker_id, full_name="Worker Bob", role="worker", email="bob@example.com")

    db_session.add_all([customer, worker])
    db_session.commit()

    customer_token = create_test_jwt(sub=str(customer_id), email="alice@example.com")
    worker_token = create_test_jwt(sub=str(worker_id), email="bob@example.com")

    # Customer accessing customer-only endpoint -> 200 OK
    res1 = client.get("/test-roles/customer-only", headers={"Authorization": f"Bearer {customer_token}"})
    assert res1.status_code == 200
    assert res1.json()["access"] == "granted"
    assert res1.json()["role"] == "customer"

    # Worker accessing customer-only endpoint -> 403 Forbidden
    res2 = client.get("/test-roles/customer-only", headers={"Authorization": f"Bearer {worker_token}"})
    assert res2.status_code == 403
    assert res2.json()["detail"]["error_code"] == "FORBIDDEN"


def test_require_worker_allows_worker_and_rejects_customer(
    client: TestClient,
    db_session: Session,
    role_test_app,
    monkeypatch,
):
    """Test require_worker grants access to worker accounts and returns 403 to customer accounts."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    # 1. Create a customer user
    customer_id = uuid.uuid4()
    customer = User(id=customer_id, full_name="Customer Charlie", role="customer", email="charlie@example.com")
    # 2. Create a worker user
    worker_id = uuid.uuid4()
    worker = User(id=worker_id, full_name="Worker David", role="worker", email="david@example.com")

    db_session.add_all([customer, worker])
    db_session.commit()

    customer_token = create_test_jwt(sub=str(customer_id), email="charlie@example.com")
    worker_token = create_test_jwt(sub=str(worker_id), email="david@example.com")

    # Worker accessing worker-only endpoint -> 200 OK
    res1 = client.get("/test-roles/worker-only", headers={"Authorization": f"Bearer {worker_token}"})
    assert res1.status_code == 200
    assert res1.json()["access"] == "granted"
    assert res1.json()["role"] == "worker"

    # Customer accessing worker-only endpoint -> 403 Forbidden
    res2 = client.get("/test-roles/worker-only", headers={"Authorization": f"Bearer {customer_token}"})
    assert res2.status_code == 403
    assert res2.json()["detail"]["error_code"] == "FORBIDDEN"


def test_require_role_with_nonexistent_profile_returns_404(
    client: TestClient,
    role_test_app,
    monkeypatch,
):
    """Test role dependencies return 404 when the user's public.users profile does not exist."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    nonexistent_id = str(uuid.uuid4())
    token = create_test_jwt(sub=nonexistent_id, email="ghost@example.com")

    res = client.get("/test-roles/customer-only", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 404
    assert res.json()["detail"]["error_code"] == "USER_PROFILE_NOT_FOUND"
