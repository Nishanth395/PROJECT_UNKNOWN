from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, Path, status, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.core.security import require_customer, require_worker, get_current_user
from app.schemas.booking import (
    BookingCreate,
    BookingStatusUpdate,
    BookingResponse,
    BookingListResponse,
    BookingStatus,
)
from app.services.booking_service import BookingService

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Service Booking",
    description="Creates a new pending service booking for a target worker and customer service request.",
)
def create_booking(
    data: BookingCreate,
    current_customer: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> BookingResponse:
    return BookingService.create_booking(
        db=db,
        customer=current_customer,
        data=data,
    )


@router.get(
    "/me",
    response_model=BookingListResponse,
    summary="List User Bookings",
    description="Returns bookings relevant to the authenticated user (customers see created bookings; workers see assigned bookings).",
)
def list_my_bookings(
    limit: int = Query(20, ge=1, le=50, description="Maximum number of bookings to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    status: Optional[BookingStatus] = Query(None, description="Optional booking status filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BookingListResponse:
    status_val = status.value if status else None
    return BookingService.list_user_bookings(
        db=db,
        user=current_user,
        limit=limit,
        offset=offset,
        status_filter=status_val,
    )


@router.patch(
    "/{booking_id}/status",
    response_model=BookingResponse,
    summary="Update Booking Status (Accept / Reject / Cancel)",
    description="Allows workers to accept/reject pending bookings, or customers to cancel their pending/accepted bookings.",
)
def update_booking_status(
    booking_id: UUID = Path(..., description="Target booking UUID"),
    data: BookingStatusUpdate = ...,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BookingResponse:
    if current_user.role == "customer":
        if data.status != BookingStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error_code": "FORBIDDEN",
                    "message": "Customers can only cancel bookings.",
                },
            )
        return BookingService.cancel_booking(
            db=db,
            customer_user=current_user,
            booking_id=booking_id,
        )
    elif current_user.role == "worker":
        if data.status not in (BookingStatus.ACCEPTED, BookingStatus.REJECTED):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error_code": "FORBIDDEN",
                    "message": "Workers can only accept or reject bookings through this endpoint. Use /complete to finish jobs.",
                },
            )
        return BookingService.update_booking_status(
            db=db,
            worker_user=current_user,
            booking_id=booking_id,
            new_status=data.status,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "FORBIDDEN",
                "message": "Unauthorized role for booking status transitions.",
            },
        )


@router.patch(
    "/{booking_id}/cancel",
    response_model=BookingResponse,
    summary="Cancel Booking",
    description="Allows an authenticated customer to cancel their own pending or accepted booking.",
)
def cancel_booking(
    booking_id: UUID = Path(..., description="Target booking UUID"),
    current_customer: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> BookingResponse:
    return BookingService.cancel_booking(
        db=db,
        customer_user=current_customer,
        booking_id=booking_id,
    )


@router.patch(
    "/{booking_id}/complete",
    response_model=BookingResponse,
    summary="Complete Booking",
    description="Allows an assigned worker to mark an accepted booking as completed, synchronizing the service request.",
)
def complete_booking(
    booking_id: UUID = Path(..., description="Target booking UUID"),
    current_worker: User = Depends(require_worker),
    db: Session = Depends(get_db),
) -> BookingResponse:
    return BookingService.complete_booking(
        db=db,
        worker_user=current_worker,
        booking_id=booking_id,
    )
