from typing import Optional, List, Tuple
from uuid import UUID
from geoalchemy2.elements import WKTElement
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.db.models import Worker, User, WorkerSkill, Skill
from app.services.service_request_service import extract_coordinates
from app.schemas.worker import (
    WorkerSummary,
    WorkerDetail,
    WorkerSkillItem,
    WorkerListResponse,
    WorkerProfileCreate,
    WorkerProfileUpdate,
    WorkerProfileResponse,
    WorkerSkillsUpdateRequest,
    WorkerSkillsResponse,
)


class WorkerService:
    @staticmethod
    def _format_worker_summary(worker: Worker) -> WorkerSummary:
        """Formats an ORM Worker instance into a WorkerSummary Pydantic schema."""
        skill_items = [
            WorkerSkillItem(
                skill_id=ws.skill.id,
                skill_name=ws.skill.name,
                category=ws.skill.category,
                experience_years=float(ws.experience_years) if ws.experience_years is not None else None,
            )
            for ws in worker.worker_skills
            if ws.skill is not None
        ]

        return WorkerSummary(
            id=worker.id,
            user_id=worker.user_id,
            full_name=worker.user.full_name if worker.user else "Unknown Worker",
            phone=worker.user.phone if worker.user else None,
            avatar_url=worker.user.avatar_url if worker.user else None,
            description=worker.description,
            experience_years=float(worker.experience_years) if worker.experience_years is not None else 0.0,
            hourly_rate=float(worker.hourly_rate) if worker.hourly_rate is not None else None,
            rating=float(worker.rating) if worker.rating is not None else 0.0,
            total_reviews=worker.total_reviews or 0,
            is_available=worker.is_available,
            is_verified=worker.is_verified,
            service_radius_km=float(worker.service_radius_km) if worker.service_radius_km is not None else 15.0,
            address_text=worker.address_text,
            skills=skill_items,
        )

    @staticmethod
    def _format_worker_profile(worker: Worker) -> WorkerProfileResponse:
        """Formats an ORM Worker instance into a WorkerProfileResponse schema."""
        lat, lon = extract_coordinates(worker.location)
        skill_items = [
            WorkerSkillItem(
                skill_id=ws.skill.id,
                skill_name=ws.skill.name,
                category=ws.skill.category,
                experience_years=float(ws.experience_years) if ws.experience_years is not None else None,
            )
            for ws in worker.worker_skills
            if ws.skill is not None
        ]

        return WorkerProfileResponse(
            worker_id=worker.id,
            user_id=worker.user_id,
            full_name=worker.user.full_name if worker.user else "Worker",
            email=worker.user.email if worker.user else None,
            phone=worker.user.phone if worker.user else None,
            bio=worker.description,
            experience_years=float(worker.experience_years) if worker.experience_years is not None else 0.0,
            service_radius_km=float(worker.service_radius_km) if worker.service_radius_km is not None else 15.0,
            latitude=lat,
            longitude=lon,
            is_available=worker.is_available,
            is_verified=worker.is_verified,
            rating=float(worker.rating) if worker.rating is not None else 0.0,
            total_reviews=worker.total_reviews or 0,
            address_text=worker.address_text,
            skills=skill_items,
        )

    @staticmethod
    def get_workers(
        db: Session,
        limit: int = 20,
        offset: int = 0,
        category: Optional[str] = None,
        skill: Optional[str] = None,
    ) -> WorkerListResponse:
        """
        Retrieves a paginated list of workers from the database,
        with optional filtering by category or specific skill.
        """
        query = (
            db.query(Worker)
            .join(Worker.user)
            .options(
                joinedload(Worker.user),
                joinedload(Worker.worker_skills).joinedload(WorkerSkill.skill),
            )
        )

        # Apply category filter
        if category:
            query = query.filter(
                Worker.worker_skills.any(
                    WorkerSkill.skill.has(Skill.category.ilike(f"%{category}%"))
                )
            )

        # Apply skill filter
        if skill:
            query = query.filter(
                Worker.worker_skills.any(
                    WorkerSkill.skill.has(Skill.name.ilike(f"%{skill}%"))
                )
            )

        total = query.distinct().count()
        workers = query.distinct().order_by(Worker.rating.desc(), Worker.created_at.desc()).offset(offset).limit(limit).all()

        items = [WorkerService._format_worker_summary(w) for w in workers]

        return WorkerListResponse(
            total=total,
            limit=limit,
            offset=offset,
            items=items,
        )

    @staticmethod
    def get_worker_by_id(db: Session, worker_id: UUID) -> Optional[WorkerDetail]:
        """
        Retrieves full details of a specific worker by UUID.
        Returns None if not found.
        """
        worker = (
            db.query(Worker)
            .options(
                joinedload(Worker.user),
                joinedload(Worker.worker_skills).joinedload(WorkerSkill.skill),
            )
            .filter(Worker.id == worker_id)
            .first()
        )

        if not worker:
            return None

        summary = WorkerService._format_worker_summary(worker)
        return WorkerDetail(
            **summary.model_dump(),
            email=worker.user.email if worker.user else None,
        )

    @staticmethod
    def get_worker_by_user_id(db: Session, user_id: UUID) -> Optional[WorkerProfileResponse]:
        """Retrieves the worker profile of an authenticated worker by user_id."""
        worker = (
            db.query(Worker)
            .options(
                joinedload(Worker.user),
                joinedload(Worker.worker_skills).joinedload(WorkerSkill.skill),
            )
            .filter(Worker.user_id == user_id)
            .first()
        )
        if not worker:
            return None
        return WorkerService._format_worker_profile(worker)

    @staticmethod
    def create_worker_profile(
        db: Session,
        user: User,
        data: WorkerProfileCreate,
    ) -> WorkerProfileResponse:
        """Creates a new worker profile record for an authenticated user with role='worker'."""
        existing = db.query(Worker).filter(Worker.user_id == user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "WORKER_PROFILE_EXISTS",
                    "message": "A worker profile already exists for this account.",
                },
            )

        location_val = None
        if data.latitude is not None and data.longitude is not None:
            location_val = WKTElement(f"SRID=4326;POINT({data.longitude} {data.latitude})", srid=4326)

        worker = Worker(
            user_id=user.id,
            description=data.bio,
            experience_years=data.experience_years,
            service_radius_km=data.service_radius_km,
            location=location_val,
            address_text=data.address_text,
            is_available=data.is_available,
            is_verified=False,
            rating=0.00,
            total_reviews=0,
        )
        db.add(worker)
        db.commit()
        db.refresh(worker)

        return WorkerService._format_worker_profile(worker)

    @staticmethod
    def update_worker_profile(
        db: Session,
        user: User,
        data: WorkerProfileUpdate,
    ) -> WorkerProfileResponse:
        """Updates the worker profile of the authenticated worker."""
        worker = (
            db.query(Worker)
            .options(
                joinedload(Worker.user),
                joinedload(Worker.worker_skills).joinedload(WorkerSkill.skill),
            )
            .filter(Worker.user_id == user.id)
            .first()
        )
        if not worker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "WORKER_PROFILE_NOT_FOUND",
                    "message": "Worker profile not found for this account.",
                },
            )

        if data.bio is not None:
            worker.description = data.bio
        if data.experience_years is not None:
            worker.experience_years = data.experience_years
        if data.service_radius_km is not None:
            worker.service_radius_km = data.service_radius_km
        if data.is_available is not None:
            worker.is_available = data.is_available
        if data.address_text is not None:
            worker.address_text = data.address_text

        if data.latitude is not None and data.longitude is not None:
            worker.location = WKTElement(f"SRID=4326;POINT({data.longitude} {data.latitude})", srid=4326)

        db.commit()
        db.refresh(worker)

        return WorkerService._format_worker_profile(worker)

    @staticmethod
    def get_worker_skills(db: Session, user: User) -> WorkerSkillsResponse:
        """Retrieves all assigned skills for the authenticated worker."""
        worker = (
            db.query(Worker)
            .options(
                joinedload(Worker.worker_skills).joinedload(WorkerSkill.skill),
            )
            .filter(Worker.user_id == user.id)
            .first()
        )
        if not worker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "WORKER_PROFILE_NOT_FOUND",
                    "message": "Worker profile not found for this account.",
                },
            )

        skill_items = [
            WorkerSkillItem(
                skill_id=ws.skill.id,
                skill_name=ws.skill.name,
                category=ws.skill.category,
                experience_years=float(ws.experience_years) if ws.experience_years is not None else None,
            )
            for ws in worker.worker_skills
            if ws.skill is not None
        ]
        return WorkerSkillsResponse(worker_id=worker.id, skills=skill_items)

    @staticmethod
    def update_worker_skills(
        db: Session,
        user: User,
        data: WorkerSkillsUpdateRequest,
    ) -> WorkerSkillsResponse:
        """Updates the canonical skills assigned to the authenticated worker."""
        worker = (
            db.query(Worker)
            .options(
                joinedload(Worker.worker_skills).joinedload(WorkerSkill.skill),
            )
            .filter(Worker.user_id == user.id)
            .first()
        )
        if not worker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "WORKER_PROFILE_NOT_FOUND",
                    "message": "Worker profile not found for this account.",
                },
            )

        # 1. Deduplicate skills by skill_id
        unique_skills = {}
        for s in data.skills:
            unique_skills[s.skill_id] = s.experience_years

        # 2. Validate that every skill_id exists in public.skills
        if unique_skills:
            existing_skills = db.query(Skill).filter(Skill.id.in_(list(unique_skills.keys()))).all()
            existing_skill_ids = {s.id for s in existing_skills}

            for sid in unique_skills.keys():
                if sid not in existing_skill_ids:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "error_code": "INVALID_SKILL_ID",
                            "message": f"Skill with ID '{sid}' does not exist in canonical skills.",
                        },
                    )

        # 3. Replace worker_skills atomically
        db.query(WorkerSkill).filter(WorkerSkill.worker_id == worker.id).delete()
        for sid, exp_years in unique_skills.items():
            new_mapping = WorkerSkill(
                worker_id=worker.id,
                skill_id=sid,
                experience_years=exp_years,
            )
            db.add(new_mapping)

        db.commit()
        db.refresh(worker)

        return WorkerService.get_worker_skills(db, user)
