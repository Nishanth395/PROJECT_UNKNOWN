"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { UserRole } from "@/types/user";
import { Wrench, Loader2, AlertCircle, User, Briefcase } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";

function SignupForm() {
  const { user, signUp, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [role, setRole] = useState<UserRole>(
    searchParams.get("role") === "worker" ? "worker" : "customer"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !isAuthLoading) {
      if (user.role === "worker") {
        router.push("/worker/dashboard");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signUp(email.trim(), password, fullName.trim(), role, phone.trim() || undefined);
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Wrench className="h-6 w-6 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Create an Account
        </h2>
        <p className="text-sm text-slate-500">
          Join Project Unknown as a customer or skilled service worker
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Account Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                role === "customer"
                  ? "border-blue-600 bg-blue-50/50 text-blue-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <User className="h-4 w-4" />
              Customer
            </button>

            <button
              type="button"
              onClick={() => setRole("worker")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                role === "worker"
                  ? "border-blue-600 bg-blue-50/50 text-blue-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Skilled Worker
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Full Name</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Phone Number (Optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Suspense fallback={<LoadingSpinner message="Loading signup..." />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
