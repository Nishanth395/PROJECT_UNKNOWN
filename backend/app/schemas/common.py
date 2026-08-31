from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", json_schema_extra={"example": "ok"})
    service: str = Field(default="project-unknown-backend", json_schema_extra={"example": "project-unknown-backend"})


class ErrorDetail(BaseModel):
    error_code: str
    message: str


class ErrorResponse(BaseModel):
    detail: ErrorDetail
