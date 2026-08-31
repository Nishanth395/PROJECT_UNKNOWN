from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class SkillBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = None


class SkillResponse(SkillBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)


class SkillListResponse(BaseModel):
    total: int
    items: List[SkillResponse]


class CategoryGroupedSkills(BaseModel):
    category: str
    skills: List[SkillResponse]


class CategoriesSkillsResponse(BaseModel):
    total_categories: int
    categories: List[CategoryGroupedSkills]
