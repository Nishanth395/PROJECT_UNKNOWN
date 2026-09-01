"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { WorkerFeedResponse } from "@/types/worker-feed";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import { JobFeedCard } from "@/components/job-feed-card";
import { Briefcase, RefreshCw, Layers, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function WorkerFeedPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [feed, setFeed] = useState<WorkerFeedResponse | null>(null);
  const [limit] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async (currentOffset = 0, isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<WorkerFeedResponse>(
        `/api/v1/workers/me/feed?limit=${limit}&offset=${currentOffset}`
      );
      setFeed(data);
      setOffset(currentOffset);
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (err: unknown) {
      setIsLoading(false);
      setIsRefreshing(false);
      if (err instanceof ApiException && err.statusCode === 404) {
        router.push("/worker/onboarding");
      } else if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("Failed to load nearby job feed. Please try again.");
      }
    }
  }, [limit, router]);

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
      fetchFeed(0);
    }
  }, [user, isAuthLoading, router, fetchFeed]);

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner message="Scanning for nearby service requests..." />;
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
              <span>Dashboard</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Live Job Dispatch
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Nearby Service Requests
          </h1>
          <p className="text-sm text-slate-600">
            Real-time active customer requests matching your trade skills and operating radius.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchFeed(offset, true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Feed"}</span>
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Feed List */}
      {feed && feed.requests.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>
              Showing {feed.requests.length} of {feed.total_requests} active jobs
            </span>
            <span>Sorted deterministically by Urgency & Distance</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feed.requests.map((item) => (
              <JobFeedCard key={item.request_id} item={item} />
            ))}
          </div>

          {/* Pagination Controls */}
          {feed.total_requests > limit && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <button
                disabled={offset === 0}
                onClick={() => fetchFeed(Math.max(0, offset - limit))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">
                Page {Math.floor(offset / limit) + 1} of {Math.ceil(feed.total_requests / limit)}
              </span>
              <button
                disabled={offset + limit >= feed.total_requests}
                onClick={() => fetchFeed(offset + limit)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
            <Briefcase className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">
              No suitable jobs nearby right now.
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              New matching requests from customers in your operating radius will automatically appear here once posted. You can also expand your skills to match more trades.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fetchFeed(0, true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold px-4 py-2.5 shadow-sm hover:bg-slate-800 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Check for New Jobs</span>
            </button>
            <Link
              href="/worker/skills"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 hover:bg-slate-50 transition"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Update Service Skills</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
