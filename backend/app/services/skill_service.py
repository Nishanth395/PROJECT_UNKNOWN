from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from app.db.models import Skill
from app.schemas.skill import SkillResponse, CategoryGroupedSkills, CategoriesSkillsResponse


class SkillService:
    @staticmethod
    def get_all_skills(db: Session, category: Optional[str] = None) -> List[Skill]:
        """Retrieves all canonical skills from PostgreSQL, with optional category filter."""
        query = db.query(Skill)
        if category:
            query = query.filter(Skill.category.ilike(f"%{category}%"))
        return query.order_by(Skill.category, Skill.name).all()

    @staticmethod
    def get_skills_grouped(db: Session) -> CategoriesSkillsResponse:
        """Retrieves skills grouped by their domain categories."""
        skills = db.query(Skill).order_by(Skill.category, Skill.name).all()
        grouped: Dict[str, List[SkillResponse]] = {}

        for skill in skills:
            cat = skill.category
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(SkillResponse.model_validate(skill))

        category_items = [
            CategoryGroupedSkills(category=cat, skills=items)
            for cat, items in grouped.items()
        ]

        return CategoriesSkillsResponse(
            total_categories=len(category_items),
            categories=category_items,
        )
