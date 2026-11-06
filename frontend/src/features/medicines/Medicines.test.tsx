import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MedicinesView } from "./MedicinesView";
import { formatClock } from "./useDoses";
import * as api from "../../api/client";
import { renderWithProviders, testProfile } from "../../test/utils";
import { toDateInput } from "../../lib/dates";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return {
    ...actual,
    listMedications: vi.fn(),
    createMedication: vi.fn(),
    updateMedication: vi.fn(),
    deleteMedication: vi.fn(),
    listDoseSlots: vi.fn(),
    logDose: vi.fn(),
    undoDoseLog: vi.fn(),
    getAdherence: vi.fn(),
  };
});

const today = toDateInput(new Date());
const med = (over: Partial<api.MedicationRecord> = {}): api.MedicationRecord => ({
  id: "m1",
  user_id: "u1",
  name: "Metformin",
  strength: "500 mg",
  schedule_times: ["08:00", "20:00"],
  schedule_days: [],
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...over,
});
const slot = (time: string, outcome: api.DoseSlot["outcome"] = null): api.DoseSlot => ({
  medication_id: "m1",
  medication_name: "Metformin",
  strength: "500 mg",
  scheduled_date: today,
  scheduled_time: time,
  outcome,
  log_id: outcome ? `log-${time}` : null,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listMedications).mockResolvedValue([med()]);
  vi.mocked(api.listDoseSlots).mockResolvedValue([slot("08:00"), slot("20:00")]);
  vi.mocked(api.getAdherence).mockResolvedValue({
    days: 7, expected: 14, taken: 10, skipped: 1, missed: 3, taken_percent: 71, per_day: [], note: "",
  });
});

describe("formatClock", () => {
  it("formats HH:MM for display", () => {
    expect(formatClock("08:00")).toMatch(/8:00/);
    expect(formatClock("20:30")).toMatch(/8:30/);
  });
});

describe("MedicinesView (real data)", () => {
  it("shows today's doses for the active profile and the adherence summary", async () => {
    renderWithProviders(<MedicinesView token="t" activeProfile={testProfile} />);
    expect(await screen.findAllByTestId("dose-card")).toHaveLength(2);
    expect(api.listDoseSlots).toHaveBeenCalledWith("t", today, "prof-1");
    expect(api.listMedications).toHaveBeenCalledWith("t", { profile_id: "prof-1" });
    expect((await screen.findByTestId("adherence-line")).textContent).toMatch(/10 taken, 3 not recorded \(71%/);
  });

  it("records a dose as taken with the exact slot and reflects the saved outcome", async () => {
    vi.mocked(api.logDose).mockResolvedValue({});
    renderWithProviders(<MedicinesView token="t" activeProfile={testProfile} />);
    const cards = await screen.findAllByTestId("dose-card");
    vi.mocked(api.listDoseSlots).mockResolvedValue([slot("08:00", "taken"), slot("20:00")]);
    fireEvent.click(within(cards[0]).getByRole("button", { name: /I took it/i }));

    await waitFor(() =>
      expect(api.logDose).toHaveBeenCalledWith("t", {
        medication_id: "m1",
        scheduled_date: today,
        scheduled_time: "08:00",
        outcome: "taken",
      })
    );
    await waitFor(() => expect(screen.getAllByTestId("dose-card")[0].getAttribute("data-status")).toBe("taken"));
  });

  it("undo removes the stored log", async () => {
    vi.mocked(api.listDoseSlots).mockResolvedValue([slot("08:00", "taken")]);
    vi.mocked(api.undoDoseLog).mockResolvedValue(undefined);
    renderWithProviders(<MedicinesView token="t" activeProfile={testProfile} />);
    fireEvent.click(await screen.findByRole("button", { name: /Undo/i }));
    await waitFor(() => expect(api.undoDoseLog).toHaveBeenCalledWith("t", "log-08:00"));
  });

  it("shows an empty state when nothing is scheduled", async () => {
    vi.mocked(api.listDoseSlots).mockResolvedValue([]);
    vi.mocked(api.listMedications).mockResolvedValue([]);
    renderWithProviders(<MedicinesView token="t" activeProfile={testProfile} />);
    expect(await screen.findByText("Nothing scheduled today")).toBeDefined();
  });

  it("add medication: requires a name and sends schedule times scoped to the profile", async () => {
    vi.mocked(api.createMedication).mockResolvedValue(med());
    renderWithProviders(<MedicinesView token="t" activeProfile={testProfile} />);
    await screen.findAllByTestId("dose-card");
    fireEvent.click(screen.getAllByRole("button", { name: /Add medication/i })[0]);

    const dlg = await screen.findByRole("dialog");
    fireEvent.click(within(dlg).getByRole("button", { name: /^Add medication$/i }));
    expect((await within(dlg).findByRole("alert")).textContent).toMatch(/Enter the medication name/i);
    expect(api.createMedication).not.toHaveBeenCalled();

    fireEvent.change(within(dlg).getByLabelText(/Medication name/i), { target: { value: "Amlodipine" } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Twice daily" }));
    fireEvent.click(within(dlg).getByRole("button", { name: /^Add medication$/i }));

    await waitFor(() => expect(api.createMedication).toHaveBeenCalled());
    const payload = vi.mocked(api.createMedication).mock.calls[0][1];
    expect(payload).toMatchObject({
      name: "Amlodipine",
      profile_id: "prof-1",
      schedule_times: ["08:00", "20:00"],
      schedule_days: [],
      frequency: "Twice daily",
    });
  });

  it("rejects an end date before the start date", async () => {
    renderWithProviders(<MedicinesView token="t" activeProfile={testProfile} />);
    await screen.findAllByTestId("dose-card");
    fireEvent.click(screen.getAllByRole("button", { name: /Add medication/i })[0]);
    const dlg = await screen.findByRole("dialog");
    fireEvent.change(within(dlg).getByLabelText(/Medication name/i), { target: { value: "X" } });
    fireEvent.change(within(dlg).getByLabelText("Start date"), { target: { value: "2026-05-10" } });
    fireEvent.change(within(dlg).getByLabelText("End date"), { target: { value: "2026-05-01" } });
    fireEvent.click(within(dlg).getByRole("button", { name: /^Add medication$/i }));
    expect((await within(dlg).findByRole("alert")).textContent).toMatch(/end date can't be before/i);
    expect(api.createMedication).not.toHaveBeenCalled();
  });
});
