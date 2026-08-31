from fastapi.testclient import TestClient


def test_list_skills(client: TestClient, seed_test_data):
    """Test GET /skills retrieves seeded skills."""
    response = client.get("/skills")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert data["total"] >= 2

    skill_names = [s["name"] for s in data["items"]]
    assert "Pipe Repair" in skill_names
    assert "House Wiring" in skill_names


def test_filter_skills_by_category(client: TestClient, seed_test_data):
    """Test GET /skills?category=Plumbing filters by category."""
    response = client.get("/skills?category=Plumbing")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Pipe Repair"
    assert data["items"][0]["category"] == "Plumbing"


def test_grouped_skills(client: TestClient, seed_test_data):
    """Test GET /skills/grouped returns categories."""
    response = client.get("/skills/grouped")
    assert response.status_code == 200
    data = response.json()
    assert "total_categories" in data
    assert "categories" in data
    assert data["total_categories"] >= 2
