"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { WorkerFeedResponse, WorkerFeedItem } from "@/types/worker-feed";
import { BookingListResponse, Booking } from "@/types/booking";
import { formatUrgency, formatStatus } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";

export default function WorkerJobDetailPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [job, setJob] = useState<WorkerFeedItem | null>(null);
  const [existingBooking, setExistingBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
      return;
    }
    if (user && user.role !== "worker") {
      router.push("/dashboard");
      return;
    }
    if (user && requestId) {
      // 1. Fetch worker feed to locate job
      Promise.all([
        apiClient.get<WorkerFeedResponse>("/api/v1/workers/me/feed?limit=50"),
        apiClient.get<BookingListResponse>("/api/v1/bookings/me?limit=50"),
      ])
        .then(([feedData, bookingsData]) => {
          const matchedItem = feedData.requests.find((r) => r.request_id === requestId);
          const matchedBooking = bookingsData.items.find((b) => b.service_request_id === requestId);

          if (matchedItem) {
            setJob(matchedItem);
          } else if (matchedBooking) {
            // Reconstruct minimal job item from booking
            setJob({
              request_id: requestId,
              description: matchedBooking.description || "Service Request",
              category: matchedBooking.category,
              matched_skills: [],
              urgency: (matchedBooking.urgency as any) || "normal",
              distance_km: 0,
              created_at: matchedBooking.created_at,
              status: "booked",
            });
          } else {
            setError("Service request not found in your current active dispatch area.");
          }

          if (matchedBooking) {
            setExistingBooking(matchedBooking);
          }
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          setIsLoading(false);
          if (err instanceof ApiException) {
            setError(err.message);
          } else {
            setError("Failed to load service request details.");
          }
        });
    }
  }, [user, isAuthLoading, requestId, router]);

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner message="Retrieving service request details..." />;
  }

  const urgencyInfo = job ? formatUrgency(job.urgency) : null;
  const statusInfo = job ? formatStatus(job.status) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center gap-2">
        <Link
          href="/worker/feed"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Job Feed</span>
        </Link>
      </div>

      {error && <ErrorAlert message={error} />}

      {job && (
        <div className="space-y-6">
          {/* Main Job Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                {job.category && (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    {job.category}
                  </span>
                )}
                {urgencyInfo && (
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${urgencyInfo.color}`}
                  >
                    {urgencyInfo.label} Urgency
                  </span>
                )}
              </div>

              {statusInfo && (
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Customer Problem Statement
              </h2>
              <p className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                {job.description}
              </p>
            </div>

            {/* Skills & Distance Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Matched Skills You Provide
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {job.matched_skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-medium"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Location & Timing
                </div>
                <div className="space-y-1 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>{job.distance_km > 0 ? `${job.distance_km.toFixed(2)} km away` : "Nearby"}</span>
                    {job.address_text && <span className="text-slate-400">({job.address_text})</span>}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="h-4 w-4" />
                    <span>Posted {new Date(job.created_at).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking State Notice */}
            {existingBooking ? (
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-blue-900">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold flex items-center gap-1.5">
                    <CalendarCheck className="h-4 w-4 text-blue-600" />
                    <span>You have an existing booking for this request</span>
                  </div>
                  <div className="text-xs text-blue-700">
                    Current Status: <strong className="uppercase">{existingBooking.status}</strong>
                  </div>
                </div>

                <Link
                  href={`/worker/bookings/${existingBooking.booking_id}`}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 text-center transition shadow-sm"
                >
                  Manage Booking
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-slate-500" />
                  <span>Marketplace Engagement Workflow</span>
                </div>
                <p>
                  Customers browse matched verified professionals and initiate bookings. When this customer selects you, a pending booking will appear in your <strong>Bookings</strong> inbox where you can accept or decline the engagement.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
