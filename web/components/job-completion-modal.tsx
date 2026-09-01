"use client";

import React, { useState } from "react";
import { Booking } from "@/types/booking";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { ErrorAlert } from "@/components/error-alert";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  Briefcase,
} from "lucide-react";

interface JobCompletionModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function JobCompletionModal({
  booking,
  isOpen,
  onClose,
  onSuccess,
}: JobCompletionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCompleteJob = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.patch<Booking>(`/api/v1/bookings/${booking.booking_id}/complete`);
      setIsSubmitting(false);
      onSuccess();
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof ApiException) {
        if (err.statusCode === 409) {
          setError(
            "This booking cannot be completed. Only accepted active bookings can be marked as complete."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to mark job as complete. Please try again.");
      }
    }
  };

  return (
    <div
      data-testid="job-completion-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Complete Service Job
            </h2>
            <p className="text-xs text-slate-500">
              Confirm successful fulfillment of this engagement
            </p>
          </div>
        </div>

        {error && <ErrorAlert message={error} />}

        {/* Booking Summary Box */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-500">Customer:</span>
            <strong className="text-slate-900">{booking.customer_name || "Customer"}</strong>
          </div>
          {booking.category && (
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500">Trade Domain:</span>
              <strong className="text-slate-900">{booking.category}</strong>
            </div>
          )}
          {booking.scheduled_time && (
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500">Appointment:</span>
              <strong className="text-slate-900">
                {new Date(booking.scheduled_time).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </strong>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Marking this engagement as completed will atomically update the service request status in PostgreSQL and finalize the customer&apos;s request.
        </p>

        {/* Action Buttons */}
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
            type="button"
            onClick={handleCompleteJob}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 text-xs font-bold shadow transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Completing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Complete Job</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
