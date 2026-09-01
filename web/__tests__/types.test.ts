import { describe, it, expect } from "vitest";
import { ServiceRequest } from "@/types/service-request";
import { ExtractionResponse } from "@/types/extraction";
import { WorkerMatchResponse } from "@/types/worker-match";
import { UserProfile } from "@/types/user";

describe("TypeScript Data Models", () => {
  it("validates ServiceRequest model shape", () => {
    const request: ServiceRequest = {
      id: "e305e940-0255-46fb-a0b4-7b6bb822602e",
      customer_id: "a0000000-0000-0000-0000-000000000001",
      raw_description: "My ceiling fan stopped working",
      extracted_category: "Electrical",
      extracted_skills: ["Fan Repair", "Electrical Troubleshooting"],
      urgency: "normal",
      status: "pending",
      latitude: 12.95,
      longitude: 77.63,
      address_text: "Indiranagar, Bengaluru",
      created_at: "2026-08-31T09:00:00Z",
      updated_at: "2026-08-31T09:00:00Z",
    };

    expect(request.extracted_skills).toHaveLength(2);
    expect(request.urgency).toBe("normal");
    expect(request.latitude).toBe(12.95);
  });

  it("validates ExtractionResponse model shape", () => {
    const extraction: ExtractionResponse = {
      request_id: "e305e940-0255-46fb-a0b4-7b6bb822602e",
      category: "Plumbing",
      skills: ["Pipe Repair", "Leak Fixing"],
      urgency: "high",
      confidence: 0.95,
      provider: "gemini",
      model: "gemini-1.5-flash",
    };

    expect(extraction.category).toBe("Plumbing");
    expect(extraction.confidence).toBe(0.95);
  });

  it("validates WorkerMatchResponse model shape", () => {
    const matchResponse: WorkerMatchResponse = {
      request_id: "e305e940-0255-46fb-a0b4-7b6bb822602e",
      total_matches: 1,
      matches: [
        {
          worker_id: "b0000000-0000-0000-0000-000000000001",
          name: "Ramesh Kumar",
          category: "Plumbing",
          matched_skills: ["Pipe Repair"],
          distance_km: 3.35,
          rating: 4.85,
          total_reviews: 48,
          experience_years: 9.0,
          is_verified: true,
          is_available: true,
          match_score: 91.57,
        },
      ],
    };

    expect(matchResponse.matches[0].name).toBe("Ramesh Kumar");
    expect(matchResponse.matches[0].match_score).toBe(91.57);
  });

  it("validates UserProfile model shape", () => {
    const user: UserProfile = {
      user_id: "a0000000-0000-0000-0000-000000000001",
      email: "customer@example.com",
      role: "customer",
      full_name: "Anita Sharma",
      phone: "+919876543210",
      avatar_url: null,
      profile_exists: true,
    };

    expect(user.role).toBe("customer");
    expect(user.profile_exists).toBe(true);
  });
});
