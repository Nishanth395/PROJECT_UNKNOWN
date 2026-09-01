import React from "react";
import Link from "next/link";
import { Booking } from "@/types/booking";
import { formatBookingStatus, formatUrgency } from "@/lib/utils";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  ArrowRight,
  FileText,
  Briefcase,
} from "lucide-react";

interface ActiveJobCardProps {
  booking: Booking;
}

export function ActiveJobCard({ booking }: ActiveJobCardProps) {
  const statusInfo = formatBookingStatus(booking.status);
  const urgencyInfo = booking.urgency ? formatUrgency(booking.urgency) : null;
  const scheduledFormatted = booking.scheduled_time
    ? new Date(booking.scheduled_time).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Flexible / ASAP";

  return (
    <div
      data-testid="active-job-card"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md space-y-4"
    >
      {/* Top Bar: Customer Name, Category & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {booking.customer_name || "Customer"}
            </h3>
            {booking.category && (
              <span className="text-xs font-semibold text-slate-500">{booking.category}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {urgencyInfo && (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${urgencyInfo.color}`}
            >
              {urgencyInfo.label}
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Service Request Problem Description */}
      {booking.description && (
        <div className="space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>Problem Description</span>
          </div>
          <p className="text-sm text-slate-700 font-medium line-clamp-2 leading-relaxed">
            {booking.description}
          </p>
        </div>
      )}

      {/* Scheduled Time & Customer Notes */}
      <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 space-y-1.5 border border-slate-100">
        <div className="flex items-center gap-2 font-semibold">
          <Calendar className="h-4 w-4 text-emerald-600" />
          <span>Scheduled: <strong className="text-slate-900">{scheduledFormatted}</strong></span>
        </div>
        {booking.notes && (
          <div className="text-slate-500 italic truncate pt-0.5">
            Customer note: &quot;{booking.notes}&quot;
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-400">
          Booking #{booking.booking_id.slice(0, 8)}
        </span>

        <Link
          href={`/worker/jobs/${booking.booking_id}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-3.5 shadow-sm transition"
        >
          <span>View Job Details</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
