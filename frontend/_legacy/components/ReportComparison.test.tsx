import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportComparison } from "./ReportComparison";
import type {
  DocumentItem,
  ReportComparisonResponse,
} from "../api/client";

// Mock API client methods
vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    listDocuments: vi.fn(),
    compareReports: vi.fn(),
    getDocument: vi.fn(),
  };
});

import {
  listDocuments,
  compareReports,
  getDocument,
} from "../api/client";

describe("ReportComparison Component", () => {
  const mockDocs: DocumentItem[] = [
    {
      id: "doc-1",
      owner_id: "user-1",
      filename: "CBC_Jan2025.pdf",
      mime_type: "application/pdf",
      file_size: 10240,
      checksum_sha256: "hash1",
      processing_status: "extracted",
      document_date: "2025-01-15",
      lab_name: "Quest Diagnostics",
      is_verified: true,
      created_at: "2025-01-16T10:00:00Z",
    },
    {
      id: "doc-2",
      owner_id: "user-1",
      filename: "CBC_Jul2025.pdf",
      mime_type: "application/pdf",
      file_size: 12040,
      checksum_sha256: "hash2",
      processing_status: "extracted",
      document_date: "2025-07-20",
      lab_name: "LabCorp",
      is_verified: true,
      created_at: "2025-07-21T10:00:00Z",
    },
    {
      id: "doc-3",
      owner_id: "user-1",
      filename: "Metabolic_Sep2025.pdf",
      mime_type: "application/pdf",
      file_size: 8040,
      checksum_sha256: "hash3",
      processing_status: "extracted",
      document_date: "2025-09-10",
      lab_name: "City Health Lab",
      is_verified: false,
      created_at: "2025-09-11T10:00:00Z",
    },
  ];

  const mockComparisonResponse: ReportComparisonResponse = {
    baseline_report: {
      document_id: "doc-1",
      filename: "CBC_Jan2025.pdf",
      clinical_date: "2025-01-15",
      date_provenance: "explicit",
      laboratory_name: "Quest Diagnostics",
      total_observations: 2,
    },
    newer_report: {
      document_id: "doc-2",
      filename: "CBC_Jul2025.pdf",
      clinical_date: "2025-07-20",
      date_provenance: "explicit",
      laboratory_name: "LabCorp",
      total_observations: 2,
    },
    additional_reports: [],
    summary: {
      total_comparisons: 3,
      increased_count: 1,
      decreased_count: 0,
      unchanged_count: 1,
      new_tests_count: 1,
      missing_tests_count: 0,
      incompatible_units_count: 0,
      needs_review_count: 0,
      unverified_count: 0,
    },
    items: [
      {
        test_name: "Fasting Blood Glucose",
        normalized_test_name: "Glucose",
        category: "Metabolic",
        classification: "increased",
        classification_label: "Increased",
        baseline_value: "92",
        baseline_unit: "mg/dL",
        baseline_numeric: 92.0,
        baseline_reference_range: "70-99 mg/dL",
        baseline_flag: "NORMAL",
        baseline_date: "2025-01-15",
        baseline_document_id: "doc-1",
        baseline_document_title: "CBC_Jan2025.pdf",
        baseline_page: 1,
        baseline_source_text: "Glucose 92 mg/dL",
        baseline_is_verified: true,
        newer_value: "108",
        newer_unit: "mg/dL",
        newer_numeric: 108.0,
        newer_reference_range: "70-99 mg/dL",
        newer_flag: "HIGH",
        newer_date: "2025-07-20",
        newer_document_id: "doc-2",
        newer_document_title: "CBC_Jul2025.pdf",
        newer_page: 1,
        newer_source_text: "Glucose 108 mg/dL",
        newer_is_verified: true,
        standard_unit: "mg/dL",
        has_converted_units: false,
        absolute_change: 16.0,
        percentage_change: 17.4,
        clinical_change_description: "Increased by 16.0 mg/dL (+17.4%) from 2025-01-15 to 2025-07-20.",
        requires_review: false,
        review_explanation: null,
      },
      {
        test_name: "Hemoglobin",
        normalized_test_name: "Hemoglobin",
        category: "Hematology",
        classification: "unchanged",
        classification_label: "Unchanged",
        baseline_value: "14.5",
        baseline_unit: "g/dL",
        baseline_numeric: 14.5,
        baseline_reference_range: "13.5-17.5 g/dL",
        baseline_flag: "NORMAL",
        baseline_date: "2025-01-15",
        baseline_document_id: "doc-1",
        baseline_document_title: "CBC_Jan2025.pdf",
        baseline_page: 1,
        baseline_source_text: "Hemoglobin 14.5 g/dL",
        baseline_is_verified: true,
        newer_value: "14.5",
        newer_unit: "g/dL",
        newer_numeric: 14.5,
        newer_reference_range: "13.5-17.5 g/dL",
        newer_flag: "NORMAL",
        newer_date: "2025-07-20",
        newer_document_id: "doc-2",
        newer_document_title: "CBC_Jul2025.pdf",
        newer_page: 1,
        newer_source_text: "Hemoglobin 14.5 g/dL",
        newer_is_verified: true,
        standard_unit: "g/dL",
        has_converted_units: false,
        absolute_change: 0.0,
        percentage_change: 0.0,
        clinical_change_description: "Stable at 14.5 g/dL between 2025-01-15 and 2025-07-20.",
        requires_review: false,
        review_explanation: null,
      },
      {
        test_name: "Thyroid Stimulating Hormone",
        normalized_test_name: "TSH",
        category: "Endocrine",
        classification: "new",
        classification_label: "New in Newer Report",
        baseline_value: null,
        baseline_unit: null,
        baseline_numeric: null,
        baseline_reference_range: null,
        baseline_flag: null,
        baseline_date: null,
        baseline_document_id: null,
        baseline_document_title: null,
        baseline_page: null,
        baseline_source_text: null,
        baseline_is_verified: null,
        newer_value: "2.1",
        newer_unit: "uIU/mL",
        newer_numeric: 2.1,
        newer_reference_range: "0.4-4.0 uIU/mL",
        newer_flag: "NORMAL",
        newer_date: "2025-07-20",
        newer_document_id: "doc-2",
        newer_document_title: "CBC_Jul2025.pdf",
        newer_page: 2,
        newer_source_text: "TSH 2.1 uIU/mL",
        newer_is_verified: true,
        standard_unit: "uIU/mL",
        has_converted_units: false,
        absolute_change: null,
        percentage_change: null,
        clinical_change_description: "Analyte was tested on 2025-07-20, but was not recorded in baseline report.",
        requires_review: false,
        review_explanation: null,
      },
    ],
    warnings: [],
    disclaimer: "HealthMate AI calculates mathematical differences and reports recorded values without diagnosing disease.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (listDocuments as any).mockResolvedValue(mockDocs);
    (compareReports as any).mockResolvedValue(mockComparisonResponse);
    (getDocument as any).mockResolvedValue(mockDocs[0]);
  });

  it("renders report selection and auto-selects initial reports", async () => {
    render(<ReportComparison token="mock-token" />);

    expect(screen.getByText("🔄 Medical Report Comparison")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("CBC_Jan2025.pdf")).toBeDefined();
      expect(screen.getByText("CBC_Jul2025.pdf")).toBeDefined();
      expect(screen.getByText("Metabolic_Sep2025.pdf")).toBeDefined();
    });

    const badge = screen.getByTestId("selected-count-badge");
    expect(badge.textContent).toContain("2 Selected (Min: 2, Max: 5)");
  });

  it("prevents comparison when fewer than 2 reports are selected", async () => {
    render(<ReportComparison token="mock-token" />);

    await waitFor(() => {
      expect(screen.getByText("CBC_Jan2025.pdf")).toBeDefined();
    });

    // Deselect one report
    const checkbox1 = screen.getByLabelText("Select CBC_Jan2025.pdf");
    fireEvent.click(checkbox1);

    const badge = screen.getByTestId("selected-count-badge");
    expect(badge.textContent).toContain("1 Selected (Min: 2, Max: 5)");

    const compareBtn = screen.getByTestId("compare-reports-button") as HTMLButtonElement;
    expect(compareBtn.disabled).toBe(true);
  });

  it("successfully triggers comparison and renders detailed comparison table", async () => {
    render(<ReportComparison token="mock-token" />);

    await waitFor(() => {
      const btn = screen.getByTestId("compare-reports-button") as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    fireEvent.click(screen.getByTestId("compare-reports-button"));

    await waitFor(() => {
      expect(compareReports).toHaveBeenCalledWith("mock-token", {
        document_ids: ["doc-1", "doc-2"],
        include_unverified: false,
        ordering_preference: "date_asc",
      });
    });

    // Check summary metrics rendered
    await waitFor(() => {
      expect(screen.getByTestId("comparison-results")).toBeDefined();
      expect(screen.getByText("BASELINE REPORT")).toBeDefined();
      expect(screen.getByText("NEWER REPORT")).toBeDefined();
    });

    // Verify row for Glucose
    expect(screen.getByTestId("comparison-row-Glucose")).toBeDefined();
    expect(screen.getByText("Fasting Blood Glucose")).toBeDefined();
    expect(screen.getByText("+16 mg/dL")).toBeDefined();
    expect(screen.getByText("(+17.4%)")).toBeDefined();

    // Verify row for Hemoglobin
    expect(screen.getByTestId("comparison-row-Hemoglobin")).toBeDefined();
    expect(screen.getByText("0 g/dL")).toBeDefined();

    // Verify row for TSH
    const tshRow = screen.getByTestId("comparison-row-TSH");
    expect(tshRow).toBeDefined();
    expect(within(tshRow).getByText("New in Newer Report")).toBeDefined();

    // Verify safety disclaimer banner
    expect(screen.getByTestId("comparison-disclaimer")).toBeDefined();
  });

  it("filters comparison rows by classification", async () => {
    render(<ReportComparison token="mock-token" />);

    await waitFor(() => {
      const btn = screen.getByTestId("compare-reports-button") as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    fireEvent.click(screen.getByTestId("compare-reports-button"));

    await waitFor(() => {
      expect(screen.getByTestId("comparison-row-Glucose")).toBeDefined();
    });

    // Filter by 'unchanged'
    const classFilter = screen.getByRole("combobox", { name: "Classification" });
    fireEvent.change(classFilter, { target: { value: "unchanged" } });

    // Hemoglobin should remain, Glucose and TSH should be hidden
    expect(screen.getByTestId("comparison-row-Hemoglobin")).toBeDefined();
    expect(screen.queryByTestId("comparison-row-Glucose")).toBeNull();
    expect(screen.queryByTestId("comparison-row-TSH")).toBeNull();
  });

  it("filters comparison rows by search query", async () => {
    render(<ReportComparison token="mock-token" />);

    await waitFor(() => {
      const btn = screen.getByTestId("compare-reports-button") as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    fireEvent.click(screen.getByTestId("compare-reports-button"));

    await waitFor(() => {
      expect(screen.getByTestId("comparison-row-Glucose")).toBeDefined();
    });

    // Search for TSH
    const searchInput = screen.getByLabelText("Search analyte name");
    fireEvent.change(searchInput, { target: { value: "TSH" } });

    expect(screen.getByTestId("comparison-row-TSH")).toBeDefined();
    expect(screen.queryByTestId("comparison-row-Glucose")).toBeNull();
    expect(screen.queryByTestId("comparison-row-Hemoglobin")).toBeNull();
  });

  it("displays absence disclosure and incompatible units warnings when present", async () => {
    const warningResponse: ReportComparisonResponse = {
      ...mockComparisonResponse,
      warnings: ["1 test(s) have incompatible measurement units across reports."],
    };
    (compareReports as any).mockResolvedValueOnce(warningResponse);

    render(<ReportComparison token="mock-token" />);

    await waitFor(() => {
      const btn = screen.getByTestId("compare-reports-button") as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    fireEvent.click(screen.getByTestId("compare-reports-button"));

    await waitFor(() => {
      expect(screen.getByTestId("comparison-warnings")).toBeDefined();
      expect(
        screen.getByText("1 test(s) have incompatible measurement units across reports.")
      ).toBeDefined();
      expect(screen.getByText(/An observation listed as "Absent from Newer Report"/i)).toBeDefined();
    });
  });

  it("handles empty document list gracefully", async () => {
    (listDocuments as any).mockResolvedValueOnce([]);

    render(<ReportComparison token="mock-token" />);

    await waitFor(() => {
      expect(screen.getByTestId("no-documents-state")).toBeDefined();
      expect(
        screen.getByText("You have not uploaded any medical reports yet.")
      ).toBeDefined();
    });
  });
});
