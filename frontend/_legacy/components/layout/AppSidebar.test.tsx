import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppSidebar } from "./AppSidebar";
import type { FamilyProfile } from "../../api/client";

describe("AppSidebar Component", () => {
  const mockProfile: FamilyProfile = {
    id: "prof-1",
    owner_id: "usr-1",
    name: "Abhijit Bhunia",
    relationship: "self",
    is_primary: true,
    is_active: true,
    is_dependent: false,
    consent_status: "authorized",
    avatar_color: "#0d9488",
    created_at: "2026-10-28T10:00:00Z",
    updated_at: "2026-10-28T10:00:00Z",
  };

  it("renders all 9 primary sidebar navigation options", () => {
    render(
      <AppSidebar
        activeTab="overview"
        onTabChange={vi.fn()}
        isOpen={false}
        onClose={vi.fn()}
        activeProfile={mockProfile}
        familyProfiles={[mockProfile]}
        onSelectProfile={vi.fn()}
      />
    );

    expect(screen.getByRole("tab", { name: /Overview/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Health Records/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Medical Timeline/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /AI Health Assistant/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Lab Reports/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Medications/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Doctor Visit Preparation/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Health Insights/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Settings/i })).toBeDefined();
  });

  it("highlights active tab and switches tab on click", () => {
    const handleTabChange = vi.fn();
    render(
      <AppSidebar
        activeTab="overview"
        onTabChange={handleTabChange}
        isOpen={false}
        onClose={vi.fn()}
        activeProfile={mockProfile}
        familyProfiles={[mockProfile]}
        onSelectProfile={vi.fn()}
      />
    );

    const timelineTab = screen.getByRole("tab", { name: /Medical Timeline/i });
    fireEvent.click(timelineTab);

    expect(handleTabChange).toHaveBeenCalledWith("timeline");
  });
});
