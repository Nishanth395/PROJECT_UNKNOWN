from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.db.models import Worker, User, WorkerSkill, Skill
from app.schemas.worker import WorkerSummary, WorkerDetail, WorkerSkillItem, WorkerListResponse


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
