import React, { useState, useEffect } from "react";
import { AppShell } from "./components/layout/AppShell";
import type { NavTabId } from "./components/layout/Sidebar";
import { PageTransition } from "./components/motion/MotionHelpers";
import { I18nProvider, useI18n } from "./i18n/i18nContext";

// Auth Views
import { LoginForm } from "./features/auth/LoginForm";
import { RegisterForm } from "./features/auth/RegisterForm";
import { AuthLayout } from "./features/auth/AuthLayout";

// Public Views
import { LandingPageView } from "./features/landing/LandingPageView";
import { PublicDoctorPortalView } from "./features/sharing/PublicDoctorPortalView";

// In-App Views
import { DashboardView } from "./features/dashboard/DashboardView";
import { HealthRecordsView } from "./features/records/HealthRecordsView";
import { TimelineTrendsView } from "./features/trends/TimelineTrendsView";
import { MedicinesView } from "./features/medicines/MedicinesView";
import { AppointmentsView } from "./features/appointments/AppointmentsView";
import { SymptomsJournalView } from "./features/symptoms/SymptomsJournalView";
import { DoctorVisitPackView } from "./features/visit-pack/DoctorVisitPackView";
import { AssistantView } from "./features/assistant/AssistantView";
import { FamilyView } from "./features/family/FamilyView";
import { SharingEmergencyView } from "./features/sharing/SharingEmergencyView";
import { PrivacyView } from "./features/privacy/PrivacyView";
import { SettingsView } from "./features/settings/SettingsView";

import type { User, FamilyProfile, DocumentItem } from "./api/client";

// Synthetic initial user & profiles for realistic, self-contained clinical UX
const INITIAL_USER: User = {
  id: "user-abhijit",
  name: "Dr. Abhijit Bhunia",
  email: "abhijit.bhunia@healthmate.ai",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

const INITIAL_PROFILES: FamilyProfile[] = [
  {
    id: "prof-1",
    owner_id: "user-abhijit",
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
    owner_id: "user-abhijit",
    name: "Anima Bhunia",
    relationship: "parent",
    is_primary: false,
    is_active: true,
    is_dependent: true,
    consent_status: "authorized",
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
  },
  {
    id: "prof-3",
    owner_id: "user-abhijit",
    name: "Aarav Bhunia",
    relationship: "child",
    is_primary: false,
    is_active: true,
    is_dependent: true,
    consent_status: "authorized",
    created_at: "2026-03-10T00:00:00Z",
    updated_at: "2026-03-10T00:00:00Z",
  },
];

const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: "doc-1",
    owner_id: "user-abhijit",
    profile_id: "prof-1",
    filename: "Apollo_Comprehensive_Metabolic_Oct2026.pdf",
    mime_type: "application/pdf",
    file_size: 428000,
    checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    processing_status: "completed",
    ocr_applied: true,
    patient_name: "Dr. Abhijit Bhunia",
    document_date: "2026-10-14",
    lab_name: "Apollo Clinic Diagnostics",
    is_verified: true,
    verified_at: "2026-10-14T10:30:00Z",
    created_at: "2026-10-14T10:00:00Z",
    observations: [
      {
        id: "obs-1",
        document_id: "doc-1",
        owner_id: "user-abhijit",
        test_name: "HbA1c (Glycosylated Hemoglobin)",
        value: "6.8 %",
        numeric_value: 6.8,
        unit: "%",
        reference_range: "4.0 - 5.6 %",
        flag: "HIGH",
        source_page: 2,
        source_text: "HbA1c (Glycosylated Hemoglobin): 6.8 % [Reference: 4.0 - 5.6 %]",
        is_low_confidence: false,
        is_reviewed: true,
        created_at: "2026-10-14T10:05:00Z",
      },
      {
        id: "obs-2",
        document_id: "doc-1",
        owner_id: "user-abhijit",
        test_name: "Fasting Blood Glucose",
        value: "118 mg/dL",
        numeric_value: 118,
        unit: "mg/dL",
        reference_range: "70 - 99 mg/dL",
        flag: "HIGH",
        source_page: 1,
        source_text: "Fasting Blood Sugar: 118 mg/dL (Normal: 70 - 99 mg/dL)",
        is_low_confidence: false,
        is_reviewed: true,
        created_at: "2026-10-14T10:05:00Z",
      },
    ],
  },
  {
    id: "doc-2",
    owner_id: "user-abhijit",
    profile_id: "prof-1",
    filename: "SRL_Lipid_Profile_Apr2026.pdf",
    mime_type: "application/pdf",
    file_size: 310000,
    checksum_sha256: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
    processing_status: "extracted",
    ocr_applied: true,
    patient_name: "Dr. Abhijit Bhunia",
    document_date: "2026-04-12",
    lab_name: "SRL Diagnostics",
    is_verified: false,
    created_at: "2026-04-12T09:00:00Z",
    observations: [
      {
        id: "obs-3",
        document_id: "doc-2",
        owner_id: "user-abhijit",
        test_name: "Total Cholesterol",
        value: "214 mg/dL",
        numeric_value: 214,
        unit: "mg/dL",
        reference_range: "< 200 mg/dL",
        flag: "HIGH",
        source_page: 1,
        source_text: "Total Cholesterol: 214 mg/dL [Desirable: < 200 mg/dL]",
        is_low_confidence: true,
        is_reviewed: false,
        created_at: "2026-04-12T09:10:00Z",
      },
    ],
  },
];

