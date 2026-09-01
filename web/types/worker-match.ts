export interface MatchedWorker {
  worker_id: string;
  name: string;
  category: string;
  matched_skills: string[];
  distance_km: number;
  rating: number;
  total_reviews: number;
  experience_years: number;
  is_verified: boolean;
  is_available: boolean;
  match_score: number;
}

export interface WorkerMatchResponse {
  request_id: string;
  total_matches: number;
  matches: MatchedWorker[];
}
