import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationCenter, type AppNotification } from "./NotificationCenter";

describe("NotificationCenter Component", () => {
  const mockNotifications: AppNotification[] = [
    {
      id: "n-1",
      title: "Medication Scheduled",
      message: "Metformin 500mg due at 8:00 PM.",
      timestamp: "2026-10-30T10:00:00Z",
      type: "reminder",
      read: false,
      linkTab: "medications",
    },
  ];

  it("renders trigger button with unread count badge", () => {
    render(<NotificationCenter notifications={mockNotifications} />);

    expect(screen.getByLabelText("View notifications")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
  });

  it("opens notification dropdown when trigger button is clicked", () => {
    const handleNavigate = vi.fn();
    render(
      <NotificationCenter
        notifications={mockNotifications}
        onNavigateTab={handleNavigate}
      />
    );

    const btn = screen.getByLabelText("View notifications");
    fireEvent.click(btn);

    expect(screen.getByText("Notifications")).toBeDefined();
    expect(screen.getByText("Medication Scheduled")).toBeDefined();
    expect(screen.getByText("Metformin 500mg due at 8:00 PM.")).toBeDefined();

    // Clicking notification marks as read and navigates
    const notifItem = screen.getByText("Medication Scheduled");
    fireEvent.click(notifItem);
    expect(handleNavigate).toHaveBeenCalledWith("medications");
  });
});

