from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class WorkerFeedItem(BaseModel):
    request_id: UUID
    description: str
    category: Optional[str] = None
    matched_skills: List[str] = Field(default_factory=list, description="Canonical skills required that worker possesses")
    urgency: str
    distance_km: float
    created_at: datetime
    status: str
    address_text: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WorkerFeedResponse(BaseModel):
    total_requests: int
    limit: int
    offset: int
    requests: List[WorkerFeedItem]
