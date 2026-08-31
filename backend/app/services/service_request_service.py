import struct
import re
import uuid
from typing import Optional, List, Tuple
from uuid import UUID
from geoalchemy2.elements import WKBElement, WKTElement
from sqlalchemy.orm import Session

from app.db.models import ServiceRequest
from app.schemas.service_request import ServiceRequestCreate, ServiceRequestResponse


def extract_coordinates(location_val) -> Tuple[Optional[float], Optional[float]]:
    """
    Safely extracts (latitude, longitude) from various PostGIS/SQLite location representations.
    Returns (latitude, longitude).
    """
    if location_val is None:
        return None, None

    # Case 1: GeoAlchemy2 WKBElement (PostgreSQL PostGIS)
    if isinstance(location_val, WKBElement):
        try:
            data = location_val.data
            if isinstance(data, memoryview):
                wkb = bytes(data)
            elif isinstance(data, str):
                wkb = bytes.fromhex(data)
            elif isinstance(data, bytes):
                wkb = data
            else:
                wkb = bytes(data)

            byte_order = "<" if wkb[0] == 1 else ">"
            geom_type, = struct.unpack(byte_order + "I", wkb[1:5])
            offset = 5
            if geom_type & 0x20000000:  # EWKB contains SRID
                offset += 4
            lon, lat = struct.unpack(byte_order + "dd", wkb[offset:offset + 16])
            return round(lat, 6), round(lon, 6)
        except Exception:
            return None, None

    # Case 2: WKTElement
    if isinstance(location_val, WKTElement):
        location_val = str(location_val.data)

    # Case 3: WKT String representation e.g. "POINT(lon lat)" or "SRID=4326;POINT(lon lat)"
    if isinstance(location_val, str):
        match = re.search(r"POINT\s*\(\s*([-\d\.]+)\s+([-\d\.]+)\s*\)", location_val, re.IGNORECASE)
        if match:
            try:
                lon = float(match.group(1))
                lat = float(match.group(2))
                return round(lat, 6), round(lon, 6)
            except (ValueError, TypeError):
                return None, None

    return None, None


class ServiceRequestService:
    """Service layer for creating, querying, and managing service requests."""

    @staticmethod
    def to_response_dto(sr: ServiceRequest) -> ServiceRequestResponse:
        """Converts a ServiceRequest database entity to a safe API response schema."""
        lat, lon = extract_coordinates(sr.location)
        return ServiceRequestResponse(
            id=sr.id,
            customer_id=sr.customer_id,
            raw_description=sr.raw_description,
            extracted_category=sr.extracted_category,
            extracted_skills=sr.extracted_skills or [],
            urgency=sr.urgency,
            status=sr.status,
            address_text=sr.address_text,
            latitude=lat,
            longitude=lon,
            created_at=sr.created_at,
            updated_at=sr.updated_at,
        )

    @staticmethod
    def create_request(
        db: Session,
        customer_id: UUID | str,
        data: ServiceRequestCreate,
    ) -> ServiceRequestResponse:
        """
        Creates a new service request record bound to the authenticated customer.
        Location is converted and stored as PostGIS geography(Point, 4326).
        """
        if isinstance(customer_id, str):
            customer_id = UUID(customer_id)

        point_wkt = WKTElement(f"POINT({data.longitude} {data.latitude})", srid=4326)

        new_request = ServiceRequest(
            id=uuid.uuid4(),
            customer_id=customer_id,
            raw_description=data.description,
            extracted_category=None,
            extracted_skills=[],
            urgency=data.urgency.value,
            location=point_wkt,
            address_text=data.address_text,
            status="open",
        )

        db.add(new_request)
        db.commit()
        db.refresh(new_request)

        return ServiceRequestService.to_response_dto(new_request)

    @staticmethod
    def get_customer_requests(
        db: Session,
        customer_id: UUID | str,
        limit: int = 20,
        offset: int = 0,
        status_filter: Optional[str] = None,
    ) -> Tuple[List[ServiceRequestResponse], int]:
        """
        Retrieves a paginated list of service requests belonging strictly to the authenticated customer.
        Never allows querying across customer boundaries.
        """
        if isinstance(customer_id, str):
            customer_id = UUID(customer_id)

        query = db.query(ServiceRequest).filter(ServiceRequest.customer_id == customer_id)

        if status_filter:
            query = query.filter(ServiceRequest.status == status_filter)

        total = query.count()
        records = (
            query.order_by(ServiceRequest.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        dtos = [ServiceRequestService.to_response_dto(r) for r in records]
        return dtos, total

    @staticmethod
    def get_customer_request_by_id(
        db: Session,
        request_id: UUID | str,
        customer_id: UUID | str,
    ) -> Optional[ServiceRequestResponse]:
        """
        Retrieves a single service request ensuring it belongs to the authenticated customer.
        Returns None if not found or if belonging to a different customer (preventing existence leak).
        """
        if isinstance(request_id, str):
            try:
                request_id = UUID(request_id)
            except (ValueError, TypeError):
                return None

        if isinstance(customer_id, str):
            customer_id = UUID(customer_id)

        record = (
            db.query(ServiceRequest)
            .filter(
                ServiceRequest.id == request_id,
                ServiceRequest.customer_id == customer_id,
            )
            .first()
        )

        if not record:
            return None

        return ServiceRequestService.to_response_dto(record)
