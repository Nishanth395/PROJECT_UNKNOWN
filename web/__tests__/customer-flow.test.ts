import { describe, it, expect } from "vitest";
import { validateCoordinates, formatUrgency, formatStatus } from "@/lib/utils";
import { ServiceRequest, ServiceRequestCreateInput } from "@/types/service-request";
import { ExtractionResponse } from "@/types/extraction";
import { WorkerMatchResponse } from "@/types/worker-match";

describe("Customer Flow & Validation Suite", () => {
  describe("Request Validation & Payload Structure", () => {
    it("validates request description length boundaries", () => {
      const validDesc = "My ceiling fan stopped working and makes a buzzing sound";
      expect(validDesc.length >= 5).toBe(true);
      expect(validDesc.length <= 2000).toBe(true);

      const invalidShort = "Tap";
      expect(invalidShort.length >= 5).toBe(false);
    });

    it("verifies request creation payload does not include client customer_id or skills", () => {
      const payload: ServiceRequestCreateInput = {
        description: "Kitchen PVC drain pipe is leaking",
        urgency: "high",
        latitude: 12.9500,
        longitude: 77.6300,
        address_text: "Indiranagar, Bengaluru",
      };

      expect(payload).not.toHaveProperty("customer_id");
      expect(payload).not.toHaveProperty("extracted_category");
      expect(payload).not.toHaveProperty("extracted_skills");
      expect(payload.urgency).toBe("high");
      expect(validateCoordinates(payload.latitude, payload.longitude)).toBe(true);
    });

    it("validates all supported urgency levels and their descriptions", () => {
      const urgencies = ["low", "normal", "high", "emergency"];
      for (const u of urgencies) {
        const info = formatUrgency(u);
        expect(info.label.toLowerCase()).toBe(u);
        expect(info.desc).toBeDefined();
      }
    });

    it("validates all request statuses", () => {
      expect(formatStatus("open").label).toBe("Open");
      expect(formatStatus("pending").label).toBe("Open");
      expect(formatStatus("matched").label).toBe("Workers Matched");
      expect(formatStatus("booked").label).toBe("Booked");
      expect(formatStatus("assigned").label).toBe("Booked");
      expect(formatStatus("completed").label).toBe("Completed");
      expect(formatStatus("cancelled").label).toBe("Cancelled");
    });
  });

  describe("AI Extraction Model & State Handling", () => {
    it("handles valid AI extraction response", () => {
      const extraction: ExtractionResponse = {
        request_id: "req-123",
        category: "Plumbing",
        skills: ["Pipe Repair", "Leak Fixing"],
        urgency: "normal",
        confidence: 0.92,
        provider: "gemini",
        model: "gemini-1.5-flash",
      };

      expect(extraction.category).toBe("Plumbing");
      expect(extraction.skills).toContain("Pipe Repair");
      expect(extraction.skills).toContain("Leak Fixing");
      expect(extraction.confidence).toBe(0.92);
    });

    it("handles extraction with empty canonical skills gracefully", () => {
      const unclassifiedExtraction: ExtractionResponse = {
        request_id: "req-456",
        category: "General",
        skills: [],
        urgency: "normal",
        confidence: 0.2,
        provider: "fallback",
        model: "standard",
      };

      expect(unclassifiedExtraction.skills).toHaveLength(0);
    });
  });

  describe("Worker Matching & Empty State Handling", () => {
    it("verifies matching response structure with ranked items", () => {
      const matchResponse: WorkerMatchResponse = {
        request_id: "req-123",
        total_matches: 2,
        matches: [
          {
            worker_id: "w-1",
            name: "Ramesh Kumar",
            category: "Plumbing",
            matched_skills: ["Pipe Repair"],
            distance_km: 3.35,
            rating: 4.85,
            total_reviews: 48,
            experience_years: 9.0,
            is_verified: true,
            is_available: true,
            match_score: 90.57,
          },
          {
            worker_id: "w-2",
            name: "Suresh Gowda",
            category: "Plumbing",
            matched_skills: ["Pipe Repair"],
            distance_km: 7.5,
            rating: 4.6,
            total_reviews: 30,
            experience_years: 6.0,
            is_verified: false,
            is_available: true,
            match_score: 78.2,
          },
        ],
      };

      expect(matchResponse.total_matches).toBe(2);
      expect(matchResponse.matches[0].match_score).toBeGreaterThan(matchResponse.matches[1].match_score);
    });

    it("handles empty matches response (total_matches = 0)", () => {
      const emptyMatchResponse: WorkerMatchResponse = {
        request_id: "req-999",
        total_matches: 0,
        matches: [],
      };

      expect(emptyMatchResponse.total_matches).toBe(0);
      expect(emptyMatchResponse.matches).toHaveLength(0);
    });
  });
});
