import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardView } from "./DashboardView";
import * as api from "../../api/client";
import { renderWithProviders, testProfile, testUser } from "../../test/utils";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return {
    ...actual,
    getCareOverview: vi.fn(),
    getTimelineTrends: vi.fn(),
    listDocuments: vi.fn(),
    listDoseSlots: vi.fn(),
    logDose: vi.fn(),
    undoDoseLog: vi.fn(),
  };
});

const series = (name: string, points: [string, string, number][]): api.TrendSeries => ({
  normalized_test_name: name,
  category: "chem",
  standard_unit: "mg/dL",
  has_multiple_points: points.length > 1,
  has_converted_units: false,
  points: points.map(([date, value, n], i) => ({
    observation_id: `${name}-${i}`,
    document_id: "d1",
    document_filename: "r.pdf",
    date,
    date_type: "actual",
    value,
    numeric_value: n,
    original_unit: "mg/dL",
    standardized_numeric_value: n,
    is_reviewed: true,
    source_page: 1,
    source_text: "",
  })),
});

const emptyOverview: api.CareOverviewResponse = {
  active_medications_count: 0,
  upcoming_appointments_count: 0,
  pending_follow_ups_count: 0,
  overdue_follow_ups_count: 0,
  upcoming_appointments: [],
  pending_tasks: [],
  active_medications: [],
  disclaimer: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getCareOverview).mockResolvedValue(emptyOverview);
  vi.mocked(api.getTimelineTrends).mockResolvedValue({ series: [] });
  vi.mocked(api.listDocuments).mockResolvedValue([]);
  vi.mocked(api.listDoseSlots).mockResolvedValue([]);
});

describe("DashboardView (real data)", () => {
  it("greets the active profile and shows honest empty states for a new account", async () => {
    renderWithProviders(<DashboardView token="t" user={testUser} activeProfile={testProfile} onNavigateTab={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /Hello, Eva Tester/ })).toBeDefined();
    expect(await screen.findByText("No verified results yet")).toBeDefined();
    expect(screen.getByText("No doses scheduled today.")).toBeDefined();
    expect(screen.getByText("No upcoming appointments.")).toBeDefined();
    expect(screen.getByText("Nothing waiting for review.")).toBeDefined();
    // checklist, not a made-up score: only allergies are filled in on the test profile
    expect(screen.getByTestId("readiness-count").textContent).toBe("1 of 4");
  });

  it("asks every endpoint for the ACTIVE profile only", async () => {
    renderWithProviders(<DashboardView token="t" user={testUser} activeProfile={testProfile} onNavigateTab={vi.fn()} />);
    await screen.findByText("No verified results yet");
    expect(api.getCareOverview).toHaveBeenCalledWith("t", "prof-1");
    expect(api.getTimelineTrends).toHaveBeenCalledWith("t", { profile_id: "prof-1" });
    expect(api.listDocuments).toHaveBeenCalledWith("t", "prof-1");
    expect(vi.mocked(api.listDoseSlots).mock.calls[0][2]).toBe("prof-1");
  });

  it("shows the latest verified values with units and a neutral change description", async () => {
    vi.mocked(api.getTimelineTrends).mockResolvedValue({
      series: [series("Fasting Glucose", [["2026-08-01", "104", 104], ["2026-10-28", "94", 94]])],
    });
    renderWithProviders(<DashboardView token="t" user={testUser} activeProfile={testProfile} onNavigateTab={vi.fn()} />);
    expect(await screen.findByText("Latest verified results")).toBeDefined();
    await waitFor(() => expect(screen.getAllByText("Fasting Glucose").length).toBeGreaterThan(0));
    expect(screen.getAllByText("94").length).toBeGreaterThan(0);
    expect(screen.getByText(/This shows what was recorded, not what it means/i)).toBeDefined();
    expect(screen.queryByText(/dangerous|worsening|improving|normal range/i)).toBeNull();
  });

  it("lets the user record a scheduled dose from the dashboard", async () => {
    const today = new Date();
    const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    vi.mocked(api.listDoseSlots).mockResolvedValue([
      { medication_id: "m1", medication_name: "Metformin", strength: "500 mg", scheduled_date: d, scheduled_time: "23:59", outcome: null },
    ]);
    vi.mocked(api.logDose).mockResolvedValue({});
    renderWithProviders(<DashboardView token="t" user={testUser} activeProfile={testProfile} onNavigateTab={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /I took it/i }));
    await waitFor(() => expect(api.logDose).toHaveBeenCalledWith("t", expect.objectContaining({ medication_id: "m1", outcome: "taken", scheduled_time: "23:59" })));
  });

  it("navigates via the primary actions", async () => {
    const nav = vi.fn();
    renderWithProviders(<DashboardView token="t" user={testUser} activeProfile={testProfile} onNavigateTab={nav} />);
    fireEvent.click(screen.getByRole("button", { name: /Add records/i }));
    expect(nav).toHaveBeenCalledWith("records");
    fireEvent.click(screen.getByRole("button", { name: /Build visit pack/i }));
    expect(nav).toHaveBeenCalledWith("visit-pack");
  });
});
