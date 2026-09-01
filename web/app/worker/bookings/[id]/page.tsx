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
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function WorkerBookingDetailPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    try {
      const data = await apiClient.get<BookingListResponse>("/api/v1/bookings/me?limit=50");
      const found = data.items.find((b) => b.booking_id === bookingId);
      if (!found) {
        setError("Booking not found or not assigned to your worker profile.");
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
    if (user && user.role !== "worker") {
      router.push("/dashboard");
      return;
    }
    if (user && bookingId) {
      fetchBooking();
    }
  }, [user, isAuthLoading, bookingId, router, fetchBooking]);

  const handleUpdateStatus = async (newStatus: "accepted" | "rejected") => {
    if (!booking || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    setActionSuccess(null);

    try {
      const updated = await apiClient.patch<Booking>(`/api/v1/bookings/${bookingId}/status`, {
        status: newStatus,
      });
      setBooking(updated);
      setIsProcessing(false);
      setActionSuccess(
        newStatus === "accepted"
          ? "Booking accepted successfully! The customer request has been booked."
          : "Booking was declined."
      );
    } catch (err: unknown) {
      setIsProcessing(false);
      if (err instanceof ApiException) {
        if (err.statusCode === 409) {
          setError("This booking is no longer available. It may have already been accepted or changed.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to update booking status.");
      }
    }
  };

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner message="Retrieving booking details..." />;
  }

  const statusInfo = booking ? formatBookingStatus(booking.status) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center gap-2">
        <Link
          href="/worker/bookings"
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
                  Received on {new Date(booking.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}
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

          {/* Customer & Problem Description */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span>Customer Profile</span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {booking.customer_name || "Customer"}
              </div>
            </div>

            {booking.description && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Service Request Description
                </div>
                <p className="text-sm font-semibold text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {booking.description}
                </p>
              </div>
            )}
          </div>

          {/* Schedule & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span>Requested Schedule</span>
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
                <span>Customer Notes</span>
              </div>
              <div className="text-xs text-slate-700 italic">
                {booking.notes ? `"${booking.notes}"` : "No extra notes provided"}
              </div>
            </div>
          </div>

          {/* Action Buttons for Pending Booking */}
          {booking.status === "pending" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-4">
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>Pending Booking Decision</span>
                </div>
                <p className="text-xs text-amber-800">
                  Accepting will confirm your engagement and mark the customer&apos;s request as booked.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={() => handleUpdateStatus("accepted")}
                  disabled={isProcessing}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 text-sm shadow-md transition disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>Accept Booking</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus("rejected")}
                  disabled={isProcessing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-red-50 hover:text-red-700 text-slate-700 font-bold py-3 px-6 text-sm transition disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Decline</span>
                </button>
              </div>
            </div>
          )}

          {/* Status Message for Completed / Accepted / Rejected */}
          {booking.status !== "pending" && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">
                Booking Status: {statusInfo?.label}
              </div>
              <p>
                {booking.status === "accepted" &&
                  "You have accepted this booking. Please coordinate with the customer at the scheduled time."}
                {booking.status === "rejected" &&
                  "You declined this booking request."}
                {booking.status === "completed" &&
                  "This job has been marked as completed."}
                {booking.status === "cancelled" &&
                  "This booking was cancelled."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
