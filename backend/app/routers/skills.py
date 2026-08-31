from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.skill_service import SkillService
from app.schemas.skill import SkillListResponse, SkillResponse, CategoriesSkillsResponse

router = APIRouter(prefix="/skills", tags=["Skills"])


@router.get(
    "",
    response_model=SkillListResponse,
    summary="Get Canonical Skills Catalog",
    description="Retrieves available service skills from PostgreSQL with optional category filtering.",
)
def list_skills(
    category: Optional[str] = Query(None, description="Filter skills by category (e.g. Plumbing, Electrical)"),
    db: Session = Depends(get_db),
) -> SkillListResponse:
    skills = SkillService.get_all_skills(db=db, category=category)
    return SkillListResponse(
        total=len(skills),
        items=[SkillResponse.model_validate(s) for s in skills],
    )


@router.get(
    "/grouped",
    response_model=CategoriesSkillsResponse,
    summary="Get Skills Grouped by Category",
    description="Retrieves all skills grouped systematically under their respective domain categories.",
)
def list_skills_grouped(
    db: Session = Depends(get_db),
) -> CategoriesSkillsResponse:
    return SkillService.get_skills_grouped(db=db)
