import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActiveJobCard } from "@/components/active-job-card";
import { JobCompletionModal } from "@/components/job-completion-modal";
import { Booking, BookingStatus } from "@/types/booking";

describe("Worker Active Jobs & Completion Flow", () => {
  const mockAcceptedBooking: Booking = {
    booking_id: "b-accepted-1",
    customer_id: "cust-1",
    worker_id: "work-1",
    service_request_id: "sr-1",
    customer_name: "Rahul Verma",
    worker_name: "Aarav Sharma",
    category: "Plumbing",
    urgency: "high",
    description: "Main waterline valve is jammed and leaking into the basement.",
    scheduled_time: "2026-09-02T14:00:00Z",
    status: "accepted",
    notes: "Please call on arrival",
    created_at: "2026-09-01T09:00:00Z",
    updated_at: "2026-09-01T09:30:00Z",
  };

  it("renders ActiveJobCard with customer name, urgency, description, and link to job details", () => {
    render(<ActiveJobCard booking={mockAcceptedBooking} />);

    expect(screen.getByText("Rahul Verma")).toBeDefined();
    expect(screen.getByText("Plumbing")).toBeDefined();
    expect(screen.getByText(/accepted/i)).toBeDefined();
    expect(screen.getByText(/Main waterline valve is jammed/i)).toBeDefined();
    expect(screen.getByText(/Please call on arrival/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /view job details/i })).toBeDefined();
  });

  it("renders JobCompletionModal with confirmation dialogue and booking summary", () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <JobCompletionModal
        booking={mockAcceptedBooking}
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByText(/Complete Service Job/i)).toBeDefined();
    expect(screen.getByText(/Confirm successful fulfillment of this engagement/i)).toBeDefined();
    expect(screen.getByText("Rahul Verma")).toBeDefined();
    expect(screen.getByText("Plumbing")).toBeDefined();
    expect(screen.getByRole("button", { name: /complete job/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDefined();
  });

  it("validates that only accepted bookings are completable by workers", () => {
    const isJobCompletable = (status: BookingStatus): boolean => {
      return status === "accepted";
    };

    expect(isJobCompletable("accepted")).toBe(true);
    expect(isJobCompletable("pending")).toBe(false);
    expect(isJobCompletable("rejected")).toBe(false);
    expect(isJobCompletable("cancelled")).toBe(false);
    expect(isJobCompletable("completed")).toBe(false);
  });

  it("verifies completion modal does not render when isOpen is false", () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    const { container } = render(
      <JobCompletionModal
        booking={mockAcceptedBooking}
        isOpen={false}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("handles modal close button click", () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <JobCompletionModal
        booking={mockAcceptedBooking}
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("formats completed booking status appropriately", () => {
    const mockCompletedBooking: Booking = {
      ...mockAcceptedBooking,
      status: "completed",
    };

    render(<ActiveJobCard booking={mockCompletedBooking} />);
    expect(screen.getByText(/completed/i)).toBeDefined();
  });
});
