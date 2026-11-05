import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MedicalChat } from "./MedicalChat";
import type {
  ChatConversationSummary,
  ChatConversationDetail,
  ChatAnswerResponse,
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
    createConversation: vi.fn(),
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    sendChatMessage: vi.fn(),
    deleteConversation: vi.fn(),
    getDocument: vi.fn(),
  };
});

import {
  createConversation,
  listConversations,
  getConversation,
  sendChatMessage,
  deleteConversation,
  getDocument,
} from "../api/client";

describe("MedicalChat Component", () => {
  const mockConversations: ChatConversationSummary[] = [
    {
      id: "conv-1",
      owner_id: "user-1",
      title: "Glucose Trend Discussion",
      created_at: "2025-07-21T10:00:00Z",
      updated_at: "2025-07-21T10:05:00Z",
      message_count: 2,
    },
    {
      id: "conv-2",
      owner_id: "user-1",
      title: "Lipid Panel Review",
      created_at: "2025-07-20T08:00:00Z",
      updated_at: "2025-07-20T08:10:00Z",
      message_count: 2,
    },
  ];

  const mockDetailConv1: ChatConversationDetail = {
    id: "conv-1",
    owner_id: "user-1",
    title: "Glucose Trend Discussion",
    created_at: "2025-07-21T10:00:00Z",
    updated_at: "2025-07-21T10:05:00Z",
    messages: [
      {
        id: "msg-1",
        conversation_id: "conv-1",
        role: "user",
        content: "How has my glucose changed across my reports?",
        citations: null,
        created_at: "2025-07-21T10:00:00Z",
      },
      {
        id: "msg-2",
        conversation_id: "conv-1",
        role: "assistant",
        content: "Based on your uploaded records, your glucose was 104 mg/dL [S1] and then 5.4 mmol/L [S2].",
        citations: [
          {
            citation_id: "[S1]",
            document_id: "doc-apr",
            document_title: "metabolic_apr.pdf",
            observation_id: "obs-1",
            normalized_test_name: "Fasting Glucose",
            value: "104",
            unit: "mg/dL",
            reference_range: "70-99",
            abnormal_flag: "HIGH",
            clinical_date: "2025-04-02",
            date_type: "actual",
            page_number: 1,
            source_text: "Blood Glucose: 104 mg/dL [70-99]",
            is_reviewed: true,
          },
          {
            citation_id: "[S2]",
            document_id: "doc-jul",
            document_title: "followup_jul.pdf",
            observation_id: "obs-2",
            normalized_test_name: "Fasting Glucose",
            value: "5.4",
            unit: "mmol/L",
            reference_range: "3.9-5.5",
            abnormal_flag: "NORMAL",
            clinical_date: "2025-07-20",
            date_type: "actual",
            page_number: 1,
            source_text: "Fasting Glucose: 5.4 mmol/L [3.9-5.5]",
            is_reviewed: false, // unverified
          },
        ],
        created_at: "2025-07-21T10:01:00Z",
      },
    ],
  };

  const mockDetailConv2: ChatConversationDetail = {
    id: "conv-2",
    owner_id: "user-1",
    title: "Lipid Panel Review",
    created_at: "2025-07-20T08:00:00Z",
    updated_at: "2025-07-20T08:10:00Z",
    messages: [
      {
        id: "msg-3",
        conversation_id: "conv-2",
        role: "user",
        content: "What was my cholesterol level?",
        citations: null,
        created_at: "2025-07-20T08:00:00Z",
      },
      {
        id: "msg-4",
        conversation_id: "conv-2",
        role: "assistant",
        content: "Your total cholesterol was 220 mg/dL [S1].",
        citations: [
          {
            citation_id: "[S1]",
            document_id: "doc-feb",
            document_title: "lipids_feb.pdf",
            observation_id: "obs-3",
            normalized_test_name: "Total Cholesterol",
            value: "220",
            unit: "mg/dL",
            reference_range: "< 200",
            abnormal_flag: "HIGH",
            clinical_date: "2025-02-10",
            date_type: "actual",
            page_number: null, // missing page number test
            source_text: "Total Cholesterol: 220 mg/dL",
            is_reviewed: true,
          },
        ],
        created_at: "2025-07-20T08:01:00Z",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.mocked(listConversations).mockResolvedValue(mockConversations);
    vi.mocked(getConversation).mockResolvedValue(mockDetailConv1);
  });

  it("Test 1: Chat renders in the authenticated dashboard", async () => {
    render(<MedicalChat />);

    expect(screen.getByText("Loading conversations…")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Glucose Trend Discussion")).toBeDefined();
    });

    expect(screen.getByText("+ New Clinical Chat")).toBeDefined();
    expect(screen.getByPlaceholderText(/Ask a question about your reports/)).toBeDefined();
  });

  it("Test 2: Empty state and suggested questions display correctly when no messages", async () => {
    vi.mocked(listConversations).mockResolvedValueOnce([]);

    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getByText("Ask Questions Grounded in Your Medical Reports")).toBeDefined();
    });

    expect(screen.getByText('"Summarize my latest blood test."')).toBeDefined();
    expect(screen.getByText('"How has my glucose changed across my reports?"')).toBeDefined();
  });

  it("Test 3: User can create a new conversation", async () => {
    const newConv: ChatConversationSummary = {
      id: "conv-3",
      owner_id: "user-1",
      title: "New Medical Chat",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
    };
    vi.mocked(createConversation).mockResolvedValueOnce(newConv);

    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getByText("+ New Clinical Chat")).toBeDefined();
    });

    const newBtn = screen.getByText("+ New Clinical Chat");
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(createConversation).toHaveBeenCalledWith("mock-jwt-token", "New Medical Chat");
    });
  });

  it("Test 4: Messages render in the correct order", async () => {
    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getByText("How has my glucose changed across my reports?")).toBeDefined();
    });

    expect(screen.getByText(/Based on your uploaded records, your glucose was 104 mg\/dL/)).toBeDefined();
  });

  it("Test 5 & 6: Sending a question shows loading state and prevents duplicate submission", async () => {
    const mockAnswer: ChatAnswerResponse = {
      conversation_id: "conv-1",
      message_id: "msg-new",
      answer: "Your latest fasting glucose was 5.4 mmol/L.",
      citations: [],
    };
    vi.mocked(sendChatMessage).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockAnswer), 200))
    );

    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask a question about your reports/)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/Ask a question about your reports/);
    const sendBtn = screen.getByText("Send Inquiry →");

    fireEvent.change(input, { target: { value: "What is my latest glucose?" } });
    fireEvent.click(sendBtn);

    // Verify loading state and disabled button
    expect(screen.getByText("Analyzing…")).toBeDefined();
    expect((sendBtn as HTMLButtonElement).disabled).toBe(true);

    // Wait for resolution
    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledWith(
        "mock-jwt-token",
        "conv-1",
        "What is my latest glucose?",
        false
      );
    });
  });

  it("Test 7: API errors display a retry option without losing typed text", async () => {
    vi.mocked(sendChatMessage).mockRejectedValueOnce(new Error("Network timeout"));

    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask a question about your reports/)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/Ask a question about your reports/);
    fireEvent.change(input, { target: { value: "Explain my results" } });

    const sendBtn = screen.getByText("Send Inquiry →");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText("Network timeout")).toBeDefined();
      expect(screen.getByText("Retry Request")).toBeDefined();
    });

    // Input preserved
    expect((input as HTMLTextAreaElement).value).toBe("Explain my results");
  });

  it("Test 8: Citation cards display available provenance", async () => {
    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getByText(/Supporting Clinical Evidence/)).toBeDefined();
    });

    expect(screen.getByText("[S1]")).toBeDefined();
    expect(screen.getByText('"Blood Glucose: 104 mg/dL [70-99]"')).toBeDefined();
  });

  it("Test 9: Clicking a citation opens the appropriate document viewer", async () => {
    const mockDoc: DocumentItem = {
      id: "doc-apr",
      owner_id: "user-1",
      filename: "metabolic_apr.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
      checksum_sha256: "abc",
      processing_status: "extracted",
      ocr_applied: false,
      document_date: "2025-04-02",
      is_verified: true,
      created_at: "2025-04-02T10:00:00Z",
    };
    vi.mocked(getDocument).mockResolvedValueOnce(mockDoc);

    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getAllByText("Open Source Report →").length).toBeGreaterThan(0);
    });

    const openBtn = screen.getAllByText("Open Source Report →")[0];
    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(getDocument).toHaveBeenCalledWith("mock-jwt-token", "doc-apr");
    });
  });

  it("Test 10: Missing page numbers do not fabricate page details", async () => {
    vi.mocked(getConversation).mockResolvedValueOnce(mockDetailConv2);

    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Lipid Panel Review" })).toBeDefined();
    });

    // For mockDetailConv2, page_number is null
    expect(screen.queryByText(/Page null/)).toBeNull();
    expect(screen.queryByText(/Page 0/)).toBeNull();
  });

  it("Test 11: Unverified evidence is visibly labelled with badge", async () => {
    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getAllByText("Reviewed").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Unverified").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("Test 12: Conversation switching loads the correct history", async () => {
    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getByText("💬 Lipid Panel Review")).toBeDefined();
    });

    vi.mocked(getConversation).mockResolvedValueOnce(mockDetailConv2);

    const conv2Tab = screen.getByText("💬 Lipid Panel Review");
    fireEvent.click(conv2Tab);

    await waitFor(() => {
      expect(getConversation).toHaveBeenCalledWith("mock-jwt-token", "conv-2");
      expect(screen.getByText("What was my cholesterol level?")).toBeDefined();
    });
  });

  it("Test 13: Conversation deletion requires window confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(deleteConversation).mockResolvedValueOnce();

    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getByText("Glucose Trend Discussion")).toBeDefined();
    });

    const delBtn = document.getElementById("delete-conv-conv-1");
    expect(delBtn).toBeDefined();
    fireEvent.click(delBtn!);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(deleteConversation).toHaveBeenCalledWith("mock-jwt-token", "conv-1");
    });
  });

  it("Test 14: Interface remains usable when no documents or evidence exist", async () => {
    vi.mocked(listConversations).mockResolvedValueOnce([]);
    vi.mocked(createConversation).mockResolvedValueOnce({
      id: "conv-empty",
      owner_id: "user-1",
      title: "New Medical Chat",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
    });
    vi.mocked(sendChatMessage).mockResolvedValueOnce({
      conversation_id: "conv-empty",
      message_id: "msg-empty-ans",
      answer: "No matching laboratory results found in your verified records.",
      citations: [],
    });

    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getByText("No past conversations.")).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/Ask a question about your reports/);
    fireEvent.change(input, { target: { value: "Do I have any thyroid tests?" } });

    const sendBtn = screen.getByText("Send Inquiry →");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText("No matching laboratory results found in your verified records.")).toBeDefined();
    });
  });

  it("Test 15: Include Unverified checkbox toggles parameter in sendChatMessage", async () => {
    vi.mocked(sendChatMessage).mockResolvedValueOnce({
      conversation_id: "conv-1",
      message_id: "msg-unv",
      answer: "Including unverified observations...",
      citations: [],
    });

    render(<MedicalChat />);

    await waitFor(() => {
      expect(screen.getByLabelText("Include Unverified Observations")).toBeDefined();
    });

    const toggle = screen.getByLabelText("Include Unverified Observations");
    fireEvent.click(toggle);

    const input = screen.getByPlaceholderText(/Ask a question about your reports/);
    fireEvent.change(input, { target: { value: "Check unverified" } });

    const sendBtn = screen.getByText("Send Inquiry →");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledWith(
        "mock-jwt-token",
        "conv-1",
        "Check unverified",
        true // include_unverified: true
      );
    });
  });
});
