import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocumentUpload } from "./DocumentUpload";
import * as client from "../api/client";

// Mock useAuth with active session
const mockHandleSessionExpired = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-123",
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

describe("DocumentUpload Component", () => {
  it("renders upload dropzone, formats guidance, and choose file button", () => {
    render(<DocumentUpload onUploadSuccess={vi.fn()} />);

    expect(screen.getByText(/Click to upload/i)).toBeDefined();
    expect(screen.getByText(/Supported formats:/i)).toBeDefined();
    expect(screen.getByText(/10 MB/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Choose File/i })).toBeDefined();
  });

  it("validates and rejects unsupported file extension", async () => {
    render(<DocumentUpload onUploadSuccess={vi.fn()} />);

    const unsupportedFile = new File(["test data"], "report.txt", {
      type: "text/plain",
    });

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [unsupportedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported file format/i)).toBeDefined();
    });
  });

  it("validates and rejects empty file (0 bytes)", async () => {
    render(<DocumentUpload onUploadSuccess={vi.fn()} />);

    const emptyFile = new File([], "empty_report.pdf", {
      type: "application/pdf",
    });

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [emptyFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Selected file is empty \(0 bytes\)/i)).toBeDefined();
    });
  });

  it("validates and rejects oversized file exceeding 10 MB", async () => {
    render(<DocumentUpload onUploadSuccess={vi.fn()} />);

    const oversizedFile = new File(["x".repeat(100)], "huge_report.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversizedFile, "size", {
      value: 11 * 1024 * 1024,
    });

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/File exceeds the 10 MB size limit/i)).toBeDefined();
    });
  });

  it("handles successful file upload, shows progress and success banner", async () => {
    const mockDoc = {
      id: "doc-test-123",
      owner_id: "user-123",
      filename: "blood_test.pdf",
      mime_type: "application/pdf",
      file_size: 2048,
      checksum_sha256: "dummy-sha256-hash",
      processing_status: "extracted",
      is_verified: false,
      created_at: "2026-10-28T10:00:00Z",
    };

    const uploadSpy = vi.spyOn(client, "uploadDocument").mockResolvedValue(mockDoc);
    const onUploadSuccess = vi.fn();

    render(<DocumentUpload onUploadSuccess={onUploadSuccess} />);

    const validFile = new File(["dummy pdf content"], "blood_test.pdf", {
      type: "application/pdf",
    });

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith("valid-test-token", validFile, expect.any(Function));
      expect(onUploadSuccess).toHaveBeenCalledWith(mockDoc);
      expect(
        screen.getByText(/Report "blood_test.pdf" .* uploaded successfully./i)
      ).toBeDefined();
    });
  });

  it("displays error alert and supports retry upon upload failure", async () => {
    const uploadSpy = vi
      .spyOn(client, "uploadDocument")
      .mockRejectedValueOnce(new Error("Server connection timed out."))
      .mockResolvedValueOnce({
        id: "doc-retry-123",
        owner_id: "user-123",
        filename: "retry_report.pdf",
        mime_type: "application/pdf",
        file_size: 1024,
        checksum_sha256: "hash-retry",
        processing_status: "extracted",
        is_verified: false,
        created_at: "2026-10-28T10:00:00Z",
      });

    const onUploadSuccess = vi.fn();
    render(<DocumentUpload onUploadSuccess={onUploadSuccess} />);

    const file = new File(["pdf content"], "retry_report.pdf", {
      type: "application/pdf",
    });

    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Server connection timed out.")).toBeDefined();
      expect(screen.getByRole("button", { name: "Retry Upload" })).toBeDefined();
    });

    // Click retry
    fireEvent.click(screen.getByRole("button", { name: "Retry Upload" }));

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledTimes(2);
      expect(onUploadSuccess).toHaveBeenCalled();
    });
  });
});
