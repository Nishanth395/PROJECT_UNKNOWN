import React from "react";
import Link from "next/link";
import { WorkerFeedItem } from "@/types/worker-feed";
import { formatUrgency } from "@/lib/utils";
import { MapPin, Clock, ArrowRight, Sparkles, Check } from "lucide-react";

interface JobFeedCardProps {
  item: WorkerFeedItem;
}

export function JobFeedCard({ item }: JobFeedCardProps) {
  const urgencyInfo = formatUrgency(item.urgency);
  const dateFormatted = new Date(item.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      data-testid="job-feed-card"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-400 hover:shadow-md space-y-4"
    >
      {/* Top Header: Category & Urgency */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          {item.category && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
              <Sparkles className="h-3 w-3" />
              {item.category}
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${urgencyInfo.color}`}
          >
            {urgencyInfo.label} Urgency
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{dateFormatted}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm font-semibold text-slate-900 leading-relaxed line-clamp-3">
        {item.description}
      </p>

      {/* Matched Skills */}
      <div className="space-y-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Matched Skills You Offer
        </div>
        <div className="flex flex-wrap gap-1.5">
          {item.matched_skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2.5 py-0.5 text-xs font-medium"
            >
              <Check className="h-3 w-3 text-emerald-600" />
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Footer: Distance & Action */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <MapPin className="h-4 w-4 text-blue-600" />
          <span>{item.distance_km.toFixed(2)} km away</span>
          {item.address_text && (
            <span className="text-slate-400 font-normal">({item.address_text})</span>
          )}
        </div>

        <Link
          href={`/worker/feed/${item.request_id}`}
          className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-xs shadow-sm transition"
        >
          <span>View Job</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
