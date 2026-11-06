import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../../components/feedback/States";
import { ChangeCard } from "../../components/health/HealthCards";
import { TrendChart, type TrendPoint } from "./TrendChart";
import { profileQueryKeys } from "../../app/queryClient";
import {
  getTimeline,
  getTimelineTrends,
  type FamilyProfile,
  type TrendSeries,
} from "../../api/client";
import { errorMessage, formatDate } from "../../lib/dates";

export interface TimelineTrendsViewProps {
  token: string;
  activeProfile: FamilyProfile | null;
}

type Range = "3m" | "6m" | "1y" | "all";
const RANGE_MONTHS: Record<Range, number | null> = { "3m": 3, "6m": 6, "1y": 12, all: null };

/** Parse "70 - 99" / "4.0 – 5.6" / "70 to 99" into numbers. Returns null for anything else (never guess). */
export function parseReferenceRange(text?: string | null): { min: number; max: number } | null {
  if (!text) return null;
  const m = text.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const min = parseFloat(m[1]);
  const max = parseFloat(m[2]);
  return Number.isFinite(min) && Number.isFinite(max) && min < max ? { min, max } : null;
}

function cutoff(range: Range): string | null {
  const months = RANGE_MONTHS[range];
  if (!months) return null;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export function TimelineTrendsView({ token, activeProfile }: TimelineTrendsViewProps) {
  const profileId = activeProfile?.id ?? "";
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("all");
  const [includeUnverified, setIncludeUnverified] = useState(false);

  const trends = useQuery({
    queryKey: [...profileQueryKeys.trends(profileId), includeUnverified],
    queryFn: () => getTimelineTrends(token, { profile_id: profileId, include_unverified: includeUnverified }),
    enabled: !!profileId,
  });
  const timeline = useQuery({
    queryKey: ["timeline", profileId, includeUnverified],
    queryFn: () => getTimeline(token, { profile_id: profileId, include_unverified: includeUnverified, limit: 100 }),
    enabled: !!profileId,
  });

  // Charted series first (≥2 points), then single-reading tests.
  const series: TrendSeries[] = useMemo(
    () => [...(trends.data?.series ?? [])].sort((a, b) => b.points.length - a.points.length || a.normalized_test_name.localeCompare(b.normalized_test_name)),
    [trends.data]
  );
  const current = series.find((s) => s.normalized_test_name === selected) ?? series[0];

  const points: TrendPoint[] = useMemo(() => {
    if (!current) return [];
    const from = cutoff(range);
    return [...current.points]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((p) => !from || p.date >= from)
      .map((p) => ({
        date: formatDate(p.date),
        value: p.standardized_numeric_value,
        unit: current.standard_unit,
        documentId: p.document_id,
        documentTitle: p.document_filename,
        isVerified: p.is_reviewed,
      }));
  }, [current, range]);

  const reference = useMemo(() => {
    if (!current) return undefined;
    const latest = [...current.points].sort((a, b) => b.date.localeCompare(a.date))[0];
    // Only draw a band when the report itself printed a numeric range.
    return parseReferenceRange(latest?.reference_range) ?? undefined;
  }, [current]);

  const changes = useMemo(
    () =>
      series
        .filter((s) => s.points.length >= 2)
        .map((s) => {
          const pts = [...s.points].sort((a, b) => a.date.localeCompare(b.date));
          return { s, prev: pts[pts.length - 2], cur: pts[pts.length - 1] };
        })
        .sort((a, b) => b.cur.date.localeCompare(a.cur.date))
        .slice(0, 4),
    [series]
  );

  const loading = trends.isLoading || timeline.isLoading;

  return (
    <div className="space-y-8" data-testid="timeline-trends-view">
      <PageHeader
        title="Timeline & Trends"
        subtitle={`Every ${includeUnverified ? "" : "verified "}result recorded for ${activeProfile?.name ?? "this profile"}, over time, with the source report for each.`}
        actions={
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={includeUnverified} onChange={(e) => setIncludeUnverified(e.target.checked)} />
            Include unverified values
          </label>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton height={48} rounded="lg" />
          <Skeleton height={300} rounded="lg" />
        </div>
      ) : trends.isError ? (
        <ErrorState title="Couldn't load your trends" message={errorMessage(trends.error)} onRetry={() => trends.refetch()} />
      ) : series.length === 0 ? (
        <EmptyState
          title="No results to chart yet"
          description={includeUnverified ? "Upload a report or add results by hand." : "Verified results appear here. Review an uploaded report, or add results by hand, to get started."}
        />
      ) : (
        <>
          <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[var(--border)] shadow-1">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Choose a test">
              {series.slice(0, 12).map((s) => (
                <button
                  key={s.normalized_test_name}
                  type="button"
                  aria-pressed={current?.normalized_test_name === s.normalized_test_name}
                  onClick={() => setSelected(s.normalized_test_name)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    current?.normalized_test_name === s.normalized_test_name
                      ? "bg-[var(--green-800)] text-white shadow-1"
                      : "bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {s.normalized_test_name}
                  <span className="ml-1.5 opacity-70">({s.points.length})</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 self-start md:self-auto" role="group" aria-label="Date range">
              {(["3m", "6m", "1y", "all"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md uppercase ${range === r ? "bg-[var(--green-100)] text-[var(--green-900)] font-bold" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>

          {current?.warning_message && (
            <p role="note" className="text-xs p-3 rounded-lg bg-[var(--warning-bg)] text-[var(--warning)] border border-[rgba(169,101,19,0.3)]">
              {current.warning_message}
            </p>
          )}

          <section>
            <TrendChart
              title={`${current?.normalized_test_name ?? ""} over time`}
              unit={current?.standard_unit ?? ""}
              points={points}
              referenceRange={reference ? { ...reference, label: "Range printed on the report" } : undefined}
            />
            {!reference && <p className="text-xs text-[var(--muted)] mt-2">No numeric reference range was printed on the latest report, so none is shown. Ranges vary between labs.</p>}
          </section>

          {changes.length > 0 && (
            <section className="space-y-3">
              <h3 className="font-display font-semibold text-sm">Recorded changes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {changes.map(({ s, prev, cur }) => (
                  <ChangeCard
                    key={s.normalized_test_name}
                    observation={s.normalized_test_name}
                    previousValue={prev.value}
                    currentValue={cur.value}
                    unit={cur.original_unit ?? s.standard_unit}
                    period={`${formatDate(prev.date)} → ${formatDate(cur.date)}`}
                    neutralDescription="This shows what was recorded, not what it means. Discuss changes with your doctor."
                  />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3" aria-label="All results">
            <h3 className="font-display font-semibold text-sm">All results</h3>
            <Card className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold">Test</th>
                    <th className="p-3 font-semibold">Value</th>
                    <th className="p-3 font-semibold">Report range</th>
                    <th className="p-3 font-semibold">Source</th>
                    <th className="p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(timeline.data?.items ?? [])]
                    .sort((a, b) => b.clinical_date.localeCompare(a.clinical_date))
                    .map((it) => (
                      <tr key={it.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="p-3 whitespace-nowrap">
                          {formatDate(it.clinical_date)}
                          {it.date_type === "inferred" && <span className="text-[var(--muted)]"> (upload date)</span>}
                        </td>
                        <td className="p-3">{it.original_test_name}</td>
                        <td className="p-3 font-mono tabular-nums">
                          {it.value} {it.unit}
                        </td>
                        <td className="p-3 text-[var(--muted)]">{it.reference_range || "—"}</td>
                        <td className="p-3 text-[var(--muted)] max-w-[200px] truncate" title={it.document_filename}>
                          {it.document_filename}
                        </td>
                        <td className="p-3">
                          <Badge variant={it.is_reviewed ? "verified" : "review"} size="sm">
                            {it.is_reviewed ? "Verified" : "Unverified"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
