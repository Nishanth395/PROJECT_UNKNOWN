"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { WorkerMatchResponse } from "@/types/worker-match";
import { WorkerCard } from "@/components/worker-card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import { ArrowLeft, Users, ShieldCheck, MapPinOff, ArrowRight } from "lucide-react";

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
      {/* Back navigation */}
      <Link
        href={`/requests/${requestId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Request Details</span>
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Users className="h-5 w-5" />
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
        <LoadingSpinner message="Finding the best workers near you..." />
      ) : matchData && matchData.matches.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500 px-1">
            <span>
              Found {matchData.total_matches} qualified trade{" "}
              {matchData.total_matches === 1 ? "worker" : "workers"} in your area
            </span>
            <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>PostGIS Spatial Score Ranking</span>
            </div>
          </div>

          <div className="space-y-4">
            {matchData.matches.map((worker, index) => (
              <WorkerCard key={worker.worker_id} worker={worker} rank={index + 1} />
            ))}
          </div>
        </div>
      ) : (
        /* Empty Matches State */
        <div className="rounded-3xl border border-slate-200 bg-white p-10 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <MapPinOff className="h-7 w-7" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">
              We couldn&apos;t find a suitable worker nearby.
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Try expanding your service location or describing the problem differently so our AI can match additional relevant trade skills.
            </p>
          </div>
          <div className="pt-3">
            <Link
              href={`/requests/${requestId}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 text-xs shadow transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Request Details</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
