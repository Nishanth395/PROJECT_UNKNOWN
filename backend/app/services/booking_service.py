from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, cast
from geoalchemy2 import Geography

from app.db.models import Booking, Worker, User, ServiceRequest, Skill, WorkerSkill
from app.schemas.booking import (
    BookingCreate,
    BookingResponse,
    BookingListResponse,
    BookingStatus,
)
from app.services.service_request_service import extract_coordinates
from app.services.matching_service import haversine_distance_km


def _format_booking_response(booking: Booking) -> BookingResponse:
    """Formats an ORM Booking instance into a clean BookingResponse Pydantic schema."""
    sr = booking.service_request
    customer_user = booking.customer
    worker_obj = booking.worker
    worker_user = worker_obj.user if worker_obj else None

    return BookingResponse(
        booking_id=booking.id,
        customer_id=booking.customer_id,
        worker_id=booking.worker_id,
        service_request_id=booking.service_request_id,
        customer_name=customer_user.full_name if customer_user else "Customer",
        worker_name=worker_user.full_name if worker_user else "Worker",
        worker_rating=float(worker_obj.rating) if worker_obj and worker_obj.rating is not None else 0.0,
        description=sr.raw_description if sr else None,
        category=sr.extracted_category if sr else None,
        urgency=sr.urgency if sr else None,
        scheduled_time=booking.scheduled_time,
        status=BookingStatus(booking.status),
        notes=booking.notes,
        created_at=booking.created_at,
        updated_at=booking.updated_at,
    )


