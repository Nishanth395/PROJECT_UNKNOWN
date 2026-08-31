from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class WorkerSkillItem(BaseModel):
    skill_id: UUID
    skill_name: str
    category: str
    experience_years: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class WorkerSummary(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    description: Optional[str] = None
    experience_years: float = 0.0
    hourly_rate: Optional[float] = None
    rating: float = 0.0
    total_reviews: int = 0
    is_available: bool = True
    is_verified: bool = False
    service_radius_km: float = 15.0
    address_text: Optional[str] = None
    skills: List[WorkerSkillItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class WorkerDetail(WorkerSummary):
    email: Optional[str] = None


class WorkerListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[WorkerSummary]
