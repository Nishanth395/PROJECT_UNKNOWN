export interface SkillItem {
  id: string;
  name: string;
  category: string;
  description?: string | null;
}

export interface SkillListResponse {
  total: number;
  items: SkillItem[];
}

export interface CategoryGroupedSkills {
  category: string;
  skills: SkillItem[];
}

export interface CategoriesSkillsResponse {
  categories: CategoryGroupedSkills[];
}
