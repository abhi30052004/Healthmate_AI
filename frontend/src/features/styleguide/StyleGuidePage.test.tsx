import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import { StyleGuidePage } from "./StyleGuidePage";

describe("StyleGuidePage - Step 1 Design Tokens & Foundations", () => {
  it("renders the design system title and brand heading", () => {
    render(<StyleGuidePage />);
    expect(screen.getByText("HealthMate AI Design System (v4)")).toBeDefined();
    expect(screen.getByText("Design Tokens & UI Foundations")).toBeDefined();
  });

  it("renders all brand color tokens from Section 5", () => {
    render(<StyleGuidePage />);
    const brandSection = screen.getByTestId("token-section-brand");
    expect(brandSection).toBeDefined();

    expect(screen.getByText("--green-900")).toBeDefined();
    expect(screen.getByText("--green-800")).toBeDefined();
    expect(screen.getByText("--green-700")).toBeDefined();
    expect(screen.getByText("--green-600")).toBeDefined();
    expect(screen.getByText("--green-500")).toBeDefined();
    expect(screen.getByText("--green-100")).toBeDefined();
    expect(screen.getByText("--green-50")).toBeDefined();
  });

  it("renders surface neutrals and status states", () => {
    render(<StyleGuidePage />);
    expect(screen.getByText("--bg")).toBeDefined();
    expect(screen.getByText("--surface")).toBeDefined();
    expect(screen.getByText("--border")).toBeDefined();
    expect(screen.getByText("Verified / Success")).toBeDefined();
    expect(screen.getByText("Needs Review")).toBeDefined();
  });

  it("renders tabular figures for clinical vitals", () => {
    render(<StyleGuidePage />);
    expect(screen.getByText("120/80")).toBeDefined();
    expect(screen.getByText("5.6")).toBeDefined();
    expect(screen.getByText("94")).toBeDefined();
  });

  it("toggles Simple Mode (20px body font scale)", () => {
    render(<StyleGuidePage />);
    const toggleBtn = screen.getByRole("button", { name: /Simple Mode: OFF/i });
    expect(toggleBtn).toBeDefined();

    fireEvent.click(toggleBtn);
    expect(document.body.classList.contains("mode-simple")).toBe(true);
    expect(screen.getByRole("button", { name: /Simple Mode: ON/i })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Simple Mode: ON/i }));
    expect(document.body.classList.contains("mode-simple")).toBe(false);
  });
});
