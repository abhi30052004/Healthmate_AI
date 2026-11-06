import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Share2, FileText, Pill, Activity, Plus, Trash2, Printer, Sparkles, Download, Calendar, Stethoscope } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorState } from "../../components/feedback/States";
import { profileQueryKeys } from "../../app/queryClient";
import {
  exportVisitPackPdf,
  generateVisitPackDraft,
  listSymptoms,
  type DoctorVisitPackData,
  type FamilyProfile,
} from "../../api/client";
import { errorMessage, formatDate, toDateInput, todayISO } from "../../lib/dates";

export interface DoctorVisitPackViewProps {
  token: string;
  activeProfile: FamilyProfile | null;
  onNavigateSharing?: () => void;
}

type Period = "3m" | "6m" | "1y" | "all" | "custom";

function periodStart(p: Period): string {
  if (p === "all" || p === "custom") return "";
  const d = new Date();
  d.setMonth(d.getMonth() - (p === "3m" ? 3 : p === "6m" ? 6 : 12));
  return toDateInput(d);
}

const SECTIONS = [
  { id: "medications", label: "Medications" },
  { id: "observations", label: "Lab results & vitals" },
  { id: "trends", label: "Changes between results" },
  { id: "care_schedule", label: "Appointments & to-dos" },
  { id: "documents", label: "Source documents" },
] as const;

