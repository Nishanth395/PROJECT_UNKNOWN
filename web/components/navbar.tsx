"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Wrench, LogOut, Menu, X, User as UserIcon, PlusCircle } from "lucide-react";

export function Navbar() {
  const { user, signOut, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const isCustomer = user?.role === "customer";
  const isWorker = user?.role === "worker";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href={user ? (isWorker ? "/worker/dashboard" : "/dashboard") : "/"} className="flex items-center gap-2.5 font-bold text-slate-900 text-lg">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Wrench className="h-5 w-5 text-blue-400" />
          </div>
          <span className="tracking-tight">Project Unknown</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {user ? (
            <>
              {isCustomer && (
                <>
                  <Link
                    href="/dashboard"
                    className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                      pathname === "/dashboard" ? "text-blue-600 font-semibold" : "text-slate-600"
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    href="/requests"
                    className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                      pathname.startsWith("/requests") ? "text-blue-600 font-semibold" : "text-slate-600"
                    }`}
                  >
                    My Requests
                  </Link>
                  <Link
                    href="/request/new"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 shadow-sm transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-blue-400" />
                    <span>Describe Problem</span>
                  </Link>
                </>
              )}

              {isWorker && (
                <Link
                  href="/worker/dashboard"
                  className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                    pathname.startsWith("/worker") ? "text-blue-600 font-semibold" : "text-slate-600"
                  }`}
                >
                  Worker Dashboard
                </Link>
              )}

              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-100 py-1.5 px-3 rounded-full">
                  <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                  <span className="max-w-[120px] truncate">{user.full_name || user.email || "Account"}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            !isLoading && (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl shadow-sm transition"
                >
                  Get Started
                </Link>
              </div>
            )
          )}
        </nav>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          {user ? (
            <>
              <div className="py-2 border-b border-slate-100 text-xs text-slate-600">
                Signed in as <strong className="text-slate-900">{user.full_name || user.email}</strong> ({user.role})
              </div>
              {isCustomer && (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-600"
                  >
                    Home
                  </Link>
                  <Link
                    href="/requests"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-600"
                  >
                    My Requests
                  </Link>
                  <Link
                    href="/request/new"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-2.5 text-center text-sm font-bold text-white bg-slate-900 rounded-xl"
                  >
                    Describe Problem
                  </Link>
                </>
              )}
              {isWorker && (
                <Link
                  href="/worker/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-600"
                >
                  Worker Dashboard
                </Link>
              )}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left py-2 text-sm font-semibold text-red-600 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </>
          ) : (
            <div className="pt-2 space-y-2">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-center py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-center py-2 text-sm font-bold text-white bg-slate-900 rounded-lg"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
