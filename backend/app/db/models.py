import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Numeric,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Uuid,
    TypeDecorator,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import ARRAY
from geoalchemy2 import Geography
from sqlalchemy.orm import relationship
from app.db.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class PointGeographyType(TypeDecorator):
    """
    Cross-database Geography Point type:
    Uses native PostGIS Geography(POINT, 4326) on PostgreSQL,
    and falls back gracefully to Text for in-memory SQLite test suites.
    """
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(Geography(geometry_type="POINT", srid=4326, spatial_index=False))
        return dialect.type_descriptor(Text)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        from geoalchemy2.elements import WKTElement, WKBElement
        if dialect.name == "postgresql":
            if isinstance(value, WKTElement):
                return value
            if isinstance(value, str):
                return WKTElement(value, srid=4326)
            return value
        if isinstance(value, WKTElement):
            return str(value.data)
        if isinstance(value, WKBElement):
            return str(value)
        return str(value)

    def process_result_value(self, value, dialect):
        return value


class TextArrayType(TypeDecorator):
    """
    Cross-database Text Array type:
    Uses native PostgreSQL ARRAY(Text) on PostgreSQL,
    and JSON serialization fallback for SQLite test suites.
    """
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(ARRAY(String))
        return dialect.type_descriptor(Text)

    def process_bind_param(self, value, dialect):
        if value is None:
            return []
        if dialect.name == "postgresql":
            return value
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return []
        if dialect.name == "postgresql":
            return value
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return [value]
        return list(value)


# ------------------------------------------------------------------------------
# Models
# ------------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    role = Column(
        SAEnum("customer", "worker", name="user_role", native_enum=True, create_type=False),
        nullable=False,
        default="customer",
    )
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    worker_profile = relationship("Worker", back_populates="user", uselist=False, cascade="all, delete-orphan")
    service_requests = relationship("ServiceRequest", back_populates="customer", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="customer", foreign_keys="Booking.customer_id")
    reviews = relationship("Review", back_populates="customer", cascade="all, delete-orphan")


class Worker(Base):
    __tablename__ = "workers"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    experience_years = Column(Numeric(4, 1), default=0.0, nullable=False)
    hourly_rate = Column(Numeric(10, 2), nullable=True)
    rating = Column(Numeric(3, 2), default=0.00, nullable=False)
    total_reviews = Column(Integer, default=0, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    service_radius_km = Column(Numeric(5, 2), default=15.00, nullable=False)
    location = Column(PointGeographyType, nullable=True)
    address_text = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="worker_profile")
    worker_skills = relationship("WorkerSkill", back_populates="worker", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="worker", foreign_keys="Booking.worker_id")
    reviews = relationship("Review", back_populates="worker", cascade="all, delete-orphan")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    # Relationships
    worker_skills = relationship("WorkerSkill", back_populates="skill", cascade="all, delete-orphan")


class WorkerSkill(Base):
    __tablename__ = "worker_skills"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    worker_id = Column(Uuid, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Uuid, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    experience_years = Column(Numeric(4, 1), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    __table_args__ = (UniqueConstraint("worker_id", "skill_id", name="uq_worker_skill"),)

    # Relationships
    worker = relationship("Worker", back_populates="worker_skills")
    skill = relationship("Skill", back_populates="worker_skills")


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    customer_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    raw_description = Column(Text, nullable=False)
    extracted_category = Column(String, nullable=True)
    extracted_skills = Column(TextArrayType, default=list)
    urgency = Column(
        SAEnum("low", "normal", "high", "emergency", name="urgency_level", native_enum=True, create_type=False),
        default="normal",
        nullable=False,
    )
    location = Column(PointGeographyType, nullable=True)
    address_text = Column(String, nullable=True)
    status = Column(
        SAEnum("open", "matched", "booked", "completed", "cancelled", name="request_status", native_enum=True, create_type=False),
        default="open",
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    customer = relationship("User", back_populates="service_requests")
    booking = relationship("Booking", back_populates="service_request", uselist=False)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    customer_id = Column(Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    worker_id = Column(Uuid, ForeignKey("workers.id", ondelete="RESTRICT"), nullable=False)
    service_request_id = Column(Uuid, ForeignKey("service_requests.id", ondelete="SET NULL"), nullable=True)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        SAEnum("pending", "accepted", "rejected", "cancelled", "completed", name="booking_status", native_enum=True, create_type=False),
        default="pending",
        nullable=False,
    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    customer = relationship("User", back_populates="bookings", foreign_keys=[customer_id])
    worker = relationship("Worker", back_populates="bookings", foreign_keys=[worker_id])
    service_request = relationship("ServiceRequest", back_populates="booking")
    review = relationship("Review", back_populates="booking", uselist=False, cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    booking_id = Column(Uuid, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    customer_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    worker_id = Column(Uuid, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    # Relationships
    booking = relationship("Booking", back_populates="review")
    customer = relationship("User", back_populates="reviews")
    worker = relationship("Worker", back_populates="reviews")
