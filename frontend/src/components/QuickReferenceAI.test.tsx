import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuickReferenceAI } from "./QuickReferenceAI";
import * as client from "../api/client";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    getQuickReferenceSuggestions: vi.fn(),
    getMyAiUsage: vi.fn(),
    queryQuickReference: vi.fn(),
    queryProfileQuickReference: vi.fn(),
  };
});

describe("QuickReferenceAI Component", () => {
  const mockProfile: client.FamilyProfile = {
    id: "prof-1",
    owner_id: "usr-1",
    name: "John Doe",
    relationship: "self",
    is_primary: true,
    is_active: true,
    is_dependent: false,
    consent_status: "authorized",
    avatar_color: "#0d9488",
    created_at: "2026-10-28T10:00:00Z",
    updated_at: "2026-10-28T10:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(client.getQuickReferenceSuggestions).mockResolvedValue({
      suggestions: [
        {
          mode: "medical_term",
          title: "Explain a Medical Term",
          description: "Plain-language definition, context and caveats",
          example_prompts: ["What is HbA1c?", "What does Creatinine measure?"],
        },
        {
          mode: "understand_test",
          title: "Understand a Test",
          description: "What it measures, why it may be ordered, and units",
          example_prompts: ["What is a Complete Blood Count?"],
        },
      ],
    });

    vi.mocked(client.getMyAiUsage).mockResolvedValue({
      quick_reference_limit: 20,
      quick_reference_used: 2,
      quick_reference_remaining: 18,
      chat_limit: 20,
      chat_used: 1,
      chat_remaining: 19,
      quota_reset_at: "2026-11-05T00:00:00Z",
    });
  });

  it("renders header, profile badge, AI quota, and all 6 mode tabs", async () => {
    render(<QuickReferenceAI token="mock-token" activeProfile={mockProfile} />);

    expect(screen.getByText("Quick Reference AI Assistant")).toBeDefined();
    expect(screen.getByText(/John Doe/)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/AI Quota:/)).toBeDefined();
      expect(screen.getByText(/18/)).toBeDefined();
    });

    expect(screen.getByRole("button", { name: /Medical Term/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Understand Test/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Explain Report/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Find Records/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Doctor Questions/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /General Health/i })).toBeDefined();
  });

  it("populates question input when clicking an example prompt chip", async () => {
    render(<QuickReferenceAI token="mock-token" activeProfile={mockProfile} />);

    await waitFor(() => {
      expect(screen.getByText("What is HbA1c?")).toBeDefined();
    });

    fireEvent.click(screen.getByText("What is HbA1c?"));
    const input = screen.getByPlaceholderText(/Enter a medical term/i) as HTMLInputElement;
    expect(input.value).toBe("What is HbA1c?");
  });

  it("submits query and displays grounded response with source links", async () => {
    vi.mocked(client.queryQuickReference).mockResolvedValue({
      mode: "medical_term",
      scope: "general_reference",
      answer: "HbA1c measures average blood sugar over 2 to 3 months.",
      sources: [
        {
          id: "REF_HBA1C",
          title: "Hemoglobin A1c (HbA1c) Test",
          publisher: "MedlinePlus / National Library of Medicine",
          url: "https://medlineplus.gov/lab-tests/hemoglobin-a1c-hba1c-test/",
          retrieved_at: "2026-11-04T00:00:00Z",
        },
      ],
      record_citations: [],
      limitations: ["This information does not diagnose or prescribe."],
      generation: { used: false, provider: "curated_catalogue", cached: false },
      status: "grounded",
      request_id: "qr_test123",
      questions_to_ask: ["What is my target HbA1c?"],
    });

    render(<QuickReferenceAI token="mock-token" activeProfile={mockProfile} />);

    const input = screen.getByPlaceholderText(/Enter a medical term/i);
    fireEvent.change(input, { target: { value: "What is HbA1c?" } });

    const submitBtn = screen.getByRole("button", { name: /Query/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/HbA1c measures average blood sugar over 2 to 3 months/i)).toBeDefined();
      expect(screen.getByText("Hemoglobin A1c (HbA1c) Test")).toBeDefined();
      expect(screen.getByText(/What is my target HbA1c\?/i)).toBeDefined();
      expect(screen.getByText(/Evidence Grounded/i)).toBeDefined();
    });
  });

  it("displays emergency advisory when emergency status is returned", async () => {
    vi.mocked(client.queryQuickReference).mockResolvedValue({
      mode: "medical_term",
      scope: "general_reference",
      answer: "EMERGENCY ADVISORY: Call your local emergency services immediately.",
      sources: [],
      record_citations: [],
      limitations: ["Educational tool only."],
      generation: { used: false, provider: "safety_guard", cached: false },
      status: "emergency_redirect",
      request_id: "qr_emerg123",
    });

    render(<QuickReferenceAI token="mock-token" activeProfile={mockProfile} />);

    const input = screen.getByPlaceholderText(/Enter a medical term/i);
    fireEvent.change(input, { target: { value: "I have severe chest pain and cannot breathe" } });

    fireEvent.click(screen.getByRole("button", { name: /Query/i }));

    await waitFor(() => {
      expect(screen.getByText(/Emergency Safety Notice/i)).toBeDefined();
      expect(screen.getByText(/EMERGENCY ADVISORY/i)).toBeDefined();
    });
  });

  it("supports helpful feedback interaction", async () => {
    vi.mocked(client.queryQuickReference).mockResolvedValue({
      mode: "medical_term",
      scope: "general_reference",
      answer: "Creatinine is a waste product filtered by the kidneys.",
      sources: [],
      record_citations: [],
      limitations: ["Educational only."],
      generation: { used: false, provider: "curated_catalogue", cached: false },
      status: "grounded",
      request_id: "qr_feed123",
    });

    render(<QuickReferenceAI token="mock-token" activeProfile={mockProfile} />);
    const input = screen.getByPlaceholderText(/Enter a medical term/i);
    fireEvent.change(input, { target: { value: "Creatinine" } });
    fireEvent.click(screen.getByRole("button", { name: /Query/i }));

    await waitFor(() => {
      expect(screen.getByText(/Creatinine is a waste product/i)).toBeDefined();
    });

    const yesBtn = screen.getByRole("button", { name: /Yes/i });
    fireEvent.click(yesBtn);
    expect(yesBtn.className).toContain("text-emerald-700");
  });
});

