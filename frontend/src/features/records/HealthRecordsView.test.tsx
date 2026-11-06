import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HealthRecordsView, documentUiState } from "./HealthRecordsView";
import * as api from "../../api/client";
import type { DocumentItem } from "../../api/client";
import { renderWithProviders, testProfile } from "../../test/utils";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return {
    ...actual,
    listDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
    verifyDocument: vi.fn(),
    getDocumentText: vi.fn(),
    fetchDocumentBlob: vi.fn(),
    createManualEntry: vi.fn(),
    updateObservation: vi.fn(),
    deleteObservation: vi.fn(),
    addObservation: vi.fn(),
  };
});

const obs = (over = {}) => ({
  id: "o1",
  document_id: "d2",
  owner_id: "u1",
  test_name: "Fasting Glucose",
  value: "118",
  numeric_value: 118,
  unit: "mg/dL",
  reference_range: "70 - 99",
  flag: "HIGH",
  source_page: 1,
  source_text: "Glucose 118",
  is_low_confidence: false,
  is_reviewed: false,
  created_at: "2026-10-01T00:00:00Z",
  ...over,
});

const verifiedDoc: DocumentItem = {
  id: "d1",
  owner_id: "u1",
  profile_id: "prof-1",
  filename: "Blood_Chemistry_Panel.pdf",
  mime_type: "application/pdf",
  file_size: 1048576,
  checksum_sha256: "a",
  processing_status: "completed",
  is_verified: true,
  document_date: "2026-10-28",
  created_at: "2026-10-28T10:00:00Z",
  observations: [obs({ id: "o0", document_id: "d1", is_reviewed: true })],
};
const reviewDoc: DocumentItem = {
  ...verifiedDoc,
  id: "d2",
  filename: "Lipid_Profile.pdf",
  processing_status: "extracted",
  is_verified: false,
  observations: [obs()],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getDocumentText).mockResolvedValue({
    document_id: "d2",
    filename: "Lipid_Profile.pdf",
    processing_status: "extracted",
    extracted_text: "Glucose 118 mg/dL",
    is_verified: false,
  });
  vi.mocked(api.fetchDocumentBlob).mockResolvedValue(new Blob(["x"], { type: "application/pdf" }));
  (URL as any).createObjectURL = vi.fn(() => "blob:preview");
  (URL as any).revokeObjectURL = vi.fn();
});

describe("documentUiState", () => {
  it("treats is_verified as the source of truth, not the processing status", () => {
    expect(documentUiState({ ...verifiedDoc, processing_status: "extracted" })).toBe("verified");
    expect(documentUiState({ ...reviewDoc, processing_status: "completed" })).toBe("needs_review");
    expect(documentUiState({ ...reviewDoc, processing_status: "processing" })).toBe("processing");
    expect(documentUiState({ ...reviewDoc, processing_status: "failed" })).toBe("failed");
  });
});

