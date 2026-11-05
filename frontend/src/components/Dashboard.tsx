import React, { useEffect, useState, useCallback } from "react";
import {
  getLive,
  getReady,
  listDocuments,
  ApiError,
  type DocumentItem,
  type ReadyStatus,
  listFamilyProfiles,
  type FamilyProfile,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "./layout/DashboardLayout";
import { OverviewDashboard } from "./dashboard/OverviewDashboard";
import { DocumentUpload } from "./DocumentUpload";
import { DocumentList } from "./DocumentList";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { MedicalTimeline } from "./MedicalTimeline";
import { MedicalChat } from "./MedicalChat";
import { QuickReferenceAI } from "./QuickReferenceAI";
import { MedicalInsights } from "./MedicalInsights";
import { LabReportsView } from "./lab/LabReportsView";
import { MedicationsView } from "./medications/MedicationsView";
import { DoctorVisitPack } from "./DoctorVisitPack";
import { SettingsView } from "./settings/SettingsView";
import type { NavTabId } from "./layout/AppSidebar";

type Conn = { api: "loading" | "ok" | "down"; ready?: ReadyStatus };

export function Dashboard() {
  const { user, token, logout, handleSessionExpired } = useAuth();
  const [conn, setConn] = useState<Conn>({ api: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<FamilyProfile | null>(null);
  const getInitialTab = (): NavTabId | string => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) return tabParam;
    }
    return "overview";
  };
  const [activeTab, setActiveTab] = useState<NavTabId | string>(getInitialTab);
  const [selectedViewerDoc, setSelectedViewerDoc] = useState<DocumentItem | null>(null);

  const fetchHealth = async () => {
    try {
      await getLive();
      const ready = await getReady();
      setConn({ api: "ok", ready });
    } catch {
      setConn({ api: "down" });
    }
  };

  const loadFamilyProfiles = useCallback(async () => {
    if (!token) return;
    try {
      const profs = await listFamilyProfiles(token);
      setFamilyProfiles(profs);
      setActiveProfile((prev) => {
        if (prev && profs.some((p) => p.id === prev.id)) {
          return profs.find((p) => p.id === prev.id) || prev;
        }
        return profs.find((p) => p.is_primary) || profs[0] || null;
      });
    } catch {
      // Non-blocking
    }
  }, [token]);

  const loadDocuments = useCallback(
    async (profId?: string) => {
      if (!token) return;
      try {
        setDocsLoading(true);
        const targetId = profId !== undefined ? profId : activeProfile?.id;
        const docs = await listDocuments(token, targetId);
        setDocuments(docs);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 401) {
          handleSessionExpired("Your session has expired. Please sign in again.");
        }
      } finally {
        setDocsLoading(false);
      }
    },
    [token, activeProfile?.id, handleSessionExpired]
  );

  useEffect(() => {
    fetchHealth();
    loadFamilyProfiles();
  }, [loadFamilyProfiles]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleRefreshHealth = async () => {
    setRefreshing(true);
    await fetchHealth();
    setRefreshing(false);
  };

  const handleSelectProfile = (profile: FamilyProfile) => {
    setActiveProfile(profile);
    loadDocuments(profile.id);
  };

  const switchTab = (tab: NavTabId | string) => {
    setActiveTab(tab);
  };

  const getSectionTitle = (tab: string): string => {
    switch (tab) {
      case "overview":
        return "Health Overview";
      case "documents":
        return "Health Records";
      case "timeline":
        return "Medical Timeline";
      case "chat":
        return "AI Health Assistant";
      case "lab-reports":
      case "comparison":
        return "Lab Reports & Medical Analysis";
      case "medications":
      case "care":
      case "reminders":
        return "Medications & Smart Reminders";
      case "visit-pack":
        return "Doctor Visit Preparation";
      case "insights":
        return "Health Insights";
      case "settings":
      case "family":
      case "sharing":
      case "quality":
      case "infrastructure":
      case "export":
      case "knowledge":
        return "Settings & System Center";
      default:
        return "Clinical Workspace";
    }
  };

  const systemStatus: "ok" | "wait" | "bad" =
    conn.ready?.database && conn.ready?.pgvector
      ? "ok"
      : conn.api === "ok"
      ? "wait"
      : "bad";

  // Map settings subtab if navigated directly
  const settingsInitialSection =
    activeTab === "family"
      ? "family"
      : activeTab === "sharing"
      ? "sharing"
      : activeTab === "quality"
      ? "quality"
      : activeTab === "export"
      ? "export"
      : activeTab === "knowledge"
      ? "knowledge"
      : "profile";

  return (
    <DashboardLayout
      activeTab={activeTab}
      activeTabTitle={getSectionTitle(activeTab)}
      onTabChange={switchTab}
      user={user}
      activeProfile={activeProfile}
      familyProfiles={familyProfiles}
      onSelectProfile={handleSelectProfile}
      onLogout={logout}
      counts={{
        documents: documents.length,
      }}
      systemStatus={systemStatus}
    >
      {/* Tab: Overview Dashboard */}
      {activeTab === "overview" && (
        <OverviewDashboard
          user={user}
          token={token}
          activeProfile={activeProfile}
          documents={documents}
          docsLoading={docsLoading}
          onNavigateTab={switchTab}
          onViewDocument={(doc) => setSelectedViewerDoc(doc)}
          systemStatus={systemStatus}
        />
      )}

      {/* Tab: Health Records (Documents) */}
      {activeTab === "documents" && (
        <div className="hm-documents-page">
          <div className="hm-page-header">
            <div className="hm-page-header-text">
              <span className="hm-pill-header">Clinical Record Management</span>
              <h2>Medical Documents & Lab Reports</h2>
              <p>
                Upload medical records, view extracted findings, verify laboratory reports, and inspect document provenance.
              </p>
            </div>
          </div>

          <section className="hm-section-block">
            <DocumentUpload
              onUploadSuccess={() => loadDocuments()}
              profileId={activeProfile?.id}
              profileName={activeProfile?.name}
            />
          </section>

          <section className="hm-section-block">
            <DocumentList
              documents={documents}
              loading={docsLoading}
              onRefresh={() => loadDocuments()}
            />
          </section>
        </div>
      )}

      {/* Tab: Medical Timeline */}
      {activeTab === "timeline" && (
        <div className="hm-timeline-page">
          <div className="hm-page-header">
            <div className="hm-page-header-text">
              <span className="hm-pill-header">Longitudinal History</span>
              <h2>Interactive Medical Timeline</h2>
              <p>
                Chronological visualization of lab observations, diagnoses, medications, and health milestones.
              </p>
            </div>
          </div>
          <MedicalTimeline />
        </div>
      )}

      {/* Tab: AI Health Assistant & Quick Reference AI */}
      {(activeTab === "chat" || activeTab === "quick-reference") && (
        <div className="hm-chat-page space-y-6">
          <div className="hm-page-header">
            <div className="hm-page-header-text">
              <span className="hm-pill-header">Evidence-Grounded AI</span>
              <h2>AI Health & Clinical Reference Suite</h2>
              <p>
                Query verified laboratory findings, explore curated medical terms, or prepare structured questions for your doctor.
              </p>
            </div>
            {/* Sub-navigation Switcher between Chat and Quick Reference */}
            <div className="flex items-center gap-2 mt-4 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
              <button
                type="button"
                onClick={() => switchTab("chat")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "chat"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Conversational Chat
              </button>
              <button
                type="button"
                onClick={() => switchTab("quick-reference")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "quick-reference"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Quick Reference AI (v4)
              </button>
            </div>
          </div>

          {activeTab === "quick-reference" && token ? (
            <QuickReferenceAI
              token={token}
              activeProfile={activeProfile}
              documents={documents}
            />
          ) : (
            <MedicalChat />
          )}
        </div>
      )}

      {/* Tab: Lab Reports & Medical Analysis */}
      {(activeTab === "lab-reports" || activeTab === "comparison") && token && (
        <LabReportsView token={token} activeProfile={activeProfile} />
      )}

      {/* Tab: Medications & Smart Reminders */}
      {(activeTab === "medications" || activeTab === "care" || activeTab === "reminders") && token && (
        <MedicationsView
          token={token}
          activeProfile={activeProfile}
          initialSubtab={activeTab === "reminders" ? "reminders" : "medications"}
        />
      )}

      {/* Tab: Doctor Visit Preparation */}
      {activeTab === "visit-pack" && (
        <div className="hm-visit-pack-page">
          <div className="hm-page-header">
            <div className="hm-page-header-text">
              <span className="hm-pill-header">Clinician Visit Readiness</span>
              <h2>Doctor Visit Preparation Pack</h2>
              <p>
                Consolidated clinical appointment summaries, observation trends, prepared questions, and printable clinician reports.
              </p>
            </div>
          </div>
          <DoctorVisitPack activeProfile={activeProfile} />
        </div>
      )}

      {/* Tab: Health Insights */}
      {activeTab === "insights" && (
        <div className="hm-insights-page">
          <div className="hm-page-header">
            <div className="hm-page-header-text">
              <span className="hm-pill-header">Clinical Analytics</span>
              <h2>Medical Insights & Lab Analytics</h2>
              <p>
                Longitudinal shift detection, abnormal flag discrepancies, category breakdowns, and observation shifts.
              </p>
            </div>
          </div>
          <MedicalInsights onNavigateTab={(tab) => switchTab(tab as any)} />
        </div>
      )}

      {/* Tab: Settings & System */}
      {(activeTab === "settings" ||
        activeTab === "family" ||
        activeTab === "sharing" ||
        activeTab === "quality" ||
        activeTab === "infrastructure" ||
        activeTab === "export" ||
        activeTab === "knowledge") &&
        token && (
          <SettingsView
            user={user}
            token={token}
            activeProfile={activeProfile}
            familyProfiles={familyProfiles}
            onSelectProfile={handleSelectProfile}
            onProfileUpdated={loadFamilyProfiles}
            documents={documents}
            conn={conn}
            onRefreshHealth={handleRefreshHealth}
            refreshing={refreshing}
            onNavigateTab={switchTab}
            initialSection={settingsInitialSection}
          />
        )}

      {/* Document Viewer Modal (when opened from Overview or global) */}
      {selectedViewerDoc && (
        <DocumentViewerModal
          document={selectedViewerDoc}
          onClose={() => setSelectedViewerDoc(null)}
          onVerified={() => loadDocuments()}
        />
      )}
    </DashboardLayout>
  );
}
