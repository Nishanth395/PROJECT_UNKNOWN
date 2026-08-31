from enum import Enum
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict


class UrgencyLevel(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"
    emergency = "emergency"


class RequestStatus(str, Enum):
    open = "open"
    matched = "matched"
    booked = "booked"
    completed = "completed"
    cancelled = "cancelled"


class ServiceRequestCreate(BaseModel):
    """
    Client request payload for creating a new service request.
    Customer identity is strictly extracted from verified JWT, never from request body.
    """
    description: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="Detailed description of the needed skilled service",
        json_schema_extra={"example": "My ceiling fan isn't working"},
    )
    latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="Service location latitude (-90 to 90)",
        json_schema_extra={"example": 12.9500},
    )
    longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="Service location longitude (-180 to 180)",
        json_schema_extra={"example": 77.6300},
    )
    urgency: UrgencyLevel = Field(
        default=UrgencyLevel.normal,
        description="Urgency classification",
        json_schema_extra={"example": "normal"},
    )
    address_text: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional human-readable address description or landmark",
        json_schema_extra={"example": "100ft Road, Indiranagar, Bengaluru"},
    )

    @field_validator("description")
    def validate_description(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 5:
            raise ValueError("Description must contain at least 5 non-whitespace characters")
        return cleaned


class ServiceRequestResponse(BaseModel):
    """Safe public representation of a service request."""
    id: UUID
    customer_id: UUID
    raw_description: str
    extracted_category: Optional[str] = None
    extracted_skills: List[str] = Field(default_factory=list)
    urgency: str
    status: str
    address_text: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServiceRequestListResponse(BaseModel):
    """Paginated list of service requests belonging to the authenticated customer."""
    total: int
    limit: int
    offset: int
    items: List[ServiceRequestResponse]
