"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { ServiceRequest } from "@/types/service-request";
import { ExtractionResponse } from "@/types/extraction";
import { formatStatus, formatUrgency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import {
  Sparkles,
  Users,
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const requestId = params.id as string;

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ServiceRequest>(
        `/api/v1/service-requests/${requestId}`
      );
      setRequest(data);
      if (data.extracted_category && data.extracted_skills?.length > 0) {
        setExtraction({
          request_id: data.id,
          category: data.extracted_category,
          skills: data.extracted_skills,
          urgency: data.urgency,
          confidence: 0.9,
          provider: "gemini/fallback",
          model: "standard",
        });
      }
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("Failed to load service request details.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (requestId) {
      fetchRequest();
    }
  }, [requestId, fetchRequest]);

  const handleExtractAI = async () => {
    setIsExtracting(true);
    setError(null);

    try {
      const result = await apiClient.post<ExtractionResponse>(
        `/api/v1/service-requests/${requestId}/extract`
      );
      setExtraction(result);
      // Refresh request
      await fetchRequest();
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("AI extraction failed. Please try again.");
      }
    } finally {
      setIsExtracting(false);
    }
  };

  if (isLoading && !request) {
    return <LoadingSpinner message="Loading request details..." />;
  }

  if (error && !request) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ErrorAlert message={error} onRetry={fetchRequest} />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-slate-500">Service request not found.</p>
        <Link href="/requests" className="mt-4 inline-block font-semibold text-blue-600">
          ← Back to Requests
        </Link>
      </div>
    );
  }

  const urgencyInfo = formatUrgency(request.urgency);
  const statusInfo = formatStatus(request.status);
  const hasExtractedSkills =
    (extraction && extraction.skills.length > 0) ||
    (request.extracted_skills && request.extracted_skills.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Back button */}
      <Link
        href="/requests"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to My Requests</span>
      </Link>

      {error && <ErrorAlert message={error} />}

      {/* Main Request Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${urgencyInfo.color}`}
            >
              {urgencyInfo.label} Urgency
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {new Date(request.created_at).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
        </div>

        {/* Problem Description */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Problem Description
          </h2>
          <p className="text-base text-slate-900 font-medium leading-relaxed whitespace-pre-wrap">
            {request.raw_description}
          </p>
        </div>

        {/* Location Info */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span>Service Location</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div>
              <span className="text-slate-500">Coordinates: </span>
              <strong>
                {request.latitude?.toFixed(4)}, {request.longitude?.toFixed(4)}
              </strong>
            </div>
            {request.address_text && (
              <div>
                <span className="text-slate-500">Address: </span>
                <strong>{request.address_text}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Extraction Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                AI Service Requirement Extraction
              </h3>
              <p className="text-xs text-slate-500">
                Natural-language intent mapped to canonical catalogue skills
              </p>
            </div>
          </div>

          {!hasExtractedSkills && !isExtracting && (
            <button
              onClick={handleExtractAI}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 shadow transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Analyze my request</span>
            </button>
          )}
        </div>

        {isExtracting ? (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
            <p className="text-sm font-semibold text-slate-800">
              Understanding your problem...
            </p>
            <p className="text-xs text-slate-500">
              Identifying required domain category and matching canonical skills
            </p>
          </div>
        ) : hasExtractedSkills ? (
          <div className="space-y-4 rounded-xl border border-purple-100 bg-purple-50/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-3">
              <div>
                <span className="text-xs font-medium text-slate-500">Detected Category</span>
                <div className="text-lg font-extrabold text-slate-900">
                  {extraction?.category || request.extracted_category}
                </div>
              </div>

              {extraction?.confidence && (
                <div className="text-right">
                  <span className="text-xs font-medium text-slate-500">AI Confidence</span>
                  <div className="text-sm font-bold text-purple-700">
                    {Math.round(extraction.confidence * 100)}%
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Extracted Canonical Skills
              </span>
              <div className="flex flex-wrap gap-2">
                {(extraction?.skills || request.extracted_skills).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-purple-200 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Next Step: Match Workers */}
            <div className="pt-4 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-600">
                Skills extracted successfully. You can now discover matching local workers.
              </p>

              <Link
                href={`/requests/${request.id}/matches`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-3 shadow transition"
              >
                <Users className="h-4 w-4" />
                <span>Find Nearby Workers</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 space-y-2">
            <p>
              Click <strong>&quot;Analyze my request&quot;</strong> above to trigger AI skill classification and unlock nearby worker matching.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
