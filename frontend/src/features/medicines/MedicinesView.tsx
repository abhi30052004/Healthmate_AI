import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pill, Plus, Pencil, Trash2, PauseCircle, PlayCircle } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Dialog } from "../../components/ui/Dialog";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { DoseCard } from "../../components/health/DoseCard";
import { EmptyState, ErrorState } from "../../components/feedback/States";
import { profileQueryKeys } from "../../app/queryClient";
import {
  deleteMedication,
  listMedications,
  updateMedication,
  type FamilyProfile,
  type MedicationRecord,
} from "../../api/client";
import { errorMessage, formatDate } from "../../lib/dates";
import { MedicationFormDialog } from "./MedicationFormDialog";
import { formatClock, useAdherence, useDoses } from "./useDoses";

export interface MedicinesViewProps {
  token: string;
  activeProfile: FamilyProfile | null;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MedicinesView({ token, activeProfile }: MedicinesViewProps) {
  const queryClient = useQueryClient();
  const profileId = activeProfile?.id ?? "";
  const [tab, setTab] = useState<"today" | "all">("today");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationRecord | null>(null);
  const [deleting, setDeleting] = useState<MedicationRecord | null>(null);

  const medsKey = profileQueryKeys.medicines(profileId);
  const medsQuery = useQuery({
    queryKey: medsKey,
    queryFn: () => listMedications(token, { profile_id: profileId }),
    enabled: !!profileId,
  });
  const doses = useDoses(token, profileId);
  const adherence = useAdherence(token, profileId, 7);

  const refreshMeds = () => {
    queryClient.invalidateQueries({ queryKey: medsKey });
    queryClient.invalidateQueries({ queryKey: ["doses", profileId] });
    queryClient.invalidateQueries({ queryKey: ["adherence", profileId] });
    queryClient.invalidateQueries({ queryKey: ["care-overview", profileId] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ med, status }: { med: MedicationRecord; status: MedicationRecord["status"] }) =>
      updateMedication(token, med.id, { status }),
    onSuccess: () => refreshMeds(),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (med: MedicationRecord) => deleteMedication(token, med.id),
    onSuccess: () => {
      toast.success("Medication deleted.");
      setDeleting(null);
      refreshMeds();
    },
    onError: (err) => toast.error(errorMessage(err, "Couldn't delete this medication.")),
  });

