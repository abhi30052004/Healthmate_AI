import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HealthRecordsView } from "./HealthRecordsView";
import * as apiClient from "../../api/client";
import type { DocumentItem, FamilyProfile } from "../../api/client";

const mockProfile: FamilyProfile = {
  id: "prof-1",
  owner_id: "user-1",
  name: "Dr. Abhijit Bhunia",
  relationship: "self",
  is_primary: true,
  is_active: true,
  is_dependent: false,
  consent_status: "authorized",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockDocs: DocumentItem[] = [
  {
    id: "doc-1",
    owner_id: "user-1",
    filename: "Blood_Chemistry_Panel.pdf",
    mime_type: "application/pdf",
    file_size: 1048576,
    checksum_sha256: "abc123sha",
    processing_status: "completed",
    is_verified: true,
    created_at: "2026-10-28T10:00:00Z",
  },
  {
    id: "doc-2",
    owner_id: "user-1",
    filename: "Lipid_Profile_Extraction.pdf",
    mime_type: "application/pdf",
    file_size: 524288,
    checksum_sha256: "def456sha",
    processing_status: "extracted",
    is_verified: false,
    created_at: "2026-10-29T10:00:00Z",
  },
];

describe("Step 7 - Health Records & Extraction Review", () => {
  it("renders upload dropzone, search bar, and document cards", () => {
    render(
      <HealthRecordsView
        token="test-token"
        activeProfile={mockProfile}
        documents={mockDocs}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText("Health Records & Laboratory Findings")).toBeDefined();
    expect(screen.getByText("Blood_Chemistry_Panel.pdf")).toBeDefined();
    expect(screen.getByText("Lipid_Profile_Extraction.pdf")).toBeDefined();
    expect(screen.getAllByText("Verified").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Needs Review").length).toBeGreaterThanOrEqual(1);
  });

  it("filters documents by filename in search input", () => {
    render(
      <HealthRecordsView
        token="test-token"
        activeProfile={mockProfile}
        documents={mockDocs}
        onRefresh={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Filter documents by filename/i);
    fireEvent.change(searchInput, { target: { value: "Lipid" } });

    expect(screen.getByText("Lipid_Profile_Extraction.pdf")).toBeDefined();
    expect(screen.queryByText("Blood_Chemistry_Panel.pdf")).toBeNull();
  });

  it("opens split-screen review modal and confirms verified facts", async () => {
    const verifySpy = vi.spyOn(apiClient, "verifyDocument").mockResolvedValueOnce({
      document_id: "doc-2",
      status: "verified",
      message: "Verified successfully",
      verified_at: "2026-11-05T00:00:00Z",
    } as any);

    const refreshSpy = vi.fn();
    render(
      <HealthRecordsView
        token="test-token"
        activeProfile={mockProfile}
        documents={mockDocs}
        onRefresh={refreshSpy}
      />
    );

    const reviewBtn = screen.getByRole("button", { name: "Review Findings" });
    fireEvent.click(reviewBtn);

    // Modal title & OCR text should be present
    expect(screen.getByText("Human Verification & Extraction Review")).toBeDefined();
    expect(screen.getByText(/Automated OCR Extracted Text/i)).toBeDefined();
    expect(screen.getByText("Fasting Blood Glucose")).toBeDefined();

    // Click confirm button
    const confirmBtn = screen.getByRole("button", { name: /Confirm & Save Verified Facts/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalled();
    });
  });
});
