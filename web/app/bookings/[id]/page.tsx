"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { BookingListResponse, Booking, BookingStatus } from "@/types/booking";
import { formatBookingStatus } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import {
  ArrowLeft,
  CalendarCheck,
  Clock,
  UserCheck,
  Star,
  Calendar,
  XCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";

export default function CustomerBookingDetailPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    try {
      const data = await apiClient.get<BookingListResponse>("/api/v1/bookings/me?limit=50");
      const found = data.items.find((b) => b.booking_id === bookingId);
      if (!found) {
        setError("Booking not found or not owned by your account.");
      } else {
        setBooking(found);
      }
      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("Failed to load booking details.");
      }
    }
  }, [bookingId]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
      return;
    }
    if (user && user.role !== "customer") {
      router.push("/worker/dashboard");
      return;
    }
    if (user && bookingId) {
      fetchBooking();
    }
  }, [user, isAuthLoading, bookingId, router, fetchBooking]);

  const handleCancelBooking = async () => {
    if (!booking || isCancelling) return;
    setIsCancelling(true);
    setError(null);
    setActionSuccess(null);

    try {
      const updated = await apiClient.patch<Booking>(`/api/v1/bookings/${bookingId}/cancel`);
      setBooking(updated);
      setIsCancelling(false);
      setShowCancelConfirmation(false);
      setActionSuccess("Booking was cancelled successfully.");
    } catch (err: unknown) {
      setIsCancelling(false);
      setShowCancelConfirmation(false);
      if (err instanceof ApiException) {
        if (err.statusCode === 409) {
          setError("This booking can no longer be cancelled. It may have already been completed or updated.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to cancel booking.");
      }
    }
  };

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner message="Retrieving booking details..." />;
  }

  const statusInfo = booking ? formatBookingStatus(booking.status) : null;

  const getStatusExplanation = (status: BookingStatus) => {
    switch (status) {
      case "pending":
        return "Waiting for worker response";
      case "accepted":
        return "Worker has accepted your request";
      case "rejected":
        return "Worker declined this request";
      case "cancelled":
        return "This booking was cancelled";
      case "completed":
        return "Service completed";
      default:
        return status;
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center gap-2">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Bookings</span>
        </Link>
      </div>

      {error && <ErrorAlert message={error} />}

      {actionSuccess && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {booking && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  Booking #{booking.booking_id.slice(0, 8)}
                </h1>
                <p className="text-xs text-slate-500">
                  Requested on {new Date(booking.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}
                </p>
              </div>
            </div>

            {statusInfo && (
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusInfo.color}`}
              >
                {statusInfo.label}
              </span>
            )}
          </div>

          {/* Status Context Banner */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-bold text-slate-900">
                {getStatusExplanation(booking.status)}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Updated {new Date(booking.updated_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          {/* Worker Info */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-slate-500" />
              <span>Assigned Professional</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-slate-900">
                  {booking.worker_name || "Worker"}
                </div>
                {booking.category && (
                  <div className="text-xs text-slate-500 font-medium">{booking.category}</div>
                )}
              </div>
              {booking.worker_rating !== undefined && booking.worker_rating !== null && (
                <div className="flex items-center gap-1 text-sm font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-xs">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{booking.worker_rating > 0 ? booking.worker_rating.toFixed(2) : "New"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Service Request Description */}
          {booking.description && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <span>Service Request</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {booking.description}
              </p>
            </div>
          )}

          {/* Schedule & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span>Scheduled Appointment</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {booking.scheduled_time
                  ? new Date(booking.scheduled_time).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Flexible / As soon as possible"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>Your Notes</span>
              </div>
              <div className="text-xs text-slate-700 italic">
                {booking.notes ? `"${booking.notes}"` : "No special instructions provided"}
              </div>
            </div>
          </div>

          {/* Cancellation Action for Pending or Accepted Bookings */}
          {(booking.status === "pending" || booking.status === "accepted") && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              {showCancelConfirmation ? (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-5 space-y-3">
                  <div className="text-sm font-bold text-red-950 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span>Are you sure you want to cancel this booking?</span>
                  </div>
                  <p className="text-xs text-red-800">
                    Cancelling will notify the worker and free your service request to match other available trade professionals.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleCancelBooking}
                      disabled={isCancelling}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 text-xs shadow transition disabled:opacity-50"
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <span>Yes, Cancel Booking</span>
                      )}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirmation(false)}
                      disabled={isCancelling}
                      className="rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Keep Booking
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Need to make adjustments or cancel?</span>
                  <button
                    onClick={() => setShowCancelConfirmation(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 py-2 px-4 text-xs font-bold transition"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Cancel Booking</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
