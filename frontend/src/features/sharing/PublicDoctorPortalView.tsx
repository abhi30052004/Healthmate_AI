import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Clock, FileText, Pill, Calendar, AlertCircle, Download, Loader2 } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import {
  getSharedDocumentDownloadUrl,
  getSharedHealthPortalView,
  getSharedVisitPackDownloadUrl,
} from "../../api/client";
import { formatDate, formatDateTime } from "../../lib/dates";

export interface PublicDoctorPortalViewProps {
  shareToken: string;
}

export function PublicDoctorPortalView({ shareToken }: PublicDoctorPortalViewProps) {
  const query = useQuery({
    queryKey: ["shared-portal", shareToken],
    queryFn: () => getSharedHealthPortalView(shareToken),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  if (query.isLoading) {
    return (
      <div role="status" className="min-h-[50vh] flex items-center justify-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="animate-spin" size={18} aria-hidden="true" /> Opening shared records…
      </div>
    );
  }

  if (query.isError || !query.data) {
    const status = (query.error as { status?: number } | null)?.status;
    return (
      <div role="alert" className="max-w-md mx-auto mt-16 p-8 rounded-xl bg-white border border-[var(--border)] text-center space-y-3">
        <AlertCircle className="mx-auto text-[var(--warning)]" size={32} aria-hidden="true" />
        <h1 className="text-lg font-display font-bold">This link isn't available</h1>
        <p className="text-sm text-[var(--muted)]">
          {status === 0
            ? "We couldn't reach HealthMate. Check your connection and try again."
            : "It may have expired or been revoked by the patient, or the address may be mistyped. Please ask them for a new link."}
        </p>
      </div>
    );
  }

  const v = query.data;
  const r = v.shared_resources;

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] flex flex-col" data-testid="doctor-portal">
      <div className="bg-[var(--green-900)] text-white text-xs py-2 px-4 flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} aria-hidden="true" />
          <span className="font-semibold">HealthMate AI Clinician Portal</span>
          <span className="opacity-75">· Read-only</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-80">
          <Clock size={13} aria-hidden="true" />
          <span>Link valid until {formatDateTime(v.expires_at)}</span>
        </div>
      </div>

      <header className="bg-white border border-[var(--border)] border-t-0 p-6 rounded-b-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--green-800)] bg-[var(--green-50)] px-2.5 py-1 rounded-full border border-[var(--green-100)]">
              Shared with {v.doctor_name}
            </span>
            <h1 className="text-2xl font-display font-bold mt-1">{v.patient_name}</h1>
            <p className="text-xs text-[var(--muted)]">
              {[v.patient_age != null ? `${v.patient_age} years` : null, v.patient_gender, v.patient_relationship].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Badge variant="verified">Shared by the patient</Badge>
        </div>
        {v.notes && <p className="mt-4 p-3 rounded-lg bg-[var(--bg)] text-sm whitespace-pre-wrap"><span className="font-semibold">Note from patient: </span>{v.notes}</p>}
        {(v.allergies_summary || v.emergency_contact) && (
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {v.allergies_summary && (
              <div>
                <dt className="text-xs text-[var(--muted)]">Allergies (self-reported)</dt>
                <dd className="font-medium">{v.allergies_summary}</dd>
              </div>
            )}
            {v.emergency_contact && (
              <div>
                <dt className="text-xs text-[var(--muted)]">Emergency contact</dt>
                <dd className="font-medium">{v.emergency_contact}</dd>
              </div>
            )}
          </dl>
        )}
      </header>

      <main className="py-6 space-y-6">
        {r.include_visit_pack && v.has_visit_pack && (
          <Card className="p-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-semibold text-sm">Visit summary</h2>
              <p className="text-xs text-[var(--muted)]">A one-document summary prepared by the patient.</p>
            </div>
            <a href={getSharedVisitPackDownloadUrl(shareToken)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--green-700)] text-white text-xs font-semibold" download>
              <Download size={14} aria-hidden="true" /> Download PDF
            </a>
          </Card>
        )}

        {r.include_medications && (
          <section aria-label="Medications" className="space-y-2">
            <h2 className="text-sm font-display font-semibold flex items-center gap-2"><Pill size={15} aria-hidden="true" /> Medications</h2>
            {v.medications.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">None recorded.</p>
            ) : (
              <Card className="divide-y divide-[var(--border)]">
                {v.medications.map((m) => (
                  <div key={m.id} className="p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold">{m.name}</span> <span className="text-[var(--muted)]">{m.dosage}</span>
                      {m.notes && <p className="text-[var(--muted)] mt-0.5">{m.notes}</p>}
                    </div>
                    <span className="text-[var(--muted)]">{m.frequency}</span>
                  </div>
                ))}
              </Card>
            )}
          </section>
        )}

        {r.include_appointments && (
          <section aria-label="Appointments" className="space-y-2">
            <h2 className="text-sm font-display font-semibold flex items-center gap-2"><Calendar size={15} aria-hidden="true" /> Upcoming appointments</h2>
            {v.appointments.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">None recorded.</p>
            ) : (
              <Card className="divide-y divide-[var(--border)]">
                {v.appointments.map((a) => (
                  <div key={a.id} className="p-3 text-xs">
                    <span className="font-semibold">{a.doctor_name}</span> · {a.appointment_date ? formatDateTime(a.appointment_date) : ""}
                    {a.location && <span className="text-[var(--muted)]"> · {a.location}</span>}
                  </div>
                ))}
              </Card>
            )}
          </section>
        )}

        {v.documents.length > 0 && (
          <section aria-label="Reports" className="space-y-2">
            <h2 className="text-sm font-display font-semibold flex items-center gap-2"><FileText size={15} aria-hidden="true" /> Reports</h2>
            <Card className="divide-y divide-[var(--border)]">
              {v.documents.map((d) => (
                <div key={d.id} className="p-3 text-xs flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{d.title}</p>
                    <p className="text-[var(--muted)]">{d.document_date ? formatDate(d.document_date) : ""}</p>
                  </div>
                  <a href={getSharedDocumentDownloadUrl(shareToken, d.id, true)} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--green-800)] hover:underline shrink-0">
                    Open
                  </a>
                </div>
              ))}
            </Card>
          </section>
        )}
      </main>

      <footer className="pb-8 text-[11px] text-[var(--muted)] text-center">
        This information was supplied by the patient from their own records for discussion. HealthMate AI does not diagnose or prescribe. Access to this page is logged.
      </footer>
    </div>
  );
}
