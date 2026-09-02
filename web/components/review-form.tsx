"use client";

import React, { useState } from "react";
import { Review, CreateReviewInput } from "@/types/review";
import { submitReview } from "@/lib/api/reviews";
import { ApiException } from "@/lib/api/api-client";
import { ErrorAlert } from "@/components/error-alert";
import {
  Star,
  Loader2,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";

interface ReviewFormProps {
  bookingId: string;
  workerName?: string;
  onSuccess: (review: Review) => void;
  onCancel?: () => void;
}

export function ReviewForm({
  bookingId,
  workerName,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationError(null);

    // 1. Client-side rating validation
    if (!rating || rating < 1 || rating > 5) {
      setValidationError("Please select a star rating from 1 to 5.");
      return;
    }

    // 2. Client-side comment character limit validation (1000 chars)
    if (comment.length > 1000) {
      setValidationError("Review comment cannot exceed 1000 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateReviewInput = {
        booking_id: bookingId,
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
          setError("Reviews are only available after the service has been completed.");
        } else if (err.errorCode === "DUPLICATE_REVIEW" || err.statusCode === 409) {
          setError("A review has already been submitted for this booking.");
        } else if (err.statusCode === 403) {
          setError("You can only review services completed for your own bookings.");
        } else if (err.statusCode === 404) {
          setError("This booking is no longer available.");
        } else if (err.statusCode === 422) {
          setError("Please verify that your rating is between 1 and 5 and comment is valid.");
        } else {
          setError(err.message || "Unable to submit review. Please try again.");
        }
      } else {
        setError("Network error encountered. Please check your connection and try again.");
      }
    }
  };

  const getRatingDescription = (val: number) => {
    switch (val) {
      case 1:
        return "1 Star - Needs Improvement";
      case 2:
        return "2 Stars - Fair";
      case 3:
        return "3 Stars - Good";
      case 4:
        return "4 Stars - Very Good";
      case 5:
        return "5 Stars - Excellent";
      default:
        return "Click a star to rate";
    }
  };

  const activeRating = hoverRating !== null ? hoverRating : rating;

  return (
    <form
      data-testid="review-form"
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-5"
    >
      {/* Title */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900">
          How was your experience{workerName ? ` with ${workerName}` : ""}?
        </h3>
        <p className="text-xs text-slate-500">
          Your feedback helps build trust across the marketplace.
        </p>
      </div>

      {error && <ErrorAlert message={error} />}

      {validationError && (
        <div
          data-testid="validation-error"
          className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs font-semibold text-amber-900"
        >
          {validationError}
        </div>
      )}

      {/* 1–5 Star Rating Controls */}
      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          Select Rating <span className="text-red-500">*</span>
        </label>

        <div
          className="flex items-center justify-center gap-2 pt-1"
          role="radiogroup"
          aria-label="Star rating"
        >
          {[1, 2, 3, 4, 5].map((starValue) => {
            const isFilled = starValue <= activeRating;
            return (
              <button
                key={starValue}
                type="button"
                onClick={() => {
                  setRating(starValue);
                  setValidationError(null);
                }}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(null)}
                className="p-1 text-slate-300 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-xl"
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

        <div className="text-xs font-bold text-amber-600 h-4">
          {getRatingDescription(activeRating)}
        </div>
      </div>

      {/* Optional Comment */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <label htmlFor="review-comment-input" className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
            <span>Tell us about your experience (optional)</span>
          </label>
          <span
            data-testid="character-counter"
            className={`text-[11px] ${
              comment.length > 1000 ? "text-red-600 font-bold" : "text-slate-400"
            }`}
          >
            {comment.length} / 1000
          </span>
        </div>
        <textarea
          id="review-comment-input"
          rows={4}
          maxLength={1000}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            if (e.target.value.length <= 1000) setValidationError(null);
          }}
          placeholder="Describe punctuality, quality of work, cleanliness, and communication..."
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 leading-relaxed placeholder:text-slate-400"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold shadow-md transition disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Submitting...</span>
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
  );
}
