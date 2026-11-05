import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HealthStatCard } from "./HealthStatCard";
import { Activity } from "lucide-react";

describe("HealthStatCard Component", () => {
  it("renders stat title, value, and subtitle", () => {
    render(
      <HealthStatCard
        title="Uploaded Reports"
        value={12}
        subtitle="Clinical lab panels"
        icon={<Activity data-testid="stat-icon" />}
        iconBg="teal"
      />
    );

    expect(screen.getByText("Uploaded Reports")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("Clinical lab panels")).toBeDefined();
    expect(screen.getByTestId("stat-icon")).toBeDefined();
  });

  it("renders trend indicator when provided", () => {
    render(
      <HealthStatCard
        title="Blood Glucose"
        value="101 mg/dL"
        icon={<Activity />}
        trend={{ value: "-6.5%", direction: "down", label: "vs last test" }}
      />
    );

    expect(screen.getByText("-6.5%")).toBeDefined();
    expect(screen.getByText("vs last test")).toBeDefined();
  });

  it("handles onClick trigger when clicked", () => {
    const handleClick = vi.fn();
    render(
      <HealthStatCard
        title="Interactive Card"
        value="Clickable"
        icon={<Activity />}
        onClick={handleClick}
      />
    );

    const card = screen.getByRole("button");
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

