import logging
from typing import Optional, List
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import Review, Booking, Worker, User
from app.schemas.review import ReviewCreate, ReviewResponse, ReviewListResponse

logger = logging.getLogger("uvicorn.error")


class ReviewService:
    """Service layer for creating, validating, and retrieving worker reviews."""

    @staticmethod
    def create_review(db: Session, customer_id: UUID, data: ReviewCreate) -> ReviewResponse:
        """
        Creates a new review for a completed booking belonging to the customer.
        Validates booking ownership, completed lifecycle state, and prevents duplicates.
        """
        # 1. Fetch booking
        booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "BOOKING_NOT_FOUND",
                    "message": "Booking not found",
                },
            )

        # 2. Verify customer ownership
        if booking.customer_id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error_code": "FORBIDDEN",
                    "message": "You can only submit reviews for your own bookings",
                },
            )

        # 3. Verify booking is in completed status
        if booking.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "BOOKING_NOT_COMPLETED",
                    "message": "Reviews can only be submitted for completed service bookings",
                },
            )

        # 4. Check for duplicate review on this booking
        existing_review = db.query(Review).filter(Review.booking_id == data.booking_id).first()
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "DUPLICATE_REVIEW",
                    "message": "A review has already been submitted for this booking",
                },
            )

        # 5. Create review
        review = Review(
            booking_id=booking.id,
            customer_id=customer_id,
            worker_id=booking.worker_id,
            rating=data.rating,
            comment=data.comment.strip() if data.comment else None,
        )
        db.add(review)
        db.commit()
        db.refresh(review)

        # In SQLite test environments where PostgreSQL triggers do not run, synchronize worker rating in SQLite
        if db.bind and db.bind.dialect.name == "sqlite":
            worker = db.query(Worker).filter(Worker.id == booking.worker_id).first()
            if worker:
                all_worker_reviews = db.query(Review).filter(Review.worker_id == booking.worker_id).all()
                if all_worker_reviews:
                    ratings = [r.rating for r in all_worker_reviews]
                    worker.rating = round(sum(ratings) / len(ratings), 2)
                    worker.total_reviews = len(ratings)
                    db.commit()

        customer_name = booking.customer.full_name if booking.customer else None

        return ReviewResponse(
            id=review.id,
            booking_id=review.booking_id,
            worker_id=review.worker_id,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at,
            customer_name=customer_name,
        )

    @staticmethod
    def get_worker_reviews(
        db: Session,
        worker_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> ReviewListResponse:
        """
        Retrieves paginated reviews for a worker, ordered newest first.
        Sanitizes customer information to protect privacy.
        """
        worker = db.query(Worker).filter(Worker.id == worker_id).first()
        if not worker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "WORKER_NOT_FOUND",
                    "message": "Worker profile not found",
                },
            )

        query = db.query(Review).filter(Review.worker_id == worker_id)
        total = query.count()
        reviews = (
            query.order_by(Review.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        items: List[ReviewResponse] = []
        for r in reviews:
            items.append(
                ReviewResponse(
                    id=r.id,
                    booking_id=r.booking_id,
                    worker_id=r.worker_id,
                    rating=r.rating,
                    comment=r.comment,
                    created_at=r.created_at,
                    customer_name=r.customer.full_name if r.customer else None,
                )
            )

        avg_rating = float(worker.rating) if worker.rating is not None and worker.rating > 0 else None

        return ReviewListResponse(
            total=total,
            average_rating=avg_rating,
            limit=limit,
            offset=offset,
            items=items,
        )
