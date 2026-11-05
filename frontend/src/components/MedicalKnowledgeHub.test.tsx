import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MedicalKnowledgeHub } from "./MedicalKnowledgeHub";

// Mock useAuth for DocumentViewerModal
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "patient@example.com",
      name: "Patient One",
      is_active: true,
      created_at: "2026-10-28T10:00:00Z",
    },
    token: "mock-token",
    isLoading: false,
    isInitializing: false,
    sessionError: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    handleSessionExpired: vi.fn(),
    clearSessionError: vi.fn(),
  }),
}));

// Mock API client methods
vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    searchMedicalRecords: vi.fn(),
    getDocument: vi.fn(),
  };
});

import { searchMedicalRecords, getDocument, type SearchResponse } from "../api/client";

const mockSearchResponse: SearchResponse = {
  query: "glucose",
  parsed_intent: "Search clinical measurements for analyte: Fasting Glucose",
  total_results: 2,
  page: 1,
  page_size: 10,
  disclaimer: "Medical Safety Notice: Retrieval only.",
  results: [
    {
      id: "obs_123",
      result_type: "observation",
      record_id: "obs-rec-123",
      title: "Fasting Glucose",
      snippet: "Fasting Blood Glucose measured at 105 mg/dL",
      source_document_id: "doc-456",
      source_document_title: "Annual_Blood_Work_2024.pdf",
      page_number: 1,
      date: "2024-05-10",
      date_provenance: "explicit",
      is_verified: true,
      verification_status: "verified",
      value: "105",
      unit: "mg/dL",
      reference_range: "70-99",
      flag: "HIGH",
      relevance_score: 95.0,
      frontend_destination: "timeline",
    },
    {
      id: "med_789",
      result_type: "medication",
      record_id: "med-rec-789",
      title: "Metformin",
      snippet: "Metformin 500 mg - Take 1 tablet twice daily",
      source_document_id: null,
      source_document_title: null,
      page_number: null,
      date: "2024-01-15",
      date_provenance: "explicit",
      is_verified: true,
      verification_status: "reviewed",
      value: "500 mg",
      unit: null,
      reference_range: null,
      flag: null,
      relevance_score: 75.0,
      frontend_destination: "care",
    },
  ],
};

