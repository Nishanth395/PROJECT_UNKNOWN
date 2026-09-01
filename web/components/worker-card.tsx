import React from "react";
import { MatchedWorker } from "@/types/worker-match";
import { Star, ShieldCheck, MapPin, Briefcase, Award } from "lucide-react";

interface WorkerCardProps {
  worker: MatchedWorker;
  rank?: number;
}

export function WorkerCard({ worker, rank }: WorkerCardProps) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Rank badge */}
      {rank && (
        <div className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow">
          #{rank}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Worker Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{worker.name}</h3>
            {worker.is_verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified
              </span>
            )}
          </div>

          {/* Rating & Reviews */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-1 text-amber-500 font-semibold">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span>{worker.rating > 0 ? worker.rating.toFixed(2) : "New"}</span>
            </div>
            <span>•</span>
            <span>{worker.total_reviews} reviews</span>
          </div>

          {/* Matched Skills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {worker.matched_skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Match Score & Metrics */}
        <div className="flex flex-row sm:flex-col sm:items-end justify-between items-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 gap-3">
          <div className="text-left sm:text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Match Score
            </div>
            <div className="text-2xl font-black text-blue-600">
              {worker.match_score.toFixed(1)}%
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{worker.distance_km.toFixed(2)} km away</span>
            </div>
            <div className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
              <span>{worker.experience_years.toFixed(0)} yrs experience</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
