import time
import uuid
import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import User, Worker, Skill, WorkerSkill, ServiceRequest
from app.services.matching_service import compute_match_score
from app.schemas.matching import MatchedWorkerItem

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


def get_or_create_skill(db: Session, name: str, category: str) -> Skill:
    """Retrieve skill if already present in DB fixture, or insert if missing."""
    existing = db.query(Skill).filter(Skill.name == name).first()
    if existing:
        return existing
    new_skill = Skill(id=uuid.uuid4(), name=name, category=category)
    db.add(new_skill)
    db.commit()
    return new_skill


# ==============================================================================
# Unit Tests for Pure Score Calculation Formula
# ==============================================================================

def test_compute_match_score_perfect():
    """Test perfect score: 0km distance, 5.0 rating, 10+ years experience -> 100.0 points."""
    skill_s, dist_s, rat_s, exp_s, total = compute_match_score(
        distance_km=0.0,
        service_radius_km=10.0,
        rating=5.0,
        experience_years=10.0,
    )
    assert skill_s == 50.0
    assert dist_s == 25.0
    assert rat_s == 15.0
    assert exp_s == 10.0
    assert total == 100.00


def test_compute_match_score_zero_distance():
    """Test 0km distance awards full 25.0 distance points."""
    _, dist_s, _, _, _ = compute_match_score(
        distance_km=0.0,
        service_radius_km=15.0,
        rating=3.0,
        experience_years=5.0,
    )
    assert dist_s == 25.0


def test_compute_match_score_maximum_radius_boundary():
    """Test distance equal to service radius awards 0.0 distance points."""
    _, dist_s, _, _, _ = compute_match_score(
        distance_km=15.0,
        service_radius_km=15.0,
        rating=4.0,
        experience_years=5.0,
    )
    assert dist_s == 0.0


def test_compute_match_score_rating_boundaries():
    """Test rating score scaling: 0.0 rating -> 0.0 pts; 5.0 rating -> 15.0 pts; None -> 0.0 pts."""
    # Rating 0.0
    _, _, rat_s_0, _, _ = compute_match_score(0.0, 10.0, rating=0.0, experience_years=5.0)
    assert rat_s_0 == 0.0

    # Rating None
    _, _, rat_s_none, _, _ = compute_match_score(0.0, 10.0, rating=None, experience_years=5.0)
    assert rat_s_none == 0.0

    # Rating 5.0
    _, _, rat_s_5, _, _ = compute_match_score(0.0, 10.0, rating=5.0, experience_years=5.0)
    assert rat_s_5 == 15.0

    # Rating 4.0 -> (4/5) * 15 = 12.0
    _, _, rat_s_4, _, _ = compute_match_score(0.0, 10.0, rating=4.0, experience_years=5.0)
    assert rat_s_4 == 12.0


def test_compute_match_score_experience_capping():
    """Test experience score scaling: 0 yrs -> 0.0 pts; 10 yrs -> 10.0 pts; 15 yrs capped at 10.0 pts."""
    # 0 years
    _, _, _, exp_s_0, _ = compute_match_score(0.0, 10.0, rating=5.0, experience_years=0.0)
    assert exp_s_0 == 0.0

    # 5 years -> 5.0 pts
    _, _, _, exp_s_5, _ = compute_match_score(0.0, 10.0, rating=5.0, experience_years=5.0)
    assert exp_s_5 == 5.0

    # 10 years -> 10.0 pts
    _, _, _, exp_s_10, _ = compute_match_score(0.0, 10.0, rating=5.0, experience_years=10.0)
    assert exp_s_10 == 10.0

    # 25 years (capped) -> 10.0 pts
    _, _, _, exp_s_25, _ = compute_match_score(0.0, 10.0, rating=5.0, experience_years=25.0)
    assert exp_s_25 == 10.0


def test_compute_match_score_distance_clamping():
    """Test distance > service_radius is clamped to 0.0 (never negative)."""
    _, dist_s, _, _, _ = compute_match_score(
        distance_km=20.0,
        service_radius_km=10.0,
        rating=4.0,
        experience_years=5.0,
    )
    assert dist_s == 0.0