class BookingService:
    """Service handling booking creation, listing, and state lifecycle transitions."""

    @staticmethod
    def create_booking(
        db: Session,
        customer: User,
        data: BookingCreate,
    ) -> BookingResponse:
        """
        Creates a new service booking between an authenticated customer and a target worker.
        Validates ownership, worker eligibility, spatial radius, and prevents duplicate active bookings.
        """
        # 1. Validate service request exists and belongs strictly to the authenticated customer
        sr = (
            db.query(ServiceRequest)
            .filter(
                ServiceRequest.id == data.service_request_id,
                ServiceRequest.customer_id == customer.id,
            )
            .first()
        )
        if not sr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "REQUEST_NOT_FOUND",
                    "message": "Service request not found or not owned by you.",
                },
            )

        # 2. Check service request eligibility
        if sr.status not in ("open", "matched"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "REQUEST_NOT_ELIGIBLE",
                    "message": f"Service request is currently '{sr.status}' and cannot be booked.",
                },
            )

        # 3. Validate worker exists
        worker = (
            db.query(Worker)
            .options(joinedload(Worker.user), joinedload(Worker.worker_skills).joinedload(WorkerSkill.skill))
            .filter(Worker.id == data.worker_id)
            .first()
        )
        if not worker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "WORKER_NOT_FOUND",
                    "message": "Target worker profile does not exist.",
                },
            )

        # 4. Check worker availability
        if not worker.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "WORKER_UNAVAILABLE",
                    "message": "Worker is currently unavailable for bookings.",
                },
            )

        # 5. Check worker skill & category match
        worker_skill_names = {ws.skill.name for ws in worker.worker_skills if ws.skill}
        worker_categories = {ws.skill.category for ws in worker.worker_skills if ws.skill}

        if sr.extracted_category and sr.extracted_category not in worker_categories:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "SKILL_MISMATCH",
                    "message": f"Worker does not service the category '{sr.extracted_category}'.",
                },
            )

        extracted_skills = sr.extracted_skills or []
        if extracted_skills and not any(s in worker_skill_names for s in extracted_skills):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "SKILL_MISMATCH",
                    "message": "Worker does not have the required skills for this request.",
                },
            )

        # 6. Check spatial radius distance
        req_lat, req_lon = extract_coordinates(sr.location)
        w_lat, w_lon = extract_coordinates(worker.location)

        if req_lat is not None and req_lon is not None and w_lat is not None and w_lon is not None:
            dist_km = haversine_distance_km(req_lat, req_lon, w_lat, w_lon)
            if dist_km > float(worker.service_radius_km):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error_code": "OUT_OF_SERVICE_RADIUS",
                        "message": f"Service request is {dist_km:.1f} km away, exceeding worker's {worker.service_radius_km} km radius.",
                    },
                )

        # 7. Prevent duplicate pending/accepted booking for this service_request + worker
        existing_booking = (
            db.query(Booking)
            .filter(
                Booking.service_request_id == sr.id,
                Booking.worker_id == worker.id,
                Booking.status.in_(["pending", "accepted"]),
            )
            .first()
        )
        if existing_booking:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "DUPLICATE_BOOKING",
                    "message": "An active booking already exists for this worker and service request.",
                },
            )

        # 8. Check if service request is already accepted by another booking
        accepted_booking = (
            db.query(Booking)
            .filter(
                Booking.service_request_id == sr.id,
                Booking.status == "accepted",
            )
            .first()
        )
        if accepted_booking:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "REQUEST_ALREADY_BOOKED",
                    "message": "This service request has already been accepted by another worker.",
                },
            )

        # 9. Create booking with status='pending'
        scheduled_time = data.scheduled_time or datetime.now(timezone.utc)
        booking = Booking(
            customer_id=customer.id,
            worker_id=worker.id,
            service_request_id=sr.id,
            scheduled_time=scheduled_time,
            status="pending",
            notes=data.notes,
        )

        db.add(booking)
        db.commit()
        db.refresh(booking)

        return _format_booking_response(booking)

    @staticmethod
    def list_user_bookings(
        db: Session,
        user: User,
        limit: int = 20,
        offset: int = 0,
        status_filter: Optional[str] = None,
    ) -> BookingListResponse:
        """
        Lists bookings for the authenticated user.
        Customers see bookings where customer_id == user.id.
        Workers see bookings where worker.user_id == user.id.
        """
        bounded_limit = max(1, min(50, limit))
        bounded_offset = max(0, offset)

        query = (
            db.query(Booking)
            .options(
                joinedload(Booking.customer),
                joinedload(Booking.worker).joinedload(Worker.user),
                joinedload(Booking.service_request),
            )
        )

        if user.role == "worker":
            worker = db.query(Worker).filter(Worker.user_id == user.id).first()
            if not worker:
                return BookingListResponse(total=0, limit=bounded_limit, offset=bounded_offset, items=[])
            query = query.filter(Booking.worker_id == worker.id)
        else:
            query = query.filter(Booking.customer_id == user.id)

        if status_filter:
            query = query.filter(Booking.status == status_filter)

        total = query.count()
        bookings = query.order_by(Booking.created_at.desc(), Booking.id.asc()).offset(bounded_offset).limit(bounded_limit).all()

        items = [_format_booking_response(b) for b in bookings]
        return BookingListResponse(
            total=total,
            limit=bounded_limit,
            offset=bounded_offset,
            items=items,
        )

    @staticmethod
    def update_booking_status(
        db: Session,
        worker_user: User,
        booking_id: UUID,
        new_status: BookingStatus,
    ) -> BookingResponse:
        """
        Allows a worker to accept or reject an incoming pending booking.
        Enforces atomic state transitions and updates related ServiceRequest to 'booked' upon acceptance.
        """
        # 1. Retrieve worker profile
        worker = db.query(Worker).filter(Worker.user_id == worker_user.id).first()
        if not worker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "WORKER_PROFILE_NOT_FOUND",
                    "message": "Worker profile does not exist.",
                },
            )

        # 2. Retrieve booking belonging strictly to this worker
        booking = (
            db.query(Booking)
            .options(
                joinedload(Booking.customer),
                joinedload(Booking.worker).joinedload(Worker.user),
                joinedload(Booking.service_request),
            )
            .filter(
                Booking.id == booking_id,
                Booking.worker_id == worker.id,
            )
            .first()
        )

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "BOOKING_NOT_FOUND",
                    "message": "Booking not found or not assigned to you.",
                },
            )

        # 3. Validate state transitions: Only 'pending' -> 'accepted' or 'pending' -> 'rejected'
        if booking.status != "pending" or new_status not in (BookingStatus.ACCEPTED, BookingStatus.REJECTED):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "INVALID_STATE_TRANSITION",
                    "message": f"Cannot transition booking from '{booking.status}' to '{new_status.value}'.",
                },
            )

        # 4. If accepting, check for race conditions and update service request
        if new_status == BookingStatus.ACCEPTED:
            if booking.service_request_id:
                # Check if another booking for the same service request has already been accepted
                already_accepted = (
                    db.query(Booking)
                    .filter(
                        Booking.service_request_id == booking.service_request_id,
                        Booking.status == "accepted",
                        Booking.id != booking.id,
                    )
                    .first()
                )
                if already_accepted:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail={
                            "error_code": "REQUEST_ALREADY_BOOKED",
                            "message": "This service request has already been accepted by another worker.",
                        },
                    )

                # Update ServiceRequest status to 'booked' atomically
                sr = db.query(ServiceRequest).filter(ServiceRequest.id == booking.service_request_id).first()
                if sr:
                    if sr.status == "booked":
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail={
                                "error_code": "REQUEST_ALREADY_BOOKED",
                                "message": "Service request is already marked as booked.",
                            },
                        )
                    sr.status = "booked"

            booking.status = "accepted"

        elif new_status == BookingStatus.REJECTED:
            booking.status = "rejected"

        db.commit()
        db.refresh(booking)

        return _format_booking_response(booking)
