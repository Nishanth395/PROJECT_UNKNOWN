import React from "react";
import Link from "next/link";
import { Booking } from "@/types/booking";
import { formatBookingStatus } from "@/lib/utils";
import { Clock, User, ArrowRight, Calendar } from "lucide-react";

interface WorkerBookingCardProps {
  booking: Booking;
}

export function WorkerBookingCard({ booking }: WorkerBookingCardProps) {
  const statusInfo = formatBookingStatus(booking.status);
  const createdFormatted = new Date(booking.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const scheduledFormatted = booking.scheduled_time
    ? new Date(booking.scheduled_time).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not specified";

  return (
    <div
      data-testid="worker-booking-card"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md space-y-4"
    >
      {/* Top Header: Customer & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <User className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">
            {booking.customer_name || "Customer"}
          </span>
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${statusInfo.color}`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Service Request Description */}
      {booking.description && (
        <p className="text-sm text-slate-700 line-clamp-2">
          {booking.description}
        </p>
      )}

      {/* Schedule & Notes */}
      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
        <div className="flex items-center gap-1.5 font-medium">
          <Calendar className="h-3.5 w-3.5 text-blue-600" />
          <span>Scheduled: <strong>{scheduledFormatted}</strong></span>
        </div>
        {booking.notes && (
          <div className="text-slate-500 italic pt-0.5">
            &quot;{booking.notes}&quot;
          </div>
        )}
      </div>

      {/* Footer: Date & Link */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-400">Received {createdFormatted}</span>

        <Link
          href={`/worker/bookings/${booking.booking_id}`}
          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 transition"
        >
          <span>View Details</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
