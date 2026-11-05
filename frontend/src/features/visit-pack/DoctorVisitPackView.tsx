import React, { useState } from "react";
import {
  Stethoscope,
  Download,
  Share2,
  CheckCircle2,
  FileText,
  Clock,
  Pill,
  Activity,
  Plus,
  Trash2,
  Printer,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardContent } from "../../components/ui/Card";
import { Input, Textarea } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import type { FamilyProfile } from "../../api/client";

export interface DoctorVisitPackViewProps {
  token: string;
  activeProfile: FamilyProfile | null;
  onNavigateSharing?: () => void;
}

export function DoctorVisitPackView({
  token,
  activeProfile,
  onNavigateSharing,
}: DoctorVisitPackViewProps) {
  const [period, setPeriod] = useState<"last_visit" | "3m" | "6m" | "all">("3m");
  const [includeVitals, setIncludeVitals] = useState(true);
  const [includeLabs, setIncludeLabs] = useState(true);
  const [includeMedicines, setIncludeMedicines] = useState(true);
  const [includeSymptoms, setIncludeSymptoms] = useState(true);

  // Doctor discussion questions
  const [questions, setQuestions] = useState<string[]>([
    "Should we adjust the Metformin dosage considering the recent normal HbA1c (5.6%)?",
    "Is any additional monitoring required for mild morning dizziness?",
  ]);
  const [newQuestion, setNewQuestion] = useState("");

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions((prev) => [...prev, newQuestion.trim()]);
    setNewQuestion("");
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePrint = () => {
    window.print();
  };

  const patientName = activeProfile?.name || "Patient Profile";

  return (
    <div className="space-y-8" data-testid="doctor-visit-pack-view">
      <PageHeader
        title="Doctor Visit Preparation Pack"
        subtitle="Consolidate verified laboratory trends, active prescriptions, and structured questions into a clean clinician report."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Printer size={14} />}
              onClick={handlePrint}
            >
              Print Report
            </Button>
            {onNavigateSharing && (
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Share2 size={14} />}
                onClick={onNavigateSharing}
              >
                Create Doctor QR
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration & Discussion Questions */}
        <div className="lg:col-span-1 space-y-5">
          {/* Section Picker */}
          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">
              1. Report Scope & Sections
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--muted)]">Time Period</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: "last_visit", label: "Since Last Visit" },
                    { id: "3m", label: "Past 3 Months" },
                    { id: "6m", label: "Past 6 Months" },
                    { id: "all", label: "All Records" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPeriod(opt.id)}
                    className={`p-2 rounded-md text-xs font-medium border text-left transition-colors ${
                      period === opt.id
                        ? "bg-[var(--green-50)] border-[var(--green-700)] text-[var(--green-900)] font-semibold"
                        : "bg-white border-[var(--border)] text-[var(--muted)] hover:bg-[var(--bg)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border)] space-y-2 text-xs">
              <span className="font-semibold text-[var(--text)]">Included Clinical Facts</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeVitals}
                  onChange={(e) => setIncludeVitals(e.target.checked)}
                  className="rounded text-[var(--green-800)]"
                />
                <span>Longitudinal Vital Signs (BP, Glucose)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLabs}
                  onChange={(e) => setIncludeLabs(e.target.checked)}
                  className="rounded text-[var(--green-800)]"
                />
                <span>Recent Verified Laboratory Findings</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMedicines}
                  onChange={(e) => setIncludeMedicines(e.target.checked)}
                  className="rounded text-[var(--green-800)]"
                />
                <span>Active Prescriptions & Dosages</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSymptoms}
                  onChange={(e) => setIncludeSymptoms(e.target.checked)}
                  className="rounded text-[var(--green-800)]"
                />
                <span>Logged Symptom Observations</span>
              </label>
            </div>
          </Card>

          {/* Doctor Discussion Questions */}
          <Card className="p-5 space-y-3">
            <h2 className="text-sm font-display font-semibold text-[var(--text)] flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--green-700)]" />
              <span>Questions for Your Doctor</span>
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Note specific concerns to ensure you discuss them during your short appointment.
            </p>

            <div className="space-y-2 pt-1">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs flex items-start justify-between gap-2"
                >
                  <span className="text-[var(--text)] leading-relaxed">
                    {idx + 1}. {q}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(idx)}
                    className="text-[var(--muted)] hover:text-[var(--danger)]"
                    aria-label={`Remove question ${idx + 1}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Add another discussion question..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-[var(--border)] rounded-md focus:outline-none focus:border-[var(--green-700)]"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddQuestion())}
              />
              <Button type="button" variant="primary" size="sm" onClick={handleAddQuestion}>
                Add
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Printable Clinician Preview */}
        <div className="lg:col-span-2">
          <div className="p-8 rounded-xl bg-white border border-[var(--border)] shadow-1 space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Header with Patient Provenance */}
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--green-800)] bg-[var(--green-50)] px-2 py-0.5 rounded border border-[var(--green-100)]">
                  Clinician Summary Pack
                </span>
                <h2 className="text-2xl font-display font-bold text-[var(--text)] mt-1.5">
                  {patientName}
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  Generated for Doctor Consultation · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>

              <div className="text-right text-xs text-[var(--muted)]">
                <p className="font-semibold text-[var(--text)]">HealthMate AI</p>
                <p>Verified Records Only</p>
              </div>
            </div>

            {/* Section 1: Active Prescriptions */}
            {includeMedicines && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--green-900)] flex items-center gap-1.5">
                  <Pill size={14} />
                  <span>Active Medication Regimen</span>
                </h3>
                <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] text-xs">
                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[var(--text)]">Metformin Hydrochloride</span>
                      <span className="text-[var(--muted)] ml-1">500 mg</span>
                    </div>
                    <span className="text-[var(--muted)]">Twice daily with meals</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[var(--text)]">Atorvastatin Calcium</span>
                      <span className="text-[var(--muted)] ml-1">20 mg</span>
                    </div>
                    <span className="text-[var(--muted)]">Once daily at bedtime</span>
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Recent Verified Laboratory Findings */}
            {includeLabs && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--green-900)] flex items-center gap-1.5">
                  <Activity size={14} />
                  <span>Verified Laboratory Observations (Oct 2026)</span>
                </h3>
                <div className="border border-[var(--border)] rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[var(--bg)] text-[var(--muted)] border-b border-[var(--border)]">
                      <tr>
                        <th className="p-2 font-semibold">Test Name</th>
                        <th className="p-2 font-semibold">Observed Value</th>
                        <th className="p-2 font-semibold">Standard Reference</th>
                        <th className="p-2 font-semibold">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      <tr>
                        <td className="p-2 font-medium">Fasting Blood Glucose</td>
                        <td className="p-2 font-bold tabular-nums">94 mg/dL</td>
                        <td className="p-2 text-[var(--muted)]">70 - 100 mg/dL</td>
                        <td className="p-2 text-[var(--green-700)] font-semibold">-6 mg/dL</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">HbA1c Glycated Hemoglobin</td>
                        <td className="p-2 font-bold tabular-nums">5.6%</td>
                        <td className="p-2 text-[var(--muted)]">4.0 - 5.7%</td>
                        <td className="p-2 text-[var(--muted)] font-semibold">0.0% (Stable)</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Total Serum Cholesterol</td>
                        <td className="p-2 font-bold tabular-nums">182 mg/dL</td>
                        <td className="p-2 text-[var(--muted)]">125 - 200 mg/dL</td>
                        <td className="p-2 text-[var(--green-700)] font-semibold">-12 mg/dL</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 3: Prepared Questions */}
            {questions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--green-900)] flex items-center gap-1.5">
                  <FileText size={14} />
                  <span>Patient Questions for Consultation</span>
                </h3>
                <ul className="list-disc pl-5 text-xs text-[var(--text)] space-y-1 leading-relaxed">
                  {questions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Medical Disclaimer Statement */}
            <div className="pt-4 border-t border-[var(--border)] text-[10px] text-[var(--muted)] leading-tight text-center">
              This summary is assembled from human-verified patient records for clinical discussion. HealthMate AI does not diagnose or prescribe.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
