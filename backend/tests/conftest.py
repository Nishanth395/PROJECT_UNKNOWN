import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.db.models import User, Worker, Skill, WorkerSkill

# In-memory SQLite for automated tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables in in-memory test database."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    """Provide a transactional database session for a test."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def seed_test_data(db_session):
    """Populates basic sample skills, worker, and user in the test database."""
    # Clean previous data
    db_session.query(WorkerSkill).delete()
    db_session.query(Skill).delete()
    db_session.query(Worker).delete()
    db_session.query(User).delete()
    db_session.commit()

    # Create Skills
    plumbing_skill = Skill(
        id=uuid.UUID("11111111-0000-0000-0000-000000000001"),
        name="Pipe Repair",
        category="Plumbing",
        description="Fixing burst and leaking pipes",
    )
    electrical_skill = Skill(
        id=uuid.UUID("22222222-0000-0000-0000-000000000001"),
        name="House Wiring",
        category="Electrical",
        description="Complete residential wiring",
    )
    db_session.add(plumbing_skill)
    db_session.add(electrical_skill)
    db_session.commit()

    # Create User & Worker
    user_id = uuid.UUID("a0000000-0000-0000-0000-000000000001")
    worker_id = uuid.UUID("b0000000-0000-0000-0000-000000000001")

    test_user = User(
        id=user_id,
        full_name="Ramesh Kumar",
        email="ramesh@example.com",
        phone="+919876543201",
        role="worker",
    )
    db_session.add(test_user)
    db_session.commit()

    test_worker = Worker(
        id=worker_id,
        user_id=user_id,
        description="Master plumber with 9 years experience",
        experience_years=9.0,
        hourly_rate=350.00,
        rating=4.85,
        total_reviews=48,
        is_available=True,
        is_verified=True,
        service_radius_km=12.00,
        address_text="Indiranagar, Bengaluru",
    )
    db_session.add(test_worker)
    db_session.commit()

    # Link worker with skill
    worker_skill = WorkerSkill(
        id=uuid.uuid4(),
        worker_id=worker_id,
        skill_id=plumbing_skill.id,
        experience_years=9.0,
    )
    db_session.add(worker_skill)
    db_session.commit()

    return {
        "user_id": user_id,
        "worker_id": worker_id,
        "plumbing_skill_id": plumbing_skill.id,
        "electrical_skill_id": electrical_skill.id,
    }