describe("HealthRecordsView (real data)", () => {
  it("lists the active profile's documents from the API with the right status", async () => {
    vi.mocked(api.listDocuments).mockResolvedValue([verifiedDoc, reviewDoc]);
    renderWithProviders(<HealthRecordsView token="t" activeProfile={testProfile} />);

    expect(await screen.findByText("Blood_Chemistry_Panel.pdf")).toBeDefined();
    expect(screen.getByText("Lipid_Profile.pdf")).toBeDefined();
    expect(api.listDocuments).toHaveBeenCalledWith("t", "prof-1");
    expect(screen.getByRole("button", { name: "Review results" })).toBeDefined();
    expect(screen.getByRole("button", { name: "View record" })).toBeDefined();
  });

  it("shows an empty state, and an error state with retry", async () => {
    vi.mocked(api.listDocuments).mockResolvedValueOnce([]);
    const { unmount } = renderWithProviders(<HealthRecordsView token="t" activeProfile={testProfile} />);
    expect(await screen.findByText("No records yet")).toBeDefined();
    unmount();

    vi.mocked(api.listDocuments).mockRejectedValueOnce(new api.ApiError(500, "boom"));
    renderWithProviders(<HealthRecordsView token="t" activeProfile={testProfile} />);
    expect(await screen.findByText("Couldn't load records")).toBeDefined();
    expect(screen.getByText("boom")).toBeDefined();
  });

  it("filters by search text", async () => {
    vi.mocked(api.listDocuments).mockResolvedValue([verifiedDoc, reviewDoc]);
    renderWithProviders(<HealthRecordsView token="t" activeProfile={testProfile} />);
    await screen.findByText("Lipid_Profile.pdf");
    fireEvent.change(screen.getByLabelText("Search records"), { target: { value: "lipid" } });
    expect(screen.queryByText("Blood_Chemistry_Panel.pdf")).toBeNull();
    expect(screen.getByText("Lipid_Profile.pdf")).toBeDefined();
  });

  it("reviews extracted values and confirms them via the verify endpoint", async () => {
    vi.mocked(api.listDocuments).mockResolvedValue([reviewDoc]);
    vi.mocked(api.verifyDocument).mockResolvedValue({ document_id: "d2", is_verified: true, verified_at: "now", observations_verified_count: 1 } as any);
    renderWithProviders(<HealthRecordsView token="t" activeProfile={testProfile} />);

    fireEvent.click(await screen.findByRole("button", { name: "Review results" }));
    const panel = await screen.findByRole("dialog", { name: /Review extracted results/i });
    expect(within(panel).getByText("Fasting Glucose")).toBeDefined();
    expect(within(panel).getByText("Above range on report")).toBeDefined();

    fireEvent.click(within(panel).getByRole("button", { name: /Confirm & save as verified/i }));
    await waitFor(() => expect(api.verifyDocument).toHaveBeenCalledWith("t", "d2"));
  });

  it("saves a correction through the API instead of only changing local state", async () => {
    vi.mocked(api.listDocuments).mockResolvedValue([reviewDoc]);
    vi.mocked(api.updateObservation).mockResolvedValue(obs({ value: "108", is_reviewed: true }) as any);
    renderWithProviders(<HealthRecordsView token="t" activeProfile={testProfile} />);

    fireEvent.click(await screen.findByRole("button", { name: "Review results" }));
    const panel = await screen.findByRole("dialog", { name: /Review extracted results/i });
    fireEvent.click(within(panel).getByRole("button", { name: "Edit Fasting Glucose" }));
    fireEvent.change(within(panel).getByLabelText("Value"), { target: { value: "108" } });
    fireEvent.click(within(panel).getByRole("button", { name: /Save correction/i }));

    await waitFor(() =>
      expect(api.updateObservation).toHaveBeenCalledWith("t", "d2", "o1", expect.objectContaining({ value: "108", test_name: "Fasting Glucose" }))
    );
    expect(await within(panel).findByText("108")).toBeDefined();
  });

  it("removing a result needs a second confirming click, then calls delete", async () => {
    vi.mocked(api.listDocuments).mockResolvedValue([reviewDoc]);
    vi.mocked(api.deleteObservation).mockResolvedValue(undefined);
    renderWithProviders(<HealthRecordsView token="t" activeProfile={testProfile} />);
    fireEvent.click(await screen.findByRole("button", { name: "Review results" }));
    const panel = await screen.findByRole("dialog", { name: /Review extracted results/i });

    fireEvent.click(within(panel).getByRole("button", { name: "Remove Fasting Glucose" }));
    expect(api.deleteObservation).not.toHaveBeenCalled();
    fireEvent.click(within(panel).getByRole("button", { name: "Confirm remove" }));
    await waitFor(() => expect(api.deleteObservation).toHaveBeenCalledWith("t", "d2", "o1"));
  });

  it("manual entry: rejects empty input, then posts a profile-scoped entry", async () => {
    vi.mocked(api.listDocuments).mockResolvedValue([]);
    vi.mocked(api.createManualEntry).mockResolvedValue({ ...verifiedDoc } as any);
    renderWithProviders(<HealthRecordsView token="t" activeProfile={testProfile} />);
    fireEvent.click(await screen.findAllByRole("button", { name: /Add results manually/i }).then((b) => b[0]));

    const dlg = await screen.findByRole("dialog");
    fireEvent.click(within(dlg).getByRole("button", { name: /Save results/i }));
    expect((await within(dlg).findByRole("alert")).textContent).toMatch(/needs both a name and a value/i);
    expect(api.createManualEntry).not.toHaveBeenCalled();

    const values = within(dlg).getAllByLabelText("Value");
    fireEvent.change(values[0], { target: { value: "128" } });
    fireEvent.change(values[1], { target: { value: "82" } });
    fireEvent.click(within(dlg).getByRole("button", { name: /Save results/i }));

    await waitFor(() => expect(api.createManualEntry).toHaveBeenCalledTimes(1));
    const [, payload] = vi.mocked(api.createManualEntry).mock.calls[0];
    expect(payload.profile_id).toBe("prof-1");
    expect(payload.entry_type).toBe("vital");
    expect(payload.entry_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.observations.map((o) => o.value)).toEqual(["128", "82"]);
    expect(payload.observations[0].unit).toBe("mmHg");
  });

  it("uploads a chosen file for the active profile", async () => {
    vi.mocked(api.listDocuments).mockResolvedValue([]);
    vi.mocked(api.uploadDocument).mockResolvedValue({ ...reviewDoc } as any);
    const { container } = renderWithProviders(<HealthRecordsView token="t" activeProfile={testProfile} />);
    await screen.findByText("No records yet");
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "scan.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(api.uploadDocument).toHaveBeenCalled());
    expect(vi.mocked(api.uploadDocument).mock.calls[0][1]).toBe(file);
    expect(vi.mocked(api.uploadDocument).mock.calls[0][3]).toBe("prof-1");
  });
});
