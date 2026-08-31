from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import require_customer
from app.db.database import get_db
from app.db.models import User
from app.schemas.service_request import (
    ServiceRequestCreate,
    ServiceRequestResponse,
    ServiceRequestListResponse,
    RequestStatus,
)
from app.schemas.ai import ExtractionResponse
from app.services.service_request_service import ServiceRequestService
from app.ai.service import AIExtractionService

router = APIRouter(prefix="/service-requests", tags=["Service Requests"])


@router.post(
    "",
    response_model=ServiceRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Service Request",
    description="Submits a new service request for the authenticated customer with description and coordinates.",
)
def create_service_request(
    payload: ServiceRequestCreate,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> ServiceRequestResponse:
    """
    Creates a new service request record.
    Customer identity is strictly derived from the verified JWT, never from request body.
    """
    return ServiceRequestService.create_request(
        db=db,
        customer_id=current_user.id,
        data=payload,
    )


@router.get(
    "",
    response_model=ServiceRequestListResponse,
    summary="List Customer Service Requests",
    description="Returns a paginated list of service requests belonging strictly to the authenticated customer.",
)
def list_service_requests(
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    status: Optional[RequestStatus] = Query(default=None, description="Filter by request status"),
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> ServiceRequestListResponse:
    """
    Lists all service requests created by the authenticated customer.
    Query is scoped to current_user.id.
    """
    status_val = status.value if status else None
    items, total = ServiceRequestService.get_customer_requests(
        db=db,
        customer_id=current_user.id,
        limit=limit,
        offset=offset,
        status_filter=status_val,
    )
    return ServiceRequestListResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=items,
    )


@router.get(
    "/{request_id}",
    response_model=ServiceRequestResponse,
    summary="Get Service Request Details",
    description="Retrieves a single service request by ID. Only accessible if created by the authenticated customer.",
)
def get_service_request(
    request_id: UUID,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> ServiceRequestResponse:
    """
    Retrieves a service request by ID.
    Returns 404 if the request does not exist or belongs to another customer.
    """
    record = ServiceRequestService.get_customer_request_by_id(
        db=db,
        request_id=request_id,
        customer_id=current_user.id,
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "REQUEST_NOT_FOUND",
                "message": "Service request not found",
            },
        )
    return record


@router.post(
    "/{request_id}/extract",
    response_model=ExtractionResponse,
    summary="Extract Service Requirements via AI",
    description="Analyzes the natural language description of a service request and extracts canonical category and skills.",
)
async def extract_service_request_requirements(
    request_id: UUID,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> ExtractionResponse:
    """
    Executes AI requirements extraction for a customer's service request.
    Validates output against public.skills and updates the database record.
    """
    return await AIExtractionService.extract_and_update_request(
        db=db,
        request_id=request_id,
        customer_id=current_user.id,
    )
