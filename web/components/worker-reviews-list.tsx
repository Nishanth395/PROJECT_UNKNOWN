"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ReviewListResponse, Review } from "@/types/review";
import { fetchWorkerReviews } from "@/lib/api/reviews";
import { ApiException } from "@/lib/api/api-client";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import {
  Star,
  MessageSquare,
  User,
  Calendar,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface WorkerReviewsListProps {
  workerId: string;
  workerName?: string;
}

export function WorkerReviewsList({
  workerId,
  workerName,
}: WorkerReviewsListProps) {
  const [reviewsData, setReviewsData] = useState<ReviewListResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchWorkerReviews(workerId, 20, 0);
      setReviewsData(data);
      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("Failed to load worker reviews.");
      }
    }
  }, [workerId]);

  useEffect(() => {
    if (workerId) {
      loadReviews();
    }
  }, [workerId, loadReviews]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-2">
        <LoadingSpinner message="Loading client reviews..." />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={loadReviews} />;
  }

  const hasReviews = reviewsData && reviewsData.items.length > 0;

  return (
    <div
      data-testid="worker-reviews-list"
      className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-6"
    >
      {/* Header & Authoritative Rating Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Reputation & Feedback
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Reviews for {workerName || "Worker"}
          </h3>
        </div>

        {reviewsData && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-2xl">
            <div className="flex items-center gap-1.5 font-black text-slate-900 text-lg">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <span>
                {reviewsData.average_rating !== null && reviewsData.average_rating !== undefined
                  ? reviewsData.average_rating.toFixed(2)
                  : "New"}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-semibold text-slate-600">
              {reviewsData.total} {reviewsData.total === 1 ? "review" : "reviews"}
            </span>
          </div>
        )}
      </div>

      {/* Reviews Content */}
      {hasReviews ? (
        <div className="space-y-4">
          {reviewsData.items.map((review: Review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2.5 transition hover:bg-slate-50"
            >
              {/* Reviewer & Star Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                    {(review.customer_name || "Customer").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      {review.customer_name || "Customer"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <Star
                      key={starVal}
                      className={`h-3.5 w-3.5 ${
                        starVal <= review.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Review Comment */}
              {review.comment && (
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  &quot;{review.comment}&quot;
                </p>
              )}

              {/* Review Timestamp */}
              <div className="text-[10px] text-slate-400 font-medium">
                Reviewed on {new Date(review.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty Reviews State */
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-8 text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No reviews yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            This professional has not received public reviews yet. When completed bookings are reviewed, they will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
