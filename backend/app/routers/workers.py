from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status, Path
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.worker_service import WorkerService
from app.schemas.worker import WorkerListResponse, WorkerDetail

router = APIRouter(prefix="/workers", tags=["Workers"])


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
