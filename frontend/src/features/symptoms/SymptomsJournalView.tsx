import React, { useState } from "react";
import { ActivitySquare, Plus, Clock, AlertTriangle, Check, CheckSquare, Square, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input, Textarea } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import type { FamilyProfile } from "../../api/client";

export interface SymptomEntry {
  id: string;
  title: string;
  severity: "mild" | "moderate" | "severe";
  notes?: string;
  date: string;
  time: string;
  includeInVisitPack: boolean;
}

export function SymptomsJournalView({
  token,
  activeProfile,
}: {
  token: string;
  activeProfile: FamilyProfile | null;
}) {
  const [entries, setEntries] = useState<SymptomEntry[]>([
    {
      id: "sym-1",
      title: "Mild morning dizziness upon standing",
      severity: "mild",
      notes: "Occurred right after waking up; resolved after drinking water.",
      date: "04 Nov 2026",
      time: "8:30 AM",
      includeInVisitPack: true,
    },
    {
      id: "sym-2",
      title: "Occasional post-meal palpitations",
      severity: "moderate",
      notes: "Lasted approximately 5 minutes after heavy dinner.",
      date: "02 Nov 2026",
      time: "9:15 PM",
      includeInVisitPack: true,
    },
    {
      id: "sym-3",
      title: "Dry cough in the evening",
      severity: "mild",
      notes: "No fever observed.",
      date: "28 Oct 2026",
      time: "7:00 PM",
      includeInVisitPack: false,
    },
  ]);

  const [newTitle, setNewTitle] = useState("");
  const [newSeverity, setNewSeverity] = useState<"mild" | "moderate" | "severe">("mild");
  const [newNotes, setNewNotes] = useState("");

  const handleAddSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newEntry: SymptomEntry = {
      id: `sym-${Date.now()}`,
      title: newTitle.trim(),
      severity: newSeverity,
      notes: newNotes.trim() || undefined,
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      includeInVisitPack: true,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setNewTitle("");
    setNewNotes("");
    setNewSeverity("mild");
  };

  const handleToggleVisitPack = (id: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, includeInVisitPack: !e.includeInVisitPack } : e
      )
    );
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const severityColors = {
    mild: "bg-[var(--green-50)] text-[var(--green-800)] border-[var(--green-100)]",
    moderate: "bg-[var(--warning-bg)] text-[var(--warning)] border-[rgba(169,101,19,0.3)]",
    severe: "bg-[var(--danger-bg)] text-[var(--danger)] border-[rgba(180,35,50,0.3)]",
  };

  return (
    <div className="space-y-8" data-testid="symptoms-journal-view">
      <PageHeader
        title="Symptom Journal & Pattern Log"
        subtitle="Log physical observations, note severity, and choose which symptoms to discuss during clinical visits."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Add Symptom Form */}
        <div className="lg:col-span-1">
          <Card className="p-5 space-y-4 sticky top-24">
            <h2 className="text-sm font-display font-semibold text-[var(--text)] flex items-center gap-2">
              <ActivitySquare size={17} className="text-[var(--green-700)]" />
              <span>Log a Health Symptom</span>
            </h2>

            <form onSubmit={handleAddSymptom} className="space-y-3.5">
              <Input
                label="What are you experiencing?"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Mild headache, joint ache..."
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[var(--text)]">
                  Severity Rating
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["mild", "moderate", "severe"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewSeverity(s)}
                      className={`p-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                        newSeverity === s
                          ? `${severityColors[s]} shadow-1 ring-2 ring-current`
                          : "bg-white border-[var(--border)] text-[var(--muted)] hover:bg-[var(--bg)]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                label="Context / Trigger Notes"
                rows={3}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="When did it start? How long did it last?"
              />

              <Button
                type="submit"
                variant="primary"
                size="sm"
                iconLeft={<Plus size={14} />}
                className="w-full mt-2"
              >
                Save Symptom Entry
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Historical Journal Grouped by Date */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">
              Recorded Observations ({entries.length})
            </h2>
            <span className="text-xs text-[var(--muted)]">Self-Reported Diary</span>
          </div>

          <div className="space-y-3">
            {entries.map((entry) => (
              <Card key={entry.id} className="p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[var(--text)]">
                        {entry.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          severityColors[entry.severity]
                        }`}
                      >
                        {entry.severity}
                      </span>
                    </div>

                    {entry.notes && (
                      <p className="text-xs text-[var(--muted)] leading-relaxed">{entry.notes}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    aria-label={`Delete ${entry.title}`}
                    className="p-1 rounded text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)] flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>{entry.date} at {entry.time}</span>
                  </span>

                  {/* Include in Visit Pack Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleVisitPack(entry.id)}
                    className="flex items-center gap-1.5 text-xs text-[var(--green-800)] font-medium hover:underline select-none"
                  >
                    {entry.includeInVisitPack ? (
                      <CheckSquare size={14} className="text-[var(--green-600)]" />
                    ) : (
                      <Square size={14} className="text-[var(--muted)]" />
                    )}
                    <span>Include in Doctor Visit Pack</span>
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

