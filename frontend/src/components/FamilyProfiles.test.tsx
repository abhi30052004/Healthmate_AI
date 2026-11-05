import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FamilyProfiles } from "./FamilyProfiles";
import type { FamilyProfile } from "../api/client";

// Mock API client methods
vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    listFamilyProfiles: vi.fn(),
    createFamilyProfile: vi.fn(),
    updateFamilyProfile: vi.fn(),
    deactivateFamilyProfile: vi.fn(),
  };
});

import {
  listFamilyProfiles,
  createFamilyProfile,
  updateFamilyProfile,
  deactivateFamilyProfile,
} from "../api/client";

describe("FamilyProfiles Component", () => {
  const mockToken = "mock-jwt-token";

  const sampleProfiles: FamilyProfile[] = [
    {
      id: "prof-self-1",
      owner_id: "user-1",
      name: "Alex Morgan",
      relationship: "self",
      date_of_birth: "1988-03-21",
      gender: "female",
      blood_type: "A+",
      emergency_contact_name: "James Morgan",
      emergency_contact_phone: "+1-555-0101",
      allergies_summary: "Penicillin",
      avatar_color: "#0d9488",
      is_primary: true,
      is_active: true,
      is_dependent: false,
      consent_status: "authorized",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      health_summary: {
        document_count: 5,
        medication_count: 2,
        appointment_count: 1,
        reminder_count: 3,
      },
    },
    {
      id: "prof-child-2",
      owner_id: "user-1",
      name: "Leo Morgan",
      relationship: "child",
      date_of_birth: "2018-05-14",
      gender: "male",
      blood_type: "O+",
      emergency_contact_name: "Alex Morgan",
      emergency_contact_phone: "+1-555-0100",
      allergies_summary: "Peanuts",
      avatar_color: "#2563eb",
      is_primary: false,
      is_active: true,
      is_dependent: true,
      consent_status: "authorized",
      created_at: "2026-01-02T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      health_summary: {
        document_count: 2,
        medication_count: 1,
        appointment_count: 2,
        reminder_count: 1,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (listFamilyProfiles as any).mockResolvedValue(sampleProfiles);
  });

  it("renders profile cards with name, relationship, and health summary metrics", async () => {
    const onSelectProfile = vi.fn();
    render(
      <FamilyProfiles
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        onSelectProfile={onSelectProfile}
      />
    );

    expect(screen.getByText("👨‍👩‍👧 Family Health Profiles")).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText("Alex Morgan").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("heading", { name: "Leo Morgan" })).toBeDefined();
      expect(screen.getAllByText("Child / Minor").length).toBeGreaterThanOrEqual(1);
    });

    // Check records counts are rendered
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Peanuts/)).toBeDefined();
  });

  it("indicates the currently active profile and allows switching to another profile", async () => {
    const onSelectProfile = vi.fn();
    render(
      <FamilyProfiles
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        onSelectProfile={onSelectProfile}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Alex Morgan")).toBeDefined();
    });

    // Switch to Leo
    const switchButton = screen.getByRole("button", { name: /Switch to Profile/i });
    fireEvent.click(switchButton);

    expect(onSelectProfile).toHaveBeenCalledWith(sampleProfiles[1]);
  });

  it("opens add family member modal and creates new profile successfully", async () => {
    const onSelectProfile = vi.fn();
    const newProfile: FamilyProfile = {
      id: "prof-parent-3",
      owner_id: "user-1",
      name: "Grandma Rose",
      relationship: "parent",
      date_of_birth: "1955-11-04",
      gender: "female",
      blood_type: "B+",
      is_primary: false,
      is_active: true,
      is_dependent: false,
      consent_status: "authorized",
      created_at: "2026-02-01T00:00:00Z",
      updated_at: "2026-02-01T00:00:00Z",
      health_summary: {
        document_count: 0,
        medication_count: 0,
        appointment_count: 0,
        reminder_count: 0,
      },
    };
    (createFamilyProfile as any).mockResolvedValue(newProfile);

    render(
      <FamilyProfiles
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        onSelectProfile={onSelectProfile}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Alex Morgan")).toBeDefined();
    });

    // Click Add Family Member
    const addButton = screen.getByRole("button", { name: /\+ Add Family Member/i });
    fireEvent.click(addButton);

    expect(screen.getByText("Add Family Member")).toBeDefined();

    // Fill form
    fireEvent.change(screen.getByLabelText(/Full Name \*/i), {
      target: { value: "Grandma Rose" },
    });
    fireEvent.change(screen.getByLabelText(/Relationship \*/i), {
      target: { value: "parent" },
    });
    fireEvent.change(screen.getByLabelText(/Blood Type/i), {
      target: { value: "B+" },
    });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Create Profile/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createFamilyProfile).toHaveBeenCalledWith(
        mockToken,
        expect.objectContaining({
          name: "Grandma Rose",
          relationship: "parent",
          blood_type: "B+",
        })
      );
      expect(onSelectProfile).toHaveBeenCalledWith(newProfile);
    });
  });

  it("validates form fields and rejects empty name", async () => {
    const onSelectProfile = vi.fn();
    render(
      <FamilyProfiles
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        onSelectProfile={onSelectProfile}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Alex Morgan")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ Add Family Member/i }));

    // Empty submission
    fireEvent.change(screen.getByLabelText(/Full Name \*/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /Create Profile/i }));

    await waitFor(() => {
      expect(screen.getByText("Full name is required.")).toBeDefined();
    });
    expect(createFamilyProfile).not.toHaveBeenCalled();
  });

  it("does not allow archiving the primary profile but allows archiving family members with retention notice", async () => {
    const onSelectProfile = vi.fn();
    (deactivateFamilyProfile as any).mockResolvedValue({
      profile_id: "prof-child-2",
      name: "Leo Morgan",
      is_active: false,
      message: "Archived",
      record_retention_note: "Historical records preserved.",
    });

    render(
      <FamilyProfiles
        token={mockToken}
        activeProfile={sampleProfiles[0]}
        onSelectProfile={onSelectProfile}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Leo Morgan")).toBeDefined();
    });

    // Primary profile card should not have an Archive button
    const archiveButtons = screen.getAllByRole("button", { name: /Archive/i });
    expect(archiveButtons.length).toBe(1); // Only for Leo, not Alex

    fireEvent.click(archiveButtons[0]);

    // Archive modal opens with Healthcare Compliance Notice
    expect(screen.getByText("Healthcare Compliance Notice:")).toBeDefined();
    expect(screen.getByText(/In accordance with medical record retention regulations/i)).toBeDefined();

    // Confirm archive
    fireEvent.click(screen.getByRole("button", { name: /Confirm Archive/i }));

    await waitFor(() => {
      expect(deactivateFamilyProfile).toHaveBeenCalledWith(mockToken, "prof-child-2");
    });
  });
});
