import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MedicinesView } from "./MedicinesView";
import { AppointmentsView } from "../appointments/AppointmentsView";
import { SymptomsJournalView } from "../symptoms/SymptomsJournalView";
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

describe("Step 9 - Medicines, Appointments & Symptom Journal", () => {
  describe("MedicinesView", () => {
    it("renders scheduled doses and confirms a dose as Taken", () => {
      render(<MedicinesView token="token-1" activeProfile={mockProfile} />);

      expect(screen.getByText("Medications & Smart Schedule")).toBeDefined();
      expect(screen.getByText("Metformin Hydrochloride")).toBeDefined();

      const takeBtns = screen.getAllByRole("button", { name: "Take" });
      fireEvent.click(takeBtns[0]);

      expect(screen.getByText("Confirmed Taken")).toBeDefined();
    });

    it("opens Add Medication modal and adds a prescription", () => {
      render(<MedicinesView token="token-1" activeProfile={mockProfile} />);

      fireEvent.click(screen.getByRole("button", { name: "Add Medication" }));
      expect(screen.getByText("Add Prescribed Medication")).toBeDefined();

      fireEvent.change(screen.getByLabelText(/Medication Name/i), { target: { value: "Amlodipine" } });
      fireEvent.change(screen.getByLabelText(/Strength & Form/i), { target: { value: "5 mg" } });

      fireEvent.click(screen.getByRole("button", { name: "Save Medication" }));
      expect(screen.getByText("Amlodipine")).toBeDefined();
    });
  });

  describe("AppointmentsView", () => {
    it("renders appointments and toggles preparation checklist items", () => {
      render(<AppointmentsView token="token-1" activeProfile={mockProfile} />);

      expect(screen.getByText("Dr. Sourav Mukherjee")).toBeDefined();
      expect(screen.getByText("Carry latest lipid & chemistry panel reports")).toBeDefined();

      const checklistItem = screen.getByRole("button", { name: /Prepare symptom and medication questions/i });
      fireEvent.click(checklistItem);

      expect(screen.getByText("3 of 3 done")).toBeDefined();
    });
  });

  describe("SymptomsJournalView", () => {
    it("logs a new symptom with severity rating and adds to the journal", () => {
      render(<SymptomsJournalView token="token-1" activeProfile={mockProfile} />);

      expect(screen.getByText("Symptom Journal & Pattern Log")).toBeDefined();

      fireEvent.change(screen.getByLabelText(/What are you experiencing\?/i), {
        target: { value: "Tension headache in afternoon" },
      });

      fireEvent.click(screen.getByRole("button", { name: "moderate" }));
      fireEvent.click(screen.getByRole("button", { name: "Save Symptom Entry" }));

      expect(screen.getByText("Tension headache in afternoon")).toBeDefined();
      expect(screen.getAllByText("moderate").length).toBeGreaterThanOrEqual(1);
    });
  });
});
