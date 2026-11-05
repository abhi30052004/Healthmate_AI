import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HealthTrendChart, type DataPoint } from "./HealthTrendChart";

describe("HealthTrendChart Component", () => {
  const mockPoints: DataPoint[] = [
    { date: "2025-01-15", value: 98, unit: "mg/dL", flag: "NORMAL", documentTitle: "Panel 1" },
    { date: "2025-07-20", value: 112, unit: "mg/dL", flag: "HIGH", documentTitle: "Panel 2" },
  ];

  it("renders chart title, category tag, and latest value", () => {
    render(
      <HealthTrendChart
        title="Fasting Blood Glucose"
        dataPoints={mockPoints}
        unit="mg/dL"
        category="Metabolic Panel"
        referenceRange={{ low: 70, high: 99, text: "70 – 99 mg/dL" }}
      />
    );

    expect(screen.getByText("Fasting Blood Glucose")).toBeDefined();
    expect(screen.getByText("Metabolic Panel")).toBeDefined();
    expect(screen.getByText(/112/)).toBeDefined();
    expect(screen.getByText(/70 – 99 mg\/dL/)).toBeDefined();
  });

  it("toggles accessible tabular data view when button is clicked", () => {
    render(
      <HealthTrendChart
        title="Fasting Blood Glucose"
        dataPoints={mockPoints}
        unit="mg/dL"
      />
    );

    const toggleBtn = screen.getByRole("button", { name: "Show Tabular Data" });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByText("Panel 1")).toBeDefined();
    expect(screen.getByText("Panel 2")).toBeDefined();
  });

  it("handles empty data gracefully with helpful notice", () => {
    render(<HealthTrendChart title="Empty Metric" dataPoints={[]} />);
    expect(
      screen.getByText("No numeric trend data recorded yet for this observation.")
    ).toBeDefined();
  });
});

