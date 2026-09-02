export interface CreateReviewInput {
  booking_id: string;
  rating: number;
  comment?: string;
}

export type ReviewCreateInput = CreateReviewInput;

export interface Review {
  id: string;
  booking_id: string;
  worker_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  customer_name?: string | null;
}

export interface WorkerReviewsResponse {
  total: number;
  average_rating?: number | null;
  limit: number;
  offset: number;
  items: Review[];
}

export type ReviewListResponse = WorkerReviewsResponse;
