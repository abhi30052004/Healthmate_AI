import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LandingPageView } from "./LandingPageView";

describe("Step 12 - Public Landing Page (All 15 Sections)", () => {
  it("renders navbar, hero, trust strip, and triggers onGetStarted", () => {
    const onGetStarted = vi.fn();
    const onLogin = vi.fn();

    render(<LandingPageView onGetStarted={onGetStarted} onLogin={onLogin} />);

    // 1. Navbar
    expect(screen.getByText("HealthMate")).toBeDefined();
    expect(screen.getByRole("button", { name: /Log in/i })).toBeDefined();

    // 2. Hero
    expect(screen.getByText(/One place for your family’s health records/i)).toBeDefined();
    expect(screen.getByText(/Demo uses synthetic data/i)).toBeDefined();

    // 3. Trust strip
    expect(screen.getByText("Private by Default")).toBeDefined();
    expect(screen.getByText("You Verify Extracted Data")).toBeDefined();
    expect(screen.getByText("Time-Limited QR Sharing")).toBeDefined();

    // Trigger CTA
    const getStartedButtons = screen.getAllByRole("button", { name: /Get started free/i });
    fireEvent.click(getStartedButtons[0]);
    expect(onGetStarted).toHaveBeenCalled();
  });

  it("renders problem/solution, how it works, and bento grid", () => {
    render(<LandingPageView />);

    // 4. Problem -> Solution
    expect(screen.getByText(/Stop carrying disorganized medical paperwork/i)).toBeDefined();
    expect(screen.getByText(/The Painful Medical Paper Trail/i)).toBeDefined();
    expect(screen.getByText(/The HealthMate Unified Timeline/i)).toBeDefined();

    // 5. How it works
    expect(screen.getByText("How HealthMate works in 4 simple steps")).toBeDefined();
    expect(screen.getByText("Upload or Scan")).toBeDefined();
    expect(screen.getByText("Review Extracted Data")).toBeDefined();
    expect(screen.getByText("Track Trends & Doses")).toBeDefined();
    expect(screen.getByText("Share with Your Doctor")).toBeDefined();

    // 6. Feature bento grid
    expect(screen.getByText("Records & OCR")).toBeDefined();
    expect(screen.getByText("Trend Graphs")).toBeDefined();
    expect(screen.getByText("Medicine Schedules")).toBeDefined();
    expect(screen.getByText("Doctor Visit Pack")).toBeDefined();
    expect(screen.getByText("Family & Caregivers")).toBeDefined();
    expect(screen.getByText("Emergency Card")).toBeDefined();
  });

  it("interacts with trends demo range selector and toggles FAQ accordion", () => {
    render(<LandingPageView />);

    // 7. Trends Demo
    expect(screen.getByText(/Systolic Blood Pressure \(Synthetic Demo\)/i)).toBeDefined();
    const range3M = screen.getByRole("button", { name: "3M" });
    fireEvent.click(range3M);
    expect(screen.getByText(/Systolic Blood Pressure/i)).toBeDefined();

    // 8. Doctor QR
    expect(screen.getByText("Share with your doctor in 30 seconds by QR")).toBeDefined();

    // 9. Family
    expect(screen.getByText("Caring for aging parents and children")).toBeDefined();

    // 10. AI Assistant preview
    expect(screen.getByText("Ask questions about your records safely")).toBeDefined();
    expect(screen.getByText(/What was my latest HbA1c result\?/i)).toBeDefined();

    // 11. Privacy & safety
    expect(screen.getByText("You Own Your Data")).toBeDefined();

    // 12. Languages
    expect(screen.getByRole("button", { name: /বাংলা \(Bengali\)/i })).toBeDefined();

    // 13. FAQ
    const faqButton = screen.getByText("Does HealthMate AI diagnose diseases or prescribe medicine?");
    fireEvent.click(faqButton);
    expect(screen.getByText(/HealthMate AI strictly explains patient records/i)).toBeDefined();

    // 14. Final CTA
    expect(screen.getByText("Start organising your family’s health today.")).toBeDefined();

    // 15. Footer safety statement
    expect(
      screen.getAllByText(
        /HealthMate AI explains records and supports doctor conversations\. It never diagnoses or prescribes\./i
      ).length
    ).toBeGreaterThanOrEqual(1);
  });
});

