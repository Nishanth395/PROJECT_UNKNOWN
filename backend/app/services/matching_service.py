import math
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, cast
from geoalchemy2 import Geography

from app.db.models import Worker, User, Skill, WorkerSkill, ServiceRequest
from app.schemas.matching import MatchedWorkerItem, WorkerMatchResponse
from app.services.service_request_service import extract_coordinates


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two coordinates in kilometers using Haversine formula."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def compute_match_score(
    distance_km: float,
    service_radius_km: float,
    rating: Optional[float],
    experience_years: float,
) -> Tuple[float, float, float, float, float]:
    """
    Calculates deterministic match score out of 100 based on standard weighting:
    - Skill match: 50 points
    - Distance: 25 points (normalized against worker's service radius)
    - Rating: 15 points (normalized against 5.0)
    - Experience: 10 points (normalized against 10 years cap)

    Returns: (skill_score, distance_score, rating_score, experience_score, total_match_score)
    """
    # 1. Skill Match Score (50 pts)
    skill_score = 50.0

    # 2. Distance Score (25 pts): normalized against worker's service radius
    if service_radius_km and service_radius_km > 0:
        ratio = distance_km / service_radius_km
        raw_dist = 25.0 * (1.0 - ratio)
        distance_score = max(0.0, min(25.0, raw_dist))
    else:
        distance_score = 0.0

    # 3. Rating Score (15 pts): normalized against 5.0 scale
    if rating is not None and rating > 0:
        raw_rating = (float(rating) / 5.0) * 15.0
        rating_score = max(0.0, min(15.0, raw_rating))
    else:
        rating_score = 0.0

    # 4. Experience Score (10 pts): capped at 10 years
    if experience_years and experience_years > 0:
        raw_exp = min(float(experience_years) / 10.0, 1.0) * 10.0
        experience_score = max(0.0, min(10.0, raw_exp))
    else:
        experience_score = 0.0

    total_score = round(skill_score + distance_score + rating_score + experience_score, 2)
    return (
        skill_score,
        round(distance_score, 2),
        round(rating_score, 2),
        round(experience_score, 2),
        total_score,
    )


