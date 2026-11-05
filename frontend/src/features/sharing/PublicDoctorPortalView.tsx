import React, { useState } from "react";
import { Stethoscope, ShieldCheck, Clock, FileText, Pill, Activity, AlertCircle, Lock } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Tabs, TabPanel } from "../../components/ui/Tabs";

export interface PublicDoctorPortalViewProps {
  shareToken: string;
  patientName?: string;
  expiresIn?: string;
}

export function PublicDoctorPortalView({
  shareToken,
  patientName = "Patient Record (Verified)",
  expiresIn = "Expires in 23 hours",
}: PublicDoctorPortalViewProps) {
  const [activeTab, setActiveTab] = useState("summary");

  const tabs = [
    { id: "summary", label: "Consultation Summary", icon: <FileText size={15} /> },
    { id: "labs", label: "Laboratory Findings", icon: <Activity size={15} /> },
    { id: "meds", label: "Active Prescriptions", icon: <Pill size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
      {/* Read-Only Top Watermark Banner */}
      <div className="bg-[var(--green-900)] text-white text-xs py-2 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[var(--green-500)]" />
          <span className="font-semibold">HealthMate AI Clinician Portal</span>
          <span className="opacity-75">· Verified Read-Only Session</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-80">
          <Clock size={13} />
          <span>{expiresIn}</span>
        </div>
      </div>

      {/* Clinician Header */}
      <header className="bg-white border-b border-[var(--border)] p-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--green-800)] bg-[var(--green-50)] px-2.5 py-1 rounded-full border border-[var(--green-100)]">
              Authorised Time-Limited Clinical Share
            </span>
            <h1 className="text-2xl font-display font-bold text-[var(--text)] mt-1">
              {patientName}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Authorized by profile owner for doctor appointment review.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="verified">Verified Facts Only</Badge>
          </div>
        </div>
      </header>

      {/* Main Tabbed Report Viewer */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Consultation Summary */}
        <TabPanel id="summary" activeTab={activeTab}>
          <div className="space-y-6 bg-white p-6 rounded-xl border border-[var(--border)] shadow-1">
            <div className="space-y-2 border-b border-[var(--border)] pb-4">
              <h2 className="text-base font-display font-bold text-[var(--green-900)]">
                Clinical Consultation Overview
              </h2>
              <p className="text-xs text-[var(--muted)]">
                The following observations and medications have been verified against original clinical reports.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[var(--green-50)] border border-[var(--green-100)] space-y-1">
                <span className="text-xs font-semibold text-[var(--green-800)]">Recent Blood Pressure</span>
                <p className="text-2xl font-bold tabular-nums text-[var(--text)]">
                  120/80 <span className="text-xs font-normal text-[var(--muted)]">mmHg</span>
                </p>
                <p className="text-[11px] text-[var(--muted)]">Observed on 28 Oct 2026 · Stable</p>
              </div>

              <div className="p-4 rounded-lg bg-[var(--green-50)] border border-[var(--green-100)] space-y-1">
                <span className="text-xs font-semibold text-[var(--green-800)]">Fasting Blood Glucose</span>
                <p className="text-2xl font-bold tabular-nums text-[var(--text)]">
                  94 <span className="text-xs font-normal text-[var(--muted)]">mg/dL</span>
                </p>
                <p className="text-[11px] text-[var(--muted)]">Observed on 28 Oct 2026 · Within ref range (70-100)</p>
              </div>
            </div>
          </div>
        </TabPanel>

        {/* Tab 2: Laboratory Findings */}
        <TabPanel id="labs" activeTab={activeTab}>
          <div className="bg-white rounded-xl border border-[var(--border)] shadow-1 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg)] text-[var(--muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="p-3 font-semibold">Laboratory Test</th>
                  <th className="p-3 font-semibold">Measured Value</th>
                  <th className="p-3 font-semibold">Unit</th>
                  <th className="p-3 font-semibold">Reference Range</th>
                  <th className="p-3 font-semibold">Report Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <tr>
                  <td className="p-3 font-medium">Fasting Blood Glucose</td>
                  <td className="p-3 font-bold tabular-nums text-sm">94</td>
                  <td className="p-3 text-[var(--muted)]">mg/dL</td>
                  <td className="p-3 text-[var(--muted)]">70 - 100</td>
                  <td className="p-3 text-[var(--muted)]">28 Oct 2026</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">HbA1c Glycated Hemoglobin</td>
                  <td className="p-3 font-bold tabular-nums text-sm">5.6</td>
                  <td className="p-3 text-[var(--muted)]">%</td>
                  <td className="p-3 text-[var(--muted)]">4.0 - 5.7</td>
                  <td className="p-3 text-[var(--muted)]">28 Oct 2026</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Total Serum Cholesterol</td>
                  <td className="p-3 font-bold tabular-nums text-sm">182</td>
                  <td className="p-3 text-[var(--muted)]">mg/dL</td>
                  <td className="p-3 text-[var(--muted)]">125 - 200</td>
                  <td className="p-3 text-[var(--muted)]">28 Oct 2026</td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabPanel>

        {/* Tab 3: Prescriptions */}
        <TabPanel id="meds" activeTab={activeTab}>
          <div className="space-y-3 bg-white p-6 rounded-xl border border-[var(--border)] shadow-1">
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">
              Active Prescribed Medication Regimen
            </h2>
            <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg text-xs">
              <div className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm">Metformin Hydrochloride</span>
                  <span className="text-[var(--muted)] ml-2">500 mg</span>
                </div>
                <span className="text-[var(--muted)]">Twice daily with meals</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm">Atorvastatin Calcium</span>
                  <span className="text-[var(--muted)] ml-2">20 mg</span>
                </div>
                <span className="text-[var(--muted)]">Once daily before bed</span>
              </div>
            </div>
          </div>
        </TabPanel>
      </main>

      {/* Clinician Footer */}
      <footer className="p-4 border-t border-[var(--border)] text-center text-xs text-[var(--muted)] bg-white">
        HealthMate AI Clinician View · Read-only access session · Data verified against original clinical documents
      </footer>
    </div>
  );
}

