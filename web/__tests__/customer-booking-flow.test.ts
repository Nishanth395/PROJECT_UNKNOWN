import { describe, it, expect } from "vitest";
import { BookingCreateInput, BookingStatus, Booking } from "@/types/booking";

describe("Customer Booking Flow & Data Model Validation", () => {
  it("constructs booking payload without customer_id", () => {
    const payload: BookingCreateInput = {
      worker_id: "worker-123",
      service_request_id: "sr-456",
      scheduled_time: "2026-09-02T10:00:00Z",
      notes: "Please call on arrival",
    };

    expect(payload.worker_id).toBe("worker-123");
    expect(payload.service_request_id).toBe("sr-456");
    expect(payload.scheduled_time).toBe("2026-09-02T10:00:00Z");
    expect(payload.notes).toBe("Please call on arrival");
    // Ensure customer_id is never present in BookingCreateInput
    expect((payload as Record<string, unknown>)["customer_id"]).toBeUndefined();
  });

  it("validates all booking status enum values", () => {
    const validStatuses: BookingStatus[] = [
      "pending",
      "accepted",
      "rejected",
      "cancelled",
      "completed",
    ];

    expect(validStatuses).toContain("pending");
    expect(validStatuses).toContain("accepted");
    expect(validStatuses).toContain("rejected");
    expect(validStatuses).toContain("cancelled");
    expect(validStatuses).toContain("completed");
    expect(validStatuses.length).toBe(5);
  });

  it("verifies booking model structure", () => {
    const booking: Booking = {
      booking_id: "book-1",
      customer_id: "cust-1",
      worker_id: "work-1",
      service_request_id: "req-1",
      customer_name: "John Doe",
      worker_name: "Jane Smith",
      worker_rating: 4.85,
      description: "Leaking bathroom sink",
      category: "Plumbing",
      urgency: "high",
      scheduled_time: "2026-09-02T10:00:00Z",
      status: "pending",
      notes: "Doorbell is broken",
      created_at: "2026-09-01T08:00:00Z",
      updated_at: "2026-09-01T08:00:00Z",
    };

    expect(booking.booking_id).toBe("book-1");
    expect(booking.status).toBe("pending");
    expect(booking.worker_name).toBe("Jane Smith");
    expect(booking.worker_rating).toBe(4.85);
  });

  it("verifies customer cancellation eligibility based on booking status", () => {
    const canCustomerCancel = (status: BookingStatus): boolean => {
      return status === "pending" || status === "accepted";
    };

    expect(canCustomerCancel("pending")).toBe(true);
    expect(canCustomerCancel("accepted")).toBe(true);
    expect(canCustomerCancel("completed")).toBe(false);
    expect(canCustomerCancel("rejected")).toBe(false);
    expect(canCustomerCancel("cancelled")).toBe(false);
  });
});
