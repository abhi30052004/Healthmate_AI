import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PageLoader } from "./PageLoader";
import { RouteProgress } from "./RouteProgress";
import { EmptyState, ErrorState, OfflineBanner, ColdStartBanner } from "./States";

describe("Step 3 - Loading, Feedback & Error States", () => {
  it("PageLoader renders with accessible role status", () => {
    render(<PageLoader />);
    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByLabelText("Loading HealthMate")).toBeDefined();
    expect(screen.getByText("HealthMate AI")).toBeDefined();
  });

  it("RouteProgress renders progressbar during navigation", () => {
    const { rerender } = render(<RouteProgress isNavigating={true} />);
    expect(screen.getByRole("progressbar")).toBeDefined();

    rerender(<RouteProgress isNavigating={false} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("EmptyState renders title, description, and triggers action button", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No Lab Reports"
        description="Upload a PDF or image of your laboratory findings."
        actionLabel="Upload First Report"
        onAction={handleAction}
      />
    );

    expect(screen.getByText("No Lab Reports")).toBeDefined();
    expect(screen.getByText("Upload a PDF or image of your laboratory findings.")).toBeDefined();

    const btn = screen.getByRole("button", { name: "Upload First Report" });
    fireEvent.click(btn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it("ErrorState renders role alert and calls onRetry when clicked", () => {
    const handleRetry = vi.fn();
    render(<ErrorState title="Failed to Fetch Records" onRetry={handleRetry} />);
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Failed to Fetch Records")).toBeDefined();

    const retryBtn = screen.getByRole("button", { name: "Try Again" });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("OfflineBanner and ColdStartBanner render polite status text", () => {
    render(
      <>
        <OfflineBanner lastSynced="10:30 AM" />
        <ColdStartBanner />
      </>
    );

    expect(screen.getByText(/You are currently offline/i)).toBeDefined();
    expect(screen.getByText(/Last synced: 10:30 AM/i)).toBeDefined();
    expect(screen.getByText(/Waking up the server/i)).toBeDefined();
  });
});
