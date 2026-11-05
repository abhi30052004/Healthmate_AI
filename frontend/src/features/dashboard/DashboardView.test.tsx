import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DashboardView } from "./DashboardView";
import type { FamilyProfile, User } from "../../api/client";

const mockUser: User = {
  id: "user-1",
  email: "dr.abhijit@example.com",
  name: "Dr. Abhijit Bhunia",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

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

describe("Step 6 - Rebuilt Clinical Dashboard", () => {
  it("renders personalized patient greeting and top action buttons", () => {
    const handleNavigate = vi.fn();
    render(
      <DashboardView
        user={mockUser}
        activeProfile={mockProfile}
        onNavigateTab={handleNavigate}
      />
    );

    expect(screen.getByText(/Good day, Dr. Abhijit Bhunia/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Upload Report/i })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Upload Report/i }));
    expect(handleNavigate).toHaveBeenCalledWith("records");
  });

  it("renders today's medicines and allows confirming a dose as Taken", () => {
    render(
      <DashboardView
        user={mockUser}
        activeProfile={mockProfile}
        onNavigateTab={vi.fn()}
      />
    );

    expect(screen.getByText("Metformin Hydrochloride")).toBeDefined();
    const takeButtons = screen.getAllByRole("button", { name: "Take" });
    fireEvent.click(takeButtons[0]);

    // Upon taking, confirmation badge displays
    expect(screen.getByText("Confirmed Taken")).toBeDefined();
  });

  it("renders vital StatCards with numbers, units, and verification badge", () => {
    render(
      <DashboardView
        user={mockUser}
        activeProfile={mockProfile}
        onNavigateTab={vi.fn()}
      />
    );

    expect(screen.getByText("Blood Pressure")).toBeDefined();
    expect(screen.getByText("120/80")).toBeDefined();
    expect(screen.getByText("mmHg")).toBeDefined();
    expect(screen.getByText("Fasting Blood Glucose")).toBeDefined();
    expect(screen.getByText("94")).toBeDefined();
    expect(screen.getByText("HbA1c Glycated Hemoglobin")).toBeDefined();
    expect(screen.getByText("5.6")).toBeDefined();
  });

  it("renders upcoming appointment and preparation pack readiness", () => {
    const handleNavigate = vi.fn();
    render(
      <DashboardView
        user={mockUser}
        activeProfile={mockProfile}
        onNavigateTab={handleNavigate}
      />
    );

    expect(screen.getByText("Dr. Sourav Mukherjee")).toBeDefined();
    expect(screen.getByText(/2 of 3 ready/i)).toBeDefined();

    const prepBtn = screen.getByRole("button", { name: "Prepare Visit Pack" });
    fireEvent.click(prepBtn);
    expect(handleNavigate).toHaveBeenCalledWith("visit-pack");
  });

  it("renders rule-based longitudinal shift detection with neutral wording", () => {
    render(
      <DashboardView
        user={mockUser}
        activeProfile={mockProfile}
        onNavigateTab={vi.fn()}
      />
    );

    expect(screen.getByText(/Longitudinal Changes \(Rule-Based Detection\)/i)).toBeDefined();
    expect(screen.getByText("Systolic Blood Pressure")).toBeDefined();
    expect(screen.getByText(/standard reference range on both comparative reports/i)).toBeDefined();
  });
});
