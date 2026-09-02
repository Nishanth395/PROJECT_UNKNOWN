"use client";

import React, { useState } from "react";
import { Booking } from "@/types/booking";
import { Review, ReviewCreateInput } from "@/types/review";
import { submitReview } from "@/lib/api/reviews";
import { ApiException } from "@/lib/api/api-client";
import { ErrorAlert } from "@/components/error-alert";
import {
  X,
  Star,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

interface ReviewModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (review: Review) => void;
}

export function ReviewModal({
  booking,
  isOpen,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!rating || rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }

    if (comment.length > 1000) {
      setError("Review comments cannot exceed 1000 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: ReviewCreateInput = {
        booking_id: booking.booking_id,
        rating,
        comment: comment.trim() || undefined,
      };

      const result = await submitReview(payload);
      setIsSubmitting(false);
      onSuccess(result);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof ApiException) {
        if (err.errorCode === "BOOKING_NOT_COMPLETED") {
          setError("Reviews can only be submitted for completed bookings.");
        } else if (err.errorCode === "DUPLICATE_REVIEW" || err.statusCode === 409) {
          setError("A review has already been submitted for this completed booking.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to submit review. Please check your connection and try again.");
      }
    }
  };

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 1:
        return "Poor (1 Star)";
      case 2:
        return "Fair (2 Stars)";
      case 3:
        return "Good (3 Stars)";
      case 4:
        return "Very Good (4 Stars)";
      case 5:
        return "Exceptional (5 Stars)";
      default:
        return "Select a rating";
    }
  };

  const activeRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div
      data-testid="review-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-500 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Verified Experience
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Rate {booking.worker_name || "Worker"}
          </h2>
          <p className="text-xs text-slate-500">
            Booking #{booking.booking_id.slice(0, 8)} • Completed Service
          </p>
        </div>

        {error && <ErrorAlert message={error} />}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Rating Picker */}
          <div className="space-y-2 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
            <label className="block text-xs font-bold text-slate-700">
              How was your service experience?
            </label>

            <div className="flex items-center justify-center gap-2 pt-1" role="radiogroup" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isFilled = starValue <= activeRating;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 text-slate-300 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg"
                    aria-label={`${starValue} Star`}
                    role="radio"
                    aria-checked={rating === starValue}
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        isFilled
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300 hover:text-amber-200"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-bold text-amber-600 pt-1">
              {getRatingLabel(activeRating)}
            </div>
          </div>

          {/* Optional Review Comment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <label htmlFor="review-comment" className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                <span>Feedback & Comments (Optional)</span>
              </label>
              <span className="text-[11px] text-slate-400">{comment.length} / 1000</span>
            </div>
            <textarea
              id="review-comment"
              rows={4}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about the quality of work, punctuality, and professionalism..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 leading-relaxed placeholder:text-slate-400"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting Review...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                  <span>Submit Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
