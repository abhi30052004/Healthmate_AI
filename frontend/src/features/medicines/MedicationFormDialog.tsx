import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import {
  createMedication,
  updateMedication,
  type MedicationRecord,
} from "../../api/client";
import { errorMessage, todayISO } from "../../lib/dates";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PRESETS: { id: string; label: string; times: string[] }[] = [
  { id: "once", label: "Once daily", times: ["08:00"] },
  { id: "twice", label: "Twice daily", times: ["08:00", "20:00"] },
  { id: "thrice", label: "Three times daily", times: ["08:00", "14:00", "20:00"] },
  { id: "prn", label: "As needed (no reminders)", times: [] },
];

export interface MedicationFormDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  profileId: string;
  profileName: string;
  /** When set, the dialog edits this medication instead of creating one. */
  editing?: MedicationRecord | null;
  onSaved: (med: MedicationRecord) => void;
}

function frequencyLabel(times: string[]): string {
  if (times.length === 0) return "As needed";
  if (times.length === 1) return "Once daily";
  if (times.length === 2) return "Twice daily";
  return `${times.length} times daily`;
}

export function MedicationFormDialog({
  open,
  onClose,
  token,
  profileId,
  profileName,
  editing,
  onSaved,
}: MedicationFormDialogProps) {
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [instructions, setInstructions] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [days, setDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [prescriber, setPrescriber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset the form whenever the dialog opens (for a new or an existing medication).
  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(editing?.name ?? "");
    setStrength(editing?.strength ?? "");
    setInstructions(editing?.dosage_instructions ?? "");
    setTimes(editing ? editing.schedule_times ?? [] : ["08:00"]);
    setDays(editing?.schedule_days ?? []);
    setStartDate(editing?.start_date ?? todayISO());
    setEndDate(editing?.end_date ?? "");
    setPrescriber(editing?.prescriber ?? "");
    setNotes(editing?.notes ?? "");
  }, [open, editing]);

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter the medication name.");
      return;
    }
    if (times.some((t) => !t)) {
      setError("Fill in every dose time, or remove the empty one.");
      return;
    }
    if (endDate && startDate && endDate < startDate) {
      setError("The end date can't be before the start date.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const uniqueTimes = Array.from(new Set(times)).sort();
      const payload = {
        name: name.trim(),
        strength: strength.trim() || null,
        dosage_instructions: instructions.trim() || null,
        schedule_times: uniqueTimes,
        schedule_days: days,
        frequency: frequencyLabel(uniqueTimes),
        start_date: startDate || null,
        end_date: endDate || null,
        prescriber: prescriber.trim() || null,
        notes: notes.trim() || null,
      };
      const saved = editing
        ? await updateMedication(token, editing.id, payload)
        : await createMedication(token, { ...payload, profile_id: profileId });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err, "Couldn't save this medication."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      title={editing ? "Edit medication" : "Add medication"}
      description={`For ${profileName}. Enter exactly what the prescription says. HealthMate never suggests or changes doses.`}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Medication name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amlodipine" />
          <Input label="Strength / form" value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="e.g. 5 mg tablet" />
        </div>
        <Input label="Directions as written" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. 1 tablet after breakfast" />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Dose times</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Schedule presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTimes(p.times)}
                className="px-3 py-1.5 rounded-full border border-[var(--border)] text-xs font-semibold hover:bg-[var(--green-50)] hover:border-[var(--green-600)]"
              >
                {p.label}
              </button>
            ))}
          </div>
          {times.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No fixed times. This medication won't appear in the daily schedule.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {times.map((t, i) => (
                <li key={i} className="flex items-center gap-1">
                  <input
                    type="time"
                    aria-label={`Dose time ${i + 1}`}
                    value={t}
                    onChange={(e) => setTimes((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
                    className="min-h-[40px] px-2 rounded-md border border-[var(--border)] text-sm"
                  />
                  <button type="button" aria-label={`Remove dose time ${i + 1}`} onClick={() => setTimes((cur) => cur.filter((_, j) => j !== i))} className="p-1.5 text-[var(--muted)] hover:text-[var(--danger)]">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="outline" size="sm" iconLeft={<Plus size={13} />} onClick={() => setTimes((cur) => [...cur, "12:00"])}>
            Add a time
          </Button>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Days</legend>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days of the week">
            {WEEKDAYS.map((label, d) => (
              <button
                key={label}
                type="button"
                aria-pressed={days.includes(d)}
                onClick={() => toggleDay(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                  days.includes(d) ? "bg-[var(--green-700)] text-white border-[var(--green-700)]" : "border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">{days.length === 0 ? "Every day" : "Only on the selected days"}</p>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="End date" type="date" min={startDate || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} hint="Leave empty if ongoing" />
          <Input label="Prescribed by" value={prescriber} onChange={(e) => setPrescriber(e.target.value)} placeholder="Optional" />
        </div>
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />

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
            {editing ? "Save changes" : "Add medication"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
