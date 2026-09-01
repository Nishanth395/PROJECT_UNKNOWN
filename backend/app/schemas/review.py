from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ReviewCreate(BaseModel):
    booking_id: UUID = Field(..., description="Target completed booking UUID")
    rating: int = Field(..., ge=1, le=5, description="Integer star rating strictly between 1 and 5")
    comment: Optional[str] = Field(None, max_length=1000, description="Optional review comment text (max 1000 chars)")


class ReviewResponse(BaseModel):
    id: UUID
    booking_id: UUID
    worker_id: UUID
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    customer_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReviewListResponse(BaseModel):
    total: int
    average_rating: Optional[float] = None
    limit: int
    offset: int
    items: List[ReviewResponse]
