import React from "react";
import {
  LayoutDashboard,
  FileText,
  Clock,
  Sparkles,
  Activity,
  Pill,
  Stethoscope,
  TrendingUp,
  Settings,
  Users,
  LogOut,
  X,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import type { FamilyProfile } from "../../api/client";

export type NavTabId =
  | "overview"
  | "documents"
  | "timeline"
  | "chat"
  | "lab-reports"
  | "medications"
  | "visit-pack"
  | "insights"
  | "settings";

export interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: NavTabId) => void;
  isOpen: boolean;
  onClose: () => void;
  activeProfile: FamilyProfile | null;
  familyProfiles: FamilyProfile[];
  onSelectProfile: (profile: FamilyProfile) => void;
  counts?: {
    documents?: number;
    reminders?: number;
  };
  systemStatus?: "ok" | "wait" | "bad";
}

interface NavItem {
  id: NavTabId;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export function AppSidebar({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  activeProfile,
  familyProfiles,
  onSelectProfile,
  counts,
  systemStatus = "ok",
}: AppSidebarProps) {
  const mainNavItems: NavItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard size={19} />,
    },
    {
      id: "documents",
      label: "Health Records",
      icon: <FileText size={19} />,
      badge: counts?.documents,
    },
    {
      id: "timeline",
      label: "Medical Timeline",
      icon: <Clock size={19} />,
    },
    {
      id: "chat",
      label: "AI Health Assistant",
      icon: <Sparkles size={19} />,
    },
    {
      id: "lab-reports",
      label: "Lab Reports",
      icon: <Activity size={19} />,
    },
    {
      id: "medications",
      label: "Medications",
      icon: <Pill size={19} />,
      badge: counts?.reminders,
    },
    {
      id: "visit-pack",
      label: "Doctor Visit Preparation",
      icon: <Stethoscope size={19} />,
    },
    {
      id: "insights",
      label: "Health Insights",
      icon: <TrendingUp size={19} />,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings size={19} />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="hm-sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`hm-app-sidebar ${isOpen ? "is-mobile-open" : ""}`}
        role="navigation"
        aria-label="Main Navigation"
      >
        {/* Brand Header */}
        <div className="hm-sidebar-brand">
          <div className="hm-brand-icon-box">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="hm-brand-heart"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              <path d="M12 9v6" />
              <path d="M9 12h6" />
            </svg>
          </div>
          <div className="hm-brand-titles">
            <span className="hm-brand-name">HealthMate AI</span>
            <span className="hm-brand-edition">Clinical SaaS</span>
          </div>
          <button
            type="button"
            className="hm-sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Active Patient Profile Switcher Card */}
        {activeProfile && (
          <div className="hm-sidebar-profile-card">
            <div
              className="hm-profile-avatar"
              style={{ backgroundColor: activeProfile.avatar_color || "#0d9488" }}
            >
              {activeProfile.name[0]?.toUpperCase() || "P"}
            </div>
            <div className="hm-profile-details">
              <span className="hm-profile-patient-label">Active Patient</span>
              <span className="hm-profile-patient-name" title={activeProfile.name}>
                {activeProfile.name}
              </span>
              <span className="hm-profile-relationship-tag">
                {activeProfile.is_primary ? "Primary Account" : activeProfile.relationship}
              </span>
            </div>
            {familyProfiles.length > 1 && (
              <button
                type="button"
                className="hm-profile-switch-btn"
                onClick={() => onTabChange("settings")}
                title="Manage Family Profiles"
              >
                <Users size={14} />
              </button>
            )}
          </div>
        )}

        {/* Nav Items List */}
        <nav className="hm-sidebar-nav" role="tablist">
          <div className="hm-nav-group-label">Healthcare Navigation</div>
          {mainNavItems.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === "documents" && activeTab === "documents") ||
              (item.id === "lab-reports" && (activeTab === "lab-reports" || activeTab === "comparison")) ||
              (item.id === "medications" && (activeTab === "medications" || activeTab === "care" || activeTab === "reminders")) ||
              (item.id === "settings" && (activeTab === "settings" || activeTab === "family" || activeTab === "sharing" || activeTab === "quality" || activeTab === "infrastructure" || activeTab === "export" || activeTab === "knowledge"));

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={isActive}
                className={`hm-nav-item ${isActive ? "is-active" : ""}`}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
              >
                <span className="hm-nav-icon">{item.icon}</span>
                <span className="hm-nav-label">{item.label}</span>
                {item.badge !== undefined && Number(item.badge) > 0 && (
                  <span className="hm-nav-badge">{item.badge}</span>
                )}
                {isActive && <ChevronRight size={14} className="hm-nav-active-arrow" />}
              </button>
            );
          })}
        </nav>

        {/* Footer with System Status */}
        <div className="hm-sidebar-footer">
          <div className="hm-system-status-indicator">
            <span
              className={`hm-status-dot ${
                systemStatus === "ok" ? "is-online" : systemStatus === "wait" ? "is-checking" : "is-offline"
              }`}
            />
            <span className="hm-status-text">
              {systemStatus === "ok"
                ? "Clinical System Online"
                : systemStatus === "wait"
                ? "Checking Connectivity…"
                : "System Degraded"}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
