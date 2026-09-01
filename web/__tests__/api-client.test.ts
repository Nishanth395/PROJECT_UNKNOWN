import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient, ApiException } from "@/lib/api/api-client";

describe("ApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles successful 200 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "online" }),
    });

    const result = await apiClient.get<{ status: string }>("/health");
    expect(result.status).toBe("online");
  });

  it("throws ApiException on 401 Unauthorized", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        detail: {
          error_code: "MISSING_CREDENTIALS",
          message: "Authorization header required",
        },
      }),
    });

    await expect(apiClient.get("/api/v1/auth/me")).rejects.toThrow(ApiException);
  });

  it("throws ApiException on 403 Forbidden", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        detail: {
          error_code: "FORBIDDEN",
          message: "Access restricted",
        },
      }),
    });

    await expect(apiClient.get("/api/v1/workers/me")).rejects.toThrow(
      "Access restricted"
    );
  });

  it("throws ApiException on 404 Not Found", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        detail: {
          error_code: "NOT_FOUND",
          message: "Resource does not exist",
        },
      }),
    });

    await expect(
      apiClient.get("/api/v1/service-requests/00000000-0000-0000-0000-000000000000")
    ).rejects.toThrow("Resource does not exist");
  });

  it("throws ApiException on 422 Validation Error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [
          { loc: ["body", "latitude"], msg: "Input should be less than or equal to 90" },
        ],
      }),
    });

    await expect(
      apiClient.post("/api/v1/service-requests", { latitude: 100 })
    ).rejects.toThrow();
  });

  it("handles network failure gracefully", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    await expect(apiClient.get("/health")).rejects.toThrow(
      "Network connection failure"
    );
  });
});
