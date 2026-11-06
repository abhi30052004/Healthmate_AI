import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders as render } from "../test/utils";
import { describe, it, expect } from "vitest";
import { I18nProvider, useI18n, LanguageSwitcher } from "./i18nContext";
import { AppShell } from "../components/layout/AppShell";
import { OfflineBanner } from "../components/feedback/States";
import type { User, FamilyProfile } from "../api/client";

const mockUser: User = {
  id: "user-1",
  email: "abhijit@healthmate.ai",
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
];

function TranslationConsumer() {
  const { t, language } = useI18n();

  return (
    <div>
      <span data-testid="title">{t("app.title")}</span>
      <span data-testid="safety">{t("app.safetyNotice")}</span>
      <span data-testid="medicines">{t("nav.medicines")}</span>
      <span data-testid="language-code">{language}</span>
    </div>
  );
}

describe("Step 13 - Regional i18n (EN/BN/HI), Simple Mode & PWA Offline", () => {
  describe("i18n Provider & LanguageSwitcher", () => {
    it("renders default English strings and switches to Bengali and Hindi", () => {
      render(
        <I18nProvider initialLanguage="en">
          <LanguageSwitcher />
          <TranslationConsumer />
        </I18nProvider>
      );

      expect(screen.getByTestId("title").textContent).toBe("HealthMate AI");
      expect(screen.getByTestId("medicines").textContent).toBe("Medicines");

      // Switch to Bengali
      const bnBtn = screen.getByRole("button", { name: "বাংলা" });
      fireEvent.click(bnBtn);

      expect(screen.getByTestId("title").textContent).toBe("হেলথমেট এআই");
      expect(screen.getByTestId("medicines").textContent).toBe("ওষুধের তালিকা");
      expect(document.documentElement.lang).toBe("bn");

      // Switch to Hindi
      const hiBtn = screen.getByRole("button", { name: "हिन्दी" });
      fireEvent.click(hiBtn);

      expect(screen.getByTestId("title").textContent).toBe("हेल्थमेट एआई");
      expect(screen.getByTestId("medicines").textContent).toBe("दवाइयाँ");
      expect(document.documentElement.lang).toBe("hi");
    });
  });

  describe("Simple Mode Behavior", () => {
    it("restricts sidebar navigation to 3 core items when simpleMode is enabled", () => {
      render(
        <AppShell
          user={mockUser}
          profiles={mockProfiles}
          activeProfile={mockProfiles[0]}
          onSelectProfile={() => {}}
          currentTab="medicines"
          onTabChange={() => {}}
          simpleMode={true}
        >
          <div>Simple View</div>
        </AppShell>
      );

      // In simple mode, full nav items like AI Assistant or Appointments are hidden
      expect(screen.queryByText("Appointments")).toBeNull();
      expect(screen.queryByText("AI Assistant")).toBeNull();

      // Only 3 simple mode items: Medicines, Records, Doctor
      expect(screen.getAllByText("Medicines").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Records").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Doctor").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("PWA Offline Support", () => {
    it("renders offline banner with cached status and sync info", () => {
      render(<OfflineBanner lastSynced="5 minutes ago" />);

      expect(screen.getByText(/Viewing cached health records in read-only mode/i)).toBeDefined();
      expect(screen.getByText(/5 minutes ago/i)).toBeDefined();
    });
  });
});
