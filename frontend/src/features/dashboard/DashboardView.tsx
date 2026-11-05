import React, { useState } from "react";
import {
  Upload,
  Plus,
  TrendingUp,
  Activity,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardContent } from "../../components/ui/Card";
import { StatCard } from "../../components/health/StatCard";
import { DoseCard, type DoseItem } from "../../components/health/DoseCard";
import { AppointmentCard, ReviewQueueCard, ChangeCard } from "../../components/health/HealthCards";
import type { FamilyProfile, User, DocumentItem } from "../../api/client";

export interface DashboardViewProps {
  user: User | null;
  activeProfile: FamilyProfile | null;
  documents?: DocumentItem[];
  onNavigateTab: (tab: any) => void;
}

export function DashboardView({
  user,
  activeProfile,
  documents = [],
  onNavigateTab,
}: DashboardViewProps) {
  const patientName = activeProfile?.name || user?.name || "Patient";

  // Synthetic today's doses (sample for active profile)
  const [doses, setDoses] = useState<DoseItem[]>([
    {
      id: "dose-1",
      name: "Metformin Hydrochloride",
      dosage: "500 mg",
      time: "8:00 AM",
      instructions: "Take with food",
      status: "pending",
    },
    {
      id: "dose-2",
      name: "Atorvastatin Calcium",
      dosage: "20 mg",
      time: "9:00 PM",
      instructions: "Take before sleep",
      status: "pending",
    },
  ]);

  const handleTakeDose = (id: string) => {
    setDoses((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "taken" } : d))
    );
  };

  const handleSkipDose = (id: string) => {
    setDoses((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "skipped" } : d))
    );
  };

  const handleSnoozeDose = (id: string) => {
    setDoses((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "snoozed" } : d))
    );
  };

  // Check if profile has unverified documents
  const unverifiedDocs = documents.filter(
    (d) => d.processing_status === "extracted" || d.processing_status === "ocr_required"
  );

  return (
    <div className="space-y-8" data-testid="dashboard-view">
      {/* Header with Greeting & Action Buttons */}
      <PageHeader
        title={`Good day, ${patientName}`}
        subtitle={`Managing verified health records for ${activeProfile?.is_primary ? "your primary account" : `${activeProfile?.name} (${activeProfile?.relationship})`}.`}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Upload size={14} />}
              onClick={() => onNavigateTab("records")}
            >
              Upload Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={() => onNavigateTab("medicines")}
            >
              Log Vital / Dose
            </Button>
          </div>
        }
      />

      {/* Row 1: Today's Action Center (Medicines, Next Appointment, Alerts) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Today's Prescriptions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">
              Today's Prescriptions
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("medicines")}
              className="text-xs font-semibold text-[var(--green-700)] hover:underline"
            >
              View Schedule
            </button>
          </div>

          <div className="space-y-3">
            {doses.map((dose) => (
              <DoseCard
                key={dose.id}
                dose={dose}
                onTake={handleTakeDose}
                onSkip={handleSkipDose}
                onSnooze={handleSnoozeDnooze => handleSnoozeDose(dose.id)}
              />
            ))}
          </div>
        </div>

        {/* Next Appointment */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">
              Next Clinical Visit
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("appointments")}
              className="text-xs font-semibold text-[var(--green-700)] hover:underline"
            >
              All Visits
            </button>
          </div>

          <AppointmentCard
            doctor="Dr. Sourav Mukherjee"
            specialty="Consultant Cardiologist · Apex Heart Center"
            date="Friday, 14 Nov 2026"
            time="11:30 AM"
            checklistCompleted={2}
            checklistTotal={3}
            onPrepareClick={() => onNavigateTab("visit-pack")}
          />
        </div>

        {/* Review Queue / Alerts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">
              Clinical Review Queue
            </h2>
            <span className="text-xs text-[var(--muted)]">Human Verification</span>
          </div>

          <ReviewQueueCard
            count={unverifiedDocs.length > 0 ? unverifiedDocs.length : 1}
            documentTitle={
              unverifiedDocs[0]?.filename || "Comprehensive Metabolic & Lipid Panel.pdf"
            }
            extractedDate="Report dated 28 Oct 2026"
            onReviewClick={() => onNavigateTab("records")}
          />
        </div>
      </section>

      {/* Row 2: Latest Verified Clinical Measurements (StatCards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-bold text-[var(--green-900)]">
            Latest Verified Vitals & Lab Measurements
          </h2>
          <span className="text-xs text-[var(--muted)]">Derived from human-verified records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Blood Pressure"
            value="120/80"
            unit="mmHg"
            date="28 Oct 2026"
            delta={{ value: "+4 mmHg", isIncrease: true, period: "15 Aug 2026" }}
            isVerified={true}
            onClick={() => onNavigateTab("timeline")}
          />
          <StatCard
            label="Fasting Blood Glucose"
            value="94"
            unit="mg/dL"
            date="28 Oct 2026"
            delta={{ value: "-6 mg/dL", isIncrease: false, period: "15 Aug 2026" }}
            isVerified={true}
            onClick={() => onNavigateTab("timeline")}
          />
          <StatCard
            label="HbA1c Glycated Hemoglobin"
            value="5.6"
            unit="%"
            date="28 Oct 2026"
            delta={{ value: "0.0%", neutral: true, period: "15 Aug 2026" }}
            isVerified={true}
            onClick={() => onNavigateTab("timeline")}
          />
          <StatCard
            label="Total Serum Cholesterol"
            value="182"
            unit="mg/dL"
            date="28 Oct 2026"
            delta={{ value: "-12 mg/dL", isIncrease: false, period: "15 Aug 2026" }}
            isVerified={true}
            onClick={() => onNavigateTab("timeline")}
          />
        </div>
      </section>

      {/* Row 3: Rule-Based Shift Detection & Record Completeness */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* What Changed (Rule-Based Detection) */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[var(--green-700)]" />
              <h3 className="text-sm font-display font-semibold text-[var(--text)]">
                Longitudinal Changes (Rule-Based Detection)
              </h3>
            </div>
            <span className="text-[11px] text-[var(--muted)]">Verified Reports</span>
          </div>

          <div className="space-y-3 pt-1">
            <ChangeCard
              observation="Systolic Blood Pressure"
              previousValue="116"
              currentValue="120"
              unit="mmHg"
              period="Aug vs Oct 2026"
              neutralDescription="Observed within standard reference range on both comparative reports."
            />
            <ChangeCard
              observation="Serum Creatinine"
              previousValue="0.9"
              currentValue="0.88"
              unit="mg/dL"
              period="Aug vs Oct 2026"
              neutralDescription="Stable longitudinal value across two consecutive automated chemistry panels."
            />
          </div>
        </Card>

        {/* Record Completeness & Clinician Share Readiness */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[var(--green-700)]" />
                <h3 className="text-sm font-display font-semibold text-[var(--text)]">
                  Doctor Visit Pack Readiness
                </h3>
              </div>
              <span className="text-xs font-semibold text-[var(--green-600)]">85% Complete</span>
            </div>

            <p className="text-xs text-[var(--muted)] pt-2 leading-relaxed">
              Your recent lab findings, active prescriptions, and observation history are organized. You can generate a time-limited read-only QR code or export a consolidated PDF report for your upcoming consultation.
            </p>

            <div className="pt-2 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-[var(--text)]">
                <CheckCircle2 size={14} className="text-[var(--green-600)] shrink-0" />
                <span>Recent blood panels verified (28 Oct 2026)</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text)]">
                <CheckCircle2 size={14} className="text-[var(--green-600)] shrink-0" />
                <span>Current medication regimen active (2 items)</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text)]">
                <CheckCircle2 size={14} className="text-[var(--green-600)] shrink-0" />
                <span>Allergies and conditions reviewed</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] mt-4 flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateTab("visit-pack")}
              className="flex-1"
              iconRight={<ArrowRight size={14} />}
            >
              Generate Doctor Visit Pack
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("sharing")}
            >
              QR Share
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
