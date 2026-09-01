export interface WorkerFeedItem {
  request_id: string;
  description: string;
  category?: string | null;
  matched_skills: string[];
  urgency: "low" | "normal" | "high" | "emergency";
  distance_km: number;
  created_at: string;
  status: string;
  address_text?: string | null;
}

export interface WorkerFeedResponse {
  total_requests: number;
  limit: number;
  offset: number;
  requests: WorkerFeedItem[];
}
