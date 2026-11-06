import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssistantView, toCitationData } from "./AssistantView";
import * as api from "../../api/client";
import { renderWithProviders, testProfile, secondProfile } from "../../test/utils";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return {
    ...actual,
    getMyAiUsage: vi.fn(),
    createConversation: vi.fn(),
    sendChatMessage: vi.fn(),
    queryQuickReference: vi.fn(),
  };
});

const citation: api.CitationItem = {
  citation_id: "[S1]",
  document_id: "d1",
  document_title: "Lab report.pdf",
  original_test_name: "Fasting Glucose",
  value: "94",
  unit: "mg/dL",
  clinical_date: "2026-10-28",
  date_type: "actual",
  page_number: null,
  source_text: "Fasting Glucose 94 mg/dL",
  is_reviewed: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getMyAiUsage).mockResolvedValue({
    quick_reference_limit: 20, quick_reference_used: 0, quick_reference_remaining: 20,
    chat_limit: 20, chat_used: 8, chat_remaining: 12, quota_reset_at: "",
  });
  vi.mocked(api.createConversation).mockResolvedValue({ id: "c1" } as any);
  vi.mocked(api.sendChatMessage).mockResolvedValue({
    conversation_id: "c1", message_id: "m1", answer: "Your fasting glucose was 94 mg/dL [S1].", citations: [citation],
  });
});

describe("toCitationData", () => {
  it("never invents a page number", () => {
    const c = toCitationData(citation, 0);
    expect(c.pageNumber).toBeNull();
    expect(c.sourceIndex).toBe(1);
    expect(c.excerpt).toBe("Fasting Glucose 94 mg/dL");
    expect(c.isVerified).toBe(true);
  });
});

describe("AssistantView (real backend)", () => {
  it("shows the safety notice and the real daily quota", async () => {
    renderWithProviders(<AssistantView token="t" activeProfile={testProfile} />);
    expect(screen.getAllByText(/never diagnoses or prescribes/i).length).toBeGreaterThan(0);
    expect(await screen.findByText(/12 of 20 chats left today/i)).toBeDefined();
  });

  it("sends the question scoped to the active profile and shows the cited answer", async () => {
    renderWithProviders(<AssistantView token="t" activeProfile={testProfile} />);
    fireEvent.change(screen.getByLabelText("Ask a question about your records"), { target: { value: "What was my glucose?" } });
    fireEvent.click(screen.getByRole("button", { name: /^Ask$/ }));

    await waitFor(() => expect(api.sendChatMessage).toHaveBeenCalledWith("t", "c1", "What was my glucose?", false, "prof-1"));
    expect(await screen.findByText(/Your fasting glucose was 94 mg\/dL/)).toBeDefined();
    expect(screen.getByText(/This explains your records/i)).toBeDefined();

    fireEvent.click(screen.getByTitle(/Source \[S1\]/));
    expect(await screen.findByText(/Exact Source Excerpt/i)).toBeDefined();
    expect(screen.getByText("Not available")).toBeDefined(); // no fabricated page
  });

  it("starts a fresh conversation when the profile changes (no context carried over)", async () => {
    const { rerender } = renderWithProviders(<AssistantView token="t" activeProfile={testProfile} />);
    fireEvent.change(screen.getByLabelText("Ask a question about your records"), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: /^Ask$/ }));
    await screen.findByText(/Your fasting glucose/);

    rerender(<AssistantView token="t" activeProfile={secondProfile} />);
    await waitFor(() => expect(screen.queryByText(/Your fasting glucose/)).toBeNull());
    fireEvent.change(screen.getByLabelText("Ask a question about your records"), { target: { value: "again" } });
    fireEvent.click(screen.getByRole("button", { name: /^Ask$/ }));
    await waitFor(() => expect(api.createConversation).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.sendChatMessage).mock.calls[1][4]).toBe("prof-2");
  });

  it("uses the unverified toggle only when asked", async () => {
    renderWithProviders(<AssistantView token="t" activeProfile={testProfile} />);
    fireEvent.click(screen.getByLabelText(/Also search values I haven't verified/i));
    fireEvent.change(screen.getByLabelText("Ask a question about your records"), { target: { value: "q" } });
    fireEvent.click(screen.getByRole("button", { name: /^Ask$/ }));
    await waitFor(() => expect(vi.mocked(api.sendChatMessage).mock.calls[0][3]).toBe(true));
  });

  it("looks up a medical term and labels it as not from the user's records", async () => {
    vi.mocked(api.queryQuickReference).mockResolvedValue({
      mode: "medical_term", scope: "general_reference", answer: "HbA1c reflects average blood sugar.", sources: [
        { id: "R1", title: "NIDDK A1C", publisher: "NIH", url: "https://example.org/a1c", retrieved_at: "" },
      ],
      record_citations: [], limitations: ["General information; not a diagnosis."],
      generation: { used: false, provider: "none", cached: false }, status: "grounded", request_id: "r",
    });
    renderWithProviders(<AssistantView token="t" activeProfile={testProfile} />);
    fireEvent.click(screen.getByRole("tab", { name: /Medical terms/i }));
    fireEvent.change(screen.getByLabelText("Term or question"), { target: { value: "HbA1c" } });
    fireEvent.click(screen.getByRole("button", { name: /Look up/i }));

    const result = await screen.findByTestId("reference-result");
    expect(within(result).getByText(/not from your records/i)).toBeDefined();
    expect(within(result).getByRole("link", { name: /NIDDK A1C/ }).getAttribute("href")).toBe("https://example.org/a1c");
    expect(vi.mocked(api.queryQuickReference).mock.calls[0][1]).toMatchObject({ mode: "medical_term", term: "HbA1c" });
  });
});
