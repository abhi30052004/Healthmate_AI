import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TimelineTrendsView, parseReferenceRange } from "./TimelineTrendsView";
import * as api from "../../api/client";
import { renderWithProviders, testProfile } from "../../test/utils";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return { ...actual, getTimelineTrends: vi.fn(), getTimeline: vi.fn() };
});

const pt = (date: string, value: string, n: number, range: string | null = "70 - 99"): api.TrendPoint => ({
  observation_id: date,
  document_id: "d1",
  document_filename: `report-${date}.pdf`,
  date,
  date_type: "actual",
  value,
  numeric_value: n,
  original_unit: "mg/dL",
  standardized_numeric_value: n,
  reference_range: range,
  is_reviewed: true,
  source_page: 1,
  source_text: "",
});

const glucose: api.TrendSeries = {
  normalized_test_name: "Fasting Glucose",
  category: "chem",
  standard_unit: "mg/dL",
  has_multiple_points: true,
  has_converted_units: false,
  points: [pt("2026-01-15", "104", 104), pt("2026-10-28", "94", 94)],
};
const hba1c: api.TrendSeries = {
  normalized_test_name: "HbA1c",
  category: "chem",
  standard_unit: "%",
  has_multiple_points: false,
  has_converted_units: false,
  points: [{ ...pt("2026-10-28", "6.8", 6.8, null), original_unit: "%" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getTimelineTrends).mockResolvedValue({ series: [glucose, hba1c] });
  vi.mocked(api.getTimeline).mockResolvedValue({
    total: 1, limit: 100, offset: 0,
    items: [{
      id: "i1", document_id: "d1", document_filename: "report-2026-10-28.pdf", clinical_date: "2026-10-28", date_type: "actual",
      original_test_name: "Fasting Glucose", normalized_test_name: "Fasting Glucose", category: "chem", value: "94", unit: "mg/dL",
      reference_range: "70 - 99", source_page: 1, source_text: "", is_reviewed: true, is_low_confidence: false, created_at: "",
    }],
  });
});

describe("parseReferenceRange", () => {
  it("reads numeric ranges and refuses anything it would have to guess", () => {
    expect(parseReferenceRange("70 - 99")).toEqual({ min: 70, max: 99 });
    expect(parseReferenceRange("4.0 – 5.6 %")).toEqual({ min: 4, max: 5.6 });
    expect(parseReferenceRange("70 to 99 mg/dL")).toEqual({ min: 70, max: 99 });
    expect(parseReferenceRange("< 5.7")).toBeNull();
    expect(parseReferenceRange("Negative")).toBeNull();
    expect(parseReferenceRange(null)).toBeNull();
    expect(parseReferenceRange("99 - 70")).toBeNull();
  });
});

describe("TimelineTrendsView (real data)", () => {
  it("charts the selected test and lists every result with its source", async () => {
    renderWithProviders(<TimelineTrendsView token="t" activeProfile={testProfile} />);
    expect(await screen.findByRole("button", { name: /Fasting Glucose/ })).toBeDefined();
    expect(api.getTimelineTrends).toHaveBeenCalledWith("t", { profile_id: "prof-1", include_unverified: false });
    expect(screen.getByRole("img", { name: /trend chart/i })).toBeDefined();
    expect(await screen.findByText("report-2026-10-28.pdf")).toBeDefined();
    expect(screen.getByText("Verified")).toBeDefined();
  });

  it("switches test and states when no reference range was printed", async () => {
    renderWithProviders(<TimelineTrendsView token="t" activeProfile={testProfile} />);
    fireEvent.click(await screen.findByRole("button", { name: /HbA1c/ }));
    expect(await screen.findByText(/No numeric reference range was printed/i)).toBeDefined();
  });

  it("can include unverified values, labelled as such", async () => {
    renderWithProviders(<TimelineTrendsView token="t" activeProfile={testProfile} />);
    await screen.findByRole("button", { name: /Fasting Glucose/ });
    fireEvent.click(screen.getByLabelText(/Include unverified values/i));
    await waitFor(() => expect(api.getTimelineTrends).toHaveBeenLastCalledWith("t", { profile_id: "prof-1", include_unverified: true }));
  });

  it("explains how to get started when there is nothing to chart", async () => {
    vi.mocked(api.getTimelineTrends).mockResolvedValue({ series: [] });
    vi.mocked(api.getTimeline).mockResolvedValue({ items: [], total: 0, limit: 100, offset: 0 });
    renderWithProviders(<TimelineTrendsView token="t" activeProfile={testProfile} />);
    expect(await screen.findByText("No results to chart yet")).toBeDefined();
  });

  it("surfaces API errors with a retry", async () => {
    vi.mocked(api.getTimelineTrends).mockRejectedValue(new api.ApiError(500, "server down"));
    renderWithProviders(<TimelineTrendsView token="t" activeProfile={testProfile} />);
    expect(await screen.findByText("Couldn't load your trends")).toBeDefined();
    expect(screen.getByText("server down")).toBeDefined();
  });
});
