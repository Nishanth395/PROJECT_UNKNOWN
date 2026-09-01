import React from "react";
import { MatchedWorker } from "@/types/worker-match";
import { Star, ShieldCheck, MapPin, Briefcase, Check } from "lucide-react";

interface WorkerCardProps {
  worker: MatchedWorker;
  rank?: number;
}

export function WorkerCard({ worker, rank }: WorkerCardProps) {
  return (
    <div
      data-testid="worker-card"
      className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-slate-300"
    >
      {/* Optional Rank Badge */}
      {rank && (
        <div className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow">
          #{rank}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        {/* Main Details */}
        <div className="space-y-3 flex-1">
          {/* Worker Name & Verified Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold text-slate-900">{worker.name}</h3>
            {worker.is_verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                <span>Verified</span>
              </span>
            )}
          </div>

          {/* Rating & Reviews */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-1 font-bold text-slate-900">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span>{worker.rating > 0 ? worker.rating.toFixed(2) : "New"}</span>
            </div>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600 font-medium">
              {worker.total_reviews} {worker.total_reviews === 1 ? "review" : "reviews"}
            </span>
          </div>

          {/* Matched Skills */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Matched Skills
            </div>
            <div className="flex flex-wrap gap-1.5">
              {worker.matched_skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800 border border-slate-200/60"
                >
                  <Check className="h-3 w-3 text-emerald-600" />
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Distance & Experience Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{worker.distance_km.toFixed(2)} km away</span>
            </div>
            <span className="text-slate-200">•</span>
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
              <span>{worker.experience_years.toFixed(0)} years experience</span>
            </div>
          </div>
        </div>

        {/* Match Score Display */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100 sm:min-w-[140px]">
          <div className="sm:text-right">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Match Score
            </div>
            <div className="text-3xl font-black text-blue-600 tracking-tight">
              {worker.match_score.toFixed(2)}%
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Skill • Distance • Rating
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
