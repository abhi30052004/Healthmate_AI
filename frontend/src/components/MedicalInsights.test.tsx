import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MedicalInsights } from "./MedicalInsights";
import type {
  InsightsOverviewMetrics,
  FindingsResponse,
  LongitudinalTrendsResponse,
  DataQualityReport,
  PersonalizedHealthSummary,
  DocumentItem,
} from "../api/client";

// Mock AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    token: "mock-jwt-token",
    user: { id: "user-1", email: "insights_test@healthmate.ai", name: "Test User" },
  }),
}));

// Mock API client methods
vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    getInsightsOverview: vi.fn(),
    getInsightsFindings: vi.fn(),
    getInsightsTrends: vi.fn(),
    getInsightsDataQuality: vi.fn(),
    getInsightsSummary: vi.fn(),
    getDocument: vi.fn(),
  };
});

import {
  getInsightsOverview,
  getInsightsFindings,
  getInsightsTrends,
  getInsightsDataQuality,
  getInsightsSummary,
  getDocument,
} from "../api/client";

describe("MedicalInsights Component", () => {
  const mockOverview: InsightsOverviewMetrics = {
    total_reports: 3,
    verified_observations_count: 5,
    unverified_observations_count: 1,
    distinct_test_types_count: 4,
    earliest_date: "2025-01-15",
    latest_date: "2025-07-20",
    reports_with_missing_dates_count: 1,
    observations_missing_units_count: 1,
    observations_missing_ranges_count: 1,
    comparable_tests_with_history_count: 1,
    noteworthy_findings_count: 2,
  };

  const mockFindings: FindingsResponse = {
    total: 3,
    items: [
      {
        observation_id: "obs-1",
        document_id: "doc-1",
        document_title: "CBC Report Jan 2025",
        test_name: "Hemoglobin",
        normalized_test_name: "Hemoglobin",
        category: "Hematology",
        value: "14.2",
        numeric_value: 14.2,
        unit: "g/dL",
        reference_range: "13.8 - 17.2",
        lab_flag: "NORMAL",
        clinical_date: "2025-01-15",
        date_provenance: "actual",
        is_verified: true,
        source_page: 1,
        source_text: "Hemoglobin: 14.2 g/dL (13.8-17.2)",
        classification: "within_reference",
        classification_explanation: "Value is within printed laboratory bounds [13.8 - 17.2].",
        requires_review: false,
        discrepancy_explanation: null,
      },
      {
        observation_id: "obs-2",
        document_id: "doc-2",
        document_title: "Metabolic Panel Apr 2025",
        test_name: "Blood Glucose",
        normalized_test_name: "Fasting Glucose",
        category: "Metabolic",
        value: "104",
        numeric_value: 104.0,
        unit: "mg/dL",
        reference_range: "70 - 99",
        lab_flag: "HIGH",
        clinical_date: "2025-04-10",
        date_provenance: "inferred",
        is_verified: true,
        source_page: 1,
        source_text: "Blood Glucose: 104 mg/dL [70-99]",
        classification: "above_reference",
        classification_explanation: "Value 104.0 mg/dL exceeds upper laboratory limit 99.0 mg/dL.",
        requires_review: false,
        discrepancy_explanation: null,
      },
      {
        observation_id: "obs-3",
        document_id: "doc-3",
        document_title: "Follow-up Jul 2025",
        test_name: "WBC Count",
        normalized_test_name: "WBC",
        category: "Hematology",
        value: "3.8",
        numeric_value: 3.8,
        unit: "K/uL",
        reference_range: "4.5 - 11.0",
        lab_flag: "NORMAL",
        clinical_date: "2025-07-20",
        date_provenance: "actual",
        is_verified: true,
        source_page: 1,
        source_text: "WBC Count: 3.8 K/uL",
        classification: "below_reference",
        classification_explanation: "Value 3.8 K/uL is below lower laboratory limit 4.5 K/uL.",
        requires_review: true,
        discrepancy_explanation: "Calculated range is below_reference but laboratory flag is NORMAL.",
      },
    ],
  };

  const mockTrends: LongitudinalTrendsResponse = {
    total: 1,
    items: [
      {
        test_name: "Fasting Glucose",
        normalized_test_name: "Fasting Glucose",
        category: "Metabolic",
        standard_unit: "mg/dL",
        has_converted_units: true,
        previous_value: "104 mg/dL",
        previous_standard_value: 104.0,
        previous_date: "2025-04-10",
        previous_document_id: "doc-2",
        previous_document_title: "Metabolic Panel Apr 2025",
        previous_is_verified: true,
        latest_value: "5.4 mmol/L",
        latest_standard_value: 97.3,
        latest_date: "2025-07-20",
        latest_document_id: "doc-3",
        latest_document_title: "Follow-up Jul 2025",
        latest_is_verified: true,
        absolute_change: -6.7,
        percentage_change: -6.4,
        direction: "decreased",
        clinical_change_description: "Decreased by 6.7 mg/dL (-6.4%) between 2025-04-10 and 2025-07-20. Original units: mg/dL, mmol/L.",
      },
    ],
  };

  const mockDataQuality: DataQualityReport = {
    total_issues: 2,
    missing_dates_count: 1,
    inferred_dates_count: 1,
    missing_units_count: 0,
    missing_ranges_count: 0,
    unverified_observations_count: 1,
    flag_discrepancies_count: 1,
    issues: [
      {
        issue_type: "missing_document_date",
        severity: "medium",
        document_id: "doc-2",
        document_title: "Metabolic Panel Apr 2025",
        observation_id: null,
        test_name: null,
        description: "Document lacks an explicit clinical collection date.",
        recommendation: "Review document and set the clinical collection date.",
      },
      {
        issue_type: "flag_discrepancy",
        severity: "medium",
        document_id: "doc-3",
        document_title: "Follow-up Jul 2025",
        observation_id: "obs-3",
        test_name: "WBC Count",
        description: "Calculated range is below_reference but laboratory flag is NORMAL.",
        recommendation: "Review source report excerpt to verify the printed reference range.",
      },
    ],
  };

  const mockSummary: PersonalizedHealthSummary = {
    summary_mode: "offline",
    narrative_summary: "Based on 3 uploaded reports between 2025-01-15 and 2025-07-20, 2 results are outside their printed reference ranges [S1].",
    key_findings: [
      "Blood Glucose: 104 mg/dL on 2025-04-10 exceeds upper limit 99 mg/dL [S1].",
      "WBC Count: 3.8 K/uL on 2025-07-20 is below lower limit 4.5 K/uL [S2].",
    ],
    longitudinal_highlights: [
      "Fasting Glucose decreased from 104.0 mg/dL to 97.3 mg/dL (-6.4%).",
    ],
    data_quality_disclosures: [
      "1 report lacks an explicit collection date (collection date inferred).",
      "1 unverified observation excluded from default calculations.",
    ],
    suggested_clinician_questions: [
      "Would you recommend re-checking Fasting Glucose to confirm current glycemic status?",
      "Does the slight WBC Count variation of 3.8 K/uL require a repeat differential count?",
    ],
    citations: [
      {
        citation_id: "S1",
        document_id: "doc-2",
        document_title: "Metabolic Panel Apr 2025",
        observation_id: "obs-2",
        original_test_name: "Blood Glucose",
        normalized_test_name: "Fasting Glucose",
        clinical_date: "2025-04-10",
        date_type: "inferred",
        is_reviewed: true,
        page_number: 1,
        source_text: "Blood Glucose: 104 mg/dL [70-99]",
      },
      {
        citation_id: "S2",
        document_id: "doc-3",
        document_title: "Follow-up Jul 2025",
        observation_id: "obs-3",
        original_test_name: "WBC Count",
        normalized_test_name: "WBC",
        clinical_date: "2025-07-20",
        date_type: "actual",
        is_reviewed: true,
        page_number: 1,
        source_text: "WBC Count: 3.8 K/uL",
      },
    ],
    medical_disclaimer: "HealthMate AI summarizes available records and does not diagnose medical conditions. Consult your clinician.",
  };

  const mockDocItem: DocumentItem = {
    id: "doc-2",
    owner_id: "user-1",
    filename: "Metabolic_Apr.pdf",
    mime_type: "application/pdf",
    file_size: 2048,
    checksum_sha256: "hash-doc-2",
    processing_status: "extracted",
    ocr_applied: false,
    extracted_text: "Blood Glucose: 104 mg/dL [70-99]",
    document_date: "2025-04-10",
    lab_name: "Metropolitan Diagnostics",
    is_verified: true,
    created_at: "2025-04-10T12:00:00Z",
    updated_at: "2025-04-10T12:00:00Z",
    observations: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getInsightsOverview as any).mockResolvedValue(mockOverview);
    (getInsightsFindings as any).mockResolvedValue(mockFindings);
    (getInsightsTrends as any).mockResolvedValue(mockTrends);
    (getInsightsDataQuality as any).mockResolvedValue(mockDataQuality);
    (getInsightsSummary as any).mockResolvedValue(mockSummary);
    (getDocument as any).mockResolvedValue(mockDocItem);
  });

  it("renders overview metrics accurately", async () => {
    render(<MedicalInsights />);

    expect(screen.getByTestId("insights-loading")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByTestId("medical-insights")).toBeDefined();
    });

    // Check metric cards
    expect(screen.getByTestId("metric-reports").textContent).toContain("3");
    expect(screen.getByTestId("metric-verified").textContent).toContain("5");
    expect(screen.getByTestId("metric-noteworthy").textContent).toContain("2");
    expect(screen.getByTestId("metric-distinct-tests").textContent).toContain("4");
    expect(screen.getByTestId("metric-date-span").textContent).toContain("2025-01-15 → 2025-07-20");
  });

  it("renders medical safety disclaimer banner", async () => {
    render(<MedicalInsights />);

    await waitFor(() => {
      expect(screen.getByText(/Important Clinical Safety Information:/i)).toBeDefined();
    });

    expect(
      screen.getByText(/HealthMate AI calculates insights strictly based on available reference ranges/i)
    ).toBeDefined();
  });

  it("renders personalized health summary with citations and clinician questions", async () => {
    render(<MedicalInsights />);

    await waitFor(() => {
      expect(screen.getByTestId("personalized-summary-card")).toBeDefined();
    });

    expect(
      screen.getByText(/Based on 3 uploaded reports between 2025-01-15 and 2025-07-20/i)
    ).toBeDefined();
    expect(
      screen.getByText(/Blood Glucose: 104 mg\/dL on 2025-04-10 exceeds upper limit 99 mg\/dL \[S1\]\./i)
    ).toBeDefined();
    expect(
      screen.getByText(/Fasting Glucose decreased from 104.0 mg\/dL to 97.3 mg\/dL/i)
    ).toBeDefined();
    expect(
      screen.getByText(/Would you recommend re-checking Fasting Glucose/i)
    ).toBeDefined();

    // Check citation chip
    expect(screen.getByText("[S1]")).toBeDefined();
    expect(screen.getByText('"Blood Glucose: 104 mg/dL [70-99]"')).toBeDefined();
  });

  it("renders findings table with reference-range classifications and flag discrepancy warnings", async () => {
    render(<MedicalInsights />);

    await waitFor(() => {
      expect(screen.getByTestId("findings-table")).toBeDefined();
    });

    const table = screen.getByTestId("findings-table");
    expect(within(table).getByText("Hemoglobin")).toBeDefined();
    expect(within(table).getByText("Within Reference")).toBeDefined();

    expect(within(table).getByText("Blood Glucose")).toBeDefined();
    expect(within(table).getByText("Above Reference")).toBeDefined();

    expect(within(table).getByText("WBC Count")).toBeDefined();
    expect(within(table).getByText("Below Reference")).toBeDefined();

    // Discrepancy alert
    expect(
      within(table).getByText(/⚠️ Review: Calculated range is below_reference but laboratory flag is NORMAL\./i)
    ).toBeDefined();
  });

  it("filters findings when clicking Outside Reference filter pill", async () => {
    render(<MedicalInsights />);

    await waitFor(() => {
      expect(screen.getByTestId("findings-table")).toBeDefined();
    });

    const outsideRefBtn = screen.getByRole("button", { name: /Outside Reference/i });
    fireEvent.click(outsideRefBtn);

    const table = screen.getByTestId("findings-table");
    // Hemoglobin (within_reference) should be filtered out
    expect(within(table).queryByText("Hemoglobin")).toBeNull();
    // Blood Glucose (above) and WBC (below) remain
    expect(within(table).getByText("Blood Glucose")).toBeDefined();
    expect(within(table).getByText("WBC Count")).toBeDefined();
  });

  it("filters findings by search query", async () => {
    render(<MedicalInsights />);

    await waitFor(() => {
      expect(screen.getByTestId("findings-table")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Search test or document/i);
    fireEvent.change(searchInput, { target: { value: "Glucose" } });

    const table = screen.getByTestId("findings-table");
    expect(within(table).getByText("Blood Glucose")).toBeDefined();
    expect(within(table).queryByText("Hemoglobin")).toBeNull();
    expect(within(table).queryByText("WBC Count")).toBeNull();
  });

  it("renders longitudinal trends with delta badge and unit conversion note", async () => {
    render(<MedicalInsights />);

    await waitFor(() => {
      expect(screen.getByTestId("trends-grid")).toBeDefined();
    });

    expect(screen.getByTestId("delta-decreased").textContent).toContain("-6.7 mg/dL (-6.4%)");
    expect(screen.getByText(/Decreased by 6.7 mg\/dL \(-6.4%\)/i)).toBeDefined();
    expect(
      screen.getByText(/Units converted to standard mg\/dL for mathematical comparison\./i)
    ).toBeDefined();
  });

  it("renders data quality indicators and review report action", async () => {
    render(<MedicalInsights />);

    await waitFor(() => {
      expect(screen.getByTestId("data-quality-section")).toBeDefined();
    });

    expect(screen.getByText("Document lacks an explicit clinical collection date.")).toBeDefined();
    expect(
      screen.getByText(/Review source report excerpt to verify the printed reference range/i)
    ).toBeDefined();

    const reviewDocBtns = screen.getAllByRole("button", { name: /Review Report ↗/i });
    expect(reviewDocBtns.length).toBeGreaterThan(0);
  });

  it("opens DocumentViewerModal when clicking View or Open Report button", async () => {
    render(<MedicalInsights />);

    await waitFor(() => {
      expect(screen.getByTestId("findings-table")).toBeDefined();
    });

    const viewDocBtns = screen.getAllByRole("button", { name: /📄 View/i });
    fireEvent.click(viewDocBtns[0]);

    await waitFor(() => {
      expect(getDocument).toHaveBeenCalledWith("mock-jwt-token", "doc-1");
    });
  });

  it("supports switching summary mode between offline and llm-assisted", async () => {
    const mockLlmSummary: PersonalizedHealthSummary = {
      ...mockSummary,
      summary_mode: "llm_assisted",
      narrative_summary: "LLM-assisted narrative: Your Fasting Glucose showed a decrease.",
    };
    (getInsightsSummary as any).mockResolvedValueOnce(mockSummary).mockResolvedValueOnce(mockLlmSummary);

    render(<MedicalInsights />);

    await waitFor(() => {
      expect(screen.getByTestId("personalized-summary-card")).toBeDefined();
    });

    const llmBtn = screen.getByRole("button", { name: /🤖 LLM-Assisted Phrasing/i });
    fireEvent.click(llmBtn);

    await waitFor(() => {
      expect(getInsightsSummary).toHaveBeenCalledWith("mock-jwt-token", "llm_assisted");
    });
  });

  it("toggles include unverified observations and refetches data", async () => {
    render(<MedicalInsights />);

    await waitFor(() => {
      expect(screen.getByTestId("medical-insights")).toBeDefined();
    });

    const checkbox = screen.getByLabelText(/Include Unverified Observations/i);
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(getInsightsFindings).toHaveBeenCalledWith("mock-jwt-token", {
        includeUnverified: true,
        limit: 100,
      });
    });
  });
});
