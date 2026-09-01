"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiClient } from "@/lib/api/api-client";
import { ServiceRequest, ServiceRequestListResponse } from "@/types/service-request";
import { RequestCard } from "@/components/request-card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { PlusCircle, ListOrdered, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export default function CustomerDashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && user.role === "worker") {
      router.push("/worker/dashboard");
      return;
    }

    if (user) {
      apiClient
        .get<ServiceRequestListResponse>("/api/v1/service-requests?limit=3")
        .then((res) => {
          setRecentRequests(res.items || []);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || (isLoading && !user)) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  const customerName = user?.full_name || user?.email?.split("@")[0] || "Customer";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Namaste, {customerName}! 🙏
          </h1>
          <p className="text-slate-300 text-sm">
            What home or trade service problem can we solve for you today?
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs px-3 py-1.5 rounded-full font-medium">
          <ShieldCheck className="h-4 w-4 text-blue-400" />
          <span>PostGIS Proximity Verified</span>
        </div>
      </div>

      {/* Primary Action Card */}
      <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-6 sm:p-8 text-center space-y-4 hover:border-blue-400 transition">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
          <Sparkles className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">
            What do you need help with?
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Describe your repair or maintenance problem in plain words. Our AI will classify the required trade skills and find nearby qualified workers.
          </p>
        </div>
        <div>
          <Link
            href="/request/new"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3 text-sm shadow transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Describe your problem</span>
          </Link>
        </div>
      </div>

      {/* Recent Requests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-slate-700" />
            <h3 className="text-lg font-bold text-slate-900">Recent Service Requests</h3>
          </div>

          <Link
            href="/requests"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Fetching requests..." size="sm" />
        ) : recentRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentRequests.map((req) => (
              <RequestCard key={req.id} request={req} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            You haven&apos;t submitted any service requests yet. Click &quot;Describe your problem&quot; to get started!
          </div>
        )}
      </div>
    </div>
  );
}
