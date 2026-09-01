"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { BookingListResponse, Booking } from "@/types/booking";
import { formatBookingStatus, formatUrgency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import { JobCompletionModal } from "@/components/job-completion-modal";
import {
  ArrowLeft,
  Briefcase,
  CalendarCheck,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
} from "lucide-react";

export default function WorkerJobDetailPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [completionSuccess, setCompletionSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<BookingListResponse>("/api/v1/bookings/me?limit=50");
      const found = data.items.find((b) => b.booking_id === jobId);
      if (!found) {
        setError("Job engagement not found or not assigned to your account.");
      } else {
        setBooking(found);
      }
      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("Failed to retrieve job details.");
      }
    }
  }, [jobId]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
      return;
    }
    if (user && user.role !== "worker") {
      router.push("/dashboard");
      return;
    }
    if (user && jobId) {
      fetchJob();
    }
  }, [user, isAuthLoading, jobId, router, fetchJob]);

  const handleCompletionSuccess = async () => {
    setIsModalOpen(false);
    setCompletionSuccess(true);
    // Re-fetch authoritative state from backend as required
    await fetchJob();
  };

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner message="Loading job details..." />;
  }

  const statusInfo = booking ? formatBookingStatus(booking.status) : null;
  const urgencyInfo = booking?.urgency ? formatUrgency(booking.urgency) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/worker/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Active Jobs</span>
        </Link>
        <button
          onClick={fetchJob}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchJob} />}

      {completionSuccess && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>Job successfully marked as completed! Both booking and service request records are updated.</span>
        </div>
      )}

      {booking && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Briefcase className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">
                  Job #{booking.booking_id.slice(0, 8)}
                </h1>
                <p className="text-xs text-slate-500">
                  Engagement requested on {new Date(booking.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {urgencyInfo && (
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${urgencyInfo.color}`}>
                  {urgencyInfo.label} Urgency
                </span>
              )}
              {statusInfo && (
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              )}
            </div>
          </div>

          {/* Customer Summary */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span>Customer Information</span>
            </div>
            <div className="text-base font-bold text-slate-900">
              {booking.customer_name || "Customer"}
            </div>
            {booking.category && (
              <div className="text-xs text-slate-500 font-medium">Trade Category: {booking.category}</div>
            )}
          </div>

          {/* Service Description */}
          {booking.description && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <span>Problem Description</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200 leading-relaxed whitespace-pre-wrap">
                {booking.description}
              </p>
            </div>
          )}

          {/* Schedule & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                <span>Scheduled Time</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {booking.scheduled_time
                  ? new Date(booking.scheduled_time).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Flexible / ASAP"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>Customer Instructions</span>
              </div>
              <div className="text-xs text-slate-700 italic">
                {booking.notes ? `"${booking.notes}"` : "No special instructions provided"}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          {booking.status === "accepted" && (
            <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Job in progress. Once you have delivered the service, mark it as completed.
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-5 text-xs shadow-md transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Complete Job</span>
              </button>
            </div>
          )}

          {booking.status === "completed" && (
            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-xs font-semibold text-blue-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span>This job was completed on {new Date(booking.updated_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.</span>
            </div>
          )}
        </div>
      )}

      {/* Completion Modal */}
      {booking && (
        <JobCompletionModal
          booking={booking}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleCompletionSuccess}
        />
      )}
    </div>
  );
}
