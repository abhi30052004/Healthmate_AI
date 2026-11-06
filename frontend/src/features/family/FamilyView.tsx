import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Archive, UserCheck, Users } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Dialog } from "../../components/ui/Dialog";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { Input, Textarea } from "../../components/ui/Input";
import {
  createFamilyProfile,
  deactivateFamilyProfile,
  updateFamilyProfile,
  type FamilyProfile,
  type FamilyProfileCreatePayload,
  type GenderType,
  type RelationshipType,
} from "../../api/client";
import { errorMessage, formatDate, todayISO } from "../../lib/dates";

const RELATIONSHIPS: { id: RelationshipType; label: string }[] = [
  { id: "spouse", label: "Spouse / partner" },
  { id: "child", label: "Child" },
  { id: "parent", label: "Parent" },
  { id: "sibling", label: "Sibling" },
  { id: "dependent", label: "Other dependent" },
  { id: "other", label: "Other" },
];
const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export interface FamilyViewProps {
  token: string;
  activeProfile: FamilyProfile | null;
  profiles?: FamilyProfile[];
  onProfilesChanged?: () => Promise<unknown> | void;
  onSelectProfile?: (profile: FamilyProfile) => void;
}

interface FormState {
  name: string;
  relationship: RelationshipType;
  date_of_birth: string;
  gender: GenderType | "";
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  allergies_summary: string;
  conditions_summary: string;
  consent_notes: string;
}

const EMPTY: FormState = {
  name: "",
  relationship: "child",
  date_of_birth: "",
  gender: "",
  blood_type: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  allergies_summary: "",
  conditions_summary: "",
  consent_notes: "",
};

function toForm(p: FamilyProfile): FormState {
  return {
    name: p.name,
    relationship: p.relationship,
    date_of_birth: p.date_of_birth ?? "",
    gender: p.gender ?? "",
    blood_type: p.blood_type ?? "",
    emergency_contact_name: p.emergency_contact_name ?? "",
    emergency_contact_phone: p.emergency_contact_phone ?? "",
    allergies_summary: p.allergies_summary ?? "",
    conditions_summary: p.conditions_summary ?? "",
    consent_notes: p.consent_notes ?? "",
  };
}

