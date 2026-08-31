import uuid
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
)
from sqlalchemy.orm import relationship
from app.db.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    role = Column(String, nullable=False, default="customer")
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
    urgency = Column(String, default="normal", nullable=False)
    address_text = Column(String, nullable=True)
    status = Column(String, default="open", nullable=False)
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
    status = Column(String, default="pending", nullable=False)
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
