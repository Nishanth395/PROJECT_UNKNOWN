import { describe, it, expect } from "vitest";
import { validateCoordinates, formatUrgency, formatStatus } from "@/lib/utils";

describe("Utility Functions", () => {
  describe("validateCoordinates", () => {
    it("returns true for valid Bengaluru coordinates", () => {
      expect(validateCoordinates(12.9716, 77.5946)).toBe(true);
      expect(validateCoordinates(0, 0)).toBe(true);
      expect(validateCoordinates(-90, -180)).toBe(true);
      expect(validateCoordinates(90, 180)).toBe(true);
    });

    it("returns false for invalid latitude (>90 or <-90)", () => {
      expect(validateCoordinates(91.0, 77.5946)).toBe(false);
      expect(validateCoordinates(-95.0, 77.5946)).toBe(false);
    });

    it("returns false for invalid longitude (>180 or <-180)", () => {
      expect(validateCoordinates(12.9716, 181.0)).toBe(false);
      expect(validateCoordinates(12.9716, -185.0)).toBe(false);
    });

    it("returns false for null or undefined coordinates", () => {
      expect(validateCoordinates(null, 77.5946)).toBe(false);
      expect(validateCoordinates(12.9716, null)).toBe(false);
      expect(validateCoordinates(undefined, undefined)).toBe(false);
    });
  });

  describe("formatUrgency", () => {
    it("formats urgency levels properly", () => {
      expect(formatUrgency("low").label).toBe("Low");
      expect(formatUrgency("normal").label).toBe("Normal");
      expect(formatUrgency("high").label).toBe("High");
      expect(formatUrgency("emergency").label).toBe("Emergency");
      expect(formatUrgency("unknown").label).toBe("Normal");
    });
  });

  describe("formatStatus", () => {
    it("formats service request statuses correctly", () => {
      expect(formatStatus("pending").label).toBe("Pending Analysis");
      expect(formatStatus("matched").label).toBe("Workers Matched");
      expect(formatStatus("completed").label).toBe("Completed");
    });
  });
});