export function FamilyView({ token, activeProfile, profiles = [], onProfilesChanged, onSelectProfile }: FamilyViewProps) {
  const [editing, setEditing] = useState<FamilyProfile | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<FamilyProfile | null>(null);

  useEffect(() => {
    if (formOpen) {
      setError(null);
      setForm(editing ? toForm(editing) : EMPTY);
    }
  }, [formOpen, editing]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        relationship: form.relationship,
        date_of_birth: form.date_of_birth || null,
        gender: (form.gender || null) as GenderType | null,
        blood_type: form.blood_type || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        allergies_summary: form.allergies_summary.trim() || null,
        conditions_summary: form.conditions_summary.trim() || null,
        consent_notes: form.consent_notes.trim() || null,
      };
      if (editing) {
        // The primary profile's relationship is fixed server-side.
        const { relationship, ...rest } = body;
        return updateFamilyProfile(token, editing.id, editing.is_primary ? rest : body);
      }
      const create: FamilyProfileCreatePayload = {
        ...body,
        is_dependent: form.relationship === "child" || form.relationship === "dependent",
        consent_status: "authorized",
      };
      return createFamilyProfile(token, create);
    },
    onSuccess: async (saved) => {
      toast.success(editing ? "Profile updated." : `${saved.name} added.`);
      setFormOpen(false);
      await onProfilesChanged?.();
    },
    onError: (e) => setError(errorMessage(e, "Couldn't save this profile.")),
  });

  const archive = useMutation({
    mutationFn: (p: FamilyProfile) => deactivateFamilyProfile(token, p.id),
    onSuccess: async (res) => {
      toast.success(`${res.name} archived. ${res.record_retention_note}`);
      setArchiving(null);
      await onProfilesChanged?.();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Enter a name.");
      return;
    }
    if (form.date_of_birth && form.date_of_birth > todayISO()) {
      setError("Date of birth can't be in the future.");
      return;
    }
    setError(null);
    save.mutate();
  };

  return (
    <div className="space-y-8" data-testid="family-view">
      <PageHeader
        title="Family Health Profiles"
        subtitle="Keep each person's records separate. Switching profiles changes everything you see."
        actions={
          <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            Add family profile
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {profiles.map((p) => {
          const active = p.id === activeProfile?.id;
          const s = p.health_summary;
          return (
            <Card key={p.id} className={`p-5 space-y-4 ${active ? "border-[var(--green-600)] ring-1 ring-[var(--green-600)]" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={p.name} />
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-xs text-[var(--muted)] capitalize">{p.is_primary ? "You (primary)" : p.relationship}</p>
                  </div>
                </div>
                {active && <Badge variant="verified" size="sm">Viewing</Badge>}
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-[var(--muted)]">Born</dt>
                <dd>{p.date_of_birth ? formatDate(p.date_of_birth) : "—"}</dd>
                <dt className="text-[var(--muted)]">Blood type</dt>
                <dd>{p.blood_type || "—"}</dd>
                <dt className="text-[var(--muted)]">Allergies</dt>
                <dd className="truncate" title={p.allergies_summary ?? ""}>{p.allergies_summary || "—"}</dd>
              </dl>

              {s && (
                <p className="text-[11px] text-[var(--muted)] pt-2 border-t border-[var(--border)]">
                  {s.document_count} records · {s.medication_count} medications · {s.appointment_count} appointments
                </p>
              )}

              <div className="flex items-center gap-2">
                {!active && onSelectProfile && (
                  <Button variant="primary" size="sm" className="flex-1 text-xs" iconLeft={<UserCheck size={13} />} onClick={() => onSelectProfile(p)}>
                    Switch to {p.name.split(" ")[0]}
                  </Button>
                )}
                <Button variant="outline" size="sm" className={active || !onSelectProfile ? "flex-1 text-xs" : "text-xs"} iconLeft={<Pencil size={13} />} onClick={() => { setEditing(p); setFormOpen(true); }}>
                  Edit
                </Button>
                {!p.is_primary && (
                  <button type="button" aria-label={`Archive ${p.name}`} title="Archive" onClick={() => setArchiving(p)} className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]">
                    <Archive size={15} />
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-[var(--muted)] flex items-center gap-1.5">
        <Users size={13} aria-hidden="true" />
        Profiles belong to your account. Sharing with a caregiver or doctor is done from the Sharing page.
      </p>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="lg" title={editing ? `Edit ${editing.name}` : "Add family profile"} description="Only add details you're comfortable storing. Everything except the name is optional.">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Full name" required autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} />
            <div className="space-y-1.5">
              <label htmlFor="fam-rel" className="block text-sm font-medium">Relationship</label>
              <select id="fam-rel" disabled={!!editing?.is_primary} value={editing?.is_primary ? "self" : form.relationship} onChange={(e) => set("relationship", e.target.value as RelationshipType)} className="w-full min-h-[44px] px-3 rounded-md border border-[var(--border)] bg-white text-sm disabled:opacity-60">
                {editing?.is_primary && <option value="self">Myself</option>}
                {RELATIONSHIPS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            <Input label="Date of birth" type="date" max={todayISO()} value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
            <div className="space-y-1.5">
              <label htmlFor="fam-gender" className="block text-sm font-medium">Gender</label>
              <select id="fam-gender" value={form.gender} onChange={(e) => set("gender", e.target.value as GenderType | "")} className="w-full min-h-[44px] px-3 rounded-md border border-[var(--border)] bg-white text-sm">
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fam-blood" className="block text-sm font-medium">Blood type</label>
              <select id="fam-blood" value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)} className="w-full min-h-[44px] px-3 rounded-md border border-[var(--border)] bg-white text-sm">
                {BLOOD_TYPES.map((b) => (
                  <option key={b} value={b}>{b || "Unknown"}</option>
                ))}
              </select>
            </div>
            <span />
            <Input label="Emergency contact name" value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
            <Input label="Emergency contact phone" type="tel" value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
          </div>
          <Textarea label="Known allergies" value={form.allergies_summary} onChange={(e) => set("allergies_summary", e.target.value)} placeholder="e.g. Penicillin (rash)" />
          <Textarea label="Known conditions" value={form.conditions_summary} onChange={(e) => set("conditions_summary", e.target.value)} placeholder="As told by a doctor, e.g. Type 2 diabetes" />
          {!editing && (
            <Input label="Consent note" value={form.consent_notes} onChange={(e) => set("consent_notes", e.target.value)} hint="Optional. For example: managing on behalf of my parent, with their agreement." />
          )}
          {error && (
            <p role="alert" className="text-xs text-[var(--danger)]">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{editing ? "Save changes" : "Add profile"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!archiving} onClose={() => setArchiving(null)} maxWidth="sm" title={`Archive ${archiving?.name ?? ""}?`} description="They'll disappear from the profile switcher. Their records are kept, not deleted.">
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => setArchiving(null)}>Cancel</Button>
          <Button variant="danger" loading={archive.isPending} onClick={() => archiving && archive.mutate(archiving)}>Archive profile</Button>
        </div>
      </Dialog>
    </div>
  );
}