  const medications = medsQuery.data ?? [];
  const doneToday = doses.items.filter((d) => d.status === "taken").length;
  const openForm = (med: MedicationRecord | null) => {
    setEditing(med);
    setFormOpen(true);
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
      active ? "bg-white text-[var(--green-900)] shadow-1" : "text-[var(--muted)] hover:text-[var(--text)]"
    }`;

  return (
    <div className="space-y-8" data-testid="medicines-view">
      <PageHeader
        title="Medications & Daily Schedule"
        subtitle={`Keep ${activeProfile?.name ?? "this profile"}'s prescriptions in one place and record each dose as you go.`}
        actions={
          <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => openForm(null)}>
            Add medication
          </Button>
        }
      />

      <section className="p-5 rounded-xl bg-white border border-[var(--border)] shadow-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-[var(--muted)]">Today</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold tabular-nums text-[var(--green-900)]">
              {doneToday}/{doses.items.length}
            </span>
            <span className="text-xs text-[var(--muted)]">doses recorded as taken</span>
          </div>
          {adherence.data && adherence.data.expected > 0 && (
            <p className="text-xs text-[var(--muted)]" data-testid="adherence-line">
              Last 7 days: {adherence.data.taken} taken
              {adherence.data.missed > 0 ? `, ${adherence.data.missed} not recorded` : ""}
              {adherence.data.taken_percent !== null ? ` (${adherence.data.taken_percent}% of due doses)` : ""}.
            </p>
          )}
        </div>

        <div role="tablist" aria-label="Medication views" className="inline-flex items-center p-1 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          <button type="button" role="tab" aria-selected={tab === "today"} onClick={() => setTab("today")} className={tabClass(tab === "today")}>
            Today ({doses.items.length})
          </button>
          <button type="button" role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")} className={tabClass(tab === "all")}>
            All medications ({medications.length})
          </button>
        </div>
      </section>

      {tab === "today" && (
        <section className="space-y-4" aria-label="Today's doses">
          {doses.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={120} rounded="lg" />
              ))}
            </div>
          ) : doses.isError ? (
            <ErrorState title="Couldn't load today's doses" message={errorMessage(doses.error)} onRetry={() => doses.refetch()} />
          ) : doses.items.length === 0 ? (
            <EmptyState
              title="Nothing scheduled today"
              description={
                medications.length === 0
                  ? "Add a medication with dose times and it will show up here every day."
                  : "No medication has a dose time today. Edit a medication to add times."
              }
              actionLabel={medications.length === 0 ? "Add medication" : undefined}
              onAction={medications.length === 0 ? () => openForm(null) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doses.items.map((dose) => (
                <DoseCard
                  key={dose.id}
                  dose={dose}
                  busy={doses.busyId === dose.id}
                  onTake={doses.take}
                  onSkip={doses.skip}
                  onSnooze={doses.snooze}
                  onUndo={doses.undo}
                />
              ))}
            </div>
          )}
          <p className="text-xs text-[var(--muted)]">
            This records what you tell us. It doesn't confirm a dose was taken and isn't medical advice.
          </p>
        </section>
      )}

      {tab === "all" && (
        <section className="space-y-4" aria-label="All medications">
          {medsQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={170} rounded="lg" />
              ))}
            </div>
          ) : medsQuery.isError ? (
            <ErrorState title="Couldn't load medications" message={errorMessage(medsQuery.error)} onRetry={() => medsQuery.refetch()} />
          ) : medications.length === 0 ? (
            <EmptyState title="No medications yet" description="Add the medicines from a prescription to start a daily schedule." actionLabel="Add medication" onAction={() => openForm(null)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medications.map((med) => {
                const inactive = med.status !== "active";
                return (
                  <Card key={med.id} className={`p-5 flex flex-col justify-between space-y-4 ${inactive ? "opacity-80" : ""}`}>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-[var(--green-50)] text-[var(--green-800)] border border-[var(--green-100)] shrink-0">
                            <Pill size={18} aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display font-semibold text-sm truncate">{med.name}</p>
                            {med.strength && <p className="text-xs text-[var(--muted)] font-mono">{med.strength}</p>}
                          </div>
                        </div>
                        <Badge variant={med.status === "active" ? "verified" : "unverified"} size="sm">
                          {med.status[0].toUpperCase() + med.status.slice(1)}
                        </Badge>
                      </div>
                      <dl className="text-xs text-[var(--muted)] space-y-1 pt-1">
                        <div>
                          <dt className="inline font-semibold text-[var(--text)]">Schedule: </dt>
                          <dd className="inline">
                            {(med.schedule_times ?? []).length
                              ? (med.schedule_times ?? []).map(formatClock).join(", ")
                              : "As needed"}
                            {(med.schedule_days ?? []).length > 0 && ` · ${(med.schedule_days ?? []).map((d) => DAY_NAMES[d]).join(" ")}`}
                          </dd>
                        </div>
                        {med.dosage_instructions && (
                          <div>
                            <dt className="inline font-semibold text-[var(--text)]">Directions: </dt>
                            <dd className="inline">{med.dosage_instructions}</dd>
                          </div>
                        )}
                        {(med.start_date || med.end_date) && (
                          <div>
                            <dt className="inline font-semibold text-[var(--text)]">Period: </dt>
                            <dd className="inline">
                              {formatDate(med.start_date)} → {med.end_date ? formatDate(med.end_date) : "ongoing"}
                            </dd>
                          </div>
                        )}
                        {med.prescriber && (
                          <div>
                            <dt className="inline font-semibold text-[var(--text)]">Prescribed by: </dt>
                            <dd className="inline">{med.prescriber}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className="pt-3 border-t border-[var(--border)] flex items-center gap-1">
                      <Button variant="outline" size="sm" iconLeft={<Pencil size={13} />} onClick={() => openForm(med)} className="flex-1 text-xs">
                        Edit
                      </Button>
                      {med.status === "active" ? (
                        <button type="button" aria-label={`Pause ${med.name}`} title="Pause" onClick={() => statusMutation.mutate({ med, status: "paused" })} className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--green-800)]">
                          <PauseCircle size={16} />
                        </button>
                      ) : (
                        <button type="button" aria-label={`Resume ${med.name}`} title="Resume" onClick={() => statusMutation.mutate({ med, status: "active" })} className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--green-800)]">
                          <PlayCircle size={16} />
                        </button>
                      )}
                      <button type="button" aria-label={`Delete ${med.name}`} title="Delete" onClick={() => setDeleting(med)} className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      <MedicationFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        token={token}
        profileId={profileId}
        profileName={activeProfile?.name ?? "this profile"}
        editing={editing}
        onSaved={() => {
          setFormOpen(false);
          toast.success(editing ? "Medication updated." : "Medication added.");
          refreshMeds();
        }}
      />

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} maxWidth="sm" title="Delete this medication?" description="Its schedule and dose history will be removed. This can't be undone.">
        <p className="text-sm mb-5">{deleting?.name}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting)}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
