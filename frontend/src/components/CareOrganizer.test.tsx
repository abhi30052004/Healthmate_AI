import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CareOrganizer } from "./CareOrganizer";
import type {
  CareOverviewResponse,
  CareCalendarResponse,
  MedicationRecord,
  AppointmentRecord,
  FollowUpTask,
  DocumentItem,
} from "../api/client";

// Mock API client methods
vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    getCareOverview: vi.fn(),
    getCareCalendar: vi.fn(),
    listMedications: vi.fn(),
    createMedication: vi.fn(),
    updateMedication: vi.fn(),
    deleteMedication: vi.fn(),
    listAppointments: vi.fn(),
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    deleteAppointment: vi.fn(),
    listFollowUps: vi.fn(),
    createFollowUp: vi.fn(),
    updateFollowUp: vi.fn(),
    deleteFollowUp: vi.fn(),
    listDocuments: vi.fn(),
  };
});

import {
  getCareOverview,
  getCareCalendar,
  listMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  listFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  listDocuments,
} from "../api/client";

describe("CareOrganizer Component", () => {
  const mockDocs: DocumentItem[] = [
    {
      id: "doc-1",
      owner_id: "user-1",
      filename: "Discharge_Summary.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
      checksum_sha256: "hash1",
      processing_status: "extracted",
      document_date: "2025-01-15",
      is_verified: true,
      created_at: "2025-01-15T10:00:00Z",
    },
  ];

  const mockOverview: CareOverviewResponse = {
    active_medications_count: 2,
    upcoming_appointments_count: 1,
    pending_follow_ups_count: 2,
    overdue_follow_ups_count: 1,
    upcoming_appointments: [
      {
        id: "appt-1",
        user_id: "user-1",
        title: "Annual Cardiology Evaluation",
        appointment_type: "Consultation",
        provider_name: "Dr. Marcus Vance",
        location: "Suite 405, Heart Institute",
        scheduled_at: "2025-08-15T14:00:00Z",
        timezone: "America/New_York",
        status: "scheduled",
        notes: "Bring previous ECG report.",
        follow_up_tasks_count: 1,
        created_at: "2025-01-01T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z",
      },
    ],
    pending_tasks: [
      {
        id: "task-1",
        user_id: "user-1",
        title: "Complete fasting blood panel",
        description: "12-hour fast before appointment.",
        due_at: "2025-08-13T09:00:00Z",
        status: "pending",
        priority: "high",
        is_overdue: false,
        created_at: "2025-01-01T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z",
      },
    ],
    active_medications: [
      {
        id: "med-1",
        user_id: "user-1",
        name: "Atorvastatin",
        strength: "20 mg",
        dosage_instructions: "Take 1 tablet daily at bedtime",
        status: "active",
        created_at: "2025-01-01T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z",
      },
    ],
    disclaimer: "HealthMate AI Care Organizer is a personal organization tool and does not prescribe medication.",
  };

  const mockMedications: MedicationRecord[] = [
    {
      id: "med-1",
      user_id: "user-1",
      name: "Atorvastatin Calcium",
      medication_type: "Prescription",
      strength: "20 mg",
      dosage_instructions: "Take 1 tablet by mouth daily at bedtime with water",
      route: "Oral",
      frequency: "Once daily at bedtime",
      start_date: "2025-01-01",
      prescriber: "Dr. Marcus Vance",
      pharmacy: "CVS Pharmacy",
      notes: "Lipid lowering therapy",
      status: "active",
      source_document_title: "Discharge_Summary.pdf",
      created_at: "2025-01-01T10:00:00Z",
      updated_at: "2025-01-01T10:00:00Z",
    },
    {
      id: "med-2",
      user_id: "user-1",
      name: "Amoxicillin",
      medication_type: "Prescription",
      strength: "500 mg",
      dosage_instructions: "Take 1 capsule every 8 hours for 10 days",
      route: "Oral",
      frequency: "Three times daily",
      start_date: "2025-01-05",
      end_date: "2025-01-15",
      status: "completed",
      created_at: "2025-01-05T10:00:00Z",
      updated_at: "2025-01-15T10:00:00Z",
    },
  ];

  const mockAppointments: AppointmentRecord[] = [
    {
      id: "appt-1",
      user_id: "user-1",
      title: "Annual Cardiology Evaluation",
      appointment_type: "Consultation",
      provider_name: "Dr. Marcus Vance",
      location: "Suite 405, Heart Institute",
      scheduled_at: "2025-08-15T14:00:00Z",
      timezone: "America/New_York",
      status: "scheduled",
      notes: "Bring previous ECG report.",
      follow_up_tasks_count: 1,
      created_at: "2025-01-01T10:00:00Z",
      updated_at: "2025-01-01T10:00:00Z",
    },
  ];

  const mockTasks: FollowUpTask[] = [
    {
      id: "task-1",
      user_id: "user-1",
      title: "Complete fasting blood panel",
      description: "12-hour fast before appointment.",
      due_at: "2025-08-13T09:00:00Z",
      status: "pending",
      priority: "high",
      appointment_title: "Annual Cardiology Evaluation",
      is_overdue: false,
      created_at: "2025-01-01T10:00:00Z",
      updated_at: "2025-01-01T10:00:00Z",
    },
  ];

  const mockCalendar: CareCalendarResponse = {
    items: [
      {
        id: "task-1",
        item_type: "follow_up",
        title: "Complete fasting blood panel",
        scheduled_or_due_at: "2025-08-13T09:00:00Z",
        status: "pending",
        priority: "high",
        description_or_notes: "12-hour fast before appointment.",
      },
      {
        id: "appt-1",
        item_type: "appointment",
        title: "Annual Cardiology Evaluation",
        scheduled_or_due_at: "2025-08-15T14:00:00Z",
        status: "scheduled",
        provider_or_location: "Dr. Marcus Vance • Suite 405, Heart Institute",
      },
    ],
    total: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (listDocuments as any).mockResolvedValue(mockDocs);
    (getCareOverview as any).mockResolvedValue(mockOverview);
    (listMedications as any).mockResolvedValue(mockMedications);
    (listAppointments as any).mockResolvedValue(mockAppointments);
    (listFollowUps as any).mockResolvedValue(mockTasks);
    (getCareCalendar as any).mockResolvedValue(mockCalendar);
  });

  it("renders overview subtab with summary metrics and disclaimers", async () => {
    render(<CareOrganizer token="mock-token" />);

    expect(screen.getByText("🏥 Care Organizer & Follow-Up Planner")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByTestId("care-overview-view")).toBeDefined();
    });

    expect(screen.getAllByText("Active Medications").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Upcoming Appointments").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pending Tasks").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Overdue Tasks").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("Annual Cardiology Evaluation")).toBeDefined();
    expect(screen.getByText("Complete fasting blood panel")).toBeDefined();
    expect(screen.getByTestId("care-safety-banner")).toBeDefined();
  });

  it("switches to medications subtab, renders medication list with exact instructions", async () => {
    render(<CareOrganizer token="mock-token" />);

    await waitFor(() => {
      expect(screen.getByTestId("subtab-medications")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("subtab-medications"));

    await waitFor(() => {
      expect(screen.getByTestId("care-medications-view")).toBeDefined();
      expect(screen.getByText("Atorvastatin Calcium")).toBeDefined();
      expect(screen.getByText("Amoxicillin")).toBeDefined();
    });

    // Check exact instructions block
    expect(
      screen.getByText('"Take 1 tablet by mouth daily at bedtime with water"')
    ).toBeDefined();

    // Check source report link
    expect(screen.getByText("📄 Discharge_Summary.pdf")).toBeDefined();
  });

  it("opens modal and records a new medication", async () => {
    (createMedication as any).mockResolvedValueOnce({
      id: "med-3",
      user_id: "user-1",
      name: "Metformin",
      strength: "500 mg",
      dosage_instructions: "Take 1 tablet with meals",
      status: "active",
      created_at: "2025-01-01T10:00:00Z",
      updated_at: "2025-01-01T10:00:00Z",
    });

    render(<CareOrganizer token="mock-token" />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("subtab-medications"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("add-medication-button")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("add-medication-button"));

    expect(screen.getByTestId("medication-modal")).toBeDefined();

    const nameInput = screen.getByTestId("med-name-input");
    const instructionsInput = screen.getByTestId("med-instructions-input");

    fireEvent.change(nameInput, { target: { value: "Metformin" } });
    fireEvent.change(instructionsInput, { target: { value: "Take 1 tablet with meals" } });

    fireEvent.click(screen.getByTestId("save-medication-btn"));

    await waitFor(() => {
      expect(createMedication).toHaveBeenCalledWith(
        "mock-token",
        expect.objectContaining({
          name: "Metformin",
          dosage_instructions: "Take 1 tablet with meals",
        })
      );
    });
  });

  it("switches to appointments subtab and updates status", async () => {
    (updateAppointment as any).mockResolvedValueOnce({
      ...mockAppointments[0],
      status: "completed",
    });

    render(<CareOrganizer token="mock-token" />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("subtab-appointments"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("care-appointments-view")).toBeDefined();
      expect(screen.getByText("Annual Cardiology Evaluation")).toBeDefined();
    });

    // Change status to completed
    const statusSelect = screen.getByLabelText("Status");
    fireEvent.change(statusSelect, { target: { value: "completed" } });

    await waitFor(() => {
      expect(updateAppointment).toHaveBeenCalledWith(
        "mock-token",
        "appt-1",
        { status: "completed" }
      );
    });
  });

  it("switches to follow-up tasks subtab and toggles task completion", async () => {
    (updateFollowUp as any).mockResolvedValueOnce({
      ...mockTasks[0],
      status: "completed",
    });

    render(<CareOrganizer token="mock-token" />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("subtab-follow-ups"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("care-follow-ups-view")).toBeDefined();
      expect(screen.getByText("Complete fasting blood panel")).toBeDefined();
    });

    const checkbox = screen.getByLabelText("Toggle completion for Complete fasting blood panel");
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(updateFollowUp).toHaveBeenCalledWith(
        "mock-token",
        "task-1",
        { status: "completed" }
      );
    });
  });

  it("switches to calendar subtab and displays agenda items", async () => {
    render(<CareOrganizer token="mock-token" />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("subtab-calendar"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("care-calendar-view")).toBeDefined();
      expect(screen.getByTestId("calendar-agenda-list")).toBeDefined();
      expect(screen.getByTestId("cal-item-task-1")).toBeDefined();
      expect(screen.getByTestId("cal-item-appt-1")).toBeDefined();
    });

    expect(screen.getByText("📅 APPOINTMENT")).toBeDefined();
    expect(screen.getByText("✅ TASK")).toBeDefined();
  });

  it("handles deletion confirmation flow", async () => {
    (deleteMedication as any).mockResolvedValueOnce(undefined);

    render(<CareOrganizer token="mock-token" />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("subtab-medications"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("delete-med-med-1")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("delete-med-med-1"));

    expect(screen.getByTestId("delete-confirmation-modal")).toBeDefined();

    fireEvent.click(screen.getByTestId("confirm-delete-btn"));

    await waitFor(() => {
      expect(deleteMedication).toHaveBeenCalledWith("mock-token", "med-1");
    });
  });
});
