import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
  createManualEntry,
  type DocumentItem,
  type ManualEntryPayload,
  type ManualObservationInput,
} from "../../api/client";
import { errorMessage, todayISO, toTimeInput } from "../../lib/dates";

type EntryType = ManualEntryPayload["entry_type"];

/** Common quick-picks so people don't have to remember units. */
const PRESETS: Record<EntryType, { test_name: string; unit: string; hint?: string }[]> = {
  vital: [
    { test_name: "Blood Pressure (Systolic)", unit: "mmHg" },
    { test_name: "Blood Pressure (Diastolic)", unit: "mmHg" },
    { test_name: "Pulse", unit: "bpm" },
    { test_name: "Blood Glucose", unit: "mg/dL" },
    { test_name: "Weight", unit: "kg" },
    { test_name: "Temperature", unit: "°C" },
    { test_name: "SpO2", unit: "%" },
  ],
  lab: [
    { test_name: "HbA1c", unit: "%" },
    { test_name: "Fasting Blood Glucose", unit: "mg/dL" },
    { test_name: "Hemoglobin", unit: "g/dL" },
    { test_name: "Total Cholesterol", unit: "mg/dL" },
    { test_name: "Creatinine", unit: "mg/dL" },
    { test_name: "TSH", unit: "mIU/L" },
  ],
  other: [],
};

interface Row extends ManualObservationInput {
  key: number;
}

let rowKey = 0;
const newRow = (preset?: { test_name: string; unit: string }): Row => ({
  key: ++rowKey,
  test_name: preset?.test_name ?? "",
  value: "",
  unit: preset?.unit ?? "",
  reference_range: "",
});

export interface ManualEntryDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  profileId: string;
  profileName: string;
  onCreated: (doc: DocumentItem) => void;
}

export function ManualEntryDialog({
  open,
  onClose,
  token,
  profileId,
  profileName,
  onCreated,
}: ManualEntryDialogProps) {
  const [entryType, setEntryType] = useState<EntryType>("vital");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(toTimeInput());
  const [source, setSource] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow(PRESETS.vital[0]), newRow(PRESETS.vital[1])]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const switchType = (t: EntryType) => {
    setEntryType(t);
    setRows(PRESETS[t].length ? [newRow(PRESETS[t][0])] : [newRow()]);
  };

  const updateRow = (key: number, patch: Partial<ManualObservationInput>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = rows.filter((r) => r.test_name.trim() || r.value.trim());
    if (filled.length === 0) {
      setError("Add at least one result.");
      return;
    }
    if (filled.some((r) => !r.test_name.trim() || !r.value.trim())) {
      setError("Each result needs both a name and a value.");
      return;
    }
    if (date > todayISO()) {
      setError("The date can't be in the future.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const doc = await createManualEntry(token, {
        profile_id: profileId,
        entry_type: entryType,
        entry_date: date,
        entry_time: time ? `${time}:00` : null,
        source_label: source.trim() || null,
        observations: filled.map((r) => ({
          test_name: r.test_name.trim(),
          value: r.value.trim(),
          unit: r.unit?.trim() || null,
          reference_range: r.reference_range?.trim() || null,
        })),
      });
      onCreated(doc);
    } catch (err) {
      setError(errorMessage(err, "Couldn't save this entry."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      title="Add results manually"
      description={`Saved to ${profileName}'s records as verified, because you typed it yourself.`}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div role="group" aria-label="Entry type" className="inline-flex p-1 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          {(
            [
              ["vital", "Vitals"],
              ["lab", "Lab results"],
              ["other", "Other"],
            ] as [EntryType, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={entryType === id}
              onClick={() => switchType(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                entryType === id ? "bg-white shadow-sm text-[var(--green-900)]" : "text-[var(--muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Date" type="date" required max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <Input
            label="Lab / source"
            placeholder="Optional"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {rows.map((row, idx) => (
            <fieldset key={row.key} className="grid grid-cols-12 gap-2 items-end">
              <legend className="sr-only">Result {idx + 1}</legend>
              <div className="col-span-12 sm:col-span-4">
                <Input
                  id={`mr-${row.key}-test`}
                  label="Test"
                  list={`presets-${entryType}`}
                  value={row.test_name}
                  onChange={(e) => {
                    const preset = PRESETS[entryType].find((p) => p.test_name === e.target.value);
                    updateRow(row.key, preset ? { test_name: preset.test_name, unit: preset.unit } : { test_name: e.target.value });
                  }}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input id={`mr-${row.key}-value`} label="Value" inputMode="decimal" value={row.value} onChange={(e) => updateRow(row.key, { value: e.target.value })} />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input id={`mr-${row.key}-unit`} label="Unit" value={row.unit ?? ""} onChange={(e) => updateRow(row.key, { unit: e.target.value })} />
              </div>
              <div className="col-span-4 sm:col-span-3">
                <Input
                  id={`mr-${row.key}-range`}
                  label="Reference range"
                  placeholder="e.g. 70 - 99"
                  value={row.reference_range ?? ""}
                  onChange={(e) => updateRow(row.key, { reference_range: e.target.value })}
                />
              </div>
              <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
                <button
                  type="button"
                  aria-label={`Remove result ${idx + 1}`}
                  disabled={rows.length === 1}
                  onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                  className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--danger)] disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </fieldset>
          ))}
          <datalist id={`presets-${entryType}`}>
            {PRESETS[entryType].map((p) => (
              <option key={p.test_name} value={p.test_name} />
            ))}
          </datalist>
          <Button type="button" variant="outline" size="sm" iconLeft={<Plus size={14} />} onClick={() => setRows((rs) => [...rs, newRow()])}>
            Add another result
          </Button>
        </div>

        <p className="text-xs text-[var(--muted)]">
          Type values exactly as they appear on the report or device. Reference ranges are only used to mark a result high/low if you provide one.
        </p>

        {error && (
          <p role="alert" className="text-xs text-[var(--danger)]">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Save results
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
