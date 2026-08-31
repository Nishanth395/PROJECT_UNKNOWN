from fastapi import APIRouter
from app.schemas.common import HealthResponse

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
