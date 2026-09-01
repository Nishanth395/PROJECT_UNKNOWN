"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { WorkerMatchResponse, MatchedWorker } from "@/types/worker-match";
import { WorkerCard } from "@/components/worker-card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import { ArrowLeft, Users, ShieldCheck, Sparkles } from "lucide-react";

export default function WorkerMatchesPage() {
  const params = useParams();
  const requestId = params.id as string;

  const [matchData, setMatchData] = useState<WorkerMatchResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<WorkerMatchResponse>(
        `/api/v1/service-requests/${requestId}/matches?limit=10`
      );
      setMatchData(data);
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("Failed to retrieve matching workers.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (requestId) {
      fetchMatches();
    }
  }, [requestId, fetchMatches]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Back button */}
      <Link
        href={`/requests/${requestId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Request Details</span>
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <Users className="h-4 w-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Recommended Workers
          </h1>
        </div>
        <p className="text-sm text-slate-600">
          Matched based on skills, distance, experience and rating.
        </p>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchMatches} />}

      {isLoading ? (
        <LoadingSpinner message="Finding nearby qualified workers..." />
      ) : matchData && matchData.matches.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>
              Found {matchData.total_matches} qualified{" "}
              {matchData.total_matches === 1 ? "worker" : "workers"} in your area
            </span>
            <div className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Deterministic PostGIS Ranking</span>
            </div>
          </div>

          <div className="space-y-3">
            {matchData.matches.map((worker, index) => (
              <WorkerCard key={worker.worker_id} worker={worker} rank={index + 1} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Users className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">No Workers Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              We couldn&apos;t find any available skilled workers matching the required skills within your location&apos;s operating radius.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={`/requests/${requestId}`}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 text-sm shadow transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Request</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
