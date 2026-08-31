from enum import Enum
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class ExtractionUrgency(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"
    emergency = "emergency"


class ServiceRequirementExtraction(BaseModel):
    """
    Structured output from the AI requirement extraction engine.
    Must be validated against canonical public.skills before persistence.
    """
    category: Optional[str] = Field(
        default=None,
        description="Extracted canonical category (e.g. Plumbing, Electrical)",
        json_schema_extra={"example": "Electrical"},
    )
    skills: List[str] = Field(
        default_factory=list,
        description="List of canonical skill names matched from the problem description",
        json_schema_extra={"example": ["Switchboard Repair"]},
    )
    urgency: ExtractionUrgency = Field(
        default=ExtractionUrgency.normal,
        description="AI detected urgency classification",
        json_schema_extra={"example": "normal"},
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Model extraction confidence score (0.0 to 1.0)",
        json_schema_extra={"example": 0.92},
    )

    model_config = ConfigDict(extra="ignore")


class ExtractionResponse(BaseModel):
    """
    API response schema for POST /service-requests/{id}/extract.
    Exposes validated category, canonical skills, and extraction confidence.
    """
    request_id: UUID
    category: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    urgency: str
    confidence: float

    model_config = ConfigDict(from_attributes=True)
