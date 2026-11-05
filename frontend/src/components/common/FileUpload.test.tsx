import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileUpload } from "./FileUpload";

describe("FileUpload Component", () => {
  it("renders dropzone instructions and target profile hint", () => {
    render(<FileUpload onFileSelect={vi.fn()} profileName="Abhijit Bhunia" />);

    expect(screen.getByText(/Drag & drop medical report or/i)).toBeDefined();
    expect(screen.getByText("Abhijit Bhunia")).toBeDefined();
  });

  it("validates file size limit and displays error message", () => {
    const handleSelect = vi.fn();
    render(<FileUpload onFileSelect={handleSelect} maxSizeBytes={1024} />);

    const oversizedFile = new File(["a".repeat(2048)], "large_report.pdf", {
      type: "application/pdf",
    });

    const dropzone = screen.getByLabelText("Upload medical document");
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [oversizedFile] },
    });

    expect(screen.getByText(/File size exceeds/i)).toBeDefined();
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it("accepts valid PDF file and triggers onFileSelect callback", () => {
    const handleSelect = vi.fn();
    render(<FileUpload onFileSelect={handleSelect} />);

    const validFile = new File(["test-content"], "blood_test.pdf", {
      type: "application/pdf",
    });

    const dropzone = screen.getByLabelText("Upload medical document");
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [validFile] },
    });

    expect(handleSelect).toHaveBeenCalledWith(validFile);
    expect(screen.getByText("blood_test.pdf")).toBeDefined();
  });
});

