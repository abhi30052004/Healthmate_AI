import React, { useEffect, useState } from "react";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import {
  createAppointment,
  createReminder,
  updateAppointment,
  type AppointmentRecord,
} from "../../api/client";
import { errorMessage, localDateTimeToIso, todayISO, toDateInput, toTimeInput } from "../../lib/dates";

const TYPES = ["Consultation", "Follow-up", "Lab work", "Imaging", "Vaccination", "Telehealth", "Other"];
const REMIND_OPTIONS = [
  { id: "none", label: "No reminder", minutes: 0 },
  { id: "1h", label: "1 hour before", minutes: 60 },
  { id: "1d", label: "1 day before", minutes: 24 * 60 },
  { id: "2d", label: "2 days before", minutes: 48 * 60 },
];

export interface AppointmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  profileId: string;
  profileName: string;
  editing?: AppointmentRecord | null;
  onSaved: (a: AppointmentRecord) => void;
}

export function AppointmentFormDialog({ open, onClose, token, profileId, profileName, editing, onSaved }: AppointmentFormDialogProps) {
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [remind, setRemind] = useState("1d");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      const d = new Date(editing.scheduled_at);
      setTitle(editing.title);
      setProvider(editing.provider_name ?? "");
      setType(editing.appointment_type ?? TYPES[0]);
      setDate(toDateInput(d));
      setTime(toTimeInput(d));
      setLocation(editing.location ?? "");
      setNotes(editing.notes ?? "");
    } else {
      setTitle("");
      setProvider("");
      setType(TYPES[0]);
      setDate(todayISO());
      setTime("10:00");
      setLocation("");
      setNotes("");
      setRemind("1d");
    }
  }, [open, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Enter the reason for the visit.");
      return;
    }
    if (!date || !time) {
      setError("Choose a date and time.");
      return;
    }
    const scheduledIso = localDateTimeToIso(date, time);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setError(null);
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        appointment_type: type,
        provider_name: provider.trim() || null,
        location: location.trim() || null,
        scheduled_at: scheduledIso,
        timezone,
        notes: notes.trim() || null,
      };
      const saved = editing
        ? await updateAppointment(token, editing.id, body)
        : await createAppointment(token, { ...body, profile_id: profileId });

      // Optional reminder (new appointments only). A failure here shouldn't lose the appointment.
      const opt = REMIND_OPTIONS.find((o) => o.id === remind);
      if (!editing && opt && opt.minutes > 0) {
        const dueAt = new Date(new Date(scheduledIso).getTime() - opt.minutes * 60_000);
        if (dueAt.getTime() > Date.now()) {
          try {
            await createReminder(token, {
              title: `Appointment: ${body.title}`,
              category: "appointment",
              due_at: dueAt.toISOString(),
              timezone,
              appointment_id: saved.id,
              profile_id: profileId,
            });
          } catch {
            /* surfaced as a toast by the caller via onSaved flag below */
          }
        }
      }
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err, "Couldn't save this appointment."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" title={editing ? "Edit appointment" : "Add appointment"} description={`For ${profileName}.`}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input label="Reason for visit" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diabetes check-up" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Doctor / clinic" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. Dr. Mukherjee" />
          <div className="space-y-1.5">
            <label htmlFor="appt-type" className="block text-sm font-medium">Type</label>
            <select id="appt-type" value={type} onChange={(e) => setType(e.target.value)} className="w-full min-h-[44px] px-3 rounded-md border border-[var(--border)] bg-white text-sm">
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" required min={editing ? undefined : todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Address, room or Telehealth" />
        <Textarea label="Questions / notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Things to ask or bring" />

        {!editing && (
          <div className="space-y-1.5">
            <label htmlFor="appt-remind" className="block text-sm font-medium">Remind me</label>
            <select id="appt-remind" value={remind} onChange={(e) => setRemind(e.target.value)} className="w-full min-h-[44px] px-3 rounded-md border border-[var(--border)] bg-white text-sm">
              {REMIND_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--muted)]">Shown in the bell menu while HealthMate is open. Best-effort, not for emergencies.</p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs text-[var(--danger)]">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? "Save changes" : "Add appointment"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
