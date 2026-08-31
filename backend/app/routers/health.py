from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.schemas.common import HealthResponse, DatabaseHealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service Health Check",
    description="Returns operational status of the Project Unknown backend service.",
)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="project-unknown-backend",
    )


@router.get(
    "/health/db",
    response_model=DatabaseHealthResponse,
    summary="Database Connectivity Health Check",
    description="Executes a live ping query against the connected PostgreSQL database to verify connectivity.",
)
def get_db_health(db: Session = Depends(get_db)) -> DatabaseHealthResponse:
    try:
        db.execute(text("SELECT 1;"))
        return DatabaseHealthResponse(
            status="ok",
            database="connected",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": "DB_UNAVAILABLE", "message": str(e)},
        )