describe("MedicalKnowledgeHub Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (searchMedicalRecords as any).mockResolvedValue(mockSearchResponse);
    (getDocument as any).mockResolvedValue({
      id: "doc-456",
      filename: "Annual_Blood_Work_2024.pdf",
      processing_status: "extracted",
      is_verified: true,
    });
  });

  it("renders search box, safety banner, filters, and suggested queries", () => {
    render(<MedicalKnowledgeHub token="mock-token" />);

    expect(screen.getByText("Personal Health Knowledge Hub")).toBeDefined();
    expect(screen.getByText(/Medical Safety Notice/i)).toBeDefined();

    const input = screen.getByLabelText("Medical records search query") as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe("");

    // Suggested queries
    expect(screen.getByText("Fasting Glucose")).toBeDefined();
    expect(screen.getByText("Metformin")).toBeDefined();

    // Verified only checkbox is checked by default
    const verifiedToggle = screen.getByLabelText(/Reviewed \/ Verified Only/i) as HTMLInputElement;
    expect(verifiedToggle.checked).toBe(true);
  });

  it("submits search query and displays result cards with exact values and provenance", async () => {
    render(<MedicalKnowledgeHub token="mock-token" />);

    const input = screen.getByLabelText("Medical records search query");
    fireEvent.change(input, { target: { value: "glucose" } });

    const submitBtn = screen.getByText("Search");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(searchMedicalRecords).toHaveBeenCalledWith("mock-token", {
        q: "glucose",
        source_type: "all",
        start_date: undefined,
        end_date: undefined,
        verified_only: true,
        sort_by: "relevance",
        page: 1,
        page_size: 10,
      });
    });

    // Verify results displayed
    await waitFor(() => {
      expect(screen.getAllByText("Fasting Glucose").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Metformin").length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText(/105 mg\/dL/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Annual_Blood_Work_2024.pdf/)).toBeDefined();
    expect(screen.getByText(/Intent: Search clinical measurements/i)).toBeDefined();
  });

  it("triggers search directly when clicking a suggested query chip", async () => {
    render(<MedicalKnowledgeHub token="mock-token" />);

    const chip = screen.getByText("Fasting Glucose");
    fireEvent.click(chip);

    await waitFor(() => {
      expect(searchMedicalRecords).toHaveBeenCalledWith(
        "mock-token",
        expect.objectContaining({ q: "Fasting Glucose" })
      );
    });
  });

  it("handles filter changes and passes them to search service", async () => {
    render(<MedicalKnowledgeHub token="mock-token" />);

    const input = screen.getByLabelText("Medical records search query");
    fireEvent.change(input, { target: { value: "glucose" } });

    const sourceSelect = screen.getByLabelText("Source:") as HTMLSelectElement;
    fireEvent.change(sourceSelect, { target: { value: "observation" } });

    const fromDate = screen.getByLabelText("From:") as HTMLInputElement;
    fireEvent.change(fromDate, { target: { value: "2024-01-01" } });

    const toDate = screen.getByLabelText("To:") as HTMLInputElement;
    fireEvent.change(toDate, { target: { value: "2024-12-31" } });

    const verifiedToggle = screen.getByLabelText(/Reviewed \/ Verified Only/i) as HTMLInputElement;
    fireEvent.click(verifiedToggle); // uncheck it

    const submitBtn = screen.getByText("Search");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(searchMedicalRecords).toHaveBeenCalledWith("mock-token", {
        q: "glucose",
        source_type: "observation",
        start_date: "2024-01-01",
        end_date: "2024-12-31",
        verified_only: false,
        sort_by: "relevance",
        page: 1,
        page_size: 10,
      });
    });
  });

  it("displays empty state when no results are found", async () => {
    (searchMedicalRecords as any).mockResolvedValueOnce({
      query: "nonexistent",
      parsed_intent: null,
      total_results: 0,
      page: 1,
      page_size: 10,
      disclaimer: "Safety disclaimer",
      results: [],
    });

    render(<MedicalKnowledgeHub token="mock-token" />);

    const input = screen.getByLabelText("Medical records search query");
    fireEvent.change(input, { target: { value: "nonexistent" } });

    const submitBtn = screen.getByText("Search");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("No matching records found")).toBeDefined();
    });
  });

  it("displays error alert when search fails", async () => {
    (searchMedicalRecords as any).mockRejectedValueOnce(new Error("Database connection lost"));

    render(<MedicalKnowledgeHub token="mock-token" />);

    const input = screen.getByLabelText("Medical records search query");
    fireEvent.change(input, { target: { value: "test" } });

    const submitBtn = screen.getByText("Search");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Database connection lost/i)).toBeDefined();
    });
  });

  it("expands result details on demand", async () => {
    render(<MedicalKnowledgeHub token="mock-token" />);

    const input = screen.getByLabelText("Medical records search query");
    fireEvent.change(input, { target: { value: "glucose" } });
    fireEvent.click(screen.getByText("Search"));

    await waitFor(() => {
      expect(screen.getAllByText("Fasting Glucose").length).toBeGreaterThanOrEqual(1);
    });

    const detailsBtns = screen.getAllByText("Details");
    fireEvent.click(detailsBtns[0]);

    await waitFor(() => {
      expect(screen.getByText("Supporting Record Provenance")).toBeDefined();
      expect(screen.getByText("obs-rec-123")).toBeDefined();
    });
  });

  it("calls getDocument when View Document button is clicked", async () => {
    render(<MedicalKnowledgeHub token="mock-token" />);

    const input = screen.getByLabelText("Medical records search query");
    fireEvent.change(input, { target: { value: "glucose" } });
    fireEvent.click(screen.getByText("Search"));

    await waitFor(() => {
      expect(screen.getByText("📄 View Document")).toBeDefined();
    });

    const viewDocBtn = screen.getByText("📄 View Document");
    fireEvent.click(viewDocBtn);

    await waitFor(() => {
      expect(getDocument).toHaveBeenCalledWith("mock-token", "doc-456");
    });
  });

  it("navigates to relevant tab when Open in Timeline or Care is clicked", async () => {
    const mockNavigate = vi.fn();
    render(<MedicalKnowledgeHub token="mock-token" onNavigateTab={mockNavigate} />);

    const input = screen.getByLabelText("Medical records search query");
    fireEvent.change(input, { target: { value: "glucose" } });
    fireEvent.click(screen.getByText("Search"));

    await waitFor(() => {
      expect(screen.getByText("Open in Timeline")).toBeDefined();
      expect(screen.getByText("Open in Care")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Open in Timeline"));
    expect(mockNavigate).toHaveBeenCalledWith("timeline");

    fireEvent.click(screen.getByText("Open in Care"));
    expect(mockNavigate).toHaveBeenCalledWith("care");
  });
});