type AppRoute = "landing" | "login" | "register" | "doctor-share" | "app";

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      if (path === "/login") return "login";
      if (path === "/register") return "register";
      if (path.includes("doctor-share") || path.includes("share")) return "doctor-share";
      if (path === "/app" || path.startsWith("/dashboard")) return "app";
    }
    return "landing";
  });

  const [activeTab, setActiveTab] = useState<NavTabId>("overview");
  const [user, setUser] = useState<User | null>(INITIAL_USER);
  const [profiles, setProfiles] = useState<FamilyProfile[]>(INITIAL_PROFILES);
  const [activeProfile, setActiveProfile] = useState<FamilyProfile>(INITIAL_PROFILES[0]);
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [token] = useState<string>("hm_demo_token_authenticated");
  const [isNavigating, setIsNavigating] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);
  const [currentLang, setCurrentLang] = useState<"en" | "bn" | "hi">("en");

  // Sync browser navigation popstate
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === "/login") setRoute("login");
      else if (path === "/register") setRoute("register");
      else if (path.includes("doctor-share") || path.includes("share")) setRoute("doctor-share");
      else if (path === "/app" || path.startsWith("/dashboard")) setRoute("app");
      else setRoute("landing");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (newRoute: AppRoute) => {
    setIsNavigating(true);
    setRoute(newRoute);
    if (typeof window !== "undefined") {
      const url = newRoute === "landing" ? "/" : `/${newRoute}`;
      window.history.pushState({}, "", url);
    }
    setTimeout(() => setIsNavigating(false), 200);
  };

  const handleTabChange = (tab: NavTabId) => {
    setIsNavigating(true);
    setActiveTab(tab);
    setTimeout(() => setIsNavigating(false), 150);
  };

  const handleProfileSelect = (profile: FamilyProfile) => {
    setIsNavigating(true);
    setActiveProfile(profile);
    setTimeout(() => setIsNavigating(false), 200);
  };

  return (
    <I18nProvider initialLanguage={currentLang}>
      {/* 1. Public Landing Page */}
      {route === "landing" && (
        <LandingPageView
          onGetStarted={() => navigateTo("register")}
          onLogin={() => navigateTo("login")}
        />
      )}

      {/* 2. Public Clinician Portal View */}
      {route === "doctor-share" && (
        <div className="min-h-screen bg-[var(--bg)] p-4 md:p-8">
          <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center">
            <button
              onClick={() => navigateTo("landing")}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline"
            >
              ← Back to HealthMate AI
            </button>
          </div>
          <PublicDoctorPortalView shareToken="SH-9281-DEMO" />
        </div>
      )}

      {/* 3. Login Page */}
      {route === "login" && (
        <AuthLayout title="Welcome back" subtitle="Log in to review and manage your family health records">
          <LoginForm
            onSuccess={() => {
              setUser(INITIAL_USER);
              navigateTo("app");
            }}
            onNavigateRegister={() => navigateTo("register")}
            onNavigateForgotPassword={() => alert("Password reset link sent to registered email.")}
          />
        </AuthLayout>
      )}

      {/* 4. Register Page */}
      {route === "register" && (
        <AuthLayout title="Create your free health vault" subtitle="3 simple steps with strict medical safety consent">
          <RegisterForm
            onSuccess={() => {
              setUser(INITIAL_USER);
              navigateTo("app");
            }}
            onNavigateLogin={() => navigateTo("login")}
          />
        </AuthLayout>
      )}

      {/* 5. In-App Workspace */}
      {route === "app" && (
        <AppShell
          user={user}
          activeProfile={activeProfile}
          profiles={profiles}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onSelectProfile={handleProfileSelect}
          onLogout={() => {
            setUser(null);
            navigateTo("landing");
          }}
          isNavigating={isNavigating}
          simpleMode={simpleMode}
        >
          <PageTransition routeKey={`${activeTab}-${activeProfile?.id}`}>
            {activeTab === "overview" && (
              <DashboardView
                user={user}
                activeProfile={activeProfile}
                documents={documents}
                onNavigateTab={(tab) => handleTabChange(tab)}
              />
            )}

            {activeTab === "records" && (
              <HealthRecordsView
                token={token}
                activeProfile={activeProfile}
                documents={documents}
                onRefresh={() => {
                  setDocuments([...INITIAL_DOCUMENTS]);
                }}
              />
            )}

            {activeTab === "timeline" && (
              <TimelineTrendsView token={token} activeProfile={activeProfile} />
            )}

            {activeTab === "medicines" && (
              <MedicinesView token={token} activeProfile={activeProfile} />
            )}

            {activeTab === "appointments" && (
              <AppointmentsView
                token={token}
                activeProfile={activeProfile}
                onPrepareVisitPack={() => handleTabChange("visit-pack")}
              />
            )}

            {activeTab === "symptoms" && (
              <SymptomsJournalView token={token} activeProfile={activeProfile} />
            )}

            {activeTab === "visit-pack" && (
              <DoctorVisitPackView token={token} activeProfile={activeProfile} />
            )}

            {activeTab === "assistant" && (
              <AssistantView token={token} activeProfile={activeProfile} />
            )}

            {activeTab === "family" && (
              <FamilyView
                token={token}
                activeProfile={activeProfile}
                onSelectProfile={handleProfileSelect}
              />
            )}

            {activeTab === "sharing" && (
              <SharingEmergencyView token={token} activeProfile={activeProfile} />
            )}

            {activeTab === "privacy" && (
              <PrivacyView token={token} activeProfile={activeProfile} />
            )}

            {activeTab === "settings" && (
              <SettingsView
                token={token}
                activeProfile={activeProfile}
                isSimpleMode={simpleMode}
                onToggleSimpleMode={(simple) => setSimpleMode(simple)}
                currentLanguage={currentLang}
                onLanguageChange={(lang) => setCurrentLang(lang)}
              />
            )}
          </PageTransition>
        </AppShell>
      )}
    </I18nProvider>
  );
}
