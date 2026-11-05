import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocumentList } from "./DocumentList";
import * as client from "../api/client";

// Mock useAuth with active session
const mockHandleSessionExpired = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "doctor@example.com",
      name: "Dr. Smith",
      is_active: true,
      created_at: "2026-10-28T10:00:00Z",
    },
    token: "valid-test-token",
    isLoading: false,
    isInitializing: false,
    sessionError: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    handleSessionExpired: mockHandleSessionExpired,
    clearSessionError: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const mockDocs: client.DocumentItem[] = [
  {
    id: "doc-1",
    owner_id: "user-1",
    filename: "lipid_panel.pdf",
    mime_type: "application/pdf",
    file_size: 4096,
    checksum_sha256: "sha256-lipid",
    processing_status: "extracted",
    is_verified: true,
    created_at: "2026-10-28T09:00:00Z",
  },
  {
    id: "doc-2",
    owner_id: "user-1",
    filename: "thyroid_scan.png",
    mime_type: "image/png",
    file_size: 1024 * 1024,
    checksum_sha256: "sha256-thyroid",
    processing_status: "ocr_required",
    is_verified: false,
    created_at: "2026-10-28T09:30:00Z",
  },
  {
    id: "doc-3",
    owner_id: "user-1",
    filename: "mri_brain.pdf",
    mime_type: "application/pdf",
    file_size: 8192,
    checksum_sha256: "sha256-mri",
    processing_status: "failed",
    error_message: "Corrupt xref stream table.",
    is_verified: false,
    created_at: "2026-10-28T10:00:00Z",
  },
];

function renderDocumentList(props: {
  documents?: client.DocumentItem[];
  loading?: boolean;
  onRefresh?: () => void;
} = {}) {
  const onRefresh = props.onRefresh ?? vi.fn();
  return {
    onRefresh,
    ...render(
      <DocumentList
        documents={props.documents ?? mockDocs}
        loading={props.loading ?? false}
        onRefresh={onRefresh}
      />
    ),
  };
}

describe("DocumentList Component", () => {
  it("renders empty state card when documents array is empty", () => {
    renderDocumentList({ documents: [] });

    expect(screen.getByText("No Documents Uploaded")).toBeDefined();
    expect(
      screen.getByText(/Upload your synthetic medical reports above/i)
    ).toBeDefined();
  });

  it("renders loading state spinner when loading is true", () => {
    renderDocumentList({ loading: true });

    expect(screen.getByText("Loading clinical documents…")).toBeDefined();
  });

  it("renders documents with filenames, sizes, status badges, and action buttons", () => {
    renderDocumentList();

    expect(screen.getByText("lipid_panel.pdf")).toBeDefined();
    expect(screen.getByText("thyroid_scan.png")).toBeDefined();
    expect(screen.getByText("mri_brain.pdf")).toBeDefined();

    // Status badges
    expect(screen.getByText("Verified")).toBeDefined();
    expect(screen.getByText("OCR Required")).toBeDefined();
    expect(screen.getByText("Failed")).toBeDefined();
    expect(screen.getByText("Corrupt xref stream table.")).toBeDefined();

    // Action buttons
    expect(screen.getAllByRole("button", { name: "Review Content" }).length).toBe(3);
    expect(screen.getAllByRole("button", { name: "Download" }).length).toBe(3);
    expect(screen.getAllByRole("button", { name: "Delete" }).length).toBe(3);
  });

  it("initiates secure download when clicking download button", async () => {
    const downloadSpy = vi.spyOn(client, "downloadDocument").mockResolvedValue(undefined);

    renderDocumentList();

    const downloadButtons = screen.getAllByRole("button", { name: "Download" });
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledWith(
        "valid-test-token",
        "doc-1",
        "lipid_panel.pdf"
      );
    });
  });

  it("prompts confirmation dialog before deleting document and honors cancellation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const deleteSpy = vi.spyOn(client, "deleteDocument").mockResolvedValue(undefined);
    const onRefresh = vi.fn();

    renderDocumentList({ onRefresh });

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('Are you sure you want to permanently delete "lipid_panel.pdf"?')
    );
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("deletes document when confirmed and triggers refresh", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteSpy = vi.spyOn(client, "deleteDocument").mockResolvedValue(undefined);
    const onRefresh = vi.fn();

    renderDocumentList({ onRefresh });

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("valid-test-token", "doc-1");
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("opens review modal when clicking Review Content", async () => {
    vi.spyOn(client, "getDocumentText").mockResolvedValue({
      document_id: "doc-1",
      filename: "lipid_panel.pdf",
      processing_status: "extracted",
      page_count: 1,
      extracted_text: "Total Cholesterol: 180 mg/dL",
      is_verified: true,
    });

    renderDocumentList();

    const reviewButtons = screen.getAllByRole("button", { name: "Review Content" });
    fireEvent.click(reviewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Verbatim Report Text")).toBeDefined();
      expect(screen.getByText("Total Cholesterol: 180 mg/dL")).toBeDefined();
    });
  });
});
