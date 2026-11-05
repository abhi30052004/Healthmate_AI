import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SmartReminders } from "./SmartReminders";
import type { ReminderItem, InAppNotification } from "../api/client";

// Mock API client methods
vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    listReminders: vi.fn(),
    createReminder: vi.fn(),
    updateReminder: vi.fn(),
    deleteReminder: vi.fn(),
    acknowledgeReminder: vi.fn(),
    dismissReminder: vi.fn(),
    getInAppNotifications: vi.fn(),
    processDueReminders: vi.fn(),
    listMedications: vi.fn().mockResolvedValue([]),
    listAppointments: vi.fn().mockResolvedValue([]),
    listFollowUps: vi.fn().mockResolvedValue([]),
    listDocuments: vi.fn().mockResolvedValue([]),
  };
});

import {
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  acknowledgeReminder,
  dismissReminder,
  getInAppNotifications,
  processDueReminders,
} from "../api/client";

describe("SmartReminders Component", () => {
  const mockToken = "mock-jwt-token";

  const sampleReminders: ReminderItem[] = [
    {
      id: "rem-1",
      user_id: "user-1",
      title: "Take Metformin 500mg",
      description: "With morning meal",
      category: "medication",
      due_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      timezone: "America/New_York",
      frequency: "daily",
      send_email: false,
      is_enabled: true,
      medication_id: "med-1",
      appointment_id: null,
      task_id: null,
      document_id: null,
      delivery_status: "pending",
      delivered_at: null,
      delivery_error: null,
      is_acknowledged: false,
      acknowledged_at: null,
      is_dismissed: false,
      dismissed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      linked_title: "Medication: Metformin",
    },
    {
      id: "rem-2",
      user_id: "user-1",
      title: "Cardiologist Checkup",
      description: "Bring recent ECG results",
      category: "appointment",
      due_at: new Date(Date.now() - 3600000).toISOString(), // 1 hr ago (overdue)
      timezone: "America/New_York",
      frequency: "once",
      send_email: true,
      is_enabled: true,
      medication_id: null,
      appointment_id: "appt-1",
      task_id: null,
      document_id: null,
      delivery_status: "delivered",
      delivered_at: new Date().toISOString(),
      delivery_error: "SMTP server host is not configured on the backend.",
      is_acknowledged: false,
      acknowledged_at: null,
      is_dismissed: false,
      dismissed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      linked_title: "Appointment: Cardiology Consultation",
    },
  ];

  const sampleNotifications: InAppNotification[] = [
    {
      reminder_id: "rem-2",
      title: "Cardiologist Checkup",
      description: "Bring recent ECG results",
      category: "appointment",
      due_at: new Date(Date.now() - 3600000).toISOString(),
      timezone: "America/New_York",
      delivery_status: "delivered",
      delivered_at: new Date().toISOString(),
      is_acknowledged: false,
      is_overdue: true,
      delivery_channel: "in_app",
      email_delivery_status: "SMTP server host is not configured",
      clinical_disclaimer: "Reminder only.",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listReminders).mockResolvedValue(sampleReminders);
    vi.mocked(getInAppNotifications).mockResolvedValue(sampleNotifications);
  });

  it("renders the clinical safety disclosure and reminder sections", async () => {
    render(<SmartReminders token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/Smart Reminder & Scheduling Aid \(Non-Prescriptive\)/i)).toBeDefined();
    });

    // Check disclosure text
    expect(screen.getByText(/never proof or verification that medication was taken/i)).toBeDefined();
    // Check reminders title
    expect(screen.getByText(/⏰ Smart Health Reminders & Notifications/i)).toBeDefined();
  });

  it("displays upcoming reminders and in-app notifications banner", async () => {
    render(<SmartReminders token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Take Metformin 500mg")).toBeDefined();
    });

    // Verify in-app notifications alert box
    expect(screen.getByText(/In-App Notifications \(1\)/i)).toBeDefined();
    expect(screen.getAllByText("Cardiologist Checkup").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/In-app only \(SMTP unset\)/i)).toBeDefined();
  });

  it("handles notification acknowledgment with explicit clinical disclosure", async () => {
    vi.mocked(acknowledgeReminder).mockResolvedValue({
      reminder_id: "rem-2",
      is_acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      message: "Notification acknowledged. Note: this records notification receipt only.",
    });

    render(<SmartReminders token={mockToken} />);

    await waitFor(() => {
      expect(screen.getAllByText("✓ Acknowledge").length).toBeGreaterThan(0);
    });

    const ackBtn = screen.getAllByText("✓ Acknowledge")[0];
    fireEvent.click(ackBtn);

    await waitFor(() => {
      expect(acknowledgeReminder).toHaveBeenCalledWith(mockToken, "rem-2");
      expect(screen.getByText(/records notification receipt only/i)).toBeDefined();
    });
  });

  it("handles dismissing a notification", async () => {
    vi.mocked(dismissReminder).mockResolvedValue({
      ...sampleReminders[1],
      is_dismissed: true,
    });

    render(<SmartReminders token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Dismiss")).toBeDefined();
    });

    const dismissBtn = screen.getByText("Dismiss");
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(dismissReminder).toHaveBeenCalledWith(mockToken, "rem-2");
      expect(screen.getByText("Notification dismissed from active view.")).toBeDefined();
    });
  });

  it("opens create reminder modal, fills form, and creates reminder", async () => {
    vi.mocked(createReminder).mockResolvedValue({
      id: "rem-3",
      user_id: "user-1",
      title: "Daily Blood Glucose Check",
      description: "Before morning coffee",
      category: "report_review",
      due_at: new Date(Date.now() + 86400000).toISOString(),
      timezone: "UTC",
      frequency: "daily",
      send_email: false,
      is_enabled: true,
      medication_id: null,
      appointment_id: null,
      task_id: null,
      document_id: null,
      delivery_status: "pending",
      delivered_at: null,
      delivery_error: null,
      is_acknowledged: false,
      acknowledged_at: null,
      is_dismissed: false,
      dismissed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    render(<SmartReminders token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("+ New Reminder")).toBeDefined();
    });

    fireEvent.click(screen.getByText("+ New Reminder"));

    // Modal should now be open
    expect(screen.getByText("Create Smart Health Reminder")).toBeDefined();
    expect(screen.getByText(/Medication Safety:/i)).toBeDefined();

    const titleInput = screen.getByPlaceholderText(/Morning Metformin/i);
    fireEvent.change(titleInput, { target: { value: "Daily Blood Glucose Check" } });

    const submitBtn = screen.getByText("Create Reminder");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createReminder).toHaveBeenCalled();
      expect(screen.getByText("New reminder created successfully.")).toBeDefined();
    });
  });

  it("handles toggle enable/disable on a reminder", async () => {
    vi.mocked(updateReminder).mockResolvedValue({
      ...sampleReminders[0],
      is_enabled: false,
    });

    render(<SmartReminders token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Disable")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Disable"));

    await waitFor(() => {
      expect(updateReminder).toHaveBeenCalledWith(mockToken, "rem-1", { is_enabled: false });
      expect(screen.getByText(/disabled successfully/i)).toBeDefined();
    });
  });

  it("handles cancel reminder and confirms medical records remain untouched", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(deleteReminder).mockResolvedValue({
      message: "Reminder cancelled successfully. Associated medical records remain untouched.",
    });

    render(<SmartReminders token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(deleteReminder).toHaveBeenCalledWith(mockToken, "rem-1");
      expect(screen.getByText(/Associated medical records remain untouched/i)).toBeDefined();
    });
  });

  it("triggers Check Due Now and displays SMTP unconfigured safe fallback notice", async () => {
    vi.mocked(processDueReminders).mockResolvedValue({
      processed_count: 2,
      delivered_in_app: 2,
      emails_sent: 0,
      emails_skipped: 2,
      errors: [],
    });

    render(<SmartReminders token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText("🔄 Check Due Now")).toBeDefined();
    });

    fireEvent.click(screen.getByText("🔄 Check Due Now"));

    await waitFor(() => {
      expect(processDueReminders).toHaveBeenCalledWith(mockToken);
      expect(screen.getByText(/In-app notifications delivered; email dispatch skipped \(SMTP unconfigured or unverified\)/i)).toBeDefined();
    });
  });
});