export function DoctorVisitPackView({ token, activeProfile, onNavigateSharing }: DoctorVisitPackViewProps) {
  const profileId = activeProfile?.id ?? "";
  const [period, setPeriod] = useState<Period>("3m");
  const [from, setFrom] = useState(periodStart("3m"));
  const [to, setTo] = useState("");
  const [sections, setSections] = useState<string[]>(SECTIONS.map((s) => s.id));
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const [includeSymptoms, setIncludeSymptoms] = useState(true);
  const [reason, setReason] = useState("");
  const [clinician, setClinician] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const draftKey = [profileId, from, to, sections.join(","), includeUnverified];
  const draft = useQuery({
    queryKey: [...profileQueryKeys.visitPack(profileId), ...draftKey],
    queryFn: () =>
      generateVisitPackDraft(token, {
        profile_id: profileId,
        start_date: from || null,
        end_date: to || null,
        include_unverified: includeUnverified,
        categories: [...sections, "clinician_questions", "patient_notes"],
        chief_complaint: null,
        clinician_name: null,
      }),
    enabled: !!profileId,
  });

  const symptomsQuery = useQuery({
    queryKey: profileQueryKeys.symptoms(profileId),
    queryFn: () => listSymptoms(token, profileId),
    enabled: !!profileId && includeSymptoms,
  });

  const symptoms = useMemo(
    () =>
      (symptomsQuery.data ?? []).filter((s) => {
        if (!s.include_in_visit_pack) return false;
        const day = toDateInput(new Date(s.occurred_at));
        return (!from || day >= from) && (!to || day <= to);
      }),
    [symptomsQuery.data, from, to]
  );

  const toggleSection = (id: string) => setSections((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const toggleExclude = (id: string) =>
    setExcluded((cur) => {
      const next = new Set(cur);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const data = draft.data;
  const suggested = (data?.clinician_questions ?? []).filter((q) => q.included);

  const buildFinalPack = (): DoctorVisitPackData | null => {
    if (!data) return null;
    const symptomLines = includeSymptoms
      ? symptoms.map((s) => `${formatDate(s.occurred_at)}: ${s.title} (${s.severity})${s.notes ? ` - ${s.notes}` : ""}`)
      : [];
    return {
      ...data,
      chief_complaint: reason.trim() || null,
      clinician_name: clinician.trim() || null,
      patient_notes: symptomLines.length ? `Symptoms I noted (my own words, not interpreted):\n${symptomLines.join("\n")}` : null,
      documents: data.documents,
      observations: data.observations.map((o) => ({ ...o, included: o.included && !excluded.has(o.observation_id) })),
      trends: data.trends.map((t) => ({ ...t, included: t.included && !excluded.has(`trend:${t.test_name}`) })),
      medications: data.medications.map((m) => ({ ...m, included: m.included && !excluded.has(m.id) })),
      appointments: data.appointments.map((a) => ({ ...a, included: a.included && !excluded.has(a.id) })),
      clinician_questions: [
        ...questions.map((q) => ({ question: q, rationale: null, source_reference: null, included: true })),
        ...data.clinician_questions.map((q) => ({ ...q, included: q.included && !excluded.has(`q:${q.question}`) })),
      ],
    };
  };

  const handleExport = async () => {
    const pack = buildFinalPack();
    if (!pack) return;
    setExporting(true);
    try {
      const blob = await exportVisitPackPdf(token, pack);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `HealthMate-visit-pack-${(activeProfile?.name ?? "profile").replace(/\s+/g, "-")}-${todayISO()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Visit pack downloaded.");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't create the PDF."));
    } finally {
      setExporting(false);
    }
  };

  const addQuestion = () => {
    const q = newQuestion.trim();
    if (!q) return;
    setQuestions((cur) => [...cur, q]);
    setNewQuestion("");
  };

  const rowCheck = (id: string) => (
    <input
      type="checkbox"
      aria-label="Include in pack"
      checked={!excluded.has(id)}
      onChange={() => toggleExclude(id)}
      className="print:hidden"
    />
  );

  return (
    <div className="space-y-8" data-testid="doctor-visit-pack-view">
      <PageHeader
        title="Doctor Visit Pack"
        subtitle="Choose what to include, add your questions, then print, download as PDF, or share a read-only link."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" iconLeft={<Printer size={14} />} onClick={() => window.print()} disabled={!data}>
              Print
            </Button>
            <Button variant="outline" size="sm" iconLeft={<Download size={14} />} onClick={handleExport} loading={exporting} disabled={!data}>
              Download PDF
            </Button>
            {onNavigateSharing && (
              <Button variant="primary" size="sm" iconLeft={<Share2 size={14} />} onClick={onNavigateSharing}>
                Share with doctor
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-5 print:hidden">
          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-display font-semibold">1. What to include</h2>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[var(--muted)]">Period</span>
              <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Period">
                {(["3m", "6m", "1y", "all"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={period === p}
                    onClick={() => {
                      setPeriod(p);
                      setFrom(periodStart(p));
                      setTo("");
                    }}
                    className={`p-2 rounded-md text-xs font-semibold border uppercase ${period === p ? "bg-[var(--green-50)] border-[var(--green-700)] text-[var(--green-900)]" : "border-[var(--border)] text-[var(--muted)]"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="From"
                  type="date"
                  max={to || todayISO()}
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPeriod("custom");
                  }}
                />
                <Input
                  label="To"
                  type="date"
                  min={from || undefined}
                  max={todayISO()}
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPeriod("custom");
                  }}
                />
              </div>
            </div>

            <fieldset className="pt-2 border-t border-[var(--border)] space-y-2 text-xs">
              <legend className="font-semibold">Sections</legend>
              {SECTIONS.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={sections.includes(s.id)} onChange={() => toggleSection(s.id)} />
                  <span>{s.label}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeSymptoms} onChange={(e) => setIncludeSymptoms(e.target.checked)} />
                <span>My symptom journal entries</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeUnverified} onChange={(e) => setIncludeUnverified(e.target.checked)} />
                <span>Include values I haven't verified (labelled)</span>
              </label>
            </fieldset>

            <div className="pt-2 border-t border-[var(--border)] space-y-3">
              <Input label="Reason for visit" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
              <Input label="Doctor / clinic" value={clinician} onChange={(e) => setClinician(e.target.value)} placeholder="Optional" />
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="text-sm font-display font-semibold flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--green-700)]" aria-hidden="true" />
              2. Your questions
            </h2>
            <p className="text-xs text-[var(--muted)]">Write down what you want to ask so it isn't forgotten in a short appointment.</p>
            <ul className="space-y-2">
              {questions.map((q, idx) => (
                <li key={idx} className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs flex items-start justify-between gap-2">
                  <span className="leading-relaxed">{idx + 1}. {q}</span>
                  <button type="button" onClick={() => setQuestions((c) => c.filter((_, i) => i !== idx))} className="text-[var(--muted)] hover:text-[var(--danger)]" aria-label={`Remove question ${idx + 1}`}>
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addQuestion();
              }}
            >
              <input
                aria-label="Add a question"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Add a question…"
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-[var(--border)] rounded-md"
              />
              <Button type="submit" size="sm" iconLeft={<Plus size={13} />} disabled={!newQuestion.trim()}>
                Add
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="p-8 rounded-xl bg-white border border-[var(--border)] shadow-1 space-y-6 print:border-none print:shadow-none print:p-0" data-testid="visit-pack-preview">
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--green-800)] bg-[var(--green-50)] px-2 py-0.5 rounded border border-[var(--green-100)]">
                  Visit summary
                </span>
                <h2 className="text-2xl font-display font-bold mt-1.5">{activeProfile?.name}</h2>
                <p className="text-xs text-[var(--muted)]">
                  Prepared {formatDate(todayISO())}
                  {from || to ? ` · Records ${from ? `from ${formatDate(from)}` : ""}${to ? ` to ${formatDate(to)}` : ""}` : " · All records"}
                </p>
                {(reason || clinician) && (
                  <p className="text-xs mt-1">
                    {clinician && <span className="font-semibold">{clinician}</span>}
                    {clinician && reason && " · "}
                    {reason}
                  </p>
                )}
              </div>
              <div className="text-right text-xs text-[var(--muted)]">
                <p className="font-semibold text-[var(--text)]">HealthMate AI</p>
                <p>{includeUnverified ? "Includes unverified values" : "Verified records only"}</p>
              </div>
            </div>

            {draft.isLoading ? (
              <div className="space-y-3">
                <Skeleton height={80} rounded="lg" />
                <Skeleton height={140} rounded="lg" />
              </div>
            ) : draft.isError ? (
              <ErrorState title="Couldn't build the preview" message={errorMessage(draft.error)} onRetry={() => draft.refetch()} />
            ) : data ? (
              <>
                {data.medications.length > 0 && sections.includes("medications") && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--green-900)] flex items-center gap-1.5"><Pill size={14} aria-hidden="true" /> Medications</h3>
                    <ul className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] text-xs">
                      {data.medications.map((m) => (
                        <li key={m.id} className={`p-2.5 flex items-center gap-3 ${excluded.has(m.id) ? "opacity-40" : ""}`}>
                          {rowCheck(m.id)}
                          <div className="flex-1">
                            <span className="font-semibold">{m.name}</span>
                            {m.strength && <span className="text-[var(--muted)] ml-1">{m.strength}</span>}
                          </div>
                          <span className="text-[var(--muted)]">{[m.dosage_instructions, m.frequency].filter(Boolean).join(" · ")}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {data.observations.length > 0 && sections.includes("observations") && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--green-900)] flex items-center gap-1.5"><Activity size={14} aria-hidden="true" /> Results</h3>
                    <div className="border border-[var(--border)] rounded-lg overflow-x-auto text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-[var(--bg)] text-[var(--muted)] border-b border-[var(--border)]">
                          <tr>
                            <th className="p-2 print:hidden" />
                            <th className="p-2 font-semibold">Test</th>
                            <th className="p-2 font-semibold">Value</th>
                            <th className="p-2 font-semibold">Report range</th>
                            <th className="p-2 font-semibold">Date</th>
                            <th className="p-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {data.observations.map((o) => (
                            <tr key={o.observation_id} className={excluded.has(o.observation_id) ? "opacity-40" : ""}>
                              <td className="p-2">{rowCheck(o.observation_id)}</td>
                              <td className="p-2 font-medium">{o.test_name}</td>
                              <td className="p-2 font-bold tabular-nums">{o.value} {o.unit}</td>
                              <td className="p-2 text-[var(--muted)]">{o.reference_range || "—"}</td>
                              <td className="p-2 text-[var(--muted)]">{formatDate(o.clinical_date)}</td>
                              <td className="p-2">{o.is_verified ? "Verified" : <span className="text-[var(--warning)] font-semibold">Unverified</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {data.trends.length > 0 && sections.includes("trends") && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--green-900)]">Recorded changes</h3>
                    <ul className="text-xs space-y-1.5">
                      {data.trends.map((t) => (
                        <li key={t.test_name} className={`flex items-start gap-2 ${excluded.has(`trend:${t.test_name}`) ? "opacity-40" : ""}`}>
                          {rowCheck(`trend:${t.test_name}`)}
                          <span><span className="font-semibold">{t.test_name}:</span> {t.change_description}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {data.appointments.length > 0 && sections.includes("care_schedule") && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--green-900)] flex items-center gap-1.5"><Calendar size={14} aria-hidden="true" /> Appointments</h3>
                    <ul className="text-xs space-y-1">
                      {data.appointments.map((a) => (
                        <li key={a.id} className={`flex items-start gap-2 ${excluded.has(a.id) ? "opacity-40" : ""}`}>
                          {rowCheck(a.id)}
                          <span>{formatDate(a.scheduled_at)}: {a.title}{a.provider_name ? ` (${a.provider_name})` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {includeSymptoms && symptoms.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--green-900)] flex items-center gap-1.5"><Stethoscope size={14} aria-hidden="true" /> Symptoms I noted</h3>
                    <ul className="text-xs space-y-1">
                      {symptoms.map((s) => (
                        <li key={s.id}>
                          <span className="font-semibold">{formatDate(s.occurred_at)}:</span> {s.title} <span className="text-[var(--muted)]">({s.severity})</span>
                          {s.notes ? <span className="text-[var(--muted)]"> {s.notes}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {(questions.length > 0 || suggested.length > 0) && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--green-900)] flex items-center gap-1.5"><FileText size={14} aria-hidden="true" /> Questions for the doctor</h3>
                    <ul className="list-disc pl-5 text-xs space-y-1 leading-relaxed">
                      {questions.map((q, i) => (
                        <li key={`m${i}`}>{q}</li>
                      ))}
                      {suggested.map((q) => (
                        <li key={q.question} className={excluded.has(`q:${q.question}`) ? "opacity-40" : ""}>
                          <label className="inline-flex items-center gap-2 -ml-5">
                            {rowCheck(`q:${q.question}`)}
                            <span>{q.question}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {data.observations.length === 0 && data.medications.length === 0 && symptoms.length === 0 && questions.length === 0 && (
                  <p className="text-xs text-[var(--muted)] p-4 border border-dashed border-[var(--border)] rounded-lg">
                    Nothing matches these filters yet. Widen the period, or add records, medications and symptoms.
                  </p>
                )}
              </>
            ) : null}

            <div className="pt-4 border-t border-[var(--border)] text-[10px] text-[var(--muted)] leading-tight text-center">
              {data?.disclaimer ?? "This summary is assembled from the patient's own records for discussion with a clinician. HealthMate AI does not diagnose or prescribe."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
