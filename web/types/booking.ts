export type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

export interface Booking {
  booking_id: string;
  customer_id: string;
  worker_id: string;
  service_request_id?: string | null;
  customer_name?: string | null;
  worker_name?: string | null;
  worker_rating?: number | null;
  description?: string | null;
  category?: string | null;
  urgency?: string | null;
  scheduled_time?: string | null;
  status: BookingStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingListResponse {
  total: number;
  limit: number;
  offset: number;
  items: Booking[];
}

export interface BookingCreateInput {
  worker_id: string;
  service_request_id: string;
  scheduled_time?: string | null;
  notes?: string | null;
}

export interface BookingStatusUpdateInput {
  status: "accepted" | "rejected";
}
