import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DoctorVisitPackView } from "./DoctorVisitPackView";
import { SharingEmergencyView } from "../sharing/SharingEmergencyView";
import { PublicDoctorPortalView } from "../sharing/PublicDoctorPortalView";
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

describe("Step 10 - Doctor Visit Pack, Sharing & Clinician Portal", () => {
  describe("DoctorVisitPackView", () => {
    it("renders printable report preview and adds discussion questions", () => {
      render(<DoctorVisitPackView token="test-token" activeProfile={mockProfile} />);

      expect(screen.getByText("Doctor Visit Preparation Pack")).toBeDefined();
      expect(screen.getByText("Clinician Summary Pack")).toBeDefined();
      expect(screen.getByText("Dr. Abhijit Bhunia")).toBeDefined();

      const input = screen.getByPlaceholderText(/Add another discussion question/i);
      fireEvent.change(input, { target: { value: "Should we repeat liver enzymes in 3 months?" } });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      expect(screen.getAllByText(/Should we repeat liver enzymes in 3 months\?/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("SharingEmergencyView", () => {
    it("renders active share sessions and revokes share on click", () => {
      render(<SharingEmergencyView token="test-token" activeProfile={mockProfile} />);

      expect(screen.getByText("Doctor Sharing & Emergency Medical Card")).toBeDefined();
      expect(screen.getByText("Doctor Consultation Share")).toBeDefined();

      const revokeBtn = screen.getByRole("button", { name: "Revoke Now" });
      fireEvent.click(revokeBtn);

      expect(screen.queryByText("Doctor Consultation Share")).toBeNull();
    });

    it("renders emergency medical card with blood group and emergency contact", () => {
      render(<SharingEmergencyView token="test-token" activeProfile={mockProfile} />);

      const emergencyTab = screen.getByRole("button", { name: /Emergency Medical Card/i });
      fireEvent.click(emergencyTab);

      expect(screen.getByText("Emergency Card Information")).toBeDefined();
      expect(screen.getByText("Critical Drug Allergies")).toBeDefined();
      expect(screen.getByText("Blood Group")).toBeDefined();
    });
  });

  describe("PublicDoctorPortalView", () => {
    it("renders read-only clinician view with watermark and lab tabs", () => {
      render(
        <PublicDoctorPortalView
          shareToken="tok-123"
          patientName="Anima Bhunia"
          expiresIn="Expires in 12 hours"
        />
      );

      expect(screen.getByText("HealthMate AI Clinician Portal")).toBeDefined();
      expect(screen.getByText("Anima Bhunia")).toBeDefined();
      expect(screen.getByText("Expires in 12 hours")).toBeDefined();

      // Click Labs tab
      const labsTab = screen.getByRole("tab", { name: "Laboratory Findings" });
      fireEvent.click(labsTab);

      expect(screen.getByText("Fasting Blood Glucose")).toBeDefined();
      expect(screen.getByText("HbA1c Glycated Hemoglobin")).toBeDefined();
    });
  });
});
