"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { apiClient, ApiException } from "@/lib/api/api-client";
import { BookingListResponse, BookingStatus } from "@/types/booking";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import { WorkerBookingCard } from "@/components/worker-booking-card";
import { CalendarCheck, Clock, ArrowLeft, RefreshCw } from "lucide-react";

const STATUS_TABS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "All Bookings", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function WorkerBookingsContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as BookingStatus | "all") || "all";

  const [activeTab, setActiveTab] = useState<BookingStatus | "all">(initialStatus);
  const [bookings, setBookings] = useState<BookingListResponse | null>(null);
  const [limit] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(
    async (tab: BookingStatus | "all", currentOffset = 0, isManualRefresh = false) => {
      if (isManualRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
        });
        if (tab !== "all") {
          queryParams.append("status", tab);
        }

        const data = await apiClient.get<BookingListResponse>(
          `/api/v1/bookings/me?${queryParams.toString()}`
        );
        setBookings(data);
        setOffset(currentOffset);
        setIsLoading(false);
        setIsRefreshing(false);
      } catch (err: unknown) {
        setIsLoading(false);
        setIsRefreshing(false);
        if (err instanceof ApiException && err.statusCode === 404) {
          router.push("/worker/onboarding");
        } else if (err instanceof ApiException) {
          setError(err.message);
        } else {
          setError("Failed to retrieve bookings.");
        }
      }
    },
    [limit, router]
  );

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
      fetchBookings(activeTab, 0);
    }
  }, [user, isAuthLoading, activeTab, router, fetchBookings]);

  const handleTabChange = (tab: BookingStatus | "all") => {
    setActiveTab(tab);
    setOffset(0);
    fetchBookings(tab, 0);
  };

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner message="Loading worker bookings..." />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/worker/dashboard"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Booking Management
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Assigned Bookings
          </h1>
          <p className="text-sm text-slate-600">
            Review customer bookings, manage confirmations, and monitor engagement schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchBookings(activeTab, offset, true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === tab.value
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {bookings && bookings.items.length > 0 ? (
        <div className="space-y-4">
          <div className="text-xs text-slate-500 font-semibold px-1">
            Found {bookings.total} booking{bookings.total !== 1 ? "s" : ""}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.items.map((b) => (
              <WorkerBookingCard key={b.booking_id} booking={b} />
            ))}
          </div>

          {/* Pagination Controls */}
          {bookings.total > limit && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <button
                disabled={offset === 0}
                onClick={() => fetchBookings(activeTab, Math.max(0, offset - limit))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">
                Page {Math.floor(offset / limit) + 1} of {Math.ceil(bookings.total / limit)}
              </span>
              <button
                disabled={offset + limit >= bookings.total}
                onClick={() => fetchBookings(activeTab, offset + limit)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <CalendarCheck className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              No {activeTab !== "all" ? activeTab : ""} bookings found
            </h3>
            <p className="text-xs text-slate-500">
              {activeTab === "pending"
                ? "You have no pending bookings waiting for your approval."
                : "Incoming customer bookings assigned to you will appear here."}
            </p>
          </div>
          <Link
            href="/worker/feed"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold px-4 py-2.5 shadow-sm hover:bg-slate-800 transition"
          >
            <span>Explore Active Job Feed</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function WorkerBookingsPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading worker bookings..." />}>
      <WorkerBookingsContent />
    </Suspense>
  );
}
