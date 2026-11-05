import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExportCenter } from "./ExportCenter";

// Mock API client methods
vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    downloadPdfHealthReport: vi.fn(),
    downloadCsvObservations: vi.fn(),
  };
});

import {
  downloadPdfHealthReport,
  downloadCsvObservations,
} from "../api/client";

describe("ExportCenter Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (downloadPdfHealthReport as any).mockResolvedValue("HealthMate_Report_2025-10-28.pdf");
    (downloadCsvObservations as any).mockResolvedValue("HealthMate_Observations_2025-10-28.csv");
  });

  it("renders export options and initial defaults", () => {
    render(<ExportCenter token="mock-token" />);

    expect(screen.getByText("📥 Export Center")).toBeDefined();
    expect(screen.getByText("Personalized Health Summary PDF")).toBeDefined();
    expect(screen.getByText("Structured Observations CSV")).toBeDefined();

    const scope = screen.getByTestId("export-scope-summary");
    expect(scope.textContent).toContain("Earliest available");
    expect(scope.textContent).toContain("Latest available");
    expect(scope.textContent).toContain("Verified Only");

    const unverifiedCheckbox = screen.getByTestId("export-include-unverified") as HTMLInputElement;
    expect(unverifiedCheckbox.checked).toBe(false);
  });

  it("updates export scope summary when date filters and unverified toggle change", () => {
    render(<ExportCenter token="mock-token" />);

    const startDateInput = screen.getByTestId("export-start-date");
    const endDateInput = screen.getByTestId("export-end-date");
    const unverifiedCheckbox = screen.getByTestId("export-include-unverified");

    fireEvent.change(startDateInput, { target: { value: "2025-01-01" } });
    fireEvent.change(endDateInput, { target: { value: "2025-06-30" } });
    fireEvent.click(unverifiedCheckbox);

    const scope = screen.getByTestId("export-scope-summary");
    expect(scope.textContent).toContain("2025-01-01");
    expect(scope.textContent).toContain("2025-06-30");
    expect(scope.textContent).toContain("Verified + Unverified");
  });

  it("downloads PDF report with configured parameters and shows success notification", async () => {
    render(<ExportCenter token="mock-token" />);

    const startDateInput = screen.getByTestId("export-start-date");
    fireEvent.change(startDateInput, { target: { value: "2025-01-01" } });

    const downloadPdfBtn = screen.getByTestId("download-pdf-btn");
    fireEvent.click(downloadPdfBtn);

    await waitFor(() => {
      expect(downloadPdfHealthReport).toHaveBeenCalledWith("mock-token", {
        startDate: "2025-01-01",
        endDate: undefined,
        includeUnverified: false,
        sections: [
          "overview",
          "source_documents",
          "summary",
          "observations",
          "trends",
          "data_quality",
          "clinician_questions",
          "disclaimers",
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("export-success")).toBeDefined();
      expect(
        screen.getByText(/Successfully generated and downloaded PDF report: HealthMate_Report_2025-10-28.pdf/i)
      ).toBeDefined();
    });
  });

  it("downloads CSV observations with configured parameters and shows success notification", async () => {
    render(<ExportCenter token="mock-token" />);

    const unverifiedCheckbox = screen.getByTestId("export-include-unverified");
    fireEvent.click(unverifiedCheckbox);

    const downloadCsvBtn = screen.getByTestId("download-csv-btn");
    fireEvent.click(downloadCsvBtn);

    await waitFor(() => {
      expect(downloadCsvObservations).toHaveBeenCalledWith("mock-token", {
        startDate: undefined,
        endDate: undefined,
        includeUnverified: true,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("export-success")).toBeDefined();
      expect(
        screen.getByText(/Successfully exported and downloaded observations CSV: HealthMate_Observations_2025-10-28.csv/i)
      ).toBeDefined();
    });
  });

  it("handles PDF download error and shows user-facing error message", async () => {
    (downloadPdfHealthReport as any).mockRejectedValueOnce(
      new Error("PDF generation failed: Corrupted font cache")
    );

    render(<ExportCenter token="mock-token" />);

    const downloadPdfBtn = screen.getByTestId("download-pdf-btn");
    fireEvent.click(downloadPdfBtn);

    await waitFor(() => {
      expect(screen.getByTestId("export-error")).toBeDefined();
      expect(
        screen.getByText("PDF generation failed: Corrupted font cache")
      ).toBeDefined();
    });
  });

  it("renders medical safety & confidentiality notice", () => {
    render(<ExportCenter token="mock-token" />);

    expect(screen.getByTestId("export-disclaimer")).toBeDefined();
    expect(
      screen.getByText(/HealthMate AI does not diagnose conditions, predict clinical outcomes, or prescribe medical treatments./i)
    ).toBeDefined();
  });
});
