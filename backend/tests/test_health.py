from fastapi.testclient import TestClient


def test_health_check_root(client: TestClient):
    """Test GET /health returns status ok and service identifier."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "project-unknown-backend"


def test_health_check_v1(client: TestClient):
    """Test GET /api/v1/health returns status ok."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "project-unknown-backend"


def test_root_endpoint(client: TestClient):
    """Test GET / returns project metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "project" in data
