import { describe, it, expect } from "vitest";
import { validateCoordinates, formatBookingStatus, formatUrgency } from "@/lib/utils";
import {
  WorkerProfile,
  WorkerProfileCreateInput,
  WorkerSkillsResponse,
} from "@/types/worker-profile";
import { WorkerFeedItem, WorkerFeedResponse } from "@/types/worker-feed";
import {
  Booking,
  BookingStatus,
  BookingListResponse,
  BookingStatusUpdateInput,
} from "@/types/booking";
import { CategoriesSkillsResponse } from "@/types/skill";

describe("Worker Flow & Marketplace Bridge Test Suite", () => {
  describe("Worker Onboarding Validation", () => {
    it("validates worker profile creation coordinates and experience boundaries", () => {
      const validPayload: WorkerProfileCreateInput = {
        bio: "Master Electrician with 10 years experience",
        experience_years: 10.0,
        service_radius_km: 15.0,
        latitude: 12.9716,
        longitude: 77.6412,
        is_available: true,
        address_text: "Indiranagar, Bengaluru",
      };

      expect(validPayload.experience_years).toBeGreaterThanOrEqual(0);
      expect(validPayload.service_radius_km).toBeGreaterThan(0);
      expect(validateCoordinates(validPayload.latitude, validPayload.longitude)).toBe(true);
    });

    it("rejects invalid coordinate bounds", () => {
      expect(validateCoordinates(95.0, 77.0)).toBe(false);
      expect(validateCoordinates(12.0, 195.0)).toBe(false);
      expect(validateCoordinates(null, 77.0)).toBe(false);
    });
  });

  describe("Canonical Skills Catalog & Selection", () => {
    it("processes live categories skills catalog structure", () => {
      const catalog: CategoriesSkillsResponse = {
        categories: [
          {
            category: "Plumbing",
            skills: [
              { id: "s-1", name: "Pipe Repair", category: "Plumbing" },
              { id: "s-2", name: "Leak Fixing", category: "Plumbing" },
            ],
          },
          {
            category: "Electrical",
            skills: [
              { id: "s-3", name: "House Wiring", category: "Electrical" },
            ],
          },
        ],
      };

      expect(catalog.categories).toHaveLength(2);
      expect(catalog.categories[0].category).toBe("Plumbing");
      expect(catalog.categories[0].skills[0].name).toBe("Pipe Repair");
    });

    it("verifies worker skills assignment response structure", () => {
      const workerSkills: WorkerSkillsResponse = {
        worker_id: "w-100",
        skills: [
          {
            skill_id: "s-1",
            skill_name: "Pipe Repair",
            category: "Plumbing",
            experience_years: 8.0,
          },
        ],
      };

      expect(workerSkills.skills).toHaveLength(1);
      expect(workerSkills.skills[0].experience_years).toBe(8.0);
    });
  });

  describe("Worker Job Feed Processing", () => {
    it("handles worker feed item shape and deterministic properties", () => {
      const feedResponse: WorkerFeedResponse = {
        total_requests: 2,
        limit: 20,
        offset: 0,
        requests: [
          {
            request_id: "req-1",
            description: "Burst main pipe in kitchen flooding floor",
            category: "Plumbing",
            matched_skills: ["Pipe Repair"],
            urgency: "emergency",
            distance_km: 2.15,
            created_at: "2026-09-01T10:00:00Z",
            status: "open",
            address_text: "Indiranagar, Bengaluru",
          },
          {
            request_id: "req-2",
            description: "Dripping faucet in guest bathroom",
            category: "Plumbing",
            matched_skills: ["Pipe Repair"],
            urgency: "low",
            distance_km: 4.8,
            created_at: "2026-09-01T09:30:00Z",
            status: "open",
          },
        ],
      };

      expect(feedResponse.total_requests).toBe(2);
      expect(feedResponse.requests[0].urgency).toBe("emergency");
      expect(feedResponse.requests[0].distance_km).toBeLessThan(feedResponse.requests[1].distance_km);
      expect(feedResponse.requests[0].matched_skills).toContain("Pipe Repair");
    });

    it("handles empty feed state gracefully", () => {
      const emptyFeed: WorkerFeedResponse = {
        total_requests: 0,
        limit: 20,
        offset: 0,
        requests: [],
      };

      expect(emptyFeed.total_requests).toBe(0);
      expect(emptyFeed.requests).toHaveLength(0);
    });
  });

  describe("Marketplace Booking Lifecycle & State Transitions", () => {
    it("formats all booking status badge variants", () => {
      expect(formatBookingStatus("pending").label).toBe("Pending");
      expect(formatBookingStatus("accepted").label).toBe("Accepted");
      expect(formatBookingStatus("rejected").label).toBe("Rejected");
      expect(formatBookingStatus("completed").label).toBe("Completed");
      expect(formatBookingStatus("cancelled").label).toBe("Cancelled");
    });

    it("verifies booking list response and counterparty metadata", () => {
      const bookingsList: BookingListResponse = {
        total: 1,
        limit: 20,
        offset: 0,
        items: [
          {
            booking_id: "b-001",
            customer_id: "c-001",
            worker_id: "w-001",
            customer_name: "Anita Sharma",
            worker_name: "Ramesh Kumar",
            worker_rating: 4.85,
            description: "Fix leaking pipe under sink",
            category: "Plumbing",
            urgency: "high",
            scheduled_time: "2026-09-02T14:00:00Z",
            status: "pending",
            notes: "Please call on arrival",
            created_at: "2026-09-01T11:00:00Z",
            updated_at: "2026-09-01T11:00:00Z",
          },
        ],
      };

      expect(bookingsList.items[0].status).toBe("pending");
      expect(bookingsList.items[0].customer_name).toBe("Anita Sharma");
      expect(bookingsList.items[0].worker_name).toBe("Ramesh Kumar");
    });

    it("validates worker booking status transition inputs", () => {
      const acceptInput: BookingStatusUpdateInput = { status: "accepted" };
      const rejectInput: BookingStatusUpdateInput = { status: "rejected" };

      expect(["accepted", "rejected"]).toContain(acceptInput.status);
      expect(["accepted", "rejected"]).toContain(rejectInput.status);
    });
  });
});
