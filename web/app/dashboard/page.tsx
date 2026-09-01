"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiClient } from "@/lib/api/api-client";
import { ServiceRequest, ServiceRequestListResponse } from "@/types/service-request";
import { RequestCard } from "@/components/request-card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { PlusCircle, ListOrdered, Sparkles, ArrowRight, Wrench, ShieldCheck } from "lucide-react";

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
        .get<ServiceRequestListResponse>("/api/v1/service-requests?limit=6")
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
      {/* Hero Section */}
      <div className="rounded-3xl bg-slate-900 p-6 sm:p-10 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Hyperlocal Service Dispatch</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            How can we help today, {customerName}?
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Tell us what needs fixing or installation. Our AI will understand your exact requirements and match verified trade professionals within your neighborhood.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <Link
            href="/request/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-3.5 shadow-lg hover:shadow-blue-500/20 transition duration-150 text-center"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Describe your problem</span>
          </Link>
          <Link
            href="/requests"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold px-5 py-3.5 transition text-center"
          >
            <ListOrdered className="h-4 w-4" />
            <span>My Requests</span>
          </Link>
        </div>
      </div>

      {/* Recent Requests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">Recent Service Requests</h2>
          </div>

          {recentRequests.length > 0 && (
            <Link
              href="/requests"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500"
            >
              <span>View All Requests</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <LoadingSpinner message="Fetching requests..." size="sm" />
        ) : recentRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentRequests.map((req) => (
              <RequestCard key={req.id} request={req} />
            ))}
          </div>
        ) : (
          /* New customer empty state */
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center space-y-4 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Wrench className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                You haven&apos;t created a service request yet.
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Got a leaking tap, broken electrical appliance, or repair job? Submit a request in seconds.
              </p>
            </div>
            <div>
              <Link
                href="/request/new"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 text-sm shadow transition"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Describe your problem</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
