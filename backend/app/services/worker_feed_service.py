from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, cast
from geoalchemy2 import Geography

from app.db.models import Worker, User, Skill, WorkerSkill, ServiceRequest
from app.schemas.worker_feed import WorkerFeedItem, WorkerFeedResponse
from app.services.service_request_service import extract_coordinates
from app.services.matching_service import haversine_distance_km

URGENCY_PRIORITY = {
    "emergency": 0,
    "high": 1,
    "normal": 2,
    "low": 3,
}


class WorkerFeedService:
    """Service providing relevant, nearby active service requests to authenticated workers."""

    @staticmethod
    def get_worker_feed(
        db: Session,
        user: User,
        limit: int = 20,
        offset: int = 0,
    ) -> WorkerFeedResponse:
        bounded_limit = max(1, min(50, limit))
        bounded_offset = max(0, offset)

        # 1. Fetch worker profile
        worker = (
            db.query(Worker)
            .filter(Worker.user_id == user.id)
            .first()
        )

        if not worker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "WORKER_PROFILE_NOT_FOUND",
                    "message": "Worker profile does not exist. Please complete worker onboarding.",
                },
            )

        # 2. If worker is unavailable or has no location, return empty feed
        if not worker.is_available or not worker.location:
            return WorkerFeedResponse(
                total_requests=0,
                limit=bounded_limit,
                offset=bounded_offset,
                requests=[],
            )

        # 3. Extract worker's canonical skills & categories
        worker_skills = (
            db.query(Skill.name, Skill.category)
            .join(WorkerSkill, WorkerSkill.skill_id == Skill.id)
            .filter(WorkerSkill.worker_id == worker.id)
            .all()
        )

        if not worker_skills:
            return WorkerFeedResponse(
                total_requests=0,
                limit=bounded_limit,
                offset=bounded_offset,
                requests=[],
            )

        worker_skill_names = {s[0] for s in worker_skills}
        worker_categories = {s[1] for s in worker_skills}

        w_lat, w_lon = extract_coordinates(worker.location)
        if w_lat is None or w_lon is None:
            return WorkerFeedResponse(
                total_requests=0,
                limit=bounded_limit,
                offset=bounded_offset,
                requests=[],
            )

        dialect_name = db.bind.dialect.name if db.bind else "postgresql"
        feed_items: List[WorkerFeedItem] = []

        # 4. Query eligible active service requests
        if dialect_name == "postgresql":
            # Native PostGIS spatial filtering
            pt = func.extensions.ST_SetSRID(func.extensions.ST_MakePoint(w_lon, w_lat), 4326)
            pt_geo = cast(pt, Geography)

            query = (
                db.query(
                    ServiceRequest,
                    (func.extensions.ST_Distance(ServiceRequest.location, pt_geo) / 1000.0).label("distance_km"),
                )
                .filter(ServiceRequest.status.in_(["open", "matched"]))
                .filter(ServiceRequest.location.isnot(None))
                .filter(func.extensions.ST_DWithin(ServiceRequest.location, pt_geo, worker.service_radius_km * 1000))
            )

            raw_requests = query.all()

            for row in raw_requests:
                sr: ServiceRequest = row[0]
                dist_km: float = float(row[1])

                # Check extracted category compatibility
                if sr.extracted_category and sr.extracted_category not in worker_categories:
                    continue

                # Check skill overlap
                extracted_skills = sr.extracted_skills or []
                matched = [s for s in extracted_skills if s in worker_skill_names]
                if not matched:
                    continue

                feed_items.append(
                    WorkerFeedItem(
                        request_id=sr.id,
                        description=sr.raw_description,
                        category=sr.extracted_category,
                        matched_skills=matched,
                        urgency=sr.urgency,
                        distance_km=round(dist_km, 2),
                        created_at=sr.created_at,
                        status=sr.status,
                        address_text=sr.address_text,
                    )
                )

        else:
            # Fallback for SQLite automated unit test suites
            raw_requests = (
                db.query(ServiceRequest)
                .filter(ServiceRequest.status.in_(["open", "matched"]))
                .filter(ServiceRequest.location.isnot(None))
                .all()
            )

            for sr in raw_requests:
                req_lat, req_lon = extract_coordinates(sr.location)
                if req_lat is None or req_lon is None:
                    continue

                dist_km = haversine_distance_km(w_lat, w_lon, req_lat, req_lon)
                radius_km = float(worker.service_radius_km)

                if dist_km > radius_km:
                    continue

                # Check extracted category compatibility
                if sr.extracted_category and sr.extracted_category not in worker_categories:
                    continue

                # Check skill overlap
                extracted_skills = sr.extracted_skills or []
                matched = [s for s in extracted_skills if s in worker_skill_names]
                if not matched:
                    continue

                feed_items.append(
                    WorkerFeedItem(
                        request_id=sr.id,
                        description=sr.raw_description,
                        category=sr.extracted_category,
                        matched_skills=matched,
                        urgency=sr.urgency,
                        distance_km=round(dist_km, 2),
                        created_at=sr.created_at,
                        status=sr.status,
                        address_text=sr.address_text,
                    )
                )

        # 5. Deterministic Sort:
        # 1. urgency priority (emergency > high > normal > low)
        # 2. distance ascending
        # 3. created_at descending
        # 4. request_id ascending
        def sort_key(item: WorkerFeedItem):
            urgency_score = URGENCY_PRIORITY.get(item.urgency.lower(), 99)
            created_timestamp = item.created_at.timestamp() if isinstance(item.created_at, datetime) else 0.0
            return (
                urgency_score,
                item.distance_km,
                -created_timestamp,
                str(item.request_id),
            )

        feed_items.sort(key=sort_key)

        total_count = len(feed_items)
        paginated_items = feed_items[bounded_offset : bounded_offset + bounded_limit]

        return WorkerFeedResponse(
            total_requests=total_count,
            limit=bounded_limit,
            offset=bounded_offset,
            requests=paginated_items,
        )
