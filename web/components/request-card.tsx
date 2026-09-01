import React from "react";
import Link from "next/link";
import { ServiceRequest } from "@/types/service-request";
import { formatStatus, formatUrgency } from "@/lib/utils";
import { ArrowRight, Clock, MapPin, Sparkles } from "lucide-react";

interface RequestCardProps {
  request: ServiceRequest;
}

export function RequestCard({ request }: RequestCardProps) {
  const urgencyInfo = formatUrgency(request.urgency);
  const statusInfo = formatStatus(request.status);
  const dateFormatted = new Date(request.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      href={`/requests/${request.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
    >
      <div className="flex flex-col gap-3">
        {/* Top bar: Category + Status / Urgency */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {request.extracted_category ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                <Sparkles className="h-3 w-3" />
                {request.extracted_category}
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500">Unclassified</span>
            )}
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${urgencyInfo.color}`}
            >
              {urgencyInfo.label}
            </span>
          </div>

          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm font-medium text-slate-800 line-clamp-2">
          {request.raw_description}
        </p>

        {/* Skills Preview */}
        {request.extracted_skills && request.extracted_skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {request.extracted_skills.map((skill) => (
              <span
                key={skill}
                className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Footer: Date, Location indicator, and CTA */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {dateFormatted}
            </span>
            {request.latitude !== null && request.longitude !== null && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                GPS Coordinates
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 font-semibold text-blue-600 group-hover:translate-x-0.5 transition">
            <span>View</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
