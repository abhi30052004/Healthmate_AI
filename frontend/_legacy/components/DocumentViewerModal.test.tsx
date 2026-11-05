import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentViewerModal } from "./DocumentViewerModal";
import type { DocumentItem } from "../api/client";

// Mock AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    token: "mock-jwt-token",
    user: { id: "user-1", email: "test@healthmate.ai", name: "Test User" },
  }),
}));

// Mock API client methods
vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    getDocumentText: vi.fn(),
    getObservations: vi.fn(),
    updateObservation: vi.fn(),
    reprocessDocument: vi.fn(),
    verifyDocument: vi.fn(),
    downloadDocument: vi.fn(),
  };
});

import {
  getDocumentText,
  getObservations,
  updateObservation,
  reprocessDocument,
  verifyDocument,
} from "../api/client";

describe("DocumentViewerModal Component", () => {
  const mockDocument: DocumentItem = {
    id: "doc-123",
    owner_id: "user-1",
    filename: "cbc_report.pdf",
    mime_type: "application/pdf",
    file_size: 2048,
    checksum_sha256: "abcdef1234567890",
    processing_status: "extracted",
    ocr_applied: false,
    patient_name: "Test Patient One (SYNTHETIC)",
    lab_name: "Northside Synthetic Labs",
    document_date: "2025-01-15",
    is_verified: false,
    created_at: "2025-01-15T10:00:00Z",
  };

  const mockObservations = [
    {
      id: "obs-1",
      document_id: "doc-123",
      owner_id: "user-1",
      test_name: "Hemoglobin",
      value: "13.2",
      numeric_value: 13.2,
      unit: "g/dL",
      reference_range: "13.5-17.5",
      flag: "LOW",
      source_page: 1,
      source_text: "Hemoglobin 13.2 g/dL 13.5-17.5",
      is_low_confidence: false,
      is_reviewed: false,
      created_at: "2025-01-15T10:00:00Z",
    },
    {
      id: "obs-2",
      document_id: "doc-123",
      owner_id: "user-1",
      test_name: "WBC",
      value: "6.8",
      numeric_value: 6.8,
      unit: "10^3/uL",
      reference_range: "4.0-11.0",
      flag: "NORMAL",
      source_page: 1,
      source_text: "WBC 6.8 10^3/uL 4.0-11.0",
      is_low_confidence: true,
      is_reviewed: false,
      created_at: "2025-01-15T10:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDocumentText).mockResolvedValue({
      document_id: "doc-123",
      filename: "cbc_report.pdf",
      processing_status: "extracted",
      page_count: 1,
      ocr_applied: false,
      extracted_text: "--- Page 1 ---\nHemoglobin 13.2 g/dL 13.5-17.5\nWBC 6.8 10^3/uL 4.0-11.0",
      is_verified: false,
    });
    vi.mocked(getObservations).mockResolvedValue(mockObservations);
  });

  it("renders observations table and provenance accurately", async () => {
    render(
      <DocumentViewerModal
        document={mockDocument}
        onClose={vi.fn()}
        onVerified={vi.fn()}
      />
    );

    // Check loading indicator then table
    expect(await screen.findByText("Hemoglobin")).toBeDefined();
    expect(screen.getByText("13.2")).toBeDefined();
    expect(screen.getByText("g/dL")).toBeDefined();
    expect(screen.getByText("13.5-17.5")).toBeDefined();
    expect(screen.getByText("▼ LOW")).toBeDefined();

    // Check provenance
    expect(screen.getAllByText("Page 1").length).toBeGreaterThan(0);
    expect(screen.getByText('"Hemoglobin 13.2 g/dL 13.5-17.5"')).toBeDefined();

    // Check low-confidence badge and banner
    expect(screen.getByText("⚠️ Low Conf.")).toBeDefined();
    expect(screen.getByText("Low-Confidence Readings Detected")).toBeDefined();
  });

  it("switches to raw text tab", async () => {
    render(
      <DocumentViewerModal
        document={mockDocument}
        onClose={vi.fn()}
        onVerified={vi.fn()}
      />
    );

    await screen.findByText("Hemoglobin");
    const rawTextTab = screen.getByRole("button", { name: /Verbatim Report Text/i });
    fireEvent.click(rawTextTab);

    expect(await screen.findByText(/--- Page 1 ---/)).toBeDefined();
  });

  it("allows user to open correction modal and submit correction", async () => {
    vi.mocked(updateObservation).mockResolvedValue({
      ...mockObservations[0],
      value: "14.2",
      flag: "NORMAL",
      is_reviewed: true,
    });

    render(
      <DocumentViewerModal
        document={mockDocument}
        onClose={vi.fn()}
        onVerified={vi.fn()}
      />
    );

    await screen.findByText("Hemoglobin");
    const editBtns = screen.getAllByRole("button", { name: "Correct" });
    fireEvent.click(editBtns[0]);

    // Check correction modal opened
    expect(screen.getByText("Correct Extracted Value: Hemoglobin")).toBeDefined();
    const valueInput = screen.getByLabelText(/Measured Value/i);
    fireEvent.change(valueInput, { target: { value: "14.2" } });

    const saveBtn = screen.getByRole("button", { name: "Save Correction" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateObservation).toHaveBeenCalledWith(
        "mock-jwt-token",
        "doc-123",
        "obs-1",
        expect.objectContaining({ value: "14.2", is_reviewed: true })
      );
    });

    // Success feedback and reviewed badge
    expect(await screen.findByText(/Observation "Hemoglobin" successfully corrected/i)).toBeDefined();
  });

  it("triggers reprocessing when Retry / Reprocess OCR button is clicked", async () => {
    vi.mocked(reprocessDocument).mockResolvedValue({
      ...mockDocument,
      ocr_applied: true,
      processing_status: "extracted",
      observations: mockObservations,
    });

    render(
      <DocumentViewerModal
        document={mockDocument}
        onClose={vi.fn()}
        onVerified={vi.fn()}
      />
    );

    await screen.findByText("Hemoglobin");
    const reprocessBtn = screen.getByRole("button", { name: /Retry \/ Reprocess OCR/i });
    fireEvent.click(reprocessBtn);

    await waitFor(() => {
      expect(reprocessDocument).toHaveBeenCalledWith("mock-jwt-token", "doc-123");
    });
    expect(await screen.findByText(/Document successfully reprocessed/i)).toBeDefined();
  });

  it("verifies the document and all observations", async () => {
    vi.mocked(verifyDocument).mockResolvedValue({
      document_id: "doc-123",
      is_verified: true,
      verified_at: "2025-01-15T12:00:00Z",
      observations_verified_count: 2,
      message: "Confirmed",
    });

    const onVerifiedMock = vi.fn();
    render(
      <DocumentViewerModal
        document={mockDocument}
        onClose={vi.fn()}
        onVerified={onVerifiedMock}
      />
    );

    await screen.findByText("Hemoglobin");
    const verifyBtn = screen.getByRole("button", { name: /Confirm & Verify Medical Records/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(verifyDocument).toHaveBeenCalledWith("mock-jwt-token", "doc-123");
      expect(onVerifiedMock).toHaveBeenCalledWith("doc-123");
    });

    expect(await screen.findByText(/Extracted clinical data and observations confirmed/i)).toBeDefined();
  });
});
