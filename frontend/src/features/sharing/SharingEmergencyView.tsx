import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Copy, Check, Plus, Heart, Phone, Printer, ShieldAlert, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input, Textarea } from "../../components/ui/Input";
import { Dialog } from "../../components/ui/Dialog";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../../components/feedback/States";
import {
  createDoctorShare,
  disableEmergencyLink,
  enableEmergencyLink,
  getEmergencyLink,
  getDoctorShareAudit,
  listDoctorShares,
  listDocuments,
  revokeDoctorShare,
  updateFamilyProfile,
  type DoctorSharingCreateResponse,
  type DoctorSharingItem,
  type FamilyProfile,
} from "../../api/client";
import { errorMessage, formatDate, formatDateTime } from "../../lib/dates";

/** The doctor link lives under the web app's /s/:token route. */
export const buildShareUrl = (accessToken: string) => `${window.location.origin}/s/${accessToken}`;

/** The public emergency card (no login) lives under /e/:token. */
export const buildEmergencyUrl = (cardToken: string) => `${window.location.origin}/e/${cardToken}`;

export interface SharingEmergencyViewProps {
  token: string;
  activeProfile: FamilyProfile | null;
  onProfilesChanged?: () => Promise<unknown> | void;
}

const DURATIONS = [
  { days: 1, label: "24 hours" },
  { days: 3, label: "3 days" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

export function SharingEmergencyView({ token, activeProfile, onProfilesChanged }: SharingEmergencyViewProps) {
  const queryClient = useQueryClient();
  const profileId = activeProfile?.id ?? "";
  const [tab, setTab] = useState<"qr" | "emergency">("qr");

  // ---------------- Doctor shares
  const sharesKey = ["doctor-shares", profileId];
  const shares = useQuery({
    queryKey: sharesKey,
    queryFn: () => listDoctorShares(token, profileId),
    enabled: !!profileId,
  });
  const docs = useQuery({
    queryKey: ["documents", profileId],
    queryFn: () => listDocuments(token, profileId),
    enabled: !!profileId,
  });
  const verifiedDocs = (docs.data ?? []).filter((d) => d.is_verified && d.file_size > 0);

  const [createOpen, setCreateOpen] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [days, setDays] = useState(7);
  const [incVisitPack, setIncVisitPack] = useState(true);
  const [incMeds, setIncMeds] = useState(true);
  const [incAppts, setIncAppts] = useState(false);
  const [docIds, setDocIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<DoctorSharingCreateResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<DoctorSharingItem | null>(null);
  const [auditFor, setAuditFor] = useState<DoctorSharingItem | null>(null);

  const audit = useQuery({
    queryKey: ["share-audit", auditFor?.id],
    queryFn: () => getDoctorShareAudit(token, auditFor!.id),
    enabled: !!auditFor,
  });

  const create = useMutation({
    mutationFn: () =>
      createDoctorShare(token, {
        profile_id: profileId,
        doctor_name: doctorName.trim(),
        doctor_email: doctorEmail.trim() || null,
        expires_in_days: days,
        notes: notes.trim() || null,
        shared_resources: {
          document_ids: docIds,
          include_visit_pack: incVisitPack,
          visit_pack_categories: ["documents", "observations", "medications", "appointments"],
          include_medications: incMeds,
          include_appointments: incAppts,
        },
      }),
    onSuccess: (res) => {
      setCreateOpen(false);
      setCreated(res);
      setDoctorName("");
      setDoctorEmail("");
      setNotes("");
      setDocIds([]);
      queryClient.invalidateQueries({ queryKey: sharesKey });
    },
    onError: (e) => setFormError(errorMessage(e, "Couldn't create the share link.")),
  });

  const revoke = useMutation({
    mutationFn: (s: DoctorSharingItem) => revokeDoctorShare(token, s.id),
    onSuccess: () => {
      toast.success("Link revoked. It stops working immediately.");
      setRevoking(null);
      queryClient.invalidateQueries({ queryKey: sharesKey });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submitShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim()) return setFormError("Enter the doctor or clinic this is for.");
    if (!incVisitPack && !incMeds && !incAppts && docIds.length === 0) return setFormError("Choose at least one thing to share.");
    setFormError(null);
    create.mutate();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  };

  // ---------------- Emergency card (edits the profile itself)
  const [em, setEm] = useState({ blood_type: "", allergies: "", conditions: "", contactName: "", contactPhone: "" });
  useEffect(() => {
    setEm({
      blood_type: activeProfile?.blood_type ?? "",
      allergies: activeProfile?.allergies_summary ?? "",
      conditions: activeProfile?.conditions_summary ?? "",
      contactName: activeProfile?.emergency_contact_name ?? "",
      contactPhone: activeProfile?.emergency_contact_phone ?? "",
    });
  }, [activeProfile]);

  const saveCard = useMutation({
    mutationFn: () =>
      updateFamilyProfile(token, profileId, {
        blood_type: em.blood_type.trim() || null,
        allergies_summary: em.allergies.trim() || null,
        conditions_summary: em.conditions.trim() || null,
        emergency_contact_name: em.contactName.trim() || null,
        emergency_contact_phone: em.contactPhone.trim() || null,
      }),
    onSuccess: async () => {
      toast.success("Emergency card saved.");
      await onProfilesChanged?.();
    },
    onError: (e) => toast.error(errorMessage(e, "Couldn't save the emergency card.")),
  });

  // Public emergency QR: off by default; the owner decides to publish it.
  const emLinkKey = ["emergency-link", profileId];
  const emLink = useQuery({
    queryKey: emLinkKey,
    queryFn: () => getEmergencyLink(token, profileId),
    enabled: !!profileId && tab === "emergency",
  });
  const changeEmLink = useMutation({
    mutationFn: (action: "on" | "rotate" | "off") =>
      action === "off"
        ? disableEmergencyLink(token, profileId)
        : enableEmergencyLink(token, profileId, action === "rotate"),
    onSuccess: (data, action) => {
      queryClient.setQueryData(emLinkKey, data);
      toast.success(
        action === "off" ? "Public emergency QR turned off." : action === "rotate" ? "New QR created. Old printed QR codes no longer work." : "Public emergency QR is on."
      );
    },
    onError: (e) => toast.error(errorMessage(e, "Couldn't update the emergency QR.")),
  });
  const emUrl = emLink.data?.enabled && emLink.data.token ? buildEmergencyUrl(emLink.data.token) : null;

  const tabClass = (a: boolean) =>
    `px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 ${a ? "bg-[var(--green-50)] text-[var(--green-900)] border border-[var(--green-100)]" : "text-[var(--muted)]"}`;

  return (
    <div className="space-y-8" data-testid="sharing-emergency-view">
      <PageHeader
        title="Doctor Sharing & Emergency Card"
        subtitle="Give a doctor a time-limited, read-only link you can revoke at any time, and keep a printable emergency card."
        actions={
          tab === "qr" && (
            <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => { setFormError(null); setCreateOpen(true); }}>
              New share link
            </Button>
          )
        }
      />

      <div role="tablist" aria-label="Sharing sections" className="inline-flex p-1 rounded-lg bg-white border border-[var(--border)] print:hidden">
        <button type="button" role="tab" aria-selected={tab === "qr"} onClick={() => setTab("qr")} className={tabClass(tab === "qr")}>
          <QrCode size={15} aria-hidden="true" /> Doctor links
        </button>
        <button type="button" role="tab" aria-selected={tab === "emergency"} onClick={() => setTab("emergency")} className={tabClass(tab === "emergency")}>
          <Heart size={15} aria-hidden="true" /> Emergency card
        </button>
      </div>

      {tab === "qr" && (
        <section className="space-y-4" aria-label="Doctor links">
          {shares.isLoading ? (
            <Skeleton height={120} rounded="lg" />
          ) : shares.isError ? (
            <ErrorState title="Couldn't load share links" message={errorMessage(shares.error)} onRetry={() => shares.refetch()} />
          ) : (shares.data ?? []).length === 0 ? (
            <EmptyState title="No share links yet" description={`Create a link to let a doctor see selected records for ${activeProfile?.name ?? "this profile"}. You choose what's included and for how long.`} actionLabel="New share link" onAction={() => setCreateOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(shares.data ?? []).map((s) => {
                const live = s.status === "active" && !s.is_expired;
                const r = s.shared_resources;
                return (
                  <Card key={s.id} className="p-5 space-y-3" data-testid="share-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{s.doctor_name}</p>
                        <p className="text-xs text-[var(--muted)]">Created {formatDate(s.created_at)}</p>
                      </div>
                      <Badge variant={live ? "verified" : "unverified"} size="sm">
                        {s.status === "revoked" ? "Revoked" : s.is_expired ? "Expired" : "Active"}
                      </Badge>
                    </div>
                    <ul className="text-xs text-[var(--muted)] space-y-0.5">
                      <li>{live ? "Expires" : "Expired"} {formatDateTime(s.expires_at)}</li>
                      <li>
                        Shares:{" "}
                        {[
                          r.document_ids.length ? `${r.document_ids.length} document${r.document_ids.length > 1 ? "s" : ""}` : null,
                          r.include_visit_pack ? "visit pack" : null,
                          r.include_medications ? "medications" : null,
                          r.include_appointments ? "appointments" : null,
                        ].filter(Boolean).join(", ")}
                      </li>
                      <li>Opened {s.access_count} time{s.access_count === 1 ? "" : "s"}{s.last_accessed_at ? `, last ${formatDateTime(s.last_accessed_at)}` : ""}</li>
                    </ul>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setAuditFor(s)}>
                        Access log
                      </Button>
                      {live && (
                        <Button variant="danger" size="sm" className="text-xs" iconLeft={<Trash2 size={13} />} onClick={() => setRevoking(s)}>
                          Revoke
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          <p className="text-xs text-[var(--muted)]">
            For security, the full link is only shown once when you create it. If you lose it, revoke the share and create a new one.
          </p>
        </section>
      )}

      {tab === "emergency" && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-label="Emergency card">
          <Card className="p-5 space-y-4 print:hidden">
            <h2 className="text-sm font-display font-semibold">What's on the card</h2>
            <p className="text-xs text-[var(--muted)]">These fields are saved on {activeProfile?.name}'s profile. Only add what you want a first responder to see.</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Blood type" value={em.blood_type} onChange={(e) => setEm({ ...em, blood_type: e.target.value })} placeholder="e.g. O+" />
              <span />
              <Input label="Emergency contact" value={em.contactName} onChange={(e) => setEm({ ...em, contactName: e.target.value })} />
              <Input label="Contact phone" type="tel" value={em.contactPhone} onChange={(e) => setEm({ ...em, contactPhone: e.target.value })} />
            </div>
            <Textarea label="Allergies" value={em.allergies} onChange={(e) => setEm({ ...em, allergies: e.target.value })} />
            <Textarea label="Known conditions" value={em.conditions} onChange={(e) => setEm({ ...em, conditions: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" iconLeft={<Printer size={14} />} onClick={() => window.print()}>Print card</Button>
              <Button size="sm" loading={saveCard.isPending} onClick={() => saveCard.mutate()}>Save</Button>
            </div>
          </Card>

          <div className="space-y-4 self-start">
          <div className="p-5 rounded-2xl bg-[var(--green-900)] text-white space-y-3 print:bg-white print:text-black print:border" data-testid="emergency-card">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <ShieldAlert size={16} aria-hidden="true" /> Emergency medical info
            </div>
            <p className="text-2xl font-display font-bold">{activeProfile?.name}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase opacity-70">Blood type</dt>
                <dd className="font-semibold">{em.blood_type || "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase opacity-70">Date of birth</dt>
                <dd className="font-semibold">{activeProfile?.date_of_birth ? formatDate(activeProfile.date_of_birth) : "Not recorded"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] uppercase opacity-70">Allergies</dt>
                <dd className="font-semibold whitespace-pre-wrap">{em.allergies || "None recorded"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] uppercase opacity-70">Conditions</dt>
                <dd className="font-semibold whitespace-pre-wrap">{em.conditions || "None recorded"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] uppercase opacity-70 flex items-center gap-1"><Phone size={10} aria-hidden="true" /> Emergency contact</dt>
                <dd className="font-semibold">{em.contactName || "Not recorded"} {em.contactPhone}</dd>
              </div>
            </dl>
            <p className="text-[10px] opacity-70">Self-reported information. Not a medical record. Updated {formatDate(activeProfile?.updated_at)}.</p>
          </div>

          <Card className="p-5 space-y-3" data-testid="emergency-qr-card">
            <h2 className="text-sm font-display font-semibold flex items-center gap-2"><QrCode size={15} aria-hidden="true" /> Emergency QR (no login needed)</h2>
            {emLink.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : emUrl ? (
              <>
                <div className="flex justify-center p-4 bg-white border border-[var(--border)] rounded-xl">
                  <QRCodeSVG value={emUrl} size={160} title="QR code for the emergency card" />
                </div>
                <input readOnly aria-label="Emergency card link" value={emUrl} onFocus={(e) => e.target.select()} className="w-full min-h-[40px] px-3 text-xs font-mono border border-[var(--border)] rounded-md bg-[var(--bg)] print:hidden" />
                <p className="text-xs text-[var(--muted)] print:hidden">
                  Anyone who scans this sees only what is on the card above: name, age, blood type, allergies, conditions and your emergency contact. Print it for a wallet or phone lock screen.
                </p>
                <div className="flex flex-wrap justify-end gap-2 print:hidden">
                  <Button variant="outline" size="sm" loading={changeEmLink.isPending} onClick={() => changeEmLink.mutate("rotate")}>New QR (cancel old)</Button>
                  <Button variant="outline" size="sm" loading={changeEmLink.isPending} onClick={() => changeEmLink.mutate("off")}>Turn off</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-[var(--muted)]">
                  Off right now, so nobody can see this card without your say-so. Turn it on to get a QR that a first responder can scan without logging in. You can turn it off or replace it at any time.
                </p>
                <div className="flex justify-end">
                  <Button size="sm" loading={changeEmLink.isPending} onClick={() => changeEmLink.mutate("on")}>Turn on emergency QR</Button>
                </div>
              </>
            )}
          </Card>
          </div>
        </section>
      )}

      {/* Create share */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="lg" title="New doctor link" description={`Read-only access to selected records for ${activeProfile?.name ?? "this profile"}.`}>
        <form onSubmit={submitShare} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Doctor or clinic" required autoFocus value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
            <Input label="Doctor's email" type="email" value={doctorEmail} onChange={(e) => setDoctorEmail(e.target.value)} hint="Optional. We don't email the link." />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="share-days" className="block text-sm font-medium">Link works for</label>
            <select id="share-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full min-h-[44px] px-3 rounded-md border border-[var(--border)] bg-white text-sm">
              {DURATIONS.map((d) => (
                <option key={d.days} value={d.days}>{d.label}</option>
              ))}
            </select>
          </div>
          <fieldset className="space-y-2 text-xs">
            <legend className="text-sm font-medium">What can they see?</legend>
            <label className="flex items-center gap-2"><input type="checkbox" checked={incVisitPack} onChange={(e) => setIncVisitPack(e.target.checked)} /> Visit pack (summary PDF)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={incMeds} onChange={(e) => setIncMeds(e.target.checked)} /> Current medications</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={incAppts} onChange={(e) => setIncAppts(e.target.checked)} /> Upcoming appointments</label>
          </fieldset>
          <fieldset className="space-y-2 text-xs">
            <legend className="text-sm font-medium">Reports to include</legend>
            {verifiedDocs.length === 0 ? (
              <p className="text-[var(--muted)]">No verified uploaded reports yet.</p>
            ) : (
              <ul className="max-h-40 overflow-y-auto space-y-1.5 border border-[var(--border)] rounded-lg p-2">
                {verifiedDocs.map((d) => (
                  <li key={d.id}>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={docIds.includes(d.id)} onChange={(e) => setDocIds((cur) => (e.target.checked ? [...cur, d.id] : cur.filter((x) => x !== d.id)))} />
                      <span className="truncate">{d.filename}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
          <Textarea label="Note for the doctor" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          {formError && <p role="alert" className="text-xs text-[var(--danger)]">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create link</Button>
          </div>
        </form>
      </Dialog>

      {/* One-time reveal */}
      <Dialog open={!!created} onClose={() => setCreated(null)} maxWidth="md" title="Link created" description="Copy it now. For your security it can't be shown again.">
        {created && (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white border border-[var(--border)] rounded-xl">
              <QRCodeSVG value={buildShareUrl(created.access_token)} size={176} title="QR code for the doctor link" />
            </div>
            <div className="flex gap-2">
              <input readOnly aria-label="Share link" value={buildShareUrl(created.access_token)} onFocus={(e) => e.target.select()} className="flex-1 min-h-[40px] px-3 text-xs font-mono border border-[var(--border)] rounded-md bg-[var(--bg)]" />
              <Button variant="outline" size="sm" iconLeft={copied ? <Check size={14} /> : <Copy size={14} />} onClick={() => copy(buildShareUrl(created.access_token))}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-[var(--muted)]">Valid until {formatDateTime(created.expires_at)}. Anyone with this link can view what you selected, so only send it to the intended doctor.</p>
            <div className="flex justify-end"><Button onClick={() => setCreated(null)}>Done</Button></div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!revoking} onClose={() => setRevoking(null)} maxWidth="sm" title="Revoke this link?" description="The doctor will lose access immediately.">
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => setRevoking(null)}>Cancel</Button>
          <Button variant="danger" loading={revoke.isPending} onClick={() => revoking && revoke.mutate(revoking)}>Revoke</Button>
        </div>
      </Dialog>

      <Dialog open={!!auditFor} onClose={() => setAuditFor(null)} maxWidth="lg" title={`Access log: ${auditFor?.doctor_name ?? ""}`} description="Every time this link was used.">
        {audit.isLoading ? (
          <Skeleton height={80} rounded="lg" />
        ) : audit.isError ? (
          <p role="alert" className="text-xs text-[var(--danger)]">{errorMessage(audit.error)}</p>
        ) : (audit.data ?? []).length === 0 ? (
          <p className="text-xs text-[var(--muted)]">Not opened yet.</p>
        ) : (
          <ul className="text-xs divide-y divide-[var(--border)]">
            {(audit.data ?? []).map((a) => (
              <li key={a.id} className="py-2 flex justify-between gap-3">
                <span className="font-medium">{a.event_type.replace(/_/g, " ")}</span>
                <span className="text-[var(--muted)]">{formatDateTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
