import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReviewModal } from "@/components/review-modal";
import { WorkerReviewsList } from "@/components/worker-reviews-list";
import { Booking } from "@/types/booking";
import * as reviewApi from "@/lib/api/reviews";
import { ApiException } from "@/lib/api/api-client";

describe("Customer Reviews & Reputation Experience", () => {
  const mockBooking: Booking = {
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

  describe("ReviewModal Component", () => {
    it("renders modal with worker name and star rating options when isOpen is true", () => {
      const handleClose = vi.fn();
      const handleSuccess = vi.fn();

      render(
        <ReviewModal
          booking={mockBooking}
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      );

      expect(screen.getByText(/Rate Manoj Sharma/i)).toBeDefined();
      expect(screen.getByText(/How was your service experience/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /Submit Review/i })).toBeDefined();
      expect(screen.getByPlaceholderText(/Tell others about the quality of work/i)).toBeDefined();
    });

    it("does not render when isOpen is false", () => {
      const { container } = render(
        <ReviewModal
          booking={mockBooking}
          isOpen={false}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("submits review successfully with valid rating and comment", async () => {
      const handleSuccess = vi.fn();
      const mockCreatedReview = {
        id: "rev-1",
        booking_id: mockBooking.booking_id,
        worker_id: mockBooking.worker_id,
        rating: 5,
        comment: "Excellent carpentry work!",
        created_at: "2026-09-01T11:30:00Z",
        customer_name: "Anjali Nair",
      };

      vi.spyOn(reviewApi, "submitReview").mockResolvedValueOnce(mockCreatedReview);

      render(
        <ReviewModal
          booking={mockBooking}
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={handleSuccess}
        />
      );

      const textarea = screen.getByPlaceholderText(/Tell others about the quality of work/i);
      fireEvent.change(textarea, { target: { value: "Excellent carpentry work!" } });

      const submitButton = screen.getByRole("button", { name: /Submit Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(reviewApi.submitReview).toHaveBeenCalledWith({
          booking_id: "b-comp-1",
          rating: 5,
          comment: "Excellent carpentry work!",
        });
        expect(handleSuccess).toHaveBeenCalledWith(mockCreatedReview);
      });
    });

    it("displays error when duplicate review is submitted (409 Conflict)", async () => {
      vi.spyOn(reviewApi, "submitReview").mockRejectedValueOnce(
        new ApiException("Duplicate review", 409, "DUPLICATE_REVIEW")
      );

      render(
        <ReviewModal
          booking={mockBooking}
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      const submitButton = screen.getByRole("button", { name: /Submit Review/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/A review has already been submitted for this completed booking/i)
        ).toBeDefined();
      });
    });
  });

  describe("WorkerReviewsList Component", () => {
    it("renders worker reviews and authoritative average rating", async () => {
      vi.spyOn(reviewApi, "fetchWorkerReviews").mockResolvedValueOnce({
        total: 2,
        average_rating: 4.85,
        limit: 20,
        offset: 0,
        items: [
          {
            id: "r-1",
            booking_id: "b-1",
            worker_id: "w-1",
            rating: 5,
            comment: "Very prompt and professional.",
            created_at: "2026-09-01T10:00:00Z",
            customer_name: "Rahul Verma",
          },
          {
            id: "r-2",
            booking_id: "b-2",
            worker_id: "w-1",
            rating: 4,
            comment: "Good work.",
            created_at: "2026-08-30T10:00:00Z",
            customer_name: "Priya S.",
          },
        ],
      });

      render(<WorkerReviewsList workerId="w-1" workerName="Manoj Sharma" />);

      await waitFor(() => {
        expect(screen.getByText(/Reviews for Manoj Sharma/i)).toBeDefined();
        expect(screen.getByText("4.85")).toBeDefined();
        expect(screen.getByText("2 reviews")).toBeDefined();
        expect(screen.getByText("Rahul Verma")).toBeDefined();
        expect(screen.getByText(/"Very prompt and professional."/i)).toBeDefined();
      });
    });

    it("renders empty state when worker has 0 reviews", async () => {
      vi.spyOn(reviewApi, "fetchWorkerReviews").mockResolvedValueOnce({
        total: 0,
        average_rating: null,
        limit: 20,
        offset: 0,
        items: [],
      });

      render(<WorkerReviewsList workerId="w-new" workerName="Deepak Pro" />);

      await waitFor(() => {
        expect(screen.getByText(/No reviews yet/i)).toBeDefined();
        expect(
          screen.getByText(/This professional has not received public reviews yet/i)
        ).toBeDefined();
      });
    });
  });
});
