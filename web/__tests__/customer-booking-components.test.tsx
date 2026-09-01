import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkerCard } from "@/components/worker-card";
import { CustomerBookingCard } from "@/components/customer-booking-card";
import { BookingConfirmationModal } from "@/components/booking-confirmation-modal";
import { MatchedWorker } from "@/types/worker-match";
import { Booking } from "@/types/booking";

describe("Customer Booking UI Components", () => {
  const mockWorker: MatchedWorker = {
    worker_id: "w-1",
    name: "Aarav Sharma",
    is_verified: true,
    rating: 4.9,
    total_reviews: 24,
    experience_years: 6,
    distance_km: 2.45,
    matched_skills: ["Pipe Repair", "Drain Cleaning"],
    match_score: 94.5,
    category: "Plumbing",
  };

  it("renders WorkerCard with Request Booking button when callback is provided", () => {
    const handleRequest = vi.fn();
    render(<WorkerCard worker={mockWorker} rank={1} onRequestBooking={handleRequest} />);

    expect(screen.getByText("Aarav Sharma")).toBeDefined();
    expect(screen.getByText("94.50%")).toBeDefined();
    const button = screen.getByRole("button", { name: /request booking/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(handleRequest).toHaveBeenCalledWith(mockWorker);
  });

  it("renders CustomerBookingCard correctly with worker details and status", () => {
    const mockBooking: Booking = {
      booking_id: "b-100",
      customer_id: "c-100",
      worker_id: "w-1",
      service_request_id: "sr-100",
      worker_name: "Aarav Sharma",
      worker_rating: 4.9,
      category: "Plumbing",
      description: "Water pipe leaking in kitchen",
      scheduled_time: "2026-09-02T10:00:00Z",
      status: "pending",
      notes: "Ring the bell twice",
      created_at: "2026-09-01T08:00:00Z",
      updated_at: "2026-09-01T08:00:00Z",
    };

    render(<CustomerBookingCard booking={mockBooking} />);

    expect(screen.getByText("Aarav Sharma")).toBeDefined();
    expect(screen.getByText(/pending/i)).toBeDefined();
    expect(screen.getByText("Water pipe leaking in kitchen")).toBeDefined();
    expect(screen.getByText(/"Ring the bell twice"/)).toBeDefined();
  });

  it("renders BookingConfirmationModal with worker details and confirmation text", () => {
    const handleClose = vi.fn();
    render(
      <BookingConfirmationModal
        worker={mockWorker}
        serviceRequestId="sr-100"
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/Request Aarav Sharma/i)).toBeDefined();
    expect(screen.getByText("You are requesting this worker for this service.")).toBeDefined();
    expect(screen.getByLabelText(/Preferred Date & Time/i)).toBeDefined();
    expect(screen.getByLabelText(/Additional Notes/i)).toBeDefined();
  });
});
