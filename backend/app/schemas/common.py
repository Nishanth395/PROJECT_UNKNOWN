from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", json_schema_extra={"example": "ok"})
    service: str = Field(default="project-unknown-backend", json_schema_extra={"example": "project-unknown-backend"})


class DatabaseHealthResponse(BaseModel):
    status: str = Field(default="ok", json_schema_extra={"example": "ok"})
    database: str = Field(default="connected", json_schema_extra={"example": "connected"})


class ErrorDetail(BaseModel):
    error_code: str
    message: str


class ErrorResponse(BaseModel):
    detail: ErrorDetail
