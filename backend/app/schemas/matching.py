from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class MatchedWorkerItem(BaseModel):
    """Structured representation of a matched worker candidate."""
    worker_id: UUID
    name: str
    category: str
    matched_skills: List[str] = Field(default_factory=list)
    distance_km: float
    rating: float = 0.0
    total_reviews: int = 0
    experience_years: float = 0.0
    is_verified: bool = False
    is_available: bool = True
    match_score: float

    model_config = ConfigDict(from_attributes=True)


class WorkerMatchResponse(BaseModel):
    """Response schema for GET /service-requests/{id}/matches."""
    request_id: UUID
    total_matches: int
    matches: List[MatchedWorkerItem] = Field(default_factory=list)
