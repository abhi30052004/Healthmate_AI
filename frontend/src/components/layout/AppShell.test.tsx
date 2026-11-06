import React, { useState } from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders as render } from "../../test/utils";
import { describe, it, expect, vi } from "vitest";
import { AppShell } from "./AppShell";
import {
  OverviewStub,
  RecordsStub,
  MedicinesStub,
  TimelineStub,
} from "../../features/stubs/StubViews";
import type { FamilyProfile, User } from "../../api/client";
import type { NavTabId } from "./Sidebar";

const mockUser: User = {
  id: "user-1",
  email: "patient@example.com",
  name: "Dr. Abhijit Bhunia",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

const mockProfiles: FamilyProfile[] = [
  {
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
  },
  {
    id: "prof-2",
    owner_id: "user-1",
    name: "Anima Bhunia",
    relationship: "parent",
    is_primary: false,
    is_active: true,
    is_dependent: true,
    consent_status: "authorized",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function TestAppShell() {
  const [activeTab, setActiveTab] = useState<NavTabId>("overview");
  const [activeProfile, setActiveProfile] = useState<FamilyProfile>(mockProfiles[0]);

  return (
    <AppShell
      user={mockUser}
      activeProfile={activeProfile}
      profiles={mockProfiles}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSelectProfile={setActiveProfile}
      onLogout={vi.fn()}
    >
      {activeTab === "overview" && <OverviewStub onNavigate={setActiveTab} />}
      {activeTab === "records" && <RecordsStub />}
      {activeTab === "medicines" && <MedicinesStub />}
      {activeTab === "timeline" && <TimelineStub />}
    </AppShell>
  );
}

describe("Step 4 - App Shell & Multi-Profile Navigation", () => {
  it("renders the app shell, sidebar items, and active profile switcher", () => {
    render(<TestAppShell />);
    expect(screen.getByText("HealthMate AI")).toBeDefined();
    expect(screen.getByText("Dr. Abhijit Bhunia")).toBeDefined();
    expect(screen.getByText("Self (Primary)")).toBeDefined();

    // Renders default Overview stub content
    expect(screen.getByText("Today's Health Overview")).toBeDefined();
  });

  it("switches navigation tabs and updates view", () => {
    render(<TestAppShell />);
    const recordsBtn = screen.getAllByRole("button", { name: /Health Records/i })[0];
    fireEvent.click(recordsBtn);

    expect(screen.getByText("Health Records & Documents")).toBeDefined();
    expect(screen.getByText("Health Records Stub View Ready")).toBeDefined();
  });

  it("opens profile switcher and selects secondary family member", () => {
    render(<TestAppShell />);
    const switcherBtn = screen.getByRole("button", { name: /Click to switch patient/i });
    fireEvent.click(switcherBtn);

    const parentOption = screen.getByRole("menuitem", { name: /Anima Bhunia/i });
    fireEvent.click(parentOption);

    // Profile in topbar should now reflect Anima Bhunia
    expect(screen.getByText("Anima Bhunia")).toBeDefined();
  });

  it("collapses and expands the desktop sidebar", () => {
    render(<TestAppShell />);
    const collapseBtn = screen.getByRole("button", { name: "Collapse sidebar" });
    fireEvent.click(collapseBtn);

    const expandBtn = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expandBtn).toBeDefined();

    fireEvent.click(expandBtn);
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeDefined();
  });

  it("enables Simple Mode with 3 primary elder tabs", () => {
    render(<TestAppShell />);
    const simpleModeBtn = screen.getByRole("button", { name: /Simple Mode/i });
    fireEvent.click(simpleModeBtn);

    expect(screen.getByText("Simple: ON")).toBeDefined();
    expect(document.body.classList.contains("mode-simple")).toBe(true);

    // Turn off
    fireEvent.click(screen.getByText("Simple: ON"));
    expect(document.body.classList.contains("mode-simple")).toBe(false);
  });
});
