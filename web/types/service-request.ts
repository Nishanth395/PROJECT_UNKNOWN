export type UrgencyLevel = "low" | "normal" | "high" | "emergency";

export type RequestStatus =
  | "pending"
  | "matched"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface ServiceRequest {
  id: string;
  customer_id: string;
  raw_description: string;
  extracted_category: string | null;
  extracted_skills: string[];
  urgency: UrgencyLevel;
  status: RequestStatus;
  latitude: number | null;
  longitude: number | null;
  address_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestCreateInput {
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  urgency?: UrgencyLevel;
  address_text?: string | null;
}

export interface ServiceRequestListResponse {
  total: number;
  limit: number;
  offset: number;
  items: ServiceRequest[];
}
