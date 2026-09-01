from enum import Enum
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class BookingStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class BookingCreate(BaseModel):
    worker_id: UUID = Field(..., description="Target worker UUID")
    service_request_id: UUID = Field(..., description="Service request UUID to book")
    scheduled_time: Optional[datetime] = Field(None, description="Optional scheduled engagement timestamp")
    notes: Optional[str] = Field(None, max_length=1000, description="Optional customer booking notes")


class BookingStatusUpdate(BaseModel):
    status: BookingStatus = Field(..., description="Target status ('accepted' or 'rejected')")


class BookingResponse(BaseModel):
    booking_id: UUID
    customer_id: UUID
    worker_id: UUID
    service_request_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    worker_name: Optional[str] = None
    worker_rating: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    urgency: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    status: BookingStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BookingListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[BookingResponse]