class MatchingService:
    """Deterministic spatial worker matching engine."""

    @staticmethod
    def find_matches_for_request(
        db: Session,
        request_id: UUID | str,
        customer_id: UUID | str,
        limit: int = 5,
    ) -> WorkerMatchResponse:
        """
        Finds and scores eligible workers for a service request based on:
        1. Canonical skill compatibility
        2. Availability
        3. PostGIS service radius filtering
        4. Deterministic weighted scoring & tie-breaking
        """
        if isinstance(request_id, str):
            try:
                request_id = UUID(request_id)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"error_code": "REQUEST_NOT_FOUND", "message": "Service request not found"},
                )

        if isinstance(customer_id, str):
            customer_id = UUID(customer_id)

        # 1. Retrieve the service request ensuring ownership
        sr = (
            db.query(ServiceRequest)
            .filter(
                ServiceRequest.id == request_id,
                ServiceRequest.customer_id == customer_id,
            )
            .first()
        )

        if not sr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "REQUEST_NOT_FOUND", "message": "Service request not found"},
            )

        # 2. Check extraction requirement
        if not sr.extracted_skills:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "REQUEST_NOT_CLASSIFIED",
                    "message": "Service request has not been classified yet. Please run requirement extraction first.",
                },
            )

        # 3. Extract request coordinates
        req_lat, req_lon = extract_coordinates(sr.location)
        if req_lat is None or req_lon is None:
            return WorkerMatchResponse(request_id=sr.id, total_matches=0, matches=[])

        # Clamp limit
        bounded_limit = max(1, min(20, limit))

        dialect_name = db.bind.dialect.name if db.bind else "postgresql"
        worker_dict: Dict[UUID, Dict[str, Any]] = {}

        # 4. Database Query & Geographic Filtering
        if dialect_name == "postgresql":
            # Native PostGIS Spatial Query
            pt = func.extensions.ST_SetSRID(func.extensions.ST_MakePoint(req_lon, req_lat), 4326)
            pt_geo = cast(pt, Geography)

            query = (
                db.query(
                    Worker,
                    User.full_name,
                    Skill.name.label("skill_name"),
                    Skill.category.label("skill_category"),
                    (func.extensions.ST_Distance(Worker.location, pt_geo) / 1000.0).label("distance_km"),
                )
                .join(User, Worker.user_id == User.id)
                .join(WorkerSkill, Worker.id == WorkerSkill.worker_id)
                .join(Skill, WorkerSkill.skill_id == Skill.id)
                .filter(Worker.is_available == True)
                .filter(Skill.name.in_(sr.extracted_skills))
                .filter(func.extensions.ST_DWithin(Worker.location, pt_geo, Worker.service_radius_km * 1000))
            )

            if sr.extracted_category:
                query = query.filter(Skill.category == sr.extracted_category)

            raw_candidates = query.all()

            for row in raw_candidates:
                worker_obj: Worker = row[0]
                user_name: str = row[1]
                skill_name: str = row[2]
                skill_cat: str = row[3]
                dist_km: float = float(row[4])

                if worker_obj.id not in worker_dict:
                    worker_dict[worker_obj.id] = {
                        "worker": worker_obj,
                        "name": user_name,
                        "category": skill_cat,
                        "matched_skills": [skill_name],
                        "distance_km": round(dist_km, 2),
                    }
                else:
                    if skill_name not in worker_dict[worker_obj.id]["matched_skills"]:
                        worker_dict[worker_obj.id]["matched_skills"].append(skill_name)

        else:
            # Fallback for in-memory SQLite automated test suites
            query = (
                db.query(
                    Worker,
                    User.full_name,
                    Skill.name.label("skill_name"),
                    Skill.category.label("skill_category"),
                )
                .join(User, Worker.user_id == User.id)
                .join(WorkerSkill, Worker.id == WorkerSkill.worker_id)
                .join(Skill, WorkerSkill.skill_id == Skill.id)
                .filter(Worker.is_available == True)
                .filter(Skill.name.in_(sr.extracted_skills))
            )

            if sr.extracted_category:
                query = query.filter(Skill.category == sr.extracted_category)

            raw_candidates = query.all()

            for row in raw_candidates:
                worker_obj: Worker = row[0]
                user_name: str = row[1]
                skill_name: str = row[2]
                skill_cat: str = row[3]

                w_lat, w_lon = extract_coordinates(worker_obj.location)
                if w_lat is None or w_lon is None:
                    continue

                dist_km = haversine_distance_km(req_lat, req_lon, w_lat, w_lon)
                radius_km = float(worker_obj.service_radius_km)

                # Geographic radius filter
                if dist_km > radius_km:
                    continue

                if worker_obj.id not in worker_dict:
                    worker_dict[worker_obj.id] = {
                        "worker": worker_obj,
                        "name": user_name,
                        "category": skill_cat,
                        "matched_skills": [skill_name],
                        "distance_km": round(dist_km, 2),
                    }
                else:
                    if skill_name not in worker_dict[worker_obj.id]["matched_skills"]:
                        worker_dict[worker_obj.id]["matched_skills"].append(skill_name)

        # 5. Score Candidates
        candidate_items: List[MatchedWorkerItem] = []
        for w_data in worker_dict.values():
            w: Worker = w_data["worker"]
            dist_km: float = w_data["distance_km"]
            radius_km: float = float(w.service_radius_km)
            rating_val: Optional[float] = float(w.rating) if w.rating is not None else None
            exp_val: float = float(w.experience_years) if w.experience_years is not None else 0.0

            _, _, _, _, total_score = compute_match_score(
                distance_km=dist_km,
                service_radius_km=radius_km,
                rating=rating_val,
                experience_years=exp_val,
            )

            candidate_items.append(
                MatchedWorkerItem(
                    worker_id=w.id,
                    name=w_data["name"],
                    category=w_data["category"],
                    matched_skills=w_data["matched_skills"],
                    distance_km=dist_km,
                    rating=round(rating_val, 2) if rating_val is not None else 0.0,
                    total_reviews=w.total_reviews,
                    experience_years=round(exp_val, 1),
                    is_verified=w.is_verified,
                    is_available=w.is_available,
                    match_score=total_score,
                )
            )

        # 6. Deterministic Tie-breaking Sort
        # 1. match_score (desc)
        # 2. rating (desc)
        # 3. distance_km (asc)
        # 4. experience_years (desc)
        # 5. is_verified (desc: True before False)
        # 6. worker_id (asc: stable string order)
        def tie_breaker_key(item: MatchedWorkerItem):
            return (
                -item.match_score,
                -(item.rating or 0.0),
                item.distance_km,
                -(item.experience_years or 0.0),
                not item.is_verified,
                str(item.worker_id),
            )

        candidate_items.sort(key=tie_breaker_key)

        return WorkerMatchResponse(
            request_id=sr.id,
            total_matches=len(candidate_items),
            matches=candidate_items[:bounded_limit],
        )
