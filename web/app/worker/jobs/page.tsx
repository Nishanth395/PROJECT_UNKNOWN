"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { BookingListResponse } from "@/types/booking";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import { ActiveJobCard } from "@/components/active-job-card";
import {
  Briefcase,
  ArrowLeft,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
} from "lucide-react";

export default function WorkerActiveJobsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<BookingListResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveJobs = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<BookingListResponse>(
        "/api/v1/bookings/me?status=accepted&limit=50"
      );
      setJobs(data);
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (err: unknown) {
      setIsLoading(false);
      setIsRefreshing(false);
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("Failed to retrieve active jobs.");
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
      return;
    }
    if (user && user.role !== "worker") {
      router.push("/dashboard");
      return;
    }
    if (user) {
      fetchActiveJobs();
    }
  }, [user, isAuthLoading, router, fetchActiveJobs]);

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner message="Loading your active jobs..." />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/worker/dashboard"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Worker Hub</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Active Engagements
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Active Jobs
          </h1>
          <p className="text-sm text-slate-600">
            Track confirmed bookings, coordinate with customers, and mark finished engagements as completed.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchActiveJobs(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
          <Link
            href="/worker/feed"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 text-xs shadow-sm transition"
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Browse Job Feed</span>
          </Link>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={() => fetchActiveJobs(false)} />}

      {/* Active Jobs Grid */}
      {jobs && jobs.items.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>You have {jobs.total} active / accepted job{jobs.total !== 1 ? "s" : ""}</span>
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
              ● Ready for Execution
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.items.map((booking) => (
              <ActiveJobCard key={booking.booking_id} booking={booking} />
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              No active jobs in progress
            </h3>
            <p className="text-xs text-slate-500">
              When you accept pending customer bookings from your feed or booking inbox, they will appear here ready for execution.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/worker/bookings?status=pending"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Check Pending Bookings</span>
            </Link>
            <Link
              href="/worker/feed"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold px-4 py-2.5 shadow-sm hover:bg-slate-800 transition"
            >
              <Briefcase className="h-3.5 w-3.5 text-blue-400" />
              <span>Explore Nearby Jobs</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
