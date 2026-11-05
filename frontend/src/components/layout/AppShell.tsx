import React, { useState } from "react";
import { Sidebar, NavTabId } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { RouteProgress } from "../feedback/RouteProgress";
import { Dialog } from "../ui/Dialog";
import type { FamilyProfile, User } from "../../api/client";

export interface AppShellProps {
  user: User | null;
  activeProfile: FamilyProfile | null;
  profiles: FamilyProfile[];
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  onSelectProfile: (profile: FamilyProfile) => void;
  onLogout?: () => void;
  isNavigating?: boolean;
  children: React.ReactNode;
}

export function AppShell({
  user,
  activeProfile,
  profiles,
  activeTab,
  onTabChange,
  onSelectProfile,
  onLogout,
  isNavigating = false,
  children,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);

  const toggleSimpleMode = () => {
    const next = !simpleMode;
    setSimpleMode(next);
    if (next) {
      document.body.classList.add("mode-simple");
    } else {
      document.body.classList.remove("mode-simple");
    }
  };

  const handleMobileNavTab = (tab: NavTabId) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const allSections: { id: NavTabId; label: string; desc: string }[] = [
    { id: "overview", label: "Overview", desc: "Today's actions, vitals and review alerts" },
    { id: "records", label: "Health Records", desc: "Uploaded laboratory and clinical documents" },
    { id: "timeline", label: "Timeline & Trends", desc: "Longitudinal observation graphs" },
    { id: "medicines", label: "Medicines", desc: "Prescription schedules and dose logging" },
    { id: "appointments", label: "Appointments", desc: "Doctor visits and preparation checklists" },
    { id: "symptoms", label: "Symptoms", desc: "Log daily observations and severity" },
    { id: "visit-pack", label: "Doctor Visit Pack", desc: "Consolidated visit summaries and export" },
    { id: "assistant", label: "AI Assistant", desc: "Evidence-grounded record questions" },
    { id: "family", label: "Family", desc: "Manage authorized caregivers and family profiles" },
    { id: "sharing", label: "Sharing & Emergency", desc: "Time-limited QR code doctor access" },
    { id: "privacy", label: "Privacy Center", desc: "Access logs, data export and deletion" },
    { id: "settings", label: "Settings", desc: "Account preferences and notification channels" },
  ];

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text)]">
      {/* Route Loading Bar */}
      <RouteProgress isNavigating={isNavigating} />

      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        simpleMode={simpleMode}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={user}
          activeProfile={activeProfile}
          profiles={profiles}
          onSelectProfile={onSelectProfile}
          onLogout={onLogout}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          simpleMode={simpleMode}
          onToggleSimpleMode={toggleSimpleMode}
        />

        {/* Workspace Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenMore={() => setMobileMenuOpen(true)}
        simpleMode={simpleMode}
      />

      {/* Mobile "More" Full Navigation Drawer */}
      <Dialog
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="Clinical Navigation"
        description="Select a section to navigate your health records."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
          {allSections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => handleMobileNavTab(sec.id)}
              className={`p-3 rounded-lg text-left border transition-colors ${
                activeTab === sec.id
                  ? "bg-[var(--green-50)] border-[var(--green-600)] text-[var(--green-900)] font-semibold"
                  : "bg-white border-[var(--border)] hover:bg-[var(--bg)]"
              }`}
            >
              <p className="text-sm font-semibold">{sec.label}</p>
              <p className="text-xs text-[var(--muted)]">{sec.desc}</p>
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
