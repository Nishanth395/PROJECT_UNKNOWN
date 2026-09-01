"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { WorkerProfile, WorkerProfileUpdateInput } from "@/types/worker-profile";
import { WorkerFeedResponse } from "@/types/worker-feed";
import { BookingListResponse } from "@/types/booking";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import { JobFeedCard } from "@/components/job-feed-card";
import { WorkerBookingCard } from "@/components/worker-booking-card";
import {
  Star,
  ShieldCheck,
  MapPin,
  Briefcase,
  Layers,
  CalendarCheck,
  Clock,
  ArrowRight,
  RefreshCw,
  Loader2,
} from "lucide-react";

export default function WorkerDashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [feed, setFeed] = useState<WorkerFeedResponse | null>(null);
  const [pendingBookings, setPendingBookings] = useState<BookingListResponse | null>(null);
  const [confirmedBookings, setConfirmedBookings] = useState<BookingListResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkerData = useCallback(async () => {
    setError(null);
    try {
      const profileData = await apiClient.get<WorkerProfile>("/api/v1/workers/me");
      setProfile(profileData);

      // Fetch feed and bookings in parallel
      const [feedData, pendingData, confirmedData] = await Promise.all([
        apiClient.get<WorkerFeedResponse>("/api/v1/workers/me/feed?limit=4"),
        apiClient.get<BookingListResponse>("/api/v1/bookings/me?status=pending&limit=3"),
        apiClient.get<BookingListResponse>("/api/v1/bookings/me?status=accepted&limit=3"),
      ]);

      setFeed(feedData);
      setPendingBookings(pendingData);
      setConfirmedBookings(confirmedData);
      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof ApiException && err.statusCode === 404) {
        router.push("/worker/onboarding");
      } else if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("Failed to load worker dashboard data.");
      }
    }
  }, [router]);

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
      loadWorkerData();
    }
  }, [user, isAuthLoading, router, loadWorkerData]);

  const handleToggleAvailability = async () => {
    if (!profile || isTogglingAvailability) return;
    setIsTogglingAvailability(true);
    setError(null);

    const nextState = !profile.is_available;
    try {
      const updated = await apiClient.patch<WorkerProfile>("/api/v1/workers/me", {
        is_available: nextState,
      });
      setProfile(updated);

      // Refresh feed based on new availability
      const feedData = await apiClient.get<WorkerFeedResponse>("/api/v1/workers/me/feed?limit=4");
      setFeed(feedData);
      setIsTogglingAvailability(false);
    } catch (err: unknown) {
      setIsTogglingAvailability(false);
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError("Failed to update availability toggle.");
      }
    }
  };

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner message="Loading worker dashboard..." />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero / Overview Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Worker Hub
              </span>
              {profile?.is_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Verified Pro
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {profile?.full_name || user?.full_name || "Worker Dashboard"}
            </h1>

            {profile?.bio && (
              <p className="text-sm text-slate-600 max-w-2xl">{profile.bio}</p>
            )}

            {/* Profile Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-1 font-semibold text-slate-900">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span>{profile?.rating ? profile.rating.toFixed(2) : "New"}</span>
                <span className="text-slate-400 font-normal">
                  ({profile?.total_reviews || 0} reviews)
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Briefcase className="h-4 w-4 text-slate-400" />
                <span>{profile?.experience_years} years experience</span>
              </div>

              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{profile?.service_radius_km} km radius</span>
                {profile?.address_text && (
                  <span className="text-slate-400">({profile.address_text})</span>
                )}
              </div>
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="flex flex-col items-start md:items-end gap-2 rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
            <div className="text-xs font-bold text-slate-500">Live Dispatch Status</div>
            <button
              onClick={handleToggleAvailability}
              disabled={isTogglingAvailability}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition shadow-sm ${
                profile?.is_available
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-slate-300 text-slate-800 hover:bg-slate-400"
              } disabled:opacity-50`}
            >
              {isTogglingAvailability ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>{profile?.is_available ? "🟢 Online" : "⚪ Offline"}</span>
              )}
            </button>
            <span className="text-[11px] text-slate-500 max-w-[200px] text-left md:text-right">
              Online workers can receive nearby job requests.
            </span>
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/worker/feed"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md space-y-1 block"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Nearby Active Jobs</span>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {feed?.total_requests ?? 0}
          </div>
          <p className="text-xs text-slate-500">Matching your skills & radius</p>
        </Link>

        <Link
          href="/worker/bookings?status=pending"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md space-y-1 block"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Bookings</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {pendingBookings?.total ?? 0}
          </div>
          <p className="text-xs text-slate-500">Awaiting your acceptance</p>
        </Link>

        <Link
          href="/worker/skills"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-300 hover:shadow-md space-y-1 block"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Trade Skills</span>
            <Layers className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {profile?.skills?.length ?? 0}
          </div>
          <p className="text-xs text-slate-500">Configured canonical skills</p>
        </Link>
      </div>

      {/* Pending Bookings Section (Action Needed) */}
      {pendingBookings && pendingBookings.items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Action Required: Pending Bookings ({pendingBookings.total})
              </h2>
            </div>
            <Link
              href="/worker/bookings?status=pending"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingBookings.items.map((booking) => (
              <WorkerBookingCard key={booking.booking_id} booking={booking} />
            ))}
          </div>
        </div>
      )}

      {/* Live Nearby Job Feed Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Nearby Job Requests ({feed?.total_requests ?? 0})
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadWorkerData}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
            <Link
              href="/worker/feed"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Explore Feed</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {feed && feed.requests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feed.requests.map((item) => (
              <JobFeedCard key={item.request_id} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Briefcase className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                No suitable jobs nearby right now
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {profile?.is_available
                  ? "When new customers describe problems matching your trade skills within your radius, they will automatically appear here."
                  : "You are currently offline. Toggle your status to Online above to receive active customer requests."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
