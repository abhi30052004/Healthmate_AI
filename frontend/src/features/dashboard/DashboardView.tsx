import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, Plus, TrendingUp, ArrowRight, ShieldCheck, CheckCircle2, Circle } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatCard } from "../../components/health/StatCard";
import { DoseCard } from "../../components/health/DoseCard";
import { AppointmentCard, ReviewQueueCard, ChangeCard } from "../../components/health/HealthCards";
import { EmptyState } from "../../components/feedback/States";
import { profileQueryKeys } from "../../app/queryClient";
import {
  getCareOverview,
  getTimelineTrends,
  listDocuments,
  type FamilyProfile,
  type TrendSeries,
  type User,
} from "../../api/client";
import { formatDate, formatTime, errorMessage } from "../../lib/dates";
import { useDoses } from "../medicines/useDoses";
import { documentUiState } from "../records/HealthRecordsView";

export interface DashboardViewProps {
  token: string;
  user: User | null;
  activeProfile: FamilyProfile | null;
  onNavigateTab: (tab: any) => void;
}

function sortedPoints(series: TrendSeries) {
  return [...series.points].sort((a, b) => a.date.localeCompare(b.date));
}

function latestDate(series: TrendSeries): string {
  const pts = sortedPoints(series);
  return pts[pts.length - 1].date;
}

function describeChange(series: TrendSeries) {
  const pts = sortedPoints(series);
  if (pts.length < 2) return null;
  const prev = pts[pts.length - 2];
  const cur = pts[pts.length - 1];
  const diff = cur.standardized_numeric_value - prev.standardized_numeric_value;
  const unit = series.standard_unit || cur.original_unit || "";
  const rounded = Math.round(diff * 100) / 100;
  return { prev, cur, diff: rounded, unit };
}

