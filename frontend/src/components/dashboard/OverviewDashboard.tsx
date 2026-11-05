import React, { useEffect, useState } from "react";
import {
  FileText,
  Upload,
  Stethoscope,
  Sparkles,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Pill,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Eye,
} from "lucide-react";
import { HealthStatCard } from "../common/HealthStatCard";
import { StatusBadge } from "../common/StatusBadge";
import { HealthTrendChart, type DataPoint } from "../common/HealthTrendChart";
import { AIInsightCard } from "../common/AIInsightCard";
import { DoctorVisitPackCard } from "../common/DoctorVisitPackCard";
import type { DocumentItem, FamilyProfile } from "../../api/client";
import {
  listReminders,
  listMedications,
  listAppointments,
  type ReminderItem,
  type MedicationRecord,
  type AppointmentRecord,
} from "../../api/client";

export interface OverviewDashboardProps {
  user: any;
  token: string | null;
  activeProfile: FamilyProfile | null;
  documents: DocumentItem[];
  docsLoading: boolean;
  onNavigateTab: (tab: any) => void;
  onViewDocument: (doc: DocumentItem) => void;
  systemStatus: "ok" | "wait" | "bad";
}

export function OverviewDashboard({
  user,
  token,
  activeProfile,
  documents,
  docsLoading,
  onNavigateTab,
  onViewDocument,
  systemStatus,
}: OverviewDashboardProps) {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchOverviewExtras = async () => {
      try {
        setLoadingExtras(true);
        const [rems, meds, appts] = await Promise.allSettled([
          listReminders(token, { profile_id: activeProfile?.id }),
          listMedications(token, { profile_id: activeProfile?.id }),
          listAppointments(token, { profile_id: activeProfile?.id }),
        ]);
        if (rems.status === "fulfilled") setReminders(rems.value);
        if (meds.status === "fulfilled") setMedications(meds.value);
        if (appts.status === "fulfilled") setAppointments(appts.value);
      } catch {
        // Non-blocking
      } finally {
        setLoadingExtras(false);
      }
    };
    fetchOverviewExtras();
  }, [token, activeProfile?.id]);

  const totalDocs = documents.length;
  const verifiedDocs = documents.filter((d) => d.is_verified).length;
  const extractedDocs = documents.filter((d) => d.processing_status === "extracted").length;

  const recentDocs = documents.slice(0, 5);
  const activeReminders = reminders.filter((r) => r.is_enabled).slice(0, 4);
  const activeMeds = medications.filter((m) => m.status === "active").slice(0, 4);

  // Sample data points for trend chart preview
  const sampleGlucoseTrends: DataPoint[] = [
    { date: "2025-04-15", value: 104, unit: "mg/dL", flag: "NORMAL" },
    { date: "2025-07-20", value: 112, unit: "mg/dL", flag: "HIGH" },
    { date: "2025-10-10", value: 108, unit: "mg/dL", flag: "HIGH" },
    { date: "2026-01-14", value: 101, unit: "mg/dL", flag: "NORMAL" },
  ];

  return (
    <div className="hm-overview-page">
      {/* Welcome Banner */}
      <section className="hm-welcome-banner">
        <div className="hm-welcome-content">
          <div className="hm-welcome-badge-strip">
            <span className="hm-patient-badge">
              Active: <strong>{activeProfile?.name || user?.name || "Patient Profile"}</strong>
              {activeProfile?.is_primary && " (Primary)"}
            </span>
          </div>

          <h1 className="hm-welcome-title">
            Welcome, {user?.name || "Clinician"}
          </h1>

          <p className="hm-welcome-subtitle">
            Personal health record intelligence. Review longitudinal trends, verify uploaded medical reports, and prepare for upcoming clinician appointments.
          </p>
        </div>

        {/* Quick Actions Strip */}
        <div className="hm-quick-actions-bar">
          <button
            type="button"
            className="hm-btn hm-btn-primary"
            onClick={() => onNavigateTab("documents")}
          >
            <Upload size={16} />
            <span>Upload Medical Report</span>
          </button>

          <button
            type="button"
            className="hm-btn hm-btn-secondary"
            onClick={() => onNavigateTab("visit-pack")}
          >
            <Stethoscope size={16} />
            <span>Prepare Doctor Visit</span>
          </button>

          <button
            type="button"
            className="hm-btn hm-btn-secondary"
            onClick={() => onNavigateTab("chat")}
          >
            <Sparkles size={16} />
            <span>Ask AI Assistant</span>
          </button>

          <button
            type="button"
            className="hm-btn hm-btn-secondary"
            onClick={() => onNavigateTab("quick-reference")}
          >
            <Activity size={16} />
            <span>Quick Reference AI</span>
          </button>
        </div>
      </section>

      {/* KPI Stats Strip */}
      <section className="hm-stats-grid">
        <HealthStatCard
          title="Uploaded Reports"
          value={totalDocs}
          subtitle="Clinical documents & lab records"
          icon={<FileText size={22} />}
          iconBg="blue"
          onClick={() => onNavigateTab("documents")}
        />

        <HealthStatCard
          title="Text Extracted"
          value={extractedDocs}
          subtitle="Processed by OCR & AI parsers"
          icon={<Activity size={22} />}
          iconBg="teal"
          trend={{ value: `${totalDocs ? Math.round((extractedDocs / totalDocs) * 100) : 0}%`, direction: "up", label: "extracted" }}
          onClick={() => onNavigateTab("documents")}
        />

        <HealthStatCard
          title="User Verified"
          value={verifiedDocs}
          subtitle="Confirmed against source PDF"
          icon={<CheckCircle2 size={22} />}
          iconBg="emerald"
          onClick={() => onNavigateTab("documents")}
        />

        <HealthStatCard
          title="System Readiness"
          value={systemStatus === "ok" ? "Online" : systemStatus === "wait" ? "Checking" : "Offline"}
          subtitle="PostgreSQL & pgvector ready"
          icon={<ShieldCheck size={22} />}
          iconBg={systemStatus === "ok" ? "emerald" : "amber"}
          badge={
            <StatusBadge
              variant={systemStatus === "ok" ? "success" : systemStatus === "wait" ? "pending" : "danger"}
              text={systemStatus === "ok" ? "Connected" : systemStatus === "wait" ? "Connecting" : "Unreachable"}
              size="sm"
            />
          }
          onClick={() => onNavigateTab("settings")}
        />
      </section>

      {/* Main Grid: Left (Recent Reports) & Right (Medications & Reminders) */}
      <div className="hm-overview-twocol-grid">
        {/* Left Column: Recent Medical Reports */}
        <div className="hm-overview-col-left">
          <div className="hm-card hm-recent-reports-card">
            <div className="hm-card-header">
              <div>
                <h3 className="hm-card-title">Recent Uploaded Reports</h3>
                <p className="hm-card-subtitle">Latest laboratory findings and clinical summaries</p>
              </div>
              <button
                type="button"
                className="hm-btn hm-btn-sm hm-btn-ghost"
                onClick={() => onNavigateTab("documents")}
              >
                <span>View All ({totalDocs})</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="hm-recent-reports-list">
              {docsLoading ? (
                <div className="hm-loading-state-p">Loading records…</div>
              ) : recentDocs.length === 0 ? (
                <div className="hm-overview-empty-block">
                  <FileText size={32} className="text-muted" />
                  <p>No medical records uploaded yet.</p>
                  <button
                    type="button"
                    className="hm-btn hm-btn-sm hm-btn-primary"
                    onClick={() => onNavigateTab("documents")}
                  >
                    Upload First Document
                  </button>
                </div>
              ) : (
                recentDocs.map((doc) => (
                  <div key={doc.id} className="hm-overview-doc-row">
                    <div className="hm-doc-row-left">
                      <div className="hm-doc-icon-pill">
                        <FileText size={18} className="text-teal" />
                      </div>
                      <div className="hm-doc-details">
                        <span className="hm-doc-filename" title={doc.filename}>
                          {doc.filename}
                        </span>
                        <span className="hm-doc-date">
                          {new Date(doc.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })} • {(doc.file_size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>

                    <div className="hm-doc-row-right">
                      <StatusBadge
                        variant={doc.processing_status === "extracted" ? "extracted" : "neutral"}
                        text={doc.processing_status === "extracted" ? "Extracted" : doc.processing_status}
                        size="sm"
                      />
                      {doc.is_verified && (
                        <StatusBadge variant="verified" text="Verified" size="sm" />
                      )}
                      <button
                        type="button"
                        className="hm-btn hm-btn-xs hm-btn-secondary"
                        onClick={() => onViewDocument(doc)}
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Key Lab Trends Chart Preview */}
          <div className="hm-card hm-trends-preview-card">
            <div className="hm-card-header">
              <div>
                <h3 className="hm-card-title">Longitudinal Health Trends</h3>
                <p className="hm-card-subtitle">Fasting blood glucose trajectory over time</p>
              </div>
              <button
                type="button"
                className="hm-btn hm-btn-sm hm-btn-ghost"
                onClick={() => onNavigateTab("lab-reports")}
              >
                <span>Full Lab Analytics</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <HealthTrendChart
              title="Fasting Blood Glucose"
              dataPoints={sampleGlucoseTrends}
              unit="mg/dL"
              referenceRange={{ low: 70, high: 99, text: "70 – 99 mg/dL" }}
              category="Metabolic Panel"
            />
          </div>
        </div>

        {/* Right Column: Medications, Reminders, and Visit Pack */}
        <div className="hm-overview-col-right">
          {/* Upcoming Reminders & Active Medications */}
          <div className="hm-card hm-reminders-card">
            <div className="hm-card-header">
              <div>
                <h3 className="hm-card-title">Medications & Smart Reminders</h3>
                <p className="hm-card-subtitle">Active prescriptions & daily health schedules</p>
              </div>
              <button
                type="button"
                className="hm-btn hm-btn-sm hm-btn-ghost"
                onClick={() => onNavigateTab("medications")}
              >
                <span>Manage</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="hm-reminders-list">
              {activeMeds.length > 0 ? (
                activeMeds.map((med) => (
                  <div key={med.id} className="hm-reminder-item">
                    <div className="hm-reminder-icon-box is-med">
                      <Pill size={15} />
                    </div>
                    <div className="hm-reminder-text">
                      <span className="hm-reminder-title">{med.name}</span>
                      <span className="hm-reminder-sub">{med.dosage_instructions}</span>
                    </div>
                  </div>
                ))
              ) : activeReminders.length > 0 ? (
                activeReminders.map((rem) => (
                  <div key={rem.id} className="hm-reminder-item">
                    <div className="hm-reminder-icon-box is-rem">
                      <Clock size={15} />
                    </div>
                    <div className="hm-reminder-text">
                      <span className="hm-reminder-title">{rem.title}</span>
                      <span className="hm-reminder-sub">Scheduled: {new Date(rem.due_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="hm-overview-empty-block">
                  <Pill size={28} className="text-muted" />
                  <p>No active medications or reminders registered.</p>
                  <button
                    type="button"
                    className="hm-btn hm-btn-xs hm-btn-secondary"
                    onClick={() => onNavigateTab("medications")}
                  >
                    Add Medication
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Doctor Visit Pack Summary */}
          <DoctorVisitPackCard
            doctorName="Dr. Sarah Jenkins, MD"
            specialty="Internal Medicine & Preventive Care"
            appointmentDate="2026-11-15T09:30:00Z"
            reasonForVisit="Annual comprehensive health review & longitudinal lab trend evaluation"
            keyObservationsCount={4}
            questionsCount={3}
            medicationsCount={activeMeds.length || 2}
            status="ready"
            onOpen={() => onNavigateTab("visit-pack")}
          />

          {/* Recent AI Insights Card */}
          <AIInsightCard
            title="Metabolic Profile Shift Detected"
            description="Fasting blood glucose decreased from 108 mg/dL to 101 mg/dL, showing stabilization toward normal reference bounds."
            category="Metabolic"
            type="shift"
            sourceDocument="Comprehensive Metabolic Panel (Jan 2026)"
            date="2026-01-14"
            metric={{
              name: "Fasting Glucose",
              previous: 108,
              current: 101,
              unit: "mg/dL",
              delta: "-6.5%",
              direction: "down",
            }}
            onDiscuss={() => onNavigateTab("chat")}
            onViewSource={() => onNavigateTab("documents")}
          />
        </div>
      </div>

      {/* Safety Notice Footer */}
      <footer className="hm-overview-disclaimer" role="note">
        <AlertCircle size={16} className="text-teal" />
        <p>
          <strong>Non-Diagnostic Medical Disclaimer:</strong> HealthMate AI organizes medical records and visualizes laboratory trends to support meaningful conversations with licensed clinicians. It does not provide medical diagnoses, treatment decisions, or independent prescriptions.
        </p>
      </footer>
    </div>
  );
}
