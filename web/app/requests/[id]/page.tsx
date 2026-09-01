"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  AlertCircle,
  Loader2,
  FileText,
  RefreshCw,
  Cpu,
} from "lucide-react";

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

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
          provider: "AI",
          model: "Standard",
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
    setExtractionError(null);

    try {
      const result = await apiClient.post<ExtractionResponse>(
        `/api/v1/service-requests/${requestId}/extract`
      );
      setExtraction(result);
      // Refresh request data to keep state in sync
      await fetchRequest();
    } catch (err: unknown) {
      setExtractionError("We couldn't understand the request right now.");
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
      <div className="mx-auto max-w-3xl px-4 py-8 text-center space-y-4">
        <p className="text-slate-500">Service request not found.</p>
        <Link href="/requests" className="inline-block font-semibold text-blue-600">
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

  const categoryName = extraction?.category || request.extracted_category;
  const skillsList = extraction?.skills || request.extracted_skills || [];
  const confidenceScore = extraction?.confidence ? Math.round(extraction.confidence * 100) : 90;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Back button */}
      <Link
        href="/requests"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to My Requests</span>
      </Link>

      {error && <ErrorAlert message={error} />}

      {/* SECTION 1: REQUEST OVERVIEW */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${urgencyInfo.color}`}>
              {urgencyInfo.label} Urgency
            </span>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Submitted {new Date(request.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Customer Problem Description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
            <FileText className="h-3.5 w-3.5" />
            <span>Original Customer Problem Description</span>
          </div>
          <p className="text-base text-slate-900 font-medium leading-relaxed whitespace-pre-wrap bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            {request.raw_description}
          </p>
        </div>

        {/* Service Location Details */}
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span>Service Dispatch Location</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-700">
            <div>
              <span className="text-slate-400 font-medium">Coordinates: </span>
              <strong>
                {request.latitude?.toFixed(4)}, {request.longitude?.toFixed(4)}
              </strong>
            </div>
            {request.address_text && (
              <div>
                <span className="text-slate-400 font-medium">Landmark: </span>
                <strong>{request.address_text}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: AI UNDERSTANDING */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                AI Service Requirement Understanding
              </h2>
              <p className="text-xs text-slate-500">
                Natural-language intent mapped to standardized trade categories and skills
              </p>
            </div>
          </div>
        </div>

        {/* Extraction Error Alert */}
        {extractionError && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-800 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span>{extractionError}</span>
            </div>
            <button
              onClick={handleExtractAI}
              className="inline-flex items-center gap-1.5 bg-red-100 hover:bg-red-200 font-bold px-3 py-1.5 rounded-lg text-red-900 transition self-start sm:self-auto"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Try again</span>
            </button>
          </div>
        )}

        {/* AI State 1: Analyzing */}
        {isExtracting ? (
          <div className="py-10 text-center space-y-3 rounded-2xl bg-purple-50/50 border border-purple-100">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
            <p className="text-sm font-bold text-slate-900">
              Understanding your problem...
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Analyzing symptoms, classifying trade domain, and identifying canonical skills.
            </p>
          </div>
        ) : hasExtractedSkills ? (
          /* AI State 2: Analyzed */
          <div className="space-y-5 rounded-2xl border border-purple-100 bg-purple-50/40 p-6">
            <div className="flex items-center justify-between border-b border-purple-100/80 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                  Detected Domain Category
                </span>
                <div className="text-2xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
                  {categoryName}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                  AI Confidence
                </span>
                <div className="text-sm font-extrabold text-purple-700 mt-0.5">
                  {confidenceScore}% confidence
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Required Canonical Skills
              </span>
              <div className="flex flex-wrap gap-2">
                {skillsList.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-purple-200 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    <span>{skill}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-purple-500" />
              <span>Interpreted automatically from customer description</span>
            </div>

            {/* CTA to Match Workers */}
            <div className="pt-4 border-t border-purple-100/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <p className="text-xs text-slate-600">
                Skills identified. You can now discover matching nearby trade specialists.
              </p>

              <Link
                href={`/requests/${request.id}/matches`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-3.5 shadow-md hover:shadow-lg transition"
              >
                <Users className="h-4 w-4 text-blue-400" />
                <span>Find Nearby Workers</span>
              </Link>
            </div>
          </div>
        ) : (
          /* AI State 3: Not Analyzed */
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-4">
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Run AI analysis to extract required trade skills from your description and unlock worker recommendations.
            </p>
            <button
              onClick={handleExtractAI}
              className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-6 py-3 shadow transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>Analyze my problem</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
