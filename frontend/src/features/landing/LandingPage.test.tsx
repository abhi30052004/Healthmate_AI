import React from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LandingPageView } from "./LandingPageView";

describe("Landing page", () => {
  it("renders the navigation, hero, trust points and wires the call-to-action buttons", () => {
    const onGetStarted = vi.fn();
    const onLogin = vi.fn();
    render(<LandingPageView onGetStarted={onGetStarted} onLogin={onLogin} />);

    expect(screen.getByRole("link", { name: /HealthMate AI home/i })).toBeDefined();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Your family’s health, finally in one place/i);
    expect(screen.getByText(/Every screen shown on this page uses synthetic sample data/i)).toBeDefined();
    expect(screen.getByText("Private by default")).toBeDefined();
    expect(screen.getByText("You verify every value")).toBeDefined();
    expect(screen.getByText("Time-limited QR links")).toBeDefined();
    expect(screen.getByTestId("hero-scene")).toBeDefined();

    fireEvent.click(screen.getAllByRole("button", { name: /Get started free/i })[0]);
    expect(onGetStarted).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByRole("button", { name: /^Log in$/i })[0]);
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("covers every product area without claiming things the app does not do", () => {
    render(<LandingPageView />);
    for (const name of [/Upload once/i, /See what is changing/i, /Never miss a dose/i, /Ask your records/i, /Share with your doctor in 30 seconds/i]) {
      expect(screen.getByRole("heading", { name })).toBeDefined();
    }
    for (const t of ["Family profiles", "Emergency card", "Doctor visit pack", "Symptom diary", "Appointments & checklists"]) {
      expect(screen.getByRole("heading", { name: t })).toBeDefined();
    }
    // claims that were removed because the product cannot back them up
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/PIN-protected/i);
    expect(text).not.toMatch(/Telegram/i);
    expect(text).not.toMatch(/HIPAA/i);
    expect(text).toMatch(/never diagnoses or prescribes/i);
  });

  it("family switcher, dose tracker and trend range respond to interaction", async () => {
    render(<LandingPageView />);

    const family = screen.getByTestId("family-demo");
    fireEvent.click(within(family).getByRole("tab", { name: /Meera/ }));
    await waitFor(() => expect(family.textContent).toContain("Type 2 diabetes"));

    const dose = screen.getByTestId("dose-demo");
    expect(dose.textContent).toContain("1/4");
    fireEvent.click(within(dose).getByRole("button", { name: /Vitamin D3/ }));
    expect(dose.textContent).toContain("2/4");

    const trend = screen.getByTestId("trend-demo");
    fireEvent.click(within(trend).getByRole("button", { name: "3M" }));
    expect(within(trend).getByRole("button", { name: "3M" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(trend).getByRole("button", { name: /Show chart data as a table/i }));
    expect(within(trend).getByRole("table")).toBeDefined();
  });

  it("QR demo can revoke and recreate the sample link", () => {
    render(<LandingPageView />);
    const qr = screen.getByTestId("qr-demo");
    fireEvent.click(within(qr).getByRole("button", { name: "Revoke link" }));
    expect(qr.textContent).toContain("Link revoked");
    fireEvent.click(within(qr).getByRole("button", { name: /Create a new link/i }));
    expect(qr.textContent).not.toContain("Link revoked");
  });

  it("FAQ opens one answer at a time", () => {
    render(<LandingPageView />);
    const q = screen.getByRole("button", { name: /Does HealthMate AI diagnose diseases or prescribe medicine\?/i });
    expect(q.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(q);
    expect(q.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/strictly explains what is already in your records/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Is HealthMate AI free to use\?/i }).getAttribute("aria-expanded")).toBe("false");
  });

  it("shows the safety statement in the footer", () => {
    render(<LandingPageView />);
    expect(screen.getAllByText(/explains records and supports doctor conversations\. It never diagnoses or prescribes\./i).length).toBeGreaterThanOrEqual(1);
  });
});
