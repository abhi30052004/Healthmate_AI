import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TimelineTrendsView } from "./TimelineTrendsView";
import type { FamilyProfile } from "../../api/client";

const mockProfile: FamilyProfile = {
  id: "prof-1",
  owner_id: "user-1",
  name: "Dr. Abhijit Bhunia",
  relationship: "self",
  is_primary: true,
  is_active: true,
  is_dependent: false,
  consent_status: "authorized",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("Step 8 - Interactive Medical Trends & Accessible Charts", () => {
  it("renders page header, metric selectors, and default glucose trend chart", () => {
    render(<TimelineTrendsView token="test-token" activeProfile={mockProfile} />);

    expect(screen.getByText("Interactive Medical Timeline & Longitudinal Trends")).toBeDefined();
    expect(screen.getByText("Fasting Blood Glucose Longitudinal Trend")).toBeDefined();
    expect(screen.getByRole("img", { name: /trend chart/i })).toBeDefined();
    expect(screen.getByText(/Standard Reference: 70 - 100 mg\/dL/i)).toBeDefined();
  });

  it("switches to accessible Table view when clicking Table button", () => {
    render(<TimelineTrendsView token="test-token" activeProfile={mockProfile} />);

    const tableToggle = screen.getByRole("button", { name: "Table" });
    fireEvent.click(tableToggle);

    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByText("Date of Record")).toBeDefined();
    expect(screen.getByText("Observation Value")).toBeDefined();
    expect(screen.getByText("104")).toBeDefined();
    expect(screen.getByText("Routine Health Check.pdf")).toBeDefined();
  });

  it("switches between metrics when clicking selector buttons", () => {
    render(<TimelineTrendsView token="test-token" activeProfile={mockProfile} />);

    const bpButton = screen.getByRole("button", { name: "Blood Pressure" });
    fireEvent.click(bpButton);

    expect(screen.getByText("Systolic Blood Pressure Trend")).toBeDefined();
    expect(screen.getByText(/Standard Reference: 90 - 120 mmHg/i)).toBeDefined();

    const hba1cButton = screen.getByRole("button", { name: "HbA1c" });
    fireEvent.click(hba1cButton);

    expect(screen.getByText("HbA1c Glycated Hemoglobin Trend")).toBeDefined();
    expect(screen.getByText(/Standard Reference: 4 - 5.7 %/i)).toBeDefined();
  });

  it("renders longitudinal shift comparison cards", () => {
    render(<TimelineTrendsView token="test-token" activeProfile={mockProfile} />);

    expect(screen.getByText("Comparative Insights & Detected Shifts")).toBeDefined();
    expect(screen.getByText("Total Serum Cholesterol")).toBeDefined();
  });
});
