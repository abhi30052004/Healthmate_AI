import React, { useState } from "react";
import {
  User,
  Users,
  Share2,
  ShieldAlert,
  Download,
  BookOpen,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
} from "lucide-react";
import { FamilyProfiles } from "../FamilyProfiles";
import { DoctorSharing } from "../DoctorSharing";
import { DataQualityCenter } from "../DataQualityCenter";
import { ExportCenter } from "../ExportCenter";
import { MedicalKnowledgeHub } from "../MedicalKnowledgeHub";
import { StatusBadge } from "../common/StatusBadge";
import type { FamilyProfile, DocumentItem, ReadyStatus } from "../../api/client";

export interface SettingsViewProps {
  user: any;
  token: string;
  activeProfile: FamilyProfile | null;
  familyProfiles: FamilyProfile[];
  onSelectProfile: (p: FamilyProfile) => void;
  onProfileUpdated: () => void;
  documents: DocumentItem[];
  conn: { api: "loading" | "ok" | "down"; ready?: ReadyStatus };
  onRefreshHealth: () => void;
  refreshing: boolean;
  onNavigateTab: (tab: string) => void;
  initialSection?:
    | "profile"
    | "family"
    | "sharing"
    | "quality"
    | "export"
    | "knowledge";
}

export function SettingsView({
  user,
  token,
  activeProfile,
  familyProfiles,
  onSelectProfile,
  onProfileUpdated,
  documents,
  conn,
  onRefreshHealth,
  refreshing,
  onNavigateTab,
  initialSection = "profile",
}: SettingsViewProps) {
  const [section, setSection] = useState<
    "profile" | "family" | "sharing" | "quality" | "export" | "knowledge"
  >(initialSection);

  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <div className="hm-settings-page">
      {/* Settings Top Header */}
      <div className="hm-page-header">
        <div className="hm-page-header-text">
          <div className="hm-pill-header">
            <Server size={14} className="text-teal" />
            <span>Workspace Administration & Platform Settings</span>
          </div>
          <h2>Settings & System Center</h2>
          <p>
            Manage your patient profile, family accounts, doctor sharing links, duplicate resolution, data exports, and infrastructure status.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="hm-settings-tabs-strip" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={section === "profile"}
          className={`hm-settings-tab-btn ${section === "profile" ? "is-active" : ""}`}
          onClick={() => setSection("profile")}
        >
          <User size={15} />
          <span>Profile & Infrastructure</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={section === "family"}
          className={`hm-settings-tab-btn ${section === "family" ? "is-active" : ""}`}
          onClick={() => setSection("family")}
        >
          <Users size={15} />
          <span>Family Profiles ({familyProfiles.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={section === "sharing"}
          className={`hm-settings-tab-btn ${section === "sharing" ? "is-active" : ""}`}
          onClick={() => setSection("sharing")}
        >
          <Share2 size={15} />
          <span>Secure Doctor Sharing</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={section === "quality"}
          className={`hm-settings-tab-btn ${section === "quality" ? "is-active" : ""}`}
          onClick={() => setSection("quality")}
        >
          <ShieldAlert size={15} />
          <span>Data Quality & Duplicates</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={section === "export"}
          className={`hm-settings-tab-btn ${section === "export" ? "is-active" : ""}`}
          onClick={() => setSection("export")}
        >
          <Download size={15} />
          <span>Clinical Export</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={section === "knowledge"}
          className={`hm-settings-tab-btn ${section === "knowledge" ? "is-active" : ""}`}
          onClick={() => setSection("knowledge")}
        >
          <BookOpen size={15} />
          <span>Knowledge Hub</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="hm-settings-content-pane">
        {section === "profile" && (
          <div className="hm-profile-infra-wrapper">
            {/* User Profile Card */}
            <div className="hm-card hm-settings-profile-card">
              <div className="hm-profile-header-strip">
                <div className="hm-profile-large-avatar">
                  {(user?.name || user?.email || "U")[0].toUpperCase()}
                </div>
                <div className="hm-profile-info-block">
                  <h3 className="hm-profile-display-name">{user?.name || "Registered User"}</h3>
                  <span className="hm-profile-email-badge">{user?.email}</span>
                </div>
                <div className="hm-profile-status-pill ml-auto">
                  <StatusBadge
                    variant={user?.is_active ? "success" : "danger"}
                    text={user?.is_active ? "Active Account" : "Inactive"}
                  />
                </div>
              </div>

              <div className="hm-profile-details-grid">
                <div className="hm-detail-box">
                  <span className="hm-detail-label">User Identifier (UUID)</span>
                  <code className="hm-detail-code">{user?.id}</code>
                </div>
                <div className="hm-detail-box">
                  <span className="hm-detail-label">Account Created</span>
                  <span className="hm-detail-value">{formattedDate}</span>
                </div>
                <div className="hm-detail-box">
                  <span className="hm-detail-label">Session Security</span>
                  <span className="hm-detail-value">Bearer Token (In-Memory / SessionStorage)</span>
                </div>
              </div>
            </div>

            {/* Infrastructure Readiness Section */}
            <div className="hm-card hm-settings-infra-card">
              <div className="hm-card-header">
                <div>
                  <h3 className="hm-card-title">Infrastructure & System Readiness</h3>
                  <p className="hm-card-subtitle">Real-time database connectivity and pgvector verification</p>
                </div>
                <button
                  type="button"
                  className="hm-btn hm-btn-sm hm-btn-secondary"
                  onClick={onRefreshHealth}
                  disabled={refreshing}
                >
                  <RefreshCw size={13} className={refreshing ? "badge-spin" : ""} />
                  <span>{refreshing ? "Checking…" : "Recheck Connectivity"}</span>
                </button>
              </div>

              <div className="hm-infra-cards-grid">
                <div className="hm-infra-stat-card">
                  <div className="hm-infra-stat-top">
                    <Server size={18} className="text-teal" />
                    <span className="hm-infra-title">FastAPI Service</span>
                    <StatusBadge
                      variant={conn.api === "ok" ? "success" : conn.api === "loading" ? "pending" : "danger"}
                      text={conn.api === "ok" ? "Connected" : conn.api === "loading" ? "Checking" : "Offline"}
                      size="sm"
                    />
                  </div>
                  <p className="hm-infra-desc">FastAPI clinical REST service on port 8000</p>
                </div>

                <div className="hm-infra-stat-card">
                  <div className="hm-infra-stat-top">
                    <Database size={18} className="text-blue" />
                    <span className="hm-infra-title">PostgreSQL Database</span>
                    <StatusBadge
                      variant={conn.ready?.database ? "success" : "pending"}
                      text={conn.ready?.database ? "Connected" : "—"}
                      size="sm"
                    />
                  </div>
                  <p className="hm-infra-desc">Relational ACID database engine</p>
                </div>

                <div className="hm-infra-stat-card">
                  <div className="hm-infra-stat-top">
                    <Cpu size={18} className="text-emerald" />
                    <span className="hm-infra-title">pgvector Extension</span>
                    <StatusBadge
                      variant={conn.ready?.pgvector ? "success" : "pending"}
                      text={conn.ready?.pgvector ? "Enabled" : "—"}
                      size="sm"
                    />
                  </div>
                  <p className="hm-infra-desc">High-dimensional vector embedding indices</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {section === "family" && (
          <FamilyProfiles
            token={token}
            activeProfile={activeProfile}
            onSelectProfile={onSelectProfile}
            onProfileUpdated={onProfileUpdated}
          />
        )}

        {section === "sharing" && (
          <DoctorSharing
            token={token}
            activeProfile={activeProfile}
            profiles={familyProfiles}
            documents={documents}
          />
        )}

        {section === "quality" && (
          <DataQualityCenter
            token={token}
            activeProfile={activeProfile}
            profiles={familyProfiles}
          />
        )}

        {section === "export" && <ExportCenter token={token} />}

        {section === "knowledge" && (
          <MedicalKnowledgeHub token={token} onNavigateTab={onNavigateTab} />
        )}
      </div>
    </div>
  );
}

