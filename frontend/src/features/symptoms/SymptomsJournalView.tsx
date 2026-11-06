import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActivitySquare, CheckSquare, Square, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Dialog } from "../../components/ui/Dialog";
import { Input, Textarea } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../../components/feedback/States";
import { profileQueryKeys } from "../../app/queryClient";
import {
  createSymptom,
  deleteSymptom,
  listSymptoms,
  updateSymptom,
  type FamilyProfile,
  type SymptomEntryItem,
  type SymptomSeverity,
} from "../../api/client";
import { errorMessage, formatDate, formatTime, localDateTimeToIso, todayISO, toTimeInput } from "../../lib/dates";

const SEVERITY_STYLE: Record<SymptomSeverity, string> = {
  mild: "bg-[var(--green-50)] text-[var(--green-800)] border-[var(--green-100)]",
  moderate: "bg-[var(--warning-bg)] text-[var(--warning)] border-[rgba(169,101,19,0.3)]",
  severe: "bg-[var(--danger-bg)] text-[var(--danger)] border-[rgba(180,35,50,0.3)]",
};

export function SymptomsJournalView({ token, activeProfile }: { token: string; activeProfile: FamilyProfile | null }) {
  const queryClient = useQueryClient();
  const profileId = activeProfile?.id ?? "";
  const key = profileQueryKeys.symptoms(profileId);

  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<SymptomSeverity>("mild");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(toTimeInput());
  const [includeInPack, setIncludeInPack] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SymptomEntryItem | null>(null);

  const query = useQuery({
    queryKey: key,
    queryFn: () => listSymptoms(token, profileId),
    enabled: !!profileId,
  });

  const create = useMutation({
    mutationFn: () =>
      createSymptom(token, {
        title: title.trim(),
        severity,
        notes: notes.trim() || null,
        occurred_at: localDateTimeToIso(date, time),
        include_in_visit_pack: includeInPack,
        profile_id: profileId,
      }),
    onSuccess: () => {
      toast.success("Symptom logged.");
      setTitle("");
      setNotes("");
      setSeverity("mild");
      setDate(todayISO());
      setTime(toTimeInput());
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e) => setFormError(errorMessage(e, "Couldn't save this entry.")),
  });

  const togglePack = useMutation({
    mutationFn: (s: SymptomEntryItem) => updateSymptom(token, s.id, { include_in_visit_pack: !s.include_in_visit_pack }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (s: SymptomEntryItem) => deleteSymptom(token, s.id),
    onSuccess: () => {
      toast.success("Entry deleted.");
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Describe what you're experiencing.");
      return;
    }
    if (new Date(localDateTimeToIso(date, time)).getTime() > Date.now() + 5 * 60_000) {
      setFormError("The time can't be in the future.");
      return;
    }
    setFormError(null);
    create.mutate();
  };

  const entries = query.data ?? [];

  return (
    <div className="space-y-8" data-testid="symptoms-journal-view">
      <PageHeader
        title="Symptom Journal"
        subtitle={`Jot down what ${activeProfile?.name ?? "you"} noticed and when, and pick which notes to bring to the doctor. HealthMate doesn't interpret symptoms.`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-5 space-y-4 lg:sticky lg:top-24">
            <h2 className="text-sm font-display font-semibold flex items-center gap-2">
              <ActivitySquare size={17} className="text-[var(--green-700)]" aria-hidden="true" />
              Log a symptom
            </h2>
            <form onSubmit={submit} className="space-y-3.5" noValidate>
              <Input label="What did you notice?" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dizziness on standing" />
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">How strong was it?</legend>
                <div className="flex gap-2" role="radiogroup" aria-label="Severity">
                  {(["mild", "moderate", "severe"] as SymptomSeverity[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={severity === s}
                      onClick={() => setSeverity(s)}
                      className={`flex-1 px-2 py-2 rounded-lg border text-xs font-semibold capitalize ${severity === s ? SEVERITY_STYLE[s] + " ring-2 ring-offset-1 ring-[var(--green-600)]" : "border-[var(--border)] text-[var(--muted)]"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
                <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <Textarea label="Details" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How long, what you were doing, anything that helped" />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={includeInPack} onChange={(e) => setIncludeInPack(e.target.checked)} />
                Include in my doctor visit pack
              </label>
              {formError && (
                <p role="alert" className="text-xs text-[var(--danger)]">
                  {formError}
                </p>
              )}
              <Button type="submit" className="w-full" loading={create.isPending}>
                Save entry
              </Button>
              <p className="text-[11px] text-[var(--muted)]">
                If something feels urgent or severe, contact your local emergency services or your doctor right away. This journal can't assess urgency.
              </p>
            </form>
          </Card>
        </div>

        <section className="lg:col-span-2 space-y-3" aria-label="Symptom entries" aria-live="polite">
          {query.isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} height={96} rounded="lg" />)
          ) : query.isError ? (
            <ErrorState title="Couldn't load your journal" message={errorMessage(query.error)} onRetry={() => query.refetch()} />
          ) : entries.length === 0 ? (
            <EmptyState title="No entries yet" description="Log your first symptom on the left. Entries are private to this profile." />
          ) : (
            entries.map((s) => (
              <Card key={s.id} className="p-4 space-y-2" data-testid="symptom-entry">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatDate(s.occurred_at)} · {formatTime(s.occurred_at)}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold capitalize shrink-0 ${SEVERITY_STYLE[s.severity]}`}>{s.severity}</span>
                </div>
                {s.notes && <p className="text-xs text-[var(--muted)] whitespace-pre-wrap">{s.notes}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    aria-pressed={s.include_in_visit_pack}
                    onClick={() => togglePack.mutate(s)}
                    className="flex items-center gap-2 text-xs"
                  >
                    {s.include_in_visit_pack ? <CheckSquare size={15} className="text-[var(--green-600)]" /> : <Square size={15} className="text-[var(--muted)]" />}
                    In visit pack
                  </button>
                  <button type="button" aria-label={`Delete ${s.title}`} onClick={() => setDeleting(s)} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--danger)]">
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            ))
          )}
        </section>
      </div>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} maxWidth="sm" title="Delete this entry?" description="This can't be undone.">
        <p className="text-sm mb-5">{deleting?.title}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting)}>Delete</Button>
        </div>
      </Dialog>
    </div>
  );
}
