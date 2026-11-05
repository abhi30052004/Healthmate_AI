import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ObservationTable, type ObservationRow } from "./ObservationTable";

describe("ObservationTable Component", () => {
  const mockObservations: ObservationRow[] = [
    {
      id: "1",
      testName: "Fasting Blood Glucose",
      category: "Metabolic",
      value: 101,
      unit: "mg/dL",
      referenceRangeText: "70 – 99 mg/dL",
      classification: "above_reference",
      laboratoryFlag: "HIGH",
      isVerified: true,
      testDate: "2026-01-14",
    },
    {
      id: "2",
      testName: "Hemoglobin",
      category: "Hematology",
      value: 14.5,
      unit: "g/dL",
      referenceRangeText: "13.5 – 17.5 g/dL",
      classification: "within_reference",
      laboratoryFlag: "NORMAL",
      isVerified: false,
      testDate: "2026-01-14",
    },
  ];

  it("renders observations table with test names and reference range badges", () => {
    render(<ObservationTable observations={mockObservations} />);

    expect(screen.getByText("Fasting Blood Glucose")).toBeDefined();
    expect(screen.getByText("Hemoglobin")).toBeDefined();
    expect(screen.getByText("Above Reference")).toBeDefined();
    expect(screen.getByText("Within Reference")).toBeDefined();
    expect(screen.getByText("Verified")).toBeDefined();
    expect(screen.getByText("Extracted")).toBeDefined();
  });

  it("filters observations using status filter pill", () => {
    render(<ObservationTable observations={mockObservations} />);

    const abnormalBtn = screen.getByRole("button", { name: "Flagged / Out of Range" });
    fireEvent.click(abnormalBtn);

    expect(screen.getByText("Fasting Blood Glucose")).toBeDefined();
    expect(screen.queryByText("Hemoglobin")).toBeNull();
  });

  it("filters observations via search text input", () => {
    render(<ObservationTable observations={mockObservations} />);

    const searchInput = screen.getByLabelText("Filter observations");
    fireEvent.change(searchInput, { target: { value: "Hemoglobin" } });

    expect(screen.queryByText("Fasting Blood Glucose")).toBeNull();
    expect(screen.getByText("Hemoglobin")).toBeDefined();
  });
});

