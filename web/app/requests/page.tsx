"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiClient } from "@/lib/api/api-client";
import { ServiceRequest, ServiceRequestListResponse } from "@/types/service-request";
import { RequestCard } from "@/components/request-card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorAlert } from "@/components/error-alert";
import { PlusCircle, Inbox } from "lucide-react";

export default function MyRequestsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<ServiceRequestListResponse>(
        "/api/v1/service-requests?limit=50"
      );
      setRequests(response.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load service requests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      fetchRequests();
    }
  }, [user, isAuthLoading, router]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            My Service Requests
          </h1>
          <p className="text-sm text-slate-600">
            Track your service requests, AI intent analysis, and worker matches.
          </p>
        </div>

        <Link
          href="/request/new"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2.5 text-sm shadow transition self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Request</span>
        </Link>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchRequests} />}

      {isLoading ? (
        <LoadingSpinner message="Fetching your service requests..." />
      ) : requests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((req) => (
            <RequestCard key={req.id} request={req} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Inbox className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">No requests found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              You haven&apos;t created any service requests yet.
            </p>
          </div>
          <div>
            <Link
              href="/request/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 text-sm shadow transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Your First Request</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
