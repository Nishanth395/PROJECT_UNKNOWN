from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.routers import health, skills, workers, auth, service_requests

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Project Unknown - AI-assisted Hyperlocal Skilled Services Marketplace",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handlers for standard error responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "detail": exc.detail,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "validation_error",
            "detail": exc.errors(),
        },
    )


# Register Routers (Both top-level and versioned under /api/v1)
app.include_router(health.router)
app.include_router(health.router, prefix=settings.API_V1_PREFIX)

app.include_router(skills.router)
app.include_router(skills.router, prefix=settings.API_V1_PREFIX)

app.include_router(workers.router)
app.include_router(workers.router, prefix=settings.API_V1_PREFIX)

app.include_router(auth.router)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)

app.include_router(service_requests.router)
app.include_router(service_requests.router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
def root_redirect():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
        "health": "/health",
    }
