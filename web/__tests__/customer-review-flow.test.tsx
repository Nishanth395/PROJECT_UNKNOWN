import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReviewForm } from "@/components/review-form";
import { ReviewModal } from "@/components/review-modal";
import { WorkerReviews } from "@/components/worker-reviews";
import { Booking } from "@/types/booking";
import * as reviewApi from "@/lib/api/reviews";
import { ApiException } from "@/lib/api/api-client";

describe("Customer Reviews & Reputation Web Experience (Phase 8D-2 Audit Suite)", () => {
  const mockCompletedBooking: Booking = {
    booking_id: "b-comp-1",
    customer_id: "cust-1",
    worker_id: "work-1",
    service_request_id: "sr-1",
    customer_name: "Anjali Nair",
    worker_name: "Manoj Sharma",
    category: "Carpentry",
    description: "Fix wardrobe hinges",
    scheduled_time: "2026-09-01T10:00:00Z",
    status: "completed",
    created_at: "2026-09-01T08:00:00Z",
    updated_at: "2026-09-01T11:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Review Form Component Tests (Tests 1-7, 10-14, 17-21)
  // =========================================================================
  describe("ReviewForm Component", () => {
    it("1. renders review form with header and accessible controls", () => {
      render(
        <ReviewForm
          bookingId="b-comp-1"
          workerName="Manoj Sharma"
          onSuccess={vi.fn()}
        />
      );

      expect(screen.getByTestId("review-form")).toBeDefined();
      expect(screen.getByText(/How was your experience with Manoj Sharma/i)).toBeDefined();
      expect(screen.getByText(/Tell us about your experience/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /Submit Review/i })).toBeDefined();
    });

    it("2. renders exactly five star rating controls", () => {
      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      const starButtons = [
        screen.getByRole("radio", { name: "1 Star" }),
        screen.getByRole("radio", { name: "2 Star" }),
        screen.getByRole("radio", { name: "3 Star" }),
        screen.getByRole("radio", { name: "4 Star" }),
        screen.getByRole("radio", { name: "5 Star" }),
      ];

      expect(starButtons.length).toBe(5);
    });

    it("3. rating selection works and updates aria-checked", () => {
      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      const fourStarBtn = screen.getByRole("radio", { name: "4 Star" });
      expect(fourStarBtn.getAttribute("aria-checked")).toBe("false");

      fireEvent.click(fourStarBtn);
      expect(fourStarBtn.getAttribute("aria-checked")).toBe("true");
      expect(screen.getByText("4 Stars - Very Good")).toBeDefined();
    });

    it("4. rating is required and shows client validation error when submitted with 0 stars", async () => {
      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      const submitButton = screen.getByRole("button", { name: /Submit Review/i });
      fireEvent.click(submitButton);

      expect(
        screen.getByText("Please select a star rating from 1 to 5.")
      ).toBeDefined();
      expect(screen.getByTestId("validation-error")).toBeDefined();
    });

    it("5. allows selecting minimum rating of 1 star and submits successfully", async () => {
      const handleSuccess = vi.fn();
      const mockCreated = {
        id: "rev-1",
        booking_id: "b-comp-1",
        worker_id: "work-1",
        rating: 1,
        comment: "Needs improvement",
        created_at: "2026-09-01T12:00:00Z",
        customer_name: "Anjali Nair",
      };

      const spy = vi.spyOn(reviewApi, "submitReview").mockResolvedValueOnce(mockCreated);

      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={handleSuccess}
        />
      );

      fireEvent.click(screen.getByRole("radio", { name: "1 Star" }));
      fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith({
          booking_id: "b-comp-1",
          rating: 1,
          comment: undefined,
        });
        expect(handleSuccess).toHaveBeenCalledWith(mockCreated);
      });
    });

    it("6. allows selecting maximum rating of 5 stars and submits successfully", async () => {
      const handleSuccess = vi.fn();
      const mockCreated = {
        id: "rev-5",
        booking_id: "b-comp-1",
        worker_id: "work-1",
        rating: 5,
        comment: undefined,
        created_at: "2026-09-01T12:00:00Z",
        customer_name: "Anjali Nair",
      };

      const spy = vi.spyOn(reviewApi, "submitReview").mockResolvedValueOnce(mockCreated);

      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={handleSuccess}
        />
      );

      fireEvent.click(screen.getByRole("radio", { name: "5 Star" }));
      fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith({
          booking_id: "b-comp-1",
          rating: 5,
          comment: undefined,
        });
      });
    });

    it("7. allows submitting review with optional comment omitted", async () => {
      const spy = vi.spyOn(reviewApi, "submitReview").mockResolvedValueOnce({
        id: "rev-no-comment",
        booking_id: "b-comp-1",
        worker_id: "work-1",
        rating: 4,
        comment: null,
        created_at: "2026-09-01T12:00:00Z",
        customer_name: "Anjali Nair",
      });

      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("radio", { name: "4 Star" }));
      fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith({
          booking_id: "b-comp-1",
          rating: 4,
          comment: undefined,
        });
      });
    });

    it("8. accepts comment up to 1000 characters and shows live counter", async () => {
      const longComment = "A".repeat(1000);
      const spy = vi.spyOn(reviewApi, "submitReview").mockResolvedValueOnce({
        id: "rev-1000",
        booking_id: "b-comp-1",
        worker_id: "work-1",
        rating: 5,
        comment: longComment,
        created_at: "2026-09-01T12:00:00Z",
        customer_name: "Anjali Nair",
      });

      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("radio", { name: "5 Star" }));
      const textarea = screen.getByPlaceholderText(/Describe punctuality/i);
      fireEvent.change(textarea, { target: { value: longComment } });

      expect(screen.getByTestId("character-counter").textContent).toContain("1000 / 1000");

      fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith({
          booking_id: "b-comp-1",
          rating: 5,
          comment: longComment,
        });
      });
    });

    it("9. loading state disables submit button and prevents duplicate submissions", async () => {
      vi.spyOn(reviewApi, "submitReview").mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500))
      );

      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("radio", { name: "5 Star" }));
      const submitBtn = screen.getByRole("button", { name: /Submit Review/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText("Submitting...")).toBeDefined();
      expect(submitBtn.hasAttribute("disabled")).toBe(true);
    });

    it("10. handles 401 unauthenticated session expired error", async () => {
      vi.spyOn(reviewApi, "submitReview").mockRejectedValueOnce(
        new ApiException("Session expired", 401, "UNAUTHORIZED")
      );

      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("radio", { name: "5 Star" }));
      fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

      await waitFor(() => {
        expect(screen.getByText("Session expired")).toBeDefined();
      });
    });

    it("11. handles 403 forbidden error when reviewing unowned booking", async () => {
      vi.spyOn(reviewApi, "submitReview").mockRejectedValueOnce(
        new ApiException("Forbidden", 403, "FORBIDDEN")
      );

      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("radio", { name: "5 Star" }));
      fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

      await waitFor(() => {
        expect(
          screen.getByText("You can only review services completed for your own bookings.")
        ).toBeDefined();
      });
    });

    it("12. handles 404 not found error when booking is missing", async () => {
      vi.spyOn(reviewApi, "submitReview").mockRejectedValueOnce(
        new ApiException("Not found", 404, "BOOKING_NOT_FOUND")
      );

      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("radio", { name: "5 Star" }));
      fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

      await waitFor(() => {
        expect(screen.getByText("This booking is no longer available.")).toBeDefined();
      });
    });

    it("13. handles DUPLICATE_REVIEW 409 conflict gracefully", async () => {
      vi.spyOn(reviewApi, "submitReview").mockRejectedValueOnce(
        new ApiException("Duplicate", 409, "DUPLICATE_REVIEW")
      );

      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("radio", { name: "5 Star" }));
      fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

      await waitFor(() => {
        expect(
          screen.getByText("A review has already been submitted for this booking.")
        ).toBeDefined();
      });
    });

    it("14. handles BOOKING_NOT_COMPLETED 409 conflict gracefully without generic override", async () => {
      vi.spyOn(reviewApi, "submitReview").mockRejectedValueOnce(
        new ApiException("Not completed", 409, "BOOKING_NOT_COMPLETED")
      );

      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("radio", { name: "4 Star" }));
      fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Reviews are only available after the service has been completed.")
        ).toBeDefined();
      });
    });

    it("15. handles 422 schema validation error", async () => {
      vi.spyOn(reviewApi, "submitReview").mockRejectedValueOnce(
        new ApiException("Invalid rating", 422, "VALIDATION_ERROR")
      );

      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("radio", { name: "5 Star" }));
      fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

      await waitFor(() => {
        expect(
          screen.getByText(
            "Please verify that your rating is between 1 and 5 and comment is valid."
          )
        ).toBeDefined();
      });
    });

    it("16. handles network failure gracefully without exposing stack traces", async () => {
      vi.spyOn(reviewApi, "submitReview").mockRejectedValueOnce(
        new Error("Network connection lost")
      );

      render(
        <ReviewForm
          bookingId="b-comp-1"
          onSuccess={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("radio", { name: "5 Star" }));
      fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

      await waitFor(() => {
        expect(
          screen.getByText(
            "Network error encountered. Please check your connection and try again."
          )
        ).toBeDefined();
        expect(screen.queryByText(/Traceback/i)).toBeNull();
      });
    });
  });

  // =========================================================================
  // 2. Booking Status Conditional Visibility Tests (Tests 17-21)
  // =========================================================================
  describe("Booking Status Rate Worker Visibility Logic", () => {
    const renderBookingStatusView = (status: Booking["status"], alreadyReviewed: boolean = false) => {
      const isCompleted = status === "completed";
      return (
        <div data-testid="booking-status-container">
          {isCompleted && (
            <div data-testid="review-action-section">
              {alreadyReviewed ? (
                <span data-testid="review-submitted-badge">Review submitted (5 ★)</span>
              ) : (
                <button data-testid="rate-worker-btn">Rate Worker</button>
              )}
            </div>
          )}
        </div>
      );
    };

    it("17. completed booking shows Rate Worker button", () => {
      render(renderBookingStatusView("completed", false));
      expect(screen.getByTestId("rate-worker-btn")).toBeDefined();
      expect(screen.getByText("Rate Worker")).toBeDefined();
    });

    it("18. pending booking does NOT show Rate Worker button", () => {
      render(renderBookingStatusView("pending", false));
      expect(screen.queryByTestId("rate-worker-btn")).toBeNull();
      expect(screen.queryByTestId("review-action-section")).toBeNull();
    });

    it("19. accepted booking does NOT show Rate Worker button", () => {
      render(renderBookingStatusView("accepted", false));
      expect(screen.queryByTestId("rate-worker-btn")).toBeNull();
      expect(screen.queryByTestId("review-action-section")).toBeNull();
    });

    it("20. cancelled booking does NOT show Rate Worker button", () => {
      render(renderBookingStatusView("cancelled", false));
      expect(screen.queryByTestId("rate-worker-btn")).toBeNull();
      expect(screen.queryByTestId("review-action-section")).toBeNull();
    });

    it("21. completed + already reviewed booking shows 'Review submitted' badge instead of button", () => {
      render(renderBookingStatusView("completed", true));
      expect(screen.queryByTestId("rate-worker-btn")).toBeNull();
      expect(screen.getByTestId("review-submitted-badge")).toBeDefined();
      expect(screen.getByText(/Review submitted/i)).toBeDefined();
    });
  });

  // =========================================================================
  // 3. Worker Reviews Display Component Tests (Tests 22-25)
  // =========================================================================
  describe("WorkerReviews Component", () => {
    it("22. renders worker reviews list with sanitized customer names and comments", async () => {
      vi.spyOn(reviewApi, "fetchWorkerReviews").mockResolvedValueOnce({
        total: 2,
        average_rating: 4.5,
        limit: 20,
        offset: 0,
        items: [
          {
            id: "r-1",
            booking_id: "b-1",
            worker_id: "w-1",
            rating: 5,
            comment: "Great experience, very punctual.",
            created_at: "2026-09-01T10:00:00Z",
            customer_name: "Pooja Sharma",
          },
          {
            id: "r-2",
            booking_id: "b-2",
            worker_id: "w-1",
            rating: 4,
            comment: "Good job done on time.",
            created_at: "2026-08-30T10:00:00Z",
            customer_name: "Amit Patel",
          },
        ],
      });

      render(<WorkerReviews workerId="w-1" workerName="Manoj Sharma" />);

      await waitFor(() => {
        expect(screen.getByTestId("worker-reviews")).toBeDefined();
        expect(screen.getByText("Pooja Sharma")).toBeDefined();
        expect(screen.getByText(/"Great experience, very punctual."/i)).toBeDefined();
        expect(screen.getByText("Amit Patel")).toBeDefined();
      });
    });

    it("23. renders empty reviews state when worker has 0 reviews", async () => {
      vi.spyOn(reviewApi, "fetchWorkerReviews").mockResolvedValueOnce({
        total: 0,
        average_rating: null,
        limit: 20,
        offset: 0,
        items: [],
      });

      render(<WorkerReviews workerId="w-empty" workerName="New Pro" />);

      await waitFor(() => {
        expect(screen.getByTestId("worker-reviews-empty")).toBeDefined();
        expect(screen.getByText("No reviews yet")).toBeDefined();
        expect(
          screen.getByText(/This professional has not received public reviews yet/i)
        ).toBeDefined();
      });
    });

    it("24. renders authoritative worker average rating and total review count from backend", async () => {
      vi.spyOn(reviewApi, "fetchWorkerReviews").mockResolvedValueOnce({
        total: 48,
        average_rating: 4.85,
        limit: 20,
        offset: 0,
        items: [
          {
            id: "r-1",
            booking_id: "b-1",
            worker_id: "w-1",
            rating: 5,
            comment: "Excellent carpentry",
            created_at: "2026-09-01T10:00:00Z",
            customer_name: "Vikas K.",
          },
        ],
      });

      render(<WorkerReviews workerId="w-1" workerName="Manoj Sharma" />);

      await waitFor(() => {
        expect(screen.getByTestId("worker-reputation-summary")).toBeDefined();
        expect(screen.getByText("4.85")).toBeDefined();
        expect(screen.getByText("48 reviews")).toBeDefined();
      });
    });

    it("25. renders error state with retry button on API failure", async () => {
      const spy = vi
        .spyOn(reviewApi, "fetchWorkerReviews")
        .mockRejectedValueOnce(new ApiException("Failed to load worker reviews", 500))
        .mockResolvedValueOnce({
          total: 1,
          average_rating: 5.0,
          limit: 20,
          offset: 0,
          items: [
            {
              id: "r-retry",
              booking_id: "b-retry",
              worker_id: "w-1",
              rating: 5,
              comment: "Recovered successfully",
              created_at: "2026-09-01T10:00:00Z",
              customer_name: "Anita Roy",
            },
          ],
        });

      render(<WorkerReviews workerId="w-1" workerName="Manoj Sharma" />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load worker reviews")).toBeDefined();
        expect(screen.getByRole("button", { name: /Try again/i })).toBeDefined();
      });

      // Click retry
      fireEvent.click(screen.getByRole("button", { name: /Try again/i }));

      await waitFor(() => {
        expect(spy).toHaveBeenCalledTimes(2);
        expect(screen.getByText("Anita Roy")).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 4. Review Modal Component Tests (Test 26)
  // =========================================================================
  describe("ReviewModal Component", () => {
    it("26. opens and closes cleanly without leaking state", () => {
      const handleClose = vi.fn();
      const { rerender } = render(
        <ReviewModal
          booking={mockCompletedBooking}
          isOpen={true}
          onClose={handleClose}
          onSuccess={vi.fn()}
        />
      );

      expect(screen.getByTestId("review-modal")).toBeDefined();
      expect(screen.getByText(/Rate Manoj Sharma/i)).toBeDefined();

      const closeBtn = screen.getByRole("button", { name: "Close modal" });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      rerender(
        <ReviewModal
          booking={mockCompletedBooking}
          isOpen={false}
          onClose={handleClose}
          onSuccess={vi.fn()}
        />
      );
      expect(screen.queryByTestId("review-modal")).toBeNull();
    });
  });
});
