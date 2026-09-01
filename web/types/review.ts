export interface ReviewCreateInput {
  booking_id: string;
  rating: number;
  comment?: string;
}

export interface Review {
  id: string;
  booking_id: string;
  worker_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  customer_name?: string | null;
}

export interface ReviewListResponse {
  total: number;
  average_rating?: number | null;
  limit: number;
  offset: number;
  items: Review[];
}
