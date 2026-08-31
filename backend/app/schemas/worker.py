from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class WorkerSkillItem(BaseModel):
    skill_id: UUID
    skill_name: str
    category: str
    experience_years: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class WorkerSkillUpdateEntry(BaseModel):
    skill_id: UUID
    experience_years: Optional[float] = Field(None, ge=0.0, description="Years of experience for this specific skill")


class WorkerSkillsUpdateRequest(BaseModel):
    skills: List[WorkerSkillUpdateEntry] = Field(default_factory=list, description="List of canonical skills to assign to the worker")


class WorkerSkillsResponse(BaseModel):
    worker_id: UUID
    skills: List[WorkerSkillItem]


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


class WorkerProfileCreate(BaseModel):
    bio: Optional[str] = Field(None, description="Worker professional bio / description")
    experience_years: float = Field(0.0, ge=0.0, description="Total years of professional experience")
    service_radius_km: float = Field(15.0, gt=0.0, description="Operating service radius in kilometers")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Worker base latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Worker base longitude")
    is_available: bool = Field(True, description="Whether worker is available for matching")
    address_text: Optional[str] = Field(None, description="Base address or neighborhood landmark")


class WorkerProfileUpdate(BaseModel):
    bio: Optional[str] = Field(None, description="Worker professional bio / description")
    experience_years: Optional[float] = Field(None, ge=0.0, description="Total years of professional experience")
    service_radius_km: Optional[float] = Field(None, gt=0.0, description="Operating service radius in kilometers")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Worker base latitude")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Worker base longitude")
    is_available: Optional[bool] = Field(None, description="Whether worker is available for matching")
    address_text: Optional[str] = Field(None, description="Base address or neighborhood landmark")


class WorkerProfileResponse(BaseModel):
    worker_id: UUID
    user_id: UUID
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    experience_years: float = 0.0
    service_radius_km: float = 15.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_available: bool = True
    is_verified: bool = False
    rating: float = 0.0
    total_reviews: int = 0
    address_text: Optional[str] = None
    skills: List[WorkerSkillItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
