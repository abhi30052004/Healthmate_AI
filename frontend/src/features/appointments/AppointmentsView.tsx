import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, Plus, Clock, MapPin, CheckSquare, Square, FileText, Pencil, Trash2, X } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Dialog } from "../../components/ui/Dialog";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { MonthCalendar } from "../../components/ui/MonthCalendar";
import { EmptyState, ErrorState } from "../../components/feedback/States";
import { profileQueryKeys } from "../../app/queryClient";
import {
  createFollowUp,
  deleteAppointment,
  deleteFollowUp,
  listAppointments,
  listFollowUps,
  updateAppointment,
  updateFollowUp,
  type AppointmentRecord,
  type FamilyProfile,
  type FollowUpTask,
} from "../../api/client";
import { errorMessage, formatDate, formatTime, toDateInput } from "../../lib/dates";
import { AppointmentFormDialog } from "./AppointmentFormDialog";

const QUICK_ITEMS = ["Bring recent lab reports", "Bring current medication list", "Write down questions"];

export function AppointmentsView({
  token,
  activeProfile,
  onPrepareVisitPack,
}: {
  token: string;
  activeProfile: FamilyProfile | null;
  onPrepareVisitPack?: () => void;
}) {
  const queryClient = useQueryClient();
  const profileId = activeProfile?.id ?? "";
  const key = profileQueryKeys.appointments(profileId);

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentRecord | null>(null);
  const [deleting, setDeleting] = useState<AppointmentRecord | null>(null);
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  const apptQuery = useQuery({
    queryKey: key,
    queryFn: () => listAppointments(token, { profile_id: profileId }),
    enabled: !!profileId,
  });
  const tasksQuery = useQuery({
    queryKey: [...key, "tasks"],
    queryFn: () => listFollowUps(token, { profile_id: profileId }),
    enabled: !!profileId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ["care-overview", profileId] });
  };

  const tasksByAppt = useMemo(() => {
    const map: Record<string, FollowUpTask[]> = {};
    for (const t of tasksQuery.data ?? []) {
      if (t.appointment_id && t.status !== "dismissed") (map[t.appointment_id] ??= []).push(t);
    }
    return map;
  }, [tasksQuery.data]);

  const statusMutation = useMutation({
    mutationFn: ({ a, status }: { a: AppointmentRecord; status: AppointmentRecord["status"] }) =>
      updateAppointment(token, a.id, { status }),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const deleteMutation = useMutation({
    mutationFn: (a: AppointmentRecord) => deleteAppointment(token, a.id),
    onSuccess: () => {
      toast.success("Appointment deleted.");
      setDeleting(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggleTask = useMutation({
    mutationFn: (t: FollowUpTask) => updateFollowUp(token, t.id, { status: t.status === "completed" ? "pending" : "completed" }),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const addTask = useMutation({
    mutationFn: ({ a, text }: { a: AppointmentRecord; text: string }) =>
      createFollowUp(token, { title: text, appointment_id: a.id, profile_id: profileId, due_at: a.scheduled_at }),
    onSuccess: (_d, vars) => {
      setNewItem((s) => ({ ...s, [vars.a.id]: "" }));
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e, "Couldn't add that item.")),
  });
  const removeTask = useMutation({
    mutationFn: (t: FollowUpTask) => deleteFollowUp(token, t.id),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });

  const all = apptQuery.data ?? [];
  const markers = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of all) {
      if (a.status === "cancelled") continue;
      const d = toDateInput(new Date(a.scheduled_at));
      m[d] = (m[d] ?? 0) + 1;
    }
    return m;
  }, [all]);

  const now = Date.now();
  const visible = all
    .filter((a) => {
      if (selectedDate) return toDateInput(new Date(a.scheduled_at)) === selectedDate;
      const isPast = new Date(a.scheduled_at).getTime() < now || a.status === "completed" || a.status === "cancelled";
      return tab === "past" ? isPast : !isPast;
    })
    .sort((a, b) => {
      const diff = new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      return tab === "past" && !selectedDate ? -diff : diff;
    });

  const statusBadge = (s: AppointmentRecord["status"]) =>
    s === "completed" ? (
      <Badge variant="verified" size="sm">Completed</Badge>
    ) : s === "cancelled" ? (
      <Badge variant="unverified" size="sm">Cancelled</Badge>
    ) : (
      <Badge variant="review" size="sm">Scheduled</Badge>
    );

  return (
    <div className="space-y-8" data-testid="appointments-view">
      <PageHeader
        title="Appointments & Visit Prep"
        subtitle={`Plan ${activeProfile?.name ?? "this profile"}'s visits, tick off what to bring, and prepare a visit pack.`}
        actions={
          <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            Add appointment
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-1 self-start">
          <MonthCalendar month={month} onMonthChange={setMonth} markers={markers} selected={selectedDate} onSelect={setSelectedDate} />
          {selectedDate && (
            <button type="button" onClick={() => setSelectedDate(null)} className="mt-3 text-xs font-semibold text-[var(--green-700)] inline-flex items-center gap-1">
              <X size={12} /> Clear date filter ({formatDate(selectedDate)})
            </button>
          )}
        </Card>

        <section className="lg:col-span-2 space-y-4" aria-label="Appointments">
          {!selectedDate && (
            <div role="tablist" aria-label="Appointment list" className="inline-flex p-1 rounded-lg bg-white border border-[var(--border)]">
              {(["upcoming", "past"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize ${tab === t ? "bg-[var(--green-50)] text-[var(--green-900)] border border-[var(--green-100)]" : "text-[var(--muted)]"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {apptQuery.isLoading ? (
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <Skeleton key={i} height={170} rounded="lg" />
              ))}
            </div>
          ) : apptQuery.isError ? (
            <ErrorState title="Couldn't load appointments" message={errorMessage(apptQuery.error)} onRetry={() => apptQuery.refetch()} />
          ) : visible.length === 0 ? (
            <EmptyState
              title={selectedDate ? "Nothing on this day" : tab === "upcoming" ? "No upcoming appointments" : "No past appointments"}
              description={selectedDate ? "Pick another date or add an appointment." : "Add a visit to keep your preparation checklist and reminders together."}
              actionLabel="Add appointment"
              onAction={() => { setEditing(null); setFormOpen(true); }}
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {visible.map((a) => {
                const tasks = tasksByAppt[a.id] ?? [];
                const done = tasks.filter((t) => t.status === "completed").length;
                const when = new Date(a.scheduled_at);
                return (
                  <Card key={a.id} className="p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2.5 rounded-lg bg-[var(--green-50)] text-[var(--green-800)] border border-[var(--green-100)] shrink-0">
                            <Calendar size={18} aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display font-semibold text-sm truncate">{a.title}</p>
                            <p className="text-xs text-[var(--muted)] truncate">{[a.provider_name, a.appointment_type].filter(Boolean).join(" · ")}</p>
                          </div>
                        </div>
                        {statusBadge(a.status)}
                      </div>

                      <div className="text-xs space-y-1.5">
                        <p className="flex items-center gap-1.5 font-medium">
                          <Clock size={13} className="text-[var(--green-700)]" aria-hidden="true" />
                          <span>{formatDate(a.scheduled_at)} at {formatTime(a.scheduled_at)}</span>
                        </p>
                        {a.location && (
                          <p className="flex items-center gap-1.5 text-[var(--muted)]">
                            <MapPin size={13} aria-hidden="true" />
                            <span>{a.location}</span>
                          </p>
                        )}
                        {a.notes && <p className="text-[var(--muted)] whitespace-pre-wrap">{a.notes}</p>}
                      </div>

                      <div className="pt-3 border-t border-[var(--border)] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold">Preparation checklist</span>
                          <span className="text-[var(--muted)]">{done} of {tasks.length} done</span>
                        </div>
                        <ul className="space-y-1">
                          {tasks.map((t) => (
                            <li key={t.id} className="flex items-center gap-1 group">
                              <button type="button" onClick={() => toggleTask.mutate(t)} aria-pressed={t.status === "completed"} className="flex-1 flex items-center gap-2 text-left text-xs p-1.5 rounded hover:bg-[var(--bg)]">
                                {t.status === "completed" ? <CheckSquare size={15} className="text-[var(--green-600)] shrink-0" /> : <Square size={15} className="text-[var(--muted)] shrink-0" />}
                                <span className={t.status === "completed" ? "line-through text-[var(--muted)]" : ""}>{t.title}</span>
                              </button>
                              <button type="button" aria-label={`Remove ${t.title}`} onClick={() => removeTask.mutate(t)} className="p-1 text-[var(--muted)] opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-[var(--danger)]">
                                <X size={13} />
                              </button>
                            </li>
                          ))}
                        </ul>
                        <form
                          className="flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const text = (newItem[a.id] ?? "").trim();
                            if (text) addTask.mutate({ a, text });
                          }}
                        >
                          <input
                            aria-label={`Add checklist item for ${a.title}`}
                            value={newItem[a.id] ?? ""}
                            onChange={(e) => setNewItem((s) => ({ ...s, [a.id]: e.target.value }))}
                            placeholder="Add an item…"
                            className="flex-1 min-h-[34px] px-2.5 text-xs rounded-md border border-[var(--border)]"
                          />
                          <Button type="submit" size="sm" variant="outline" disabled={!(newItem[a.id] ?? "").trim()}>
                            Add
                          </Button>
                        </form>
                        {tasks.length === 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {QUICK_ITEMS.map((q) => (
                              <button key={q} type="button" onClick={() => addTask.mutate({ a, text: q })} className="px-2 py-1 rounded-full border border-[var(--border)] text-[11px] text-[var(--muted)] hover:bg-[var(--green-50)]">
                                + {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center gap-2">
                      {a.status === "scheduled" && (
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => statusMutation.mutate({ a, status: "completed" })}>
                          Mark done
                        </Button>
                      )}
                      {a.status === "scheduled" && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => statusMutation.mutate({ a, status: "cancelled" })}>
                          Cancel visit
                        </Button>
                      )}
                      {a.status !== "scheduled" && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => statusMutation.mutate({ a, status: "scheduled" })}>
                          Reopen
                        </Button>
                      )}
                      <span className="flex-1" />
                      <button type="button" aria-label={`Edit ${a.title}`} onClick={() => { setEditing(a); setFormOpen(true); }} className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--green-800)]">
                        <Pencil size={15} />
                      </button>
                      <button type="button" aria-label={`Delete ${a.title}`} onClick={() => setDeleting(a)} className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {onPrepareVisitPack && a.status === "scheduled" && (
                      <Button variant="outline" size="sm" onClick={onPrepareVisitPack} iconLeft={<FileText size={14} />} className="w-full text-xs">
                        Prepare visit pack
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AppointmentFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        token={token}
        profileId={profileId}
        profileName={activeProfile?.name ?? "this profile"}
        editing={editing}
        onSaved={(a) => {
          setFormOpen(false);
          toast.success(editing ? "Appointment updated." : "Appointment added.");
          setMonth(new Date(a.scheduled_at));
          refresh();
        }}
      />

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} maxWidth="sm" title="Delete this appointment?" description="Its checklist items will be unlinked. This can't be undone.">
        <p className="text-sm mb-5">{deleting?.title}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting)}>Delete</Button>
        </div>
      </Dialog>
    </div>
  );
}
