from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import require_customer
from app.db.database import get_db
from app.db.models import User
from app.schemas.review import ReviewCreate, ReviewResponse, ReviewListResponse
from app.services.review_service import ReviewService

router = APIRouter(tags=["Reviews"])


@router.post(
    "/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Review for Completed Booking",
    description="Allows a customer to submit a star rating and comment for their completed service booking.",
)
def create_review(
    data: ReviewCreate,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> ReviewResponse:
    return ReviewService.create_review(
        db=db,
        customer_id=current_user.id,
        data=data,
    )


@router.get(
    "/reviews/worker/{worker_id}",
    response_model=ReviewListResponse,
    summary="Get Worker Reviews",
    description="Retrieves a paginated list of reviews and average rating for a specified worker.",
)
def get_worker_reviews(
    worker_id: UUID,
    limit: int = Query(20, ge=1, le=100, description="Max reviews to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
) -> ReviewListResponse:
    return ReviewService.get_worker_reviews(
        db=db,
        worker_id=worker_id,
        limit=limit,
        offset=offset,
    )
