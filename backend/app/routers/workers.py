from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status, Path
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.core.security import require_worker
from app.services.worker_service import WorkerService
from app.services.worker_feed_service import WorkerFeedService
from app.schemas.worker_feed import WorkerFeedResponse
from app.schemas.worker import (
    WorkerListResponse,
    WorkerDetail,
    WorkerProfileCreate,
    WorkerProfileUpdate,
    WorkerProfileResponse,
    WorkerSkillsUpdateRequest,
    WorkerSkillsResponse,
)

router = APIRouter(prefix="/workers", tags=["Workers"])


# ==============================================================================
# Authenticated Worker Profile Endpoints (/workers/me)
# Declared BEFORE /{worker_id} to prevent path conflict with UUID routing.
# ==============================================================================

@router.get(
    "/me",
    response_model=WorkerProfileResponse,
    summary="Get Authenticated Worker Profile",
    description="Retrieves the full profile, base location coordinates, rating, and assigned skills of the authenticated worker.",
)
def get_my_worker_profile(
    current_worker: User = Depends(require_worker),
    db: Session = Depends(get_db),
) -> WorkerProfileResponse:
    profile = WorkerService.get_worker_by_user_id(db=db, user_id=current_worker.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "WORKER_PROFILE_NOT_FOUND",
                "message": "Worker profile does not exist for this account. Please complete onboarding.",
            },
        )
    return profile


@router.post(
    "/me",
    response_model=WorkerProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Worker Profile (Onboarding)",
    description="Creates a new worker profile record for an authenticated user with role='worker'.",
)
def create_my_worker_profile(
    data: WorkerProfileCreate,
    current_worker: User = Depends(require_worker),
    db: Session = Depends(get_db),
) -> WorkerProfileResponse:
    return WorkerService.create_worker_profile(db=db, user=current_worker, data=data)


@router.patch(
    "/me",
    response_model=WorkerProfileResponse,
    summary="Update Worker Profile",
    description="Updates editable worker profile fields: bio, experience, service radius, location, and availability.",
)
def update_my_worker_profile(
    data: WorkerProfileUpdate,
    current_worker: User = Depends(require_worker),
    db: Session = Depends(get_db),
) -> WorkerProfileResponse:
    return WorkerService.update_worker_profile(db=db, user=current_worker, data=data)


@router.get(
    "/me/skills",
    response_model=WorkerSkillsResponse,
    summary="Get Assigned Worker Skills",
    description="Retrieves the canonical skills and specific years of experience for the authenticated worker.",
)
def get_my_worker_skills(
    current_worker: User = Depends(require_worker),
    db: Session = Depends(get_db),
) -> WorkerSkillsResponse:
    return WorkerService.get_worker_skills(db=db, user=current_worker)


@router.put(
    "/me/skills",
    response_model=WorkerSkillsResponse,
    summary="Update Worker Canonical Skills",
    description="Updates the set of canonical skills and domain experience for the authenticated worker.",
)
def update_my_worker_skills(
    data: WorkerSkillsUpdateRequest,
    current_worker: User = Depends(require_worker),
    db: Session = Depends(get_db),
) -> WorkerSkillsResponse:
    return WorkerService.update_worker_skills(db=db, user=current_worker, data=data)


@router.get(
    "/me/feed",
    response_model=WorkerFeedResponse,
    summary="Get Worker Service Request Feed",
    description="Retrieves nearby active service requests matching the worker's skills, category, and operating service radius.",
)
def get_my_worker_feed(
    limit: int = Query(20, ge=1, le=50, description="Maximum number of requests to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    current_worker: User = Depends(require_worker),
    db: Session = Depends(get_db),
) -> WorkerFeedResponse:
    return WorkerFeedService.get_worker_feed(
        db=db,
        user=current_worker,
        limit=limit,
        offset=offset,
    )


# ==============================================================================
# Public / Discovery Worker Endpoints
# ==============================================================================

@router.get(
    "",
    response_model=WorkerListResponse,
    summary="List & Filter Service Workers",
    description="Retrieves a paginated list of workers with optional filtering by domain category or specific skill.",
)
def list_workers(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of workers to return"),
    offset: int = Query(0, ge=0, description="Number of workers to skip for pagination"),
    category: Optional[str] = Query(None, description="Filter workers by category (e.g. Plumbing, Electrical)"),
    skill: Optional[str] = Query(None, description="Filter workers by specific skill name"),
    db: Session = Depends(get_db),
) -> WorkerListResponse:
    return WorkerService.get_workers(
        db=db,
        limit=limit,
        offset=offset,
        category=category,
        skill=skill,
    )


@router.get(
    "/{worker_id}",
    response_model=WorkerDetail,
    summary="Get Worker Profile Details",
    description="Retrieves the detailed public profile, skills, and ratings of a specific worker by UUID.",
)
def get_worker(
    worker_id: UUID = Path(..., description="Unique UUID identifier of the worker"),
    db: Session = Depends(get_db),
) -> WorkerDetail:
    worker = WorkerService.get_worker_by_id(db=db, worker_id=worker_id)
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Worker with ID '{worker_id}' not found",
        )
    return worker