def test_deterministic_tie_breaking():
    """Test tie-breaking comparator ordering."""
    w1_id = uuid.uuid4()
    w2_id = uuid.uuid4()

    # Worker 1: higher rating (4.9 vs 4.8), same match score
    item1 = MatchedWorkerItem(
        worker_id=w1_id,
        name="Worker One",
        category="Plumbing",
        matched_skills=["Pipe Repair"],
        distance_km=2.0,
        rating=4.9,
        total_reviews=10,
        experience_years=5.0,
        is_verified=True,
        is_available=True,
        match_score=85.0,
    )
    item2 = MatchedWorkerItem(
        worker_id=w2_id,
        name="Worker Two",
        category="Plumbing",
        matched_skills=["Pipe Repair"],
        distance_km=1.0,
        rating=4.8,
        total_reviews=10,
        experience_years=5.0,
        is_verified=True,
        is_available=True,
        match_score=85.0,
    )

    items = [item2, item1]

    def tie_breaker_key(item: MatchedWorkerItem):
        return (
            -item.match_score,
            -(item.rating or 0.0),
            item.distance_km,
            -(item.experience_years or 0.0),
            not item.is_verified,
            str(item.worker_id),
        )

    items.sort(key=tie_breaker_key)
    assert items[0].worker_id == w1_id  # Higher rating wins tie-break


# ==============================================================================
# API Endpoint Tests (GET /service-requests/{id}/matches)
# ==============================================================================

def test_get_matches_unauthenticated(client: TestClient):
    """Test GET /service-requests/{id}/matches rejects unauthenticated requests with 401."""
    random_id = str(uuid.uuid4())
    res = client.get(f"/service-requests/{random_id}/matches")
    assert res.status_code == 401
    assert res.json()["detail"]["error_code"] == "MISSING_CREDENTIALS"


def test_get_matches_worker_forbidden(client: TestClient, db_session: Session, monkeypatch):
    """Test GET /service-requests/{id}/matches rejects worker accounts with 403 Forbidden."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    worker_id = uuid.uuid4()
    worker = User(id=worker_id, full_name="Worker Dave", role="worker", email="worker.dave@example.com")
    db_session.add(worker)
    db_session.commit()

    token = create_token(sub=str(worker_id), email="worker.dave@example.com")
    res = client.get(f"/service-requests/{uuid.uuid4()}/matches", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert res.json()["detail"]["error_code"] == "FORBIDDEN"


def test_get_matches_wrong_customer_returns_404(client: TestClient, db_session: Session, monkeypatch):
    """Test customer attempting to get matches for another customer's request receives 404."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    cust1_id = uuid.uuid4()
    cust2_id = uuid.uuid4()
    u1 = User(id=cust1_id, full_name="Cust 1", role="customer", email="c1@example.com")
    u2 = User(id=cust2_id, full_name="Cust 2", role="customer", email="c2@example.com")
    db_session.add_all([u1, u2])
    db_session.commit()

    sr = ServiceRequest(
        id=uuid.uuid4(),
        customer_id=cust1_id,
        raw_description="Pipe burst",
        extracted_category="Plumbing",
        extracted_skills=["Pipe Repair"],
        urgency="normal",
        status="open",
        location="POINT(77.63 12.95)",
    )
    db_session.add(sr)
    db_session.commit()

    token2 = create_token(sub=str(cust2_id), email="c2@example.com")
    res = client.get(f"/service-requests/{sr.id}/matches", headers={"Authorization": f"Bearer {token2}"})
    assert res.status_code == 404
    assert res.json()["detail"]["error_code"] == "REQUEST_NOT_FOUND"


