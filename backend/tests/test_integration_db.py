import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.db.database import SessionLocal
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
    assert data["total"] == 10
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
