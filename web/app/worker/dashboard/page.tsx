"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import {
  Briefcase,
  Star,
  ShieldCheck,
  MapPin,
  Clock,
  CheckCircle2,
  Inbox,
  Sparkles,
} from "lucide-react";

interface WorkerProfileData {
  worker_id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  experience_years: number;
  service_radius_km: number;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  is_verified: boolean;
  rating: number;
  total_reviews: number;
  skills: Array<{
    skill_id: string;
    skill_name: string;
    category: string;
    experience_years?: number;
  }>;
}

export default function WorkerDashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<WorkerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isToggling, setIsToggling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<WorkerProfileData>("/api/v1/workers/me");
      setProfile(data);
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        if (err.statusCode === 404) {
          setError("Worker profile not created yet. Please complete worker setup.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to load worker profile.");
      }
    } finally {
      setIsLoading(false);
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
      fetchProfile();
    }
  }, [user, isAuthLoading, router, fetchProfile]);

  const toggleAvailability = async () => {
    if (!profile) return;
    setIsToggling(true);
    try {
      const updated = await apiClient.patch<WorkerProfileData>("/api/v1/workers/me", {
        is_available: !profile.is_available,
      });
      setProfile(updated);
    } catch (err: any) {
      setError(err.message || "Failed to update availability");
    } finally {
      setIsToggling(false);
    }
  };

  if (isAuthLoading || (isLoading && !profile)) {
    return <LoadingSpinner message="Loading worker dashboard..." />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Worker Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Manage your trade availability, operating radius, and assigned skills.
          </p>
        </div>

        {profile && (
          <button
            onClick={toggleAvailability}
            disabled={isToggling}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
              profile.is_available
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-slate-200 hover:bg-slate-300 text-slate-700"
            }`}
          >
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                profile.is_available ? "bg-white animate-pulse" : "bg-slate-400"
              }`}
            />
            <span>{profile.is_available ? "Online (Available for Jobs)" : "Offline (Unavailable)"}</span>
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchProfile} />}

      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Overview Card */}
          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
                  {profile.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{profile.email || "No email"}</p>
              </div>

              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-amber-700 font-bold text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{profile.rating > 0 ? profile.rating.toFixed(2) : "New"}</span>
                <span className="text-xs font-normal text-amber-600">({profile.total_reviews})</span>
              </div>
            </div>

            {profile.bio && (
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bio</span>
                <p className="text-sm text-slate-700 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Skills */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Assigned Trade Skills ({profile.skills.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span
                    key={s.skill_id}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    {s.skill_name} ({s.category})
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Operational Metrics */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Operating Parameters
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Experience</span>
                  <span className="font-bold text-slate-900">{profile.experience_years} years</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Service Radius</span>
                  <span className="font-bold text-slate-900">{profile.service_radius_km} km</span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Coordinates</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {profile.latitude?.toFixed(4)}, {profile.longitude?.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Service Requests Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center space-y-2">
              <Inbox className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900">No service requests yet</h3>
              <p className="text-xs text-slate-500">
                Incoming customer job assignments will appear here in the next phase.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
