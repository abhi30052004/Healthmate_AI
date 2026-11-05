import React, { useState } from "react";
import { AppSidebar, type NavTabId } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import type { FamilyProfile } from "../../api/client";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  activeTabTitle: string;
  onTabChange: (tab: NavTabId) => void;
  user: any;
  activeProfile: FamilyProfile | null;
  familyProfiles: FamilyProfile[];
  onSelectProfile: (profile: FamilyProfile) => void;
  onLogout: () => void;
  counts?: {
    documents?: number;
    reminders?: number;
  };
  systemStatus?: "ok" | "wait" | "bad";
  onSearch?: (query: string) => void;
}

export function DashboardLayout({
  children,
  activeTab,
  activeTabTitle,
  onTabChange,
  user,
  activeProfile,
  familyProfiles,
  onSelectProfile,
  onLogout,
  counts,
  systemStatus,
  onSearch,
}: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="hm-dashboard-shell">
      {/* SaaS Sidebar */}
      <AppSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        activeProfile={activeProfile}
        familyProfiles={familyProfiles}
        onSelectProfile={onSelectProfile}
        counts={counts}
        systemStatus={systemStatus}
      />

      {/* Main Content Area */}
      <div className="hm-main-viewport">
        {/* Top App Header */}
        <AppHeader
          activeTab={activeTab}
          activeTabTitle={activeTabTitle}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          user={user}
          activeProfile={activeProfile}
          familyProfiles={familyProfiles}
          onSelectProfile={onSelectProfile}
          onLogout={onLogout}
          onNavigateTab={(tab) => onTabChange(tab as NavTabId)}
          onSearch={onSearch}
        />

        {/* Scrollable Viewport Body */}
        <main className="hm-content-container" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}

