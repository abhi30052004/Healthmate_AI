import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DataQualityCenter } from "./DataQualityCenter";
import type {
  DuplicateCandidateItem,
  DuplicateComparisonView,
  DataQualitySummary,
  DataQualityAuditLogItem,
  FamilyProfile,
} from "../api/client";

// Mock API client methods
vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    getDataQualitySummary: vi.fn(),
    listDuplicateCandidates: vi.fn(),
    getDuplicateComparison: vi.fn(),
    scanDuplicates: vi.fn(),
    confirmDuplicateCandidate: vi.fn(),
    dismissDuplicateCandidate: vi.fn(),
    resolveDuplicateCandidate: vi.fn(),
    getDataQualityAuditHistory: vi.fn(),
  };
});

import {
  getDataQualitySummary,
  listDuplicateCandidates,
  getDuplicateComparison,
  scanDuplicates,
  confirmDuplicateCandidate,
  dismissDuplicateCandidate,
  resolveDuplicateCandidate,
  getDataQualityAuditHistory,
} from "../api/client";

describe("DataQualityCenter Component", () => {
  const mockToken = "mock-jwt-token";

  const sampleProfiles: FamilyProfile[] = [
    {
      id: "prof-1",
      owner_id: "user-1",
      name: "Alex Morgan",
      relationship: "self",
      is_primary: true,
      is_active: true,
      is_dependent: false,
      consent_status: "authorized",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "prof-2",
      owner_id: "user-1",
      name: "Leo Morgan",
      relationship: "child",
      is_primary: false,
      is_active: true,
      is_dependent: true,
      consent_status: "authorized",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ];

  const sampleSummary: DataQualitySummary = {
    total_candidates: 3,
    pending_candidates: 2,
    high_confidence_candidates: 1,
    confirmed_duplicates: 1,
    resolved_duplicates: 0,
    dismissed_candidates: 0,
    document_candidates: 2,
    observation_candidates: 1,
    last_scan_at: "2026-04-01T10:00:00Z",
  };

  const sampleCandidates: DuplicateCandidateItem[] = [
    {
      id: "cand-1",
      user_id: "user-1",
      profile_id: "prof-1",
      record_type: "document",
      primary_record_id: "doc-1",
      secondary_record_id: "doc-2",
      confidence: 1.0,
      match_reasons: [
        {
          code: "EXACT_HASH",
          description: "Cryptographically identical SHA-256 file checksum",
        },
      ],
      status: "pending",
      detected_at: "2026-04-01T10:00:00Z",
      primary_summary: {
        id: "doc-1",
        record_type: "document",
        title: "blood_test_jan.pdf",
        clinical_date: "2026-01-15",
        details: { file_size: 2048, checksum: "sha256abc" },
      },
      secondary_summary: {
        id: "doc-2",
        record_type: "document",
        title: "blood_test_jan (copy).pdf",
        clinical_date: "2026-01-15",
        details: { file_size: 2048, checksum: "sha256abc" },
      },
    },
    {
      id: "cand-2",
      user_id: "user-1",
      profile_id: "prof-1",
      record_type: "observation",
      primary_record_id: "obs-1",
      secondary_record_id: "obs-2",
      confidence: 0.95,
      match_reasons: [
        {
          code: "IDENTICAL_OBSERVATION",
          description: "Identical measurement 'Hemoglobin' = 14.2 g/dL on date 2026-01-15",
        },
      ],
      status: "confirmed_duplicate",
      detected_at: "2026-04-01T10:00:00Z",
      primary_summary: {
        id: "obs-1",
        record_type: "observation",
        title: "Hemoglobin",
        clinical_date: "2026-01-15",
        details: { value: 14.2, unit: "g/dL" },
      },
      secondary_summary: {
        id: "obs-2",
        record_type: "observation",
        title: "Hemoglobin",
        clinical_date: "2026-01-15",
        details: { value: 14.2, unit: "g/dL" },
      },
    },
  ];

  const sampleComparison: DuplicateComparisonView = {
    candidate_id: "cand-1",
    record_type: "document",
    confidence: 1.0,
    status: "pending",
    match_reasons: [
      {
        code: "EXACT_HASH",
        description: "Cryptographically identical SHA-256 file checksum",
      },
    ],
    primary_record: {
      id: "doc-1",
      record_type: "document",
      title: "blood_test_jan.pdf",
      clinical_date: "2026-01-15",
      details: { file_size: 2048, checksum: "sha256abc" },
    },
    secondary_record: {
      id: "doc-2",
      record_type: "document",
      title: "blood_test_jan (copy).pdf",
      clinical_date: "2026-01-15",
      details: { file_size: 2048, checksum: "sha256abc" },
    },
    similarities: ["Identical file content checksum (SHA-256)", "Identical file size"],
    differences: ["Filename differs slightly"],
  };

  const sampleAuditLogs: DataQualityAuditLogItem[] = [
    {
      id: "audit-1",
      user_id: "user-1",
      candidate_id: "cand-1",
      action: "CONFIRMED_DUPLICATE",
      record_type: "document",
      primary_record_id: "doc-1",
      secondary_record_id: "doc-2",
      created_at: "2026-04-01T10:05:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDataQualitySummary).mockResolvedValue(sampleSummary);
    vi.mocked(listDuplicateCandidates).mockResolvedValue({
      items: sampleCandidates,
      total: 2,
      page: 1,
      page_size: 12,
      total_pages: 1,
    });
    vi.mocked(getDuplicateComparison).mockResolvedValue(sampleComparison);
    vi.mocked(scanDuplicates).mockResolvedValue(sampleSummary);
    vi.mocked(confirmDuplicateCandidate).mockResolvedValue({
      ...sampleCandidates[0],
      status: "confirmed_duplicate",
    });
    vi.mocked(dismissDuplicateCandidate).mockResolvedValue({
      ...sampleCandidates[0],
      status: "not_duplicate",
    });
    vi.mocked(resolveDuplicateCandidate).mockResolvedValue({
      ...sampleCandidates[0],
      status: "resolved",
      retained_record_id: "doc-1",
      archived_record_id: "doc-2",
    });
    vi.mocked(getDataQualityAuditHistory).mockResolvedValue(sampleAuditLogs);
  });

  it("renders Data Quality Center summary KPI cards and candidate cards", async () => {
    render(
      <DataQualityCenter
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        profiles={sampleProfiles}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("🛡️ Data Quality & Duplicate Detection Center")).toBeDefined();
    });

    // Check KPI counts
    expect(screen.getAllByText("Pending Review").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("High-Confidence")).toBeDefined();
    expect(screen.getAllByText("Confirmed Duplicates").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Safely Resolved")).toBeDefined();

    // Check Candidate cards
    expect(screen.getByText("blood_test_jan.pdf")).toBeDefined();
    expect(screen.getByText("blood_test_jan (copy).pdf")).toBeDefined();
    expect(screen.getAllByText("Hemoglobin").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("● 100% High Match")).toBeDefined();
  });

  it("filters candidates when clicking status filter buttons", async () => {
    render(
      <DataQualityCenter
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        profiles={sampleProfiles}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("blood_test_jan.pdf")).toBeDefined();
    });

    const pendingBtn = screen.getByRole("button", { name: "Pending" });
    fireEvent.click(pendingBtn);

    await waitFor(() => {
      expect(listDuplicateCandidates).toHaveBeenCalledWith(
        mockToken,
        expect.objectContaining({ status: "pending" })
      );
    });
  });

  it("filters candidates by record type dropdown", async () => {
    render(
      <DataQualityCenter
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        profiles={sampleProfiles}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("blood_test_jan.pdf")).toBeDefined();
    });

    const typeSelect = screen.getByLabelText("Filter by record type");
    fireEvent.change(typeSelect, { target: { value: "document" } });

    await waitFor(() => {
      expect(listDuplicateCandidates).toHaveBeenCalledWith(
        mockToken,
        expect.objectContaining({ recordType: "document" })
      );
    });
  });

  it("opens side-by-side comparison modal", async () => {
    render(
      <DataQualityCenter
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        profiles={sampleProfiles}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("blood_test_jan.pdf")).toBeDefined();
    });

    const compareBtn = screen.getAllByRole("button", { name: "🔍 Compare Side-by-Side" })[0];
    fireEvent.click(compareBtn);

    await waitFor(() => {
      expect(screen.getByText("Side-by-Side Record Comparison")).toBeDefined();
      expect(screen.getByText("Identical file content checksum (SHA-256)")).toBeDefined();
      expect(screen.getByText("Filename differs slightly")).toBeDefined();
    });

    // Close comparison modal
    const closeBtn = screen.getByRole("button", { name: "✕ Close" });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Side-by-Side Record Comparison")).toBeNull();
    });
  });

  it("confirms a duplicate candidate", async () => {
    render(
      <DataQualityCenter
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        profiles={sampleProfiles}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("blood_test_jan.pdf")).toBeDefined();
    });

    const confirmBtn = screen.getByRole("button", { name: "⚠️ Confirm Duplicate" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(confirmDuplicateCandidate).toHaveBeenCalledWith(mockToken, "cand-1");
      expect(
        screen.getByText(/Candidate marked as Confirmed Duplicate/)
      ).toBeDefined();
    });
  });

  it("dismisses a candidate as false positive (not a duplicate)", async () => {
    render(
      <DataQualityCenter
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        profiles={sampleProfiles}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("blood_test_jan.pdf")).toBeDefined();
    });

    const dismissBtn = screen.getAllByRole("button", { name: "✕ Not a Duplicate" })[0];
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(dismissDuplicateCandidate).toHaveBeenCalledWith(
        mockToken,
        "cand-1",
        "User verified non-duplicate"
      );
      expect(screen.getByText(/Candidate dismissed as Not a Duplicate/)).toBeDefined();
    });
  });

  it("opens resolution modal, selects retained record, and resolves duplicate", async () => {
    render(
      <DataQualityCenter
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        profiles={sampleProfiles}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("blood_test_jan.pdf")).toBeDefined();
    });

    const resolveBtn = screen.getAllByRole("button", { name: "✅ Resolve Duplicate" })[0];
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(screen.getByText("Resolve Duplicate Record Safely")).toBeDefined();
      expect(screen.getByText("Choose Record to Retain (Active):")).toBeDefined();
    });

    // Select retain secondary record
    const radioSecondary = screen.getByRole("radio", {
      name: /Retain Record B/,
    });
    fireEvent.click(radioSecondary);

    // Enter notes
    const notesInput = screen.getByPlaceholderText(/e\.g\., Retained later scan/);
    fireEvent.change(notesInput, { target: { value: "Retained cleaner scan" } });

    // Submit resolution
    const confirmArchiveBtn = screen.getByRole("button", {
      name: "Confirm & Archive Duplicate",
    });
    fireEvent.click(confirmArchiveBtn);

    await waitFor(() => {
      expect(resolveDuplicateCandidate).toHaveBeenCalledWith(
        mockToken,
        "cand-1",
        expect.objectContaining({
          retained_record_id: "doc-2",
          decision_notes: "Retained cleaner scan",
        })
      );
      expect(screen.getByText(/Duplicate safely resolved!/)).toBeDefined();
    });
  });

  it("runs duplicate scan when clicking scan button", async () => {
    render(
      <DataQualityCenter
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        profiles={sampleProfiles}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("blood_test_jan.pdf")).toBeDefined();
    });

    const scanBtn = screen.getByRole("button", { name: "🔍 Run Duplicate Scan" });
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(scanDuplicates).toHaveBeenCalledWith(mockToken, "prof-1");
      expect(screen.getByText(/Scan complete!/)).toBeDefined();
    });
  });

  it("opens and displays audit trail modal", async () => {
    render(
      <DataQualityCenter
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        profiles={sampleProfiles}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("blood_test_jan.pdf")).toBeDefined();
    });

    const auditBtn = screen.getByRole("button", { name: "📜 Audit Trail" });
    fireEvent.click(auditBtn);

    await waitFor(() => {
      expect(screen.getByText("📜 Data Quality Audit Trail")).toBeDefined();
      expect(screen.getByText("CONFIRMED_DUPLICATE")).toBeDefined();
    });

    // Close audit modal
    const closeBtn = screen.getByRole("button", { name: "✕ Close" });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("📜 Data Quality Audit Trail")).toBeNull();
    });
  });

  it("shows empty state when no candidates found", async () => {
    vi.mocked(listDuplicateCandidates).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 12,
      total_pages: 0,
    });

    render(
      <DataQualityCenter
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        profiles={sampleProfiles}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No Duplicate Candidates Found")).toBeDefined();
      expect(screen.getByText("Run New Scan")).toBeDefined();
    });
  });
});
