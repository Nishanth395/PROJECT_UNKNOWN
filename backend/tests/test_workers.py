import uuid
from fastapi.testclient import TestClient


def test_list_workers(client: TestClient, seed_test_data):
    """Test GET /workers retrieves paginated worker list."""
    response = client.get("/workers")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert data["total"] == 1

    worker = data["items"][0]
    assert worker["full_name"] == "Ramesh Kumar"
    assert worker["rating"] == 4.85
    assert len(worker["skills"]) == 1
    assert worker["skills"][0]["skill_name"] == "Pipe Repair"


def test_list_workers_pagination(client: TestClient, seed_test_data):
    """Test GET /workers pagination parameters limit and offset."""
    response = client.get("/workers?limit=10&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert data["limit"] == 10
    assert data["offset"] == 0
    assert len(data["items"]) == 1


def test_filter_workers_by_category(client: TestClient, seed_test_data):
    """Test GET /workers?category=Plumbing matches plumbing workers."""
    response = client.get("/workers?category=Plumbing")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1

    # Non-matching category
    empty_response = client.get("/workers?category=Automobile")
    assert empty_response.status_code == 200
    assert empty_response.json()["total"] == 0


def test_filter_workers_by_skill(client: TestClient, seed_test_data):
    """Test GET /workers?skill=Pipe matches workers with skill."""
    response = client.get("/workers?skill=Pipe")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1


def test_get_worker_by_id_success(client: TestClient, seed_test_data):
    """Test GET /workers/{worker_id} retrieves full profile details."""
    worker_id = seed_test_data["worker_id"]
    response = client.get(f"/workers/{worker_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(worker_id)
    assert data["full_name"] == "Ramesh Kumar"
    assert data["email"] == "ramesh@example.com"
    assert data["hourly_rate"] == 350.00
    assert data["rating"] == 4.85
    assert len(data["skills"]) == 1


def test_get_worker_by_id_not_found(client: TestClient, seed_test_data):
    """Test GET /workers/{non_existent_id} returns 404 status."""
    non_existent_id = uuid.uuid4()
    response = client.get(f"/workers/{non_existent_id}")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert f"Worker with ID '{non_existent_id}' not found" in data["detail"]
