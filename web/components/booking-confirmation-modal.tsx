"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MatchedWorker } from "@/types/worker-match";
import { BookingCreateInput, Booking } from "@/types/booking";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { ErrorAlert } from "@/components/error-alert";
import {
  X,
  Calendar,
  Clock,
  Star,
  ShieldCheck,
  MapPin,
  Briefcase,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

interface BookingConfirmationModalProps {
  worker: MatchedWorker;
  serviceRequestId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BookingConfirmationModal({
  worker,
  serviceRequestId,
  isOpen,
  onClose,
}: BookingConfirmationModalProps) {
  // Default to tomorrow at 10:00 AM
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  defaultDate.setHours(10, 0, 0, 0);
  const defaultIso = defaultDate.toISOString().slice(0, 16);

  const [scheduledTime, setScheduledTime] = useState<string>(defaultIso);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!scheduledTime) {
      setError("Please specify a preferred scheduled date and time.");
      return;
    }

    const scheduledDate = new Date(scheduledTime);
    if (isNaN(scheduledDate.getTime())) {
      setError("Please enter a valid scheduled date and time.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: BookingCreateInput = {
        worker_id: worker.worker_id,
        service_request_id: serviceRequestId,
        scheduled_time: scheduledDate.toISOString(),
        notes: notes.trim() || undefined,
      };

      const booking = await apiClient.post<Booking>("/api/v1/bookings", payload);
      setCreatedBooking(booking);
      setIsSubmitting(false);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof ApiException) {
        if (err.statusCode === 409) {
          setError("This worker is no longer available for this request.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to create booking request. Please try again.");
      }
    }
  };

  return (
    <div
      data-testid="booking-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {createdBooking ? (
          /* Success Screen */
          <div className="text-center space-y-5 py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-slate-900">
                Booking Request Sent!
              </h2>
              <p className="text-sm text-slate-600 max-w-sm mx-auto">
                Your request has been sent to <strong>{worker.name}</strong>. The booking is now <strong>Pending</strong> awaiting their confirmation.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-xs text-slate-700 space-y-1 text-left">
              <div>Scheduled Time: <strong>{new Date(scheduledTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong></div>
              <div>Worker: <strong>{worker.name}</strong> ({worker.category})</div>
              <div>Match Score: <strong>{worker.match_score.toFixed(2)}%</strong></div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row gap-3">
              <Link
                href="/bookings"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 text-sm shadow transition"
              >
                <span>View My Bookings</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={onClose}
                className="rounded-2xl border border-slate-200 py-3.5 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Back to Matches
              </button>
            </div>
          </div>
        ) : (
          /* Confirmation Form */
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-1">
                <span>Confirm Service Booking</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Request {worker.name}
              </h2>
              <p className="text-xs text-slate-500">
                You are requesting this worker for this service.
              </p>
            </div>

            {/* Worker Summary Card */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{worker.name}</span>
                  {worker.is_verified && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{worker.rating > 0 ? worker.rating.toFixed(2) : "New"}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{worker.distance_km.toFixed(2)} km away</span>
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  <span>{worker.experience_years.toFixed(0)} yrs exp</span>
                </div>
                <div className="font-bold text-blue-600">
                  Match: {worker.match_score.toFixed(2)}%
                </div>
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {worker.matched_skills.map((s) => (
                  <span key={s} className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>

            {error && <ErrorAlert message={error} />}

            {/* Form Inputs */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="scheduledTime" className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  <span>Preferred Date & Time *</span>
                </label>
                <input
                  id="scheduledTime"
                  type="datetime-local"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="notes" className="text-xs font-bold text-slate-900">
                  Additional Notes for Worker (Optional)
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Please bring pipe replacement washers and come through gate #2."
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Requesting Booking...</span>
                    </>
                  ) : (
                    <span>Request Booking</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
