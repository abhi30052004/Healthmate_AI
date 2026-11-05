import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AssistantView } from "./AssistantView";
import { FamilyView } from "../family/FamilyView";
import { PrivacyView } from "../privacy/PrivacyView";
import { SettingsView } from "../settings/SettingsView";
import type { FamilyProfile } from "../../api/client";

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

describe("Step 11 - AI Assistant, Family, Privacy & Settings", () => {
  describe("AssistantView", () => {
    it("renders AI quota, persistent medical disclaimer, and suggested prompt chips", () => {
      render(<AssistantView token="test-token" activeProfile={mockProfile} />);

      expect(screen.getByText("AI Health Assistant")).toBeDefined();
      expect(screen.getAllByText(/HealthMate AI explains records and supports doctor conversations/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/12 of 20 chats left today/i)).toBeDefined();
      expect(screen.getByText("What was my latest HbA1c result?")).toBeDefined();
    });

    it("opens evidence drawer when clicking source citation", () => {
      render(<AssistantView token="test-token" activeProfile={mockProfile} />);

      const citationButton = screen.getByTitle(/Source \[S1\]/i);
      fireEvent.click(citationButton);

      expect(screen.getAllByText("Metabolic & Glycemic Profile - Apollo Clinic").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Exact Source Excerpt/i)).toBeDefined();
    });
  });

  describe("FamilyView", () => {
    it("renders family profiles and opens add profile dialog", () => {
      render(<FamilyView token="test-token" activeProfile={mockProfile} />);

      expect(screen.getByText("Family Health Profiles")).toBeDefined();
      expect(screen.getByText("Anima Bhunia")).toBeDefined();
      expect(screen.getByText("Aarav Bhunia")).toBeDefined();

      const addBtn = screen.getByRole("button", { name: /Add Family Profile/i });
      fireEvent.click(addBtn);

      expect(screen.getByText("Full Name")).toBeDefined();
    });
  });

  describe("PrivacyView", () => {
    it("renders audit logs, export button, and delete account confirmation dialog", () => {
      render(<PrivacyView token="test-token" activeProfile={mockProfile} />);

      expect(screen.getByText("Privacy & Security Centre")).toBeDefined();
      expect(screen.getByText("You Own 100% of Your Data")).toBeDefined();
      expect(screen.getByText("Generated Doctor Visit Pack")).toBeDefined();

      const deleteBtn = screen.getByRole("button", { name: /Delete Account & Purge Records/i });
      fireEvent.click(deleteBtn);

      expect(screen.getByText("Confirm Permanent Account Deletion")).toBeDefined();
      expect(screen.getByPlaceholderText("DELETE MY HEALTHMATE DATA")).toBeDefined();
    });
  });

  describe("SettingsView", () => {
    it("renders notification channels, Telegram connect code, and Simple mode toggle", () => {
      const onToggleSimpleMode = vi.fn();
      render(
        <SettingsView
          token="test-token"
          activeProfile={mockProfile}
          isSimpleMode={false}
          onToggleSimpleMode={onToggleSimpleMode}
        />
      );

      expect(screen.getByText("Settings & Preferences")).toBeDefined();
      expect(screen.getByText("Browser Push Notifications")).toBeDefined();
      expect(screen.getByText(/Telegram Care Bot Reminders/i)).toBeDefined();
      expect(screen.getByText(/HM-8921-X/i)).toBeDefined();

      const simpleModeCheckbox = screen.getByRole("checkbox", {
        name: /Simple Mode for Elders & Caregivers/i,
      });
      fireEvent.click(simpleModeCheckbox);
      expect(onToggleSimpleMode).toHaveBeenCalledWith(true);
    });
  });
});