export function DashboardView({ token, user, activeProfile, onNavigateTab }: DashboardViewProps) {
  const profileId = activeProfile?.id ?? "";
  const patientName = activeProfile?.name || user?.name || "there";

  const doses = useDoses(token, profileId);

  const overview = useQuery({
    queryKey: ["care-overview", profileId],
    queryFn: () => getCareOverview(token, profileId),
    enabled: !!profileId,
  });
  const trends = useQuery({
    queryKey: profileQueryKeys.trends(profileId),
    queryFn: () => getTimelineTrends(token, { profile_id: profileId }),
    enabled: !!profileId,
  });
  const docs = useQuery({
    queryKey: profileQueryKeys.documents(profileId),
    queryFn: () => listDocuments(token, profileId),
    enabled: !!profileId,
  });

  const needsReview = (docs.data ?? []).filter((d) => documentUiState(d) === "needs_review");
  const nextAppt = overview.data?.upcoming_appointments?.[0] ?? null;
  const apptTasks = overview.data?.pending_tasks?.filter((t) => nextAppt && t.appointment_id === nextAppt.id) ?? [];

  const latestSeries = useMemo(() => {
    const series = trends.data?.series ?? [];
    return [...series]
      .filter((s) => s.points.length > 0)
      .sort((a, b) => latestDate(b).localeCompare(latestDate(a)))
      .slice(0, 4);
  }, [trends.data]);

  const changes = useMemo(
    () =>
      (trends.data?.series ?? [])
        .map((s) => ({ s, c: describeChange(s) }))
        .filter((x): x is { s: TrendSeries; c: NonNullable<ReturnType<typeof describeChange>> } => x.c !== null)
        .sort((a, b) => b.c.cur.date.localeCompare(a.c.cur.date))
        .slice(0, 3),
    [trends.data]
  );

  const readiness = [
    { label: "At least one verified result", done: (trends.data?.series ?? []).length > 0 },
    { label: "Medication list added", done: (overview.data?.active_medications_count ?? 0) > 0 },
    { label: "Allergies recorded", done: !!activeProfile?.allergies_summary?.trim() },
    { label: "Emergency contact added", done: !!activeProfile?.emergency_contact_name?.trim() },
  ];
  const readyCount = readiness.filter((r) => r.done).length;

  return (
    <div className="space-y-8" data-testid="dashboard-view">
      <PageHeader
        title={`Hello, ${patientName}`}
        subtitle={`Viewing records for ${activeProfile?.is_primary ? "your own profile" : `${activeProfile?.name} (${activeProfile?.relationship})`}.`}
        actions={
          <div className="flex items-center gap-2.5">
            <Button variant="primary" size="sm" iconLeft={<Upload size={14} />} onClick={() => onNavigateTab("records")}>
              Add records
            </Button>
            <Button variant="outline" size="sm" iconLeft={<Plus size={14} />} onClick={() => onNavigateTab("medicines")}>
              Today's doses
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between min-h-[24px]">
            <h2 className="text-sm font-display font-semibold">Today's doses</h2>
            <button type="button" onClick={() => onNavigateTab("medicines")} className="text-xs font-semibold text-[var(--green-700)] hover:underline">
              View schedule
            </button>
          </div>
          {doses.isLoading ? (
            <Skeleton height={110} rounded="lg" />
          ) : doses.items.length === 0 ? (
            <Card className="p-4 text-xs text-[var(--muted)]">No doses scheduled today.</Card>
          ) : (
            <div className="space-y-3">
              {doses.items.slice(0, 3).map((d) => (
                <DoseCard key={d.id} dose={d} busy={doses.busyId === d.id} onTake={doses.take} onSkip={doses.skip} onSnooze={doses.snooze} onUndo={doses.undo} />
              ))}
              {doses.items.length > 3 && (
                <button type="button" onClick={() => onNavigateTab("medicines")} className="text-xs font-semibold text-[var(--green-700)]">
                  + {doses.items.length - 3} more today
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between min-h-[24px]">
            <h2 className="text-sm font-display font-semibold">Next visit</h2>
            <button type="button" onClick={() => onNavigateTab("appointments")} className="text-xs font-semibold text-[var(--green-700)] hover:underline">
              All visits
            </button>
          </div>
          {overview.isLoading ? (
            <Skeleton height={140} rounded="lg" />
          ) : nextAppt ? (
            <AppointmentCard
              doctor={nextAppt.title}
              specialty={[nextAppt.provider_name, nextAppt.appointment_type].filter(Boolean).join(" · ") || "Appointment"}
              date={formatDate(nextAppt.scheduled_at)}
              time={formatTime(nextAppt.scheduled_at)}
              checklistCompleted={Math.max(nextAppt.follow_up_tasks_count - apptTasks.length, 0)}
              checklistTotal={nextAppt.follow_up_tasks_count}
              onPrepareClick={() => onNavigateTab("visit-pack")}
            />
          ) : (
            <Card className="p-4 text-xs text-[var(--muted)] space-y-2">
              <p>No upcoming appointments.</p>
              <button type="button" onClick={() => onNavigateTab("appointments")} className="font-semibold text-[var(--green-700)]">
                Add one
              </button>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between min-h-[24px]">
            <h2 className="text-sm font-display font-semibold">Needs your review</h2>
            <span className="text-xs text-[var(--muted)]">Human verification</span>
          </div>
          {docs.isLoading ? (
            <Skeleton height={140} rounded="lg" />
          ) : needsReview.length > 0 ? (
            <ReviewQueueCard
              count={needsReview.length}
              documentTitle={needsReview[0].filename}
              extractedDate={needsReview[0].document_date ? `Report dated ${formatDate(needsReview[0].document_date)}` : undefined}
              onReviewClick={() => onNavigateTab("records")}
            />
          ) : (
            <Card className="p-4 text-xs text-[var(--muted)] flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[var(--green-600)]" aria-hidden="true" />
              Nothing waiting for review.
            </Card>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-bold text-[var(--green-900)]">Latest verified results</h2>
          <span className="text-xs text-[var(--muted)]">Only values you've confirmed</span>
        </div>
        {trends.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={120} rounded="lg" />
            ))}
          </div>
        ) : trends.isError ? (
          <p role="alert" className="text-xs text-[var(--danger)]">{errorMessage(trends.error, "Couldn't load results.")}</p>
        ) : latestSeries.length === 0 ? (
          <EmptyState
            title="No verified results yet"
            description="Upload a report and confirm its values, or enter results by hand, to see them here."
            actionLabel="Add records"
            onAction={() => onNavigateTab("records")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {latestSeries.map((s) => {
              const pts = sortedPoints(s);
              const cur = pts[pts.length - 1];
              const ch = describeChange(s);
              return (
                <StatCard
                  key={s.normalized_test_name}
                  label={s.normalized_test_name}
                  value={cur.value}
                  unit={cur.original_unit ?? s.standard_unit}
                  date={formatDate(cur.date)}
                  delta={
                    ch
                      ? ch.diff === 0
                        ? { value: "No change", neutral: true, period: formatDate(ch.prev.date) }
                        : { value: `${ch.diff > 0 ? "+" : ""}${ch.diff} ${ch.unit}`, isIncrease: ch.diff > 0, period: formatDate(ch.prev.date) }
                      : undefined
                  }
                  isVerified
                  onClick={() => onNavigateTab("timeline")}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[var(--green-700)]" aria-hidden="true" />
              <h3 className="text-sm font-display font-semibold">What changed</h3>
            </div>
            <span className="text-[11px] text-[var(--muted)]">Latest vs previous result</span>
          </div>
          {changes.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">Add the same test on two dates to see how the recorded value moved.</p>
          ) : (
            <div className="space-y-3 pt-1">
              {changes.map(({ s, c }) => (
                <ChangeCard
                  key={s.normalized_test_name}
                  observation={s.normalized_test_name}
                  previousValue={c.prev.value}
                  currentValue={c.cur.value}
                  unit={c.cur.original_unit ?? s.standard_unit}
                  period={`${formatDate(c.prev.date)} → ${formatDate(c.cur.date)}`}
                  neutralDescription="This shows what was recorded, not what it means. Discuss changes with your doctor."
                />
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[var(--green-700)]" aria-hidden="true" />
                <h3 className="text-sm font-display font-semibold">Visit pack readiness</h3>
              </div>
              <span className="text-xs font-semibold text-[var(--green-600)]" data-testid="readiness-count">
                {readyCount} of {readiness.length}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] pt-2 leading-relaxed">
              A fuller record makes a more useful summary for your doctor. This is a checklist of what's recorded, not a health score.
            </p>
            <ul className="pt-2 space-y-1.5 text-xs">
              {readiness.map((r) => (
                <li key={r.label} className="flex items-center gap-2">
                  {r.done ? <CheckCircle2 size={14} className="text-[var(--green-600)] shrink-0" aria-label="Done" /> : <Circle size={14} className="text-[var(--muted)] shrink-0" aria-label="Not done" />}
                  <span className={r.done ? "" : "text-[var(--muted)]"}>{r.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-4 border-t border-[var(--border)] mt-4 flex items-center gap-3">
            <Button variant="primary" size="sm" onClick={() => onNavigateTab("visit-pack")} className="flex-1" iconRight={<ArrowRight size={14} />}>
              Build visit pack
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigateTab("sharing")}>
              Share
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