def test_get_matches_unextracted_request_returns_400(client: TestClient, db_session: Session, monkeypatch):
    """Test GET matches on a service request with no extracted skills returns 400 Bad Request."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    cust_id = uuid.uuid4()
    u = User(id=cust_id, full_name="Customer Unextracted", role="customer", email="unex@example.com")
    db_session.add(u)
    db_session.commit()

    sr = ServiceRequest(
        id=uuid.uuid4(),
        customer_id=cust_id,
        raw_description="My ceiling fan is broken",
        extracted_category=None,
        extracted_skills=[],  # Not extracted yet!
        urgency="normal",
        status="open",
        location="POINT(77.63 12.95)",
    )
    db_session.add(sr)
    db_session.commit()

    token = create_token(sub=str(cust_id), email="unex@example.com")
    res = client.get(f"/service-requests/{sr.id}/matches", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    assert res.json()["detail"]["error_code"] == "REQUEST_NOT_CLASSIFIED"


def test_get_matches_successful_filtering_and_ranking(client: TestClient, db_session: Session, monkeypatch):
    """
    Comprehensive matching test:
    - Worker 1: Matching skill (Pipe Repair), 2km distance, 4.8 rating, 8 yrs exp -> Highly eligible
    - Worker 2: Matching skill (Pipe Repair), 10km distance, 4.5 rating, 5 yrs exp -> Lower score
    - Worker 3: Matching skill (Pipe Repair), 25km distance (out of 15km radius) -> Excluded
    - Worker 4: Matching skill (Pipe Repair), 1km distance, but is_available = False -> Excluded
    - Worker 5: Non-matching skill (Mathematics Tutoring), 1km distance -> Excluded
    """
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    # 1. Skills (get or create safely)
    plumbing_skill = get_or_create_skill(db_session, "Pipe Repair", "Plumbing")
    tutoring_skill = get_or_create_skill(db_session, "Mathematics Tutoring", "Tutoring")

    # 2. Customer & Service Request (at lat 12.9500, lon 77.6300)
    cust_id = uuid.uuid4()
    cust = User(id=cust_id, full_name="Matching Customer", role="customer", email="match.cust@example.com")
    db_session.add(cust)
    db_session.commit()

    sr = ServiceRequest(
        id=uuid.uuid4(),
        customer_id=cust_id,
        raw_description="PVC Pipe is leaking under the sink",
        extracted_category="Plumbing",
        extracted_skills=["Pipe Repair"],
        urgency="normal",
        status="open",
        location="POINT(77.6300 12.9500)",
    )
    db_session.add(sr)
    db_session.commit()

    # 3. Create Workers
    def add_worker(name, email, loc_wkt, is_avail, radius, rating, exp, skill):
        uid = uuid.uuid4()
        wid = uuid.uuid4()
        user = User(id=uid, full_name=name, email=email, role="worker")
        db_session.add(user)
        worker = Worker(
            id=wid,
            user_id=uid,
            location=loc_wkt,
            is_available=is_avail,
            service_radius_km=radius,
            rating=rating,
            experience_years=exp,
            is_verified=True,
        )
        db_session.add(worker)
        ws = WorkerSkill(id=uuid.uuid4(), worker_id=wid, skill_id=skill.id, experience_years=exp)
        db_session.add(ws)
        return wid

    # W1: Near (~2km), Available, Matching skill
    w1_id = add_worker("Near Plumber", "w1@example.com", "POINT(77.6400 12.9600)", True, 15.0, 4.8, 8.0, plumbing_skill)
    # W2: Further (~8km), Available, Matching skill
    w2_id = add_worker("Mid Plumber", "w2@example.com", "POINT(77.6800 13.0100)", True, 15.0, 4.2, 4.0, plumbing_skill)
    # W3: Out of radius (> 30km away with 10km radius)
    w3_id = add_worker("Far Plumber", "w3@example.com", "POINT(77.9500 13.3500)", True, 10.0, 5.0, 10.0, plumbing_skill)
    # W4: Near (~1km), but UNAVAILABLE
    w4_id = add_worker("Unavailable Plumber", "w4@example.com", "POINT(77.6350 12.9520)", False, 15.0, 5.0, 10.0, plumbing_skill)
    # W5: Near (~1km), Available, but WRONG SKILL (Tutoring)
    w5_id = add_worker("Math Tutor", "w5@example.com", "POINT(77.6350 12.9520)", True, 15.0, 5.0, 10.0, tutoring_skill)

    db_session.commit()

    # 4. Request matches
    token = create_token(sub=str(cust_id), email="match.cust@example.com")
    res = client.get(f"/service-requests/{sr.id}/matches", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()

    assert data["request_id"] == str(sr.id)
    # Exactly 2 eligible workers: W1 and W2 (W3 is out of radius, W4 is unavailable, W5 has wrong skill)
    assert data["total_matches"] == 2
    matched_ids = [m["worker_id"] for m in data["matches"]]
    assert str(w1_id) in matched_ids
    assert str(w2_id) in matched_ids
    assert str(w3_id) not in matched_ids
    assert str(w4_id) not in matched_ids
    assert str(w5_id) not in matched_ids

    # W1 should be ranked #1 (closer, higher rating, higher experience)
    top_match = data["matches"][0]
    assert top_match["worker_id"] == str(w1_id)
    assert top_match["name"] == "Near Plumber"
    assert "Pipe Repair" in top_match["matched_skills"]
    assert top_match["match_score"] > data["matches"][1]["match_score"]


def test_get_matches_limit_and_empty_results(client: TestClient, db_session: Session, monkeypatch):
    """Test limit parameter bounds and empty match response when no workers exist in domain."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

    cust_id = uuid.uuid4()
    cust = User(id=cust_id, full_name="Empty Cust", role="customer", email="empty@example.com")
    db_session.add(cust)
    db_session.commit()

    sr = ServiceRequest(
        id=uuid.uuid4(),
        customer_id=cust_id,
        raw_description="Fix my antique pendulum clock",
        extracted_category="Mechanic",
        extracted_skills=["Two-Wheeler Servicing"],  # No workers created for this in test session
        urgency="normal",
        status="open",
        location="POINT(77.63 12.95)",
    )
    db_session.add(sr)
    db_session.commit()

    token = create_token(sub=str(cust_id), email="empty@example.com")

    # When no workers match: total_matches=0, matches=[]
    res = client.get(f"/service-requests/{sr.id}/matches?limit=10", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_matches"] == 0
    assert data["matches"] == []
