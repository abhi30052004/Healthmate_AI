import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SymptomsJournalView } from "./SymptomsJournalView";
import * as api from "../../api/client";
import { renderWithProviders, testProfile } from "../../test/utils";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return { ...actual, listSymptoms: vi.fn(), createSymptom: vi.fn(), updateSymptom: vi.fn(), deleteSymptom: vi.fn() };
});

const entry = (over: Partial<api.SymptomEntryItem> = {}): api.SymptomEntryItem => ({
  id: "s1",
  title: "Dizziness on standing",
  severity: "mild",
  notes: "After waking",
  occurred_at: "2026-11-01T08:30:00Z",
  include_in_visit_pack: true,
  profile_id: "prof-1",
  created_at: "2026-11-01T08:31:00Z",
  updated_at: "2026-11-01T08:31:00Z",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listSymptoms).mockResolvedValue([entry()]);
});

describe("SymptomsJournalView (real data)", () => {
  it("lists entries for the active profile", async () => {
    renderWithProviders(<SymptomsJournalView token="t" activeProfile={testProfile} />);
    expect(await screen.findByText("Dizziness on standing")).toBeDefined();
    expect(api.listSymptoms).toHaveBeenCalledWith("t", "prof-1");
  });

  it("requires a description and blocks future times", async () => {
    renderWithProviders(<SymptomsJournalView token="t" activeProfile={testProfile} />);
    await screen.findByText("Dizziness on standing");
    fireEvent.click(screen.getByRole("button", { name: /Save entry/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Describe what you/i);

    fireEvent.change(screen.getByLabelText(/What did you notice/i), { target: { value: "Cough" } });
    const future = new Date(Date.now() + 2 * 86_400_000);
    const iso = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: iso } });
    fireEvent.click(screen.getByRole("button", { name: /Save entry/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/can't be in the future/i);
    expect(api.createSymptom).not.toHaveBeenCalled();
  });

  it("creates an entry with severity, an ISO time and the profile id", async () => {
    vi.mocked(api.createSymptom).mockResolvedValue(entry({ id: "s2", title: "Cough" }));
    renderWithProviders(<SymptomsJournalView token="t" activeProfile={testProfile} />);
    await screen.findByText("Dizziness on standing");
    fireEvent.change(screen.getByLabelText(/What did you notice/i), { target: { value: "Cough" } });
    fireEvent.click(screen.getByRole("radio", { name: "moderate" }));
    fireEvent.click(screen.getByRole("button", { name: /Save entry/i }));
    await waitFor(() => expect(api.createSymptom).toHaveBeenCalled());
    const body = vi.mocked(api.createSymptom).mock.calls[0][1];
    expect(body).toMatchObject({ title: "Cough", severity: "moderate", profile_id: "prof-1", include_in_visit_pack: true });
    expect(() => new Date(body.occurred_at).toISOString()).not.toThrow();
  });

  it("toggles visit-pack inclusion through the API", async () => {
    vi.mocked(api.updateSymptom).mockResolvedValue(entry({ include_in_visit_pack: false }));
    renderWithProviders(<SymptomsJournalView token="t" activeProfile={testProfile} />);
    fireEvent.click(await screen.findByRole("button", { name: /In visit pack/i }));
    await waitFor(() => expect(api.updateSymptom).toHaveBeenCalledWith("t", "s1", { include_in_visit_pack: false }));
  });

  it("empty state for a profile with no entries", async () => {
    vi.mocked(api.listSymptoms).mockResolvedValue([]);
    renderWithProviders(<SymptomsJournalView token="t" activeProfile={testProfile} />);
    expect(await screen.findByText("No entries yet")).toBeDefined();
  });
});
