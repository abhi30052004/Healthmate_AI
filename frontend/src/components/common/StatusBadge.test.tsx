import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge Component", () => {
  it("renders with correct label and success variant", () => {
    render(<StatusBadge variant="success" text="Normal" />);
    expect(screen.getByText("Normal")).toBeDefined();
    const badge = screen.getByTitle("Normal");
    expect(badge.className).toContain("hm-badge-success");
  });

  it("renders verified status with icon and correct styling", () => {
    render(<StatusBadge variant="verified" text="Clinician Verified" />);
    expect(screen.getByText("Clinician Verified")).toBeDefined();
    const badge = screen.getByTitle("Clinician Verified");
    expect(badge.className).toContain("hm-badge-verified");
  });

  it("renders pulse dot when pulse prop is provided", () => {
    const { container } = render(<StatusBadge variant="pending" text="Analyzing" pulse />);
    expect(container.querySelector(".hm-badge-dot")).toBeDefined();
  });
});

