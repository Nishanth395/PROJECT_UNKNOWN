import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobFeedCard } from "@/components/job-feed-card";
import { WorkerBookingCard } from "@/components/worker-booking-card";
import { WorkerFeedItem } from "@/types/worker-feed";
import { Booking } from "@/types/booking";

describe("Worker Components Suite", () => {
  describe("JobFeedCard", () => {
    const sampleJob: WorkerFeedItem = {
      request_id: "req-12345",
      description: "Severe water leak under kitchen sink flooding cabinets",
      category: "Plumbing",
      matched_skills: ["Pipe Repair", "Leak Fixing"],
      urgency: "emergency",
      distance_km: 2.45,
      created_at: "2026-09-01T12:00:00Z",
      status: "open",
      address_text: "Indiranagar, Bengaluru",
    };

    it("renders job description, urgency, skills, and distance", () => {
      render(<JobFeedCard item={sampleJob} />);

      expect(screen.getByText("Severe water leak under kitchen sink flooding cabinets")).toBeInTheDocument();
      expect(screen.getByText("Plumbing")).toBeInTheDocument();
      expect(screen.getByText("Emergency Urgency")).toBeInTheDocument();
      expect(screen.getByText("Pipe Repair")).toBeInTheDocument();
      expect(screen.getByText("Leak Fixing")).toBeInTheDocument();
      expect(screen.getByText(/2.45 km away/)).toBeInTheDocument();
      expect(screen.getByText("View Job")).toBeInTheDocument();
    });
  });

  describe("WorkerBookingCard", () => {
    const sampleBooking: Booking = {
      booking_id: "book-98765",
      customer_id: "cust-1",
      worker_id: "worker-1",
      customer_name: "Anita Sharma",
      worker_name: "Ramesh Kumar",
      description: "Bathroom faucet cartridge replacement",
      category: "Plumbing",
      urgency: "high",
      scheduled_time: "2026-09-03T15:30:00Z",
      status: "pending",
      notes: "Please call upon arrival at gate",
      created_at: "2026-09-01T11:00:00Z",
      updated_at: "2026-09-01T11:00:00Z",
    };

    it("renders customer name, description, pending status, and notes", () => {
      render(<WorkerBookingCard booking={sampleBooking} />);

      expect(screen.getByText("Anita Sharma")).toBeInTheDocument();
      expect(screen.getByText("Bathroom faucet cartridge replacement")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText(/"Please call upon arrival at gate"/)).toBeInTheDocument();
      expect(screen.getByText("View Details")).toBeInTheDocument();
    });
  });
});
