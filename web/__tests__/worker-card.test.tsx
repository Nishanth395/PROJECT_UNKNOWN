import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkerCard } from "@/components/worker-card";
import { MatchedWorker } from "@/types/worker-match";

describe("WorkerCard Component", () => {
  const sampleWorker: MatchedWorker = {
    worker_id: "b0000000-0000-0000-0000-000000000001",
    name: "Ramesh Kumar",
    category: "Plumbing",
    matched_skills: ["Pipe Repair", "Leak Fixing"],
    distance_km: 3.35,
    rating: 4.85,
    total_reviews: 48,
    experience_years: 9.0,
    is_verified: true,
    is_available: true,
    match_score: 90.57,
  };

  it("renders worker name, verified badge, rating, and match score", () => {
    render(<WorkerCard worker={sampleWorker} rank={1} />);

    expect(screen.getByText("Ramesh Kumar")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("4.85")).toBeInTheDocument();
    expect(screen.getByText("48 reviews")).toBeInTheDocument();
    expect(screen.getByText("90.57%")).toBeInTheDocument();
    expect(screen.getByText("Pipe Repair")).toBeInTheDocument();
    expect(screen.getByText("Leak Fixing")).toBeInTheDocument();
    expect(screen.getByText("3.35 km away")).toBeInTheDocument();
    expect(screen.getByText("9 years experience")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("renders non-verified worker without verified badge", () => {
    const unverified: MatchedWorker = {
      ...sampleWorker,
      is_verified: false,
      rating: 0,
      total_reviews: 0,
    };

    render(<WorkerCard worker={unverified} />);
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("0 reviews")).toBeInTheDocument();
  });
});
