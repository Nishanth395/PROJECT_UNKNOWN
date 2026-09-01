export interface WorkerSkillItem {
  skill_id: string;
  skill_name: string;
  category: string;
  experience_years?: number | null;
}

export interface WorkerSkillUpdateEntry {
  skill_id: string;
  experience_years?: number | null;
}

export interface WorkerSkillsResponse {
  worker_id: string;
  skills: WorkerSkillItem[];
}

export interface WorkerProfile {
  worker_id: string;
  user_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  experience_years: number;
  service_radius_km: number;
  latitude?: number | null;
  longitude?: number | null;
  is_available: boolean;
  is_verified: boolean;
  rating: number;
  total_reviews: number;
  address_text?: string | null;
  skills: WorkerSkillItem[];
}

export interface WorkerProfileCreateInput {
  bio?: string;
  experience_years: number;
  service_radius_km: number;
  latitude: number;
  longitude: number;
  is_available?: boolean;
  address_text?: string;
}

export interface WorkerProfileUpdateInput {
  bio?: string;
  experience_years?: number;
  service_radius_km?: number;
  latitude?: number;
  longitude?: number;
  is_available?: boolean;
  address_text?: string;
}
