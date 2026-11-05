import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MedicalTimeline } from "./MedicalTimeline";
import type {
  TimelineItem,
  TimelineResponse,
  TrendResponse,
  TimelineSummaryResponse,
  DocumentItem,
} from "../api/client";

// Mock AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    token: "mock-jwt-token",
    user: { id: "user-1", email: "test@healthmate.ai", name: "Test Patient (SYNTHETIC)" },
  }),
}));

// Mock API client methods
vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    getTimeline: vi.fn(),
    getTimelineTrends: vi.fn(),
    getTimelineSummary: vi.fn(),
    getDocument: vi.fn(),
  };
});

import {
  getTimeline,
  getTimelineTrends,
  getTimelineSummary,
  getDocument,
} from "../api/client";

describe("MedicalTimeline Component", () => {
  const mockTimelineItems: TimelineItem[] = [
    {
      id: "obs-1",
      document_id: "doc-1",
      document_filename: "cbc_report_jan.pdf",
      clinical_date: "2025-01-15",
      date_type: "actual",
      lab_name: "Northside Synthetic Labs",
      original_test_name: "Hb",
      normalized_test_name: "Hemoglobin",
      category: "Hematology",
      value: "14.2",
      numeric_value: 14.2,
      unit: "g/dL",
      reference_range: "13.8 - 17.2",
      flag: "NORMAL",
      is_reviewed: true,
      is_low_confidence: false,
      created_at: "2025-01-15T10:00:00Z",
      source_page: 1,
      source_text: "Hb: 14.2 g/dL (13.8-17.2)",
    },
    {
      id: "obs-2",
      document_id: "doc-2",
      document_filename: "metabolic_panel_apr.pdf",
      clinical_date: "2025-04-02",
      date_type: "actual",
      lab_name: "Metropolitan Synthetic Diagnostic Center",
      original_test_name: "Blood Glucose",
      normalized_test_name: "Glucose",
      category: "Metabolic",
      value: "104",
      numeric_value: 104.0,
      unit: "mg/dL",
      reference_range: "70 - 99",
      flag: "HIGH",
      is_reviewed: true,
      is_low_confidence: false,
      created_at: "2025-04-02T10:00:00Z",
      source_page: 1,
      source_text: "Blood Glucose: 104 mg/dL [70-99]",
    },
    {
      id: "obs-3",
      document_id: "doc-3",
      document_filename: "metabolic_panel_jul.pdf",
      clinical_date: "2025-07-20",
      date_type: "actual",
      lab_name: "Apex Clinical Research Laboratories",
      original_test_name: "Fasting Glucose",
      normalized_test_name: "Glucose",
      category: "Metabolic",
      value: "5.4",
      numeric_value: 5.4,
      unit: "mmol/L",
      reference_range: "3.9 - 5.5",
      flag: "NORMAL",
      is_reviewed: false, // Unverified
      is_low_confidence: false,
      created_at: "2025-07-20T10:00:00Z",
      source_page: 1,
      source_text: "Fasting Glucose: 5.4 mmol/L",
    },
  ];

  const mockTrends: TrendResponse = {
    series: [
      {
        normalized_test_name: "Glucose",
        category: "Metabolic",
        standard_unit: "mg/dL",
        has_converted_units: true,
        has_multiple_points: true,
        points: [
          {
            observation_id: "obs-2",
            document_id: "doc-2",
            document_filename: "metabolic_panel_apr.pdf",
            date: "2025-04-02",
            date_type: "actual",
            value: "104",
            numeric_value: 104.0,
            standardized_numeric_value: 104.0,
            original_unit: "mg/dL",
            reference_range: "70 - 99",
            flag: "HIGH",
            is_reviewed: true,
            source_page: 1,
            source_text: "Blood Glucose: 104 mg/dL [70-99]",
          },
          {
            observation_id: "obs-3",
            document_id: "doc-3",
            document_filename: "metabolic_panel_jul.pdf",
            date: "2025-07-20",
            date_type: "actual",
            value: "5.4",
            numeric_value: 5.4,
            standardized_numeric_value: 97.3,
            original_unit: "mmol/L",
            reference_range: "3.9 - 5.5",
            flag: "NORMAL",
            is_reviewed: false,
            source_page: 1,
            source_text: "Fasting Glucose: 5.4 mmol/L",
          },
        ],
      },
      {
        normalized_test_name: "Hemoglobin",
        category: "Hematology",
        standard_unit: "g/dL",
        has_converted_units: false,
        has_multiple_points: false,
        points: [
          {
            observation_id: "obs-1",
            document_id: "doc-1",
            document_filename: "cbc_report_jan.pdf",
            date: "2025-01-15",
            date_type: "actual",
            value: "14.2",
            numeric_value: 14.2,
            standardized_numeric_value: 14.2,
            original_unit: "g/dL",
            reference_range: "13.8 - 17.2",
            flag: "NORMAL",
            is_reviewed: true,
            source_page: 1,
            source_text: "Hb: 14.2 g/dL (13.8-17.2)",
          },
        ],
      },
    ],
  };

  const mockSummary: TimelineSummaryResponse = {
    total_reports: 3,
    earliest_date: "2025-01-15",
    latest_date: "2025-07-20",
    total_observations: 3,
    reviewed_observations_count: 2,
    unverified_observations_count: 1,
    abnormal_findings_count: 1,
    categories: ["Hematology", "Metabolic"],
    repeated_tests: [
      {
        normalized_test_name: "Glucose",
        category: "Metabolic",
        count: 2,
        dates: ["2025-04-02", "2025-07-20"],
        earliest_value: "104 mg/dL",
        latest_value: "97.3 mg/dL",
        unit: "mg/dL",
        trajectory_summary: "Decreased from 104 mg/dL to 97.3 mg/dL between 2025-04-02 and 2025-07-20 across 2 observations.",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTimeline).mockResolvedValue({
      total: 3,
      limit: 100,
      offset: 0,
      items: mockTimelineItems,
    });
    vi.mocked(getTimelineTrends).mockResolvedValue(mockTrends);
    vi.mocked(getTimelineSummary).mockResolvedValue(mockSummary);
  });

  it("renders timeline header, summary metrics, and trajectory cards", async () => {
    render(<MedicalTimeline />);

    expect(screen.getByText("Loading chronological medical history…")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Medical Observation Timeline & Longitudinal Trends")).toBeDefined();
    });

    // Check summary statistics
    expect(screen.getByText("Reports Analyzed")).toBeDefined();
    expect(screen.getByText("2025-01-15 to 2025-07-20")).toBeDefined();
    expect(screen.getByText("Longitudinal Trajectory Highlights")).toBeDefined();
    expect(screen.getByText(/Decreased from 104 mg\/dL to 97.3 mg\/dL/)).toBeDefined();
  });

  it("renders chronological grouped feed with source evidence", async () => {
    render(<MedicalTimeline />);

    await waitFor(() => {
      expect(screen.getByText("Chronological Medical Observation Feed (3 records)")).toBeDefined();
    });

    // Date group markers
    expect(screen.getAllByText("2025-01-15").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2025-04-02").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2025-07-20").length).toBeGreaterThanOrEqual(1);

    // Normalized vs original name
    expect(screen.getByText(/as "Hb"/)).toBeDefined();
    expect(screen.getByText(/as "Blood Glucose"/)).toBeDefined();
    expect(screen.getByText(/as "Fasting Glucose"/)).toBeDefined();

    // Source line text provenance
    expect(screen.getByText('"Hb: 14.2 g/dL (13.8-17.2)"')).toBeDefined();
    expect(screen.getByText('"Blood Glucose: 104 mg/dL [70-99]"')).toBeDefined();
  });

  it("distinguishes verified vs unverified observation status and flags", async () => {
    render(<MedicalTimeline />);

    await waitFor(() => {
      expect(screen.getAllByText("Reviewed").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Unverified").length).toBeGreaterThanOrEqual(1);
    });

    // High and normal flags
    expect(screen.getByText("▲ HIGH")).toBeDefined();
    expect(screen.getAllByText("● NORMAL").length).toBeGreaterThanOrEqual(1);
  });

  it("filters observations by category pill click", async () => {
    render(<MedicalTimeline />);

    await waitFor(() => {
      expect(screen.getByText("Medical Observation Timeline & Longitudinal Trends")).toBeDefined();
    });

    const lipidsBtn = screen.getByText("Lipids");
    fireEvent.click(lipidsBtn);

    await waitFor(() => {
      expect(getTimeline).toHaveBeenCalledWith(
        "mock-jwt-token",
        expect.objectContaining({ category: "Lipids" })
      );
    });
  });

  it("supports text search and date range filtering", async () => {
    render(<MedicalTimeline />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g. Glucose, Hemoglobin, Cholesterol…")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText("e.g. Glucose, Hemoglobin, Cholesterol…");
    fireEvent.change(searchInput, { target: { value: "Glucose" } });

    const startDateInput = screen.getByLabelText("From Date:");
    fireEvent.change(startDateInput, { target: { value: "2025-04-01" } });

    await waitFor(() => {
      expect(getTimeline).toHaveBeenCalledWith(
        "mock-jwt-token",
        expect.objectContaining({
          test_name: "Glucose",
          start_date: "2025-04-01",
        })
      );
    });
  });

  it("toggles unverified observations inclusion", async () => {
    render(<MedicalTimeline />);

    await waitFor(() => {
      expect(screen.getByLabelText("Include Unverified Observations")).toBeDefined();
    });

    const checkbox = screen.getByLabelText("Include Unverified Observations");
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(getTimeline).toHaveBeenCalledWith(
        "mock-jwt-token",
        expect.objectContaining({ include_unverified: true })
      );
    });
  });

  it("renders SVG trend visualization and unit conversion notice", async () => {
    render(<MedicalTimeline />);

    await waitFor(() => {
      expect(screen.getByText("Longitudinal Trend Visualization")).toBeDefined();
    });

    // Unit harmonization banner
    expect(screen.getByText(/Unit Harmonization:/)).toBeDefined();
    expect(screen.getByText(/mmol\/L and mg\/dL/)).toBeDefined();

    // Chart has SVG role
    const chart = screen.getByRole("img", { name: "Trend chart for Glucose" });
    expect(chart).toBeDefined();
  });

  it("toggles accessible tabular alternative for trend chart", async () => {
    render(<MedicalTimeline />);

    await waitFor(() => {
      expect(screen.getByText("Show Tabular Data")).toBeDefined();
    });

    const toggleBtn = screen.getByText("Show Tabular Data");
    fireEvent.click(toggleBtn);

    // Tabular alternative table is now visible
    expect(screen.getByText("Show Visual Chart")).toBeDefined();
    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByText("Measured Value")).toBeDefined();
    expect(screen.getByText("Standardized (mg/dL)")).toBeDefined();
  });

  it("handles empty histories gracefully", async () => {
    vi.mocked(getTimeline).mockResolvedValueOnce({
      total: 0,
      limit: 100,
      offset: 0,
      items: [],
    });
    vi.mocked(getTimelineTrends).mockResolvedValueOnce({ series: [] });
    vi.mocked(getTimelineSummary).mockResolvedValueOnce({
      total_reports: 0,
      earliest_date: null,
      latest_date: null,
      total_observations: 0,
      reviewed_observations_count: 0,
      unverified_observations_count: 0,
      abnormal_findings_count: 0,
      categories: [],
      repeated_tests: [],
    });

    render(<MedicalTimeline />);

    await waitFor(() => {
      expect(screen.getByText("No Timeline Entries Found")).toBeDefined();
      expect(screen.getByText("No Numeric Trend Data Available")).toBeDefined();
    });
  });

  it("navigates to original report viewer modal on View Original Report click", async () => {
    const mockDoc: DocumentItem = {
      id: "doc-1",
      owner_id: "user-1",
      filename: "cbc_report_jan.pdf",
      mime_type: "application/pdf",
      file_size: 2048,
      checksum_sha256: "abc",
      processing_status: "extracted",
      ocr_applied: false,
      document_date: "2025-01-15",
      is_verified: true,
      created_at: "2025-01-15T10:00:00Z",
    };
    vi.mocked(getDocument).mockResolvedValueOnce(mockDoc);

    render(<MedicalTimeline />);

    await waitFor(() => {
      expect(screen.getAllByText("View Original Report →").length).toBeGreaterThan(0);
    });

    const viewBtn = screen.getAllByText("View Original Report →")[0];
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(getDocument).toHaveBeenCalledWith("mock-jwt-token", "doc-1");
    });
  });

  it("displays error banner when timeline fetch fails", async () => {
    vi.mocked(getTimeline).mockRejectedValueOnce(new Error("Network connection lost"));

    render(<MedicalTimeline />);

    await waitFor(() => {
      expect(screen.getByText("Network connection lost")).toBeDefined();
    });
  });
});
