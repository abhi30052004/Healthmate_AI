import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DoctorVisitPackView } from "./DoctorVisitPackView";
import * as api from "../../api/client";
import { renderWithProviders, testProfile } from "../../test/utils";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return { ...actual, generateVisitPackDraft: vi.fn(), exportVisitPackPdf: vi.fn(), listSymptoms: vi.fn() };
});

const pack: api.DoctorVisitPackData = {
  patient_name: "Eva Tester", patient_email: "x", generated_at: "2026-11-05T00:00:00Z", include_unverified: false,
  categories: [], documents: [], trends: [], appointments: [], follow_up_tasks: [], disclaimer: "Backend disclaimer text.",
  medications: [{ id: "m1", name: "Metformin", strength: "500 mg", status: "active", included: true }],
  observations: [{
    observation_id: "o1", document_id: "d1", document_title: "r.pdf", test_name: "Fasting Glucose", category: "chem",
    value: "94", unit: "mg/dL", reference_range: "70 - 99", clinical_date: "2026-10-28", is_verified: true, included: true,
  }],
  clinician_questions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.generateVisitPackDraft).mockResolvedValue(pack);
  vi.mocked(api.listSymptoms).mockResolvedValue([
    { id: "s1", title: "Dizziness", severity: "mild", notes: null, occurred_at: new Date().toISOString(), include_in_visit_pack: true, created_at: "", updated_at: "" },
    { id: "s2", title: "Private note", severity: "mild", notes: null, occurred_at: new Date().toISOString(), include_in_visit_pack: false, created_at: "", updated_at: "" },
  ]);
});

describe("DoctorVisitPackView (real data)", () => {
  it("builds the preview from the profile's records and only the symptoms marked for the pack", async () => {
    renderWithProviders(<DoctorVisitPackView token="t" activeProfile={testProfile} />);
    const preview = await screen.findByTestId("visit-pack-preview");
    expect(await within(preview).findByText("Metformin")).toBeDefined();
    expect(within(preview).getByText("Fasting Glucose")).toBeDefined();
    expect(await within(preview).findByText("Dizziness")).toBeDefined();
    expect(within(preview).queryByText("Private note")).toBeNull();
    expect(api.generateVisitPackDraft).toHaveBeenCalledWith("t", expect.objectContaining({ profile_id: "prof-1", include_unverified: false }));
    expect(within(preview).getByText("Backend disclaimer text.")).toBeDefined();
  });

  it("excluding a row marks it not-included in the exported PDF payload", async () => {
    vi.mocked(api.exportVisitPackPdf).mockResolvedValue(new Blob(["pdf"]));
    (URL as any).createObjectURL = vi.fn(() => "blob:x");
    (URL as any).revokeObjectURL = vi.fn();
    renderWithProviders(<DoctorVisitPackView token="t" activeProfile={testProfile} />);
    const preview = await screen.findByTestId("visit-pack-preview");
    await within(preview).findByText("Fasting Glucose");

    const row = within(preview).getByText("Fasting Glucose").closest("tr")!;
    fireEvent.click(within(row).getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Add a question"), { target: { value: "Any follow-up needed?" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Download PDF/i }));

    await waitFor(() => expect(api.exportVisitPackPdf).toHaveBeenCalled());
    const sent = vi.mocked(api.exportVisitPackPdf).mock.calls[0][1];
    expect(sent.observations[0].included).toBe(false);
    expect(sent.medications[0].included).toBe(true);
    expect(sent.clinician_questions[0]).toMatchObject({ question: "Any follow-up needed?", included: true });
    expect(sent.patient_notes).toMatch(/Dizziness/);
    expect(sent.patient_notes).not.toMatch(/Private note/);
  });
});
