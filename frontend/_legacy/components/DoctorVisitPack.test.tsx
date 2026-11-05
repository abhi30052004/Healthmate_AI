import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DoctorVisitPack } from "./DoctorVisitPack";
import type { DoctorVisitPackData } from "../api/client";

// Mock AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    token: "mock-jwt-token",
    user: { id: "user-1", email: "alpha@healthmate.ai", name: "Alpha Patient" },
    handleSessionExpired: vi.fn(),
  }),
}));

// Mock API client methods
vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    generateVisitPackDraft: vi.fn(),
    exportVisitPackPdf: vi.fn(),
  };
});

import { generateVisitPackDraft, exportVisitPackPdf, ApiError } from "../api/client";

describe("DoctorVisitPack Component", () => {
  const mockDraft: DoctorVisitPackData = {
    patient_name: "Alpha Patient",
    patient_email: "alpha@healthmate.ai",
    clinician_name: "Dr. Emily Thorne",
    chief_complaint: "6-month diabetes checkup",
    patient_notes: "Feeling occasional dizziness.",
    start_date: "2026-01-01",
    end_date: "2026-06-30",
    generated_at: "2026-06-30 12:00 UTC",
    include_unverified: false,
    categories: ["documents", "observations", "medications", "care_schedule", "clinician_questions"],
    documents: [
      {
        document_id: "doc-1",
        filename: "Metabolic_Panel.pdf",
        clinical_date: "2026-04-15",
        is_verified: true,
        page_count: 1,
      },
    ],
    observations: [
      {
        observation_id: "obs-1",
        document_id: "doc-1",
        document_title: "Metabolic_Panel.pdf",
        test_name: "Fasting Blood Glucose",
        category: "Endocrine",
        value: "115",
        unit: "mg/dL",
        reference_range: "70 - 99",
        flag: "HIGH",
        clinical_date: "2026-04-15",
        is_verified: true,
        page: 1,
        included: true,
      },
    ],
    trends: [
      {
        test_name: "Fasting Blood Glucose",
        category: "Endocrine",
        baseline_date: "2025-10-10",
        baseline_value: "102 mg/dL",
        latest_date: "2026-04-15",
        latest_value: "115 mg/dL",
        change_description: "Increased by 13 mg/dL (+12.7%)",
        included: true,
      },
    ],
    medications: [
      {
        id: "med-1",
        name: "Metformin",
        strength: "500 mg",
        dosage_instructions: "Take 1 tablet by mouth daily",
        frequency: "Once daily",
        prescriber: "Dr. Emily Thorne",
        status: "active",
        notes: null,
        included: true,
      },
    ],
    appointments: [
      {
        id: "appt-1",
        title: "Endocrinology Follow-Up",
        provider_name: "Dr. Emily Thorne",
        location: "Suite 400",
        scheduled_at: "2026-07-15 10:00 AM",
        status: "scheduled",
        included: true,
      },
    ],
    follow_up_tasks: [
      {
        id: "task-1",
        title: "Fast 8 hours before lab draw",
        due_at: "2026-07-14",
        priority: "high",
        status: "pending",
        appointment_id: "appt-1",
        included: true,
      },
    ],
    clinician_questions: [
      {
        question: "What is the clinical significance of my Fasting Blood Glucose (115 mg/dL) being HIGH?",
        rationale: "From Metabolic_Panel.pdf on 2026-04-15",
        source_reference: "Metabolic_Panel.pdf",
        included: true,
      },
    ],
    disclaimer: "NOTICE FOR CLINICAL DISCUSSION: Personal record organization tool. Not a diagnosis.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (generateVisitPackDraft as any).mockResolvedValue(mockDraft);
    (exportVisitPackPdf as any).mockResolvedValue(new Blob(["%PDF-1.4 mock content"], { type: "application/pdf" }));
  });

  it("renders configuration controls, safety notice, and generate action", () => {
    render(<DoctorVisitPack />);

    expect(screen.getByText("Doctor Visit Preparation Pack")).toBeDefined();
    expect(screen.getByText(/CLINICAL DISCUSSION TOOL:/)).toBeDefined();
    expect(screen.getByText("1. Configure Visit Pack Scope")).toBeDefined();
    expect(screen.getByLabelText("Start Date Filter (Optional)")).toBeDefined();
    expect(screen.getByLabelText("End Date Filter (Optional)")).toBeDefined();
    expect(screen.getByText("⚡ Generate Visit Pack Draft")).toBeDefined();
  });

  it("toggles unverified observations caution warning", () => {
    render(<DoctorVisitPack />);

    const unverifiedCheckbox = screen.getByLabelText("Include unverified extracted observations");
    expect(screen.queryByText(/Caution: Unreviewed OCR observations will be included/)).toBeNull();

    fireEvent.click(unverifiedCheckbox);
    expect(screen.getByText(/Caution: Unreviewed OCR observations will be included/)).toBeDefined();
  });

  it("generates and displays visit pack draft with observations, medications, and questions", async () => {
    render(<DoctorVisitPack />);

    const generateBtn = screen.getByText("⚡ Generate Visit Pack Draft");
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(generateVisitPackDraft).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("2. Review and Customize Your Pack")).toBeDefined();
    expect(screen.getAllByText("Fasting Blood Glucose").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Metformin")).toBeDefined();
    expect(screen.getByText("Endocrinology Follow-Up")).toBeDefined();
    expect(screen.getByText(/What is the clinical significance of my Fasting Blood Glucose/)).toBeDefined();
  });

  it("allows adding and removing custom clinician questions", async () => {
    render(<DoctorVisitPack />);

    fireEvent.click(screen.getByText("⚡ Generate Visit Pack Draft"));
    await screen.findByText("2. Review and Customize Your Pack");

    const inputCustomQ = screen.getByPlaceholderText("Type a custom question to ask your doctor…");
    const addBtn = screen.getByText("Add Question");

    fireEvent.change(inputCustomQ, { target: { value: "Should I monitor blood pressure at home?" } });
    fireEvent.click(addBtn);

    expect(screen.getByText("Should I monitor blood pressure at home?")).toBeDefined();

    // Remove first question
    const removeButtons = screen.getAllByTitle("Remove question");
    fireEvent.click(removeButtons[0]);

    expect(screen.queryByText(/What is the clinical significance of my Fasting Blood Glucose/)).toBeNull();
  });

  it("toggles observation included state", async () => {
    render(<DoctorVisitPack />);

    fireEvent.click(screen.getByText("⚡ Generate Visit Pack Draft"));
    await screen.findByText("2. Review and Customize Your Pack");

    const obsCheckbox = document.getElementById("obs-check-obs-1") as HTMLInputElement;
    expect(obsCheckbox.checked).toBe(true);

    fireEvent.click(obsCheckbox);
    expect(obsCheckbox.checked).toBe(false);
  });

  it("exports PDF successfully when clicking download", async () => {
    // Mock URL.createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();

    render(<DoctorVisitPack />);

    fireEvent.click(screen.getByText("⚡ Generate Visit Pack Draft"));
    await screen.findByText("2. Review and Customize Your Pack");

    const downloadBtn = document.getElementById("btn-download-visit-pack-pdf") as HTMLButtonElement;
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(exportVisitPackPdf).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Doctor Visit Pack PDF downloaded successfully.")).toBeDefined();
    });
  });

  it("displays error message if draft generation fails", async () => {
    (generateVisitPackDraft as any).mockRejectedValueOnce(
      new ApiError(422, "start_date cannot be after end_date.")
    );

    render(<DoctorVisitPack />);

    fireEvent.click(screen.getByText("⚡ Generate Visit Pack Draft"));

    await waitFor(() => {
      expect(screen.getByText("start_date cannot be after end_date.")).toBeDefined();
    });
  });
});
