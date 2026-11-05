import React, { useState } from "react";
import { Clock, TrendingUp, Calendar, Filter, Activity } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { TrendChart, type TrendPoint } from "./TrendChart";
import { ChangeCard } from "../../components/health/HealthCards";
import type { FamilyProfile } from "../../api/client";

export interface TimelineTrendsViewProps {
  token: string;
  activeProfile: FamilyProfile | null;
}

export function TimelineTrendsView({ token, activeProfile }: TimelineTrendsViewProps) {
  const [selectedMetric, setSelectedMetric] = useState<"bp" | "glucose" | "hba1c" | "cholesterol">("glucose");
  const [timeRange, setTimeRange] = useState<"3m" | "6m" | "1y" | "all">("1y");

  // Synthetic longitudinal observations
  const glucosePoints: TrendPoint[] = [
    { date: "15 Jan 2026", value: 104, unit: "mg/dL", documentTitle: "Routine Health Check.pdf", isVerified: true },
    { date: "12 Apr 2026", value: 98, unit: "mg/dL", documentTitle: "Follow-up Lab Panel.pdf", isVerified: true },
    { date: "15 Aug 2026", value: 100, unit: "mg/dL", documentTitle: "Annual Clinical Profile.pdf", isVerified: true },
    { date: "28 Oct 2026", value: 94, unit: "mg/dL", documentTitle: "Comprehensive Chemistry.pdf", isVerified: true },
  ];

  const bpPoints: TrendPoint[] = [
    { date: "15 Jan 2026", value: 124, unit: "mmHg", documentTitle: "Cardio Visit Notes.pdf", isVerified: true },
    { date: "12 Apr 2026", value: 122, unit: "mmHg", documentTitle: "Follow-up Lab Panel.pdf", isVerified: true },
    { date: "15 Aug 2026", value: 116, unit: "mmHg", documentTitle: "Annual Clinical Profile.pdf", isVerified: true },
    { date: "28 Oct 2026", value: 120, unit: "mmHg", documentTitle: "Comprehensive Chemistry.pdf", isVerified: true },
  ];

  const hba1cPoints: TrendPoint[] = [
    { date: "15 Jan 2026", value: 5.8, unit: "%", documentTitle: "Routine Health Check.pdf", isVerified: true },
    { date: "15 Aug 2026", value: 5.6, unit: "%", documentTitle: "Annual Clinical Profile.pdf", isVerified: true },
    { date: "28 Oct 2026", value: 5.6, unit: "%", documentTitle: "Comprehensive Chemistry.pdf", isVerified: true },
  ];

  const cholesterolPoints: TrendPoint[] = [
    { date: "15 Jan 2026", value: 204, unit: "mg/dL", documentTitle: "Routine Health Check.pdf", isVerified: true },
    { date: "12 Apr 2026", value: 196, unit: "mg/dL", documentTitle: "Follow-up Lab Panel.pdf", isVerified: true },
    { date: "15 Aug 2026", value: 194, unit: "mg/dL", documentTitle: "Annual Clinical Profile.pdf", isVerified: true },
    { date: "28 Oct 2026", value: 182, unit: "mg/dL", documentTitle: "Comprehensive Chemistry.pdf", isVerified: true },
  ];

  const metricConfigs = {
    glucose: {
      title: "Fasting Blood Glucose Longitudinal Trend",
      unit: "mg/dL",
      points: glucosePoints,
      referenceRange: { min: 70, max: 100 },
    },
    bp: {
      title: "Systolic Blood Pressure Trend",
      unit: "mmHg",
      points: bpPoints,
      referenceRange: { min: 90, max: 120 },
    },
    hba1c: {
      title: "HbA1c Glycated Hemoglobin Trend",
      unit: "%",
      points: hba1cPoints,
      referenceRange: { min: 4.0, max: 5.7 },
    },
    cholesterol: {
      title: "Total Serum Cholesterol Trend",
      unit: "mg/dL",
      points: cholesterolPoints,
      referenceRange: { min: 125, max: 200 },
    },
  };

  const currentConfig = metricConfigs[selectedMetric];

  return (
    <div className="space-y-8" data-testid="timeline-trends-view">
      <PageHeader
        title="Interactive Medical Timeline & Longitudinal Trends"
        subtitle="Chronological visualization of lab observations, vitals, and comparative reference ranges."
      />

      {/* Metric Selector Bar & Period Buttons */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[var(--border)] shadow-1">
        {/* Metric Picker */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "glucose", label: "Fasting Glucose" },
              { id: "bp", label: "Blood Pressure" },
              { id: "hba1c", label: "HbA1c" },
              { id: "cholesterol", label: "Lipid / Cholesterol" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMetric(m.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                selectedMetric === m.id
                  ? "bg-[var(--green-800)] text-white shadow-1"
                  : "bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-1.5 self-start md:self-auto">
          {(["3m", "6m", "1y", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md uppercase transition-colors ${
                timeRange === r
                  ? "bg-[var(--green-100)] text-[var(--green-900)] font-bold"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* Active Trend Chart with Reference Band */}
      <section>
        <TrendChart
          title={currentConfig.title}
          unit={currentConfig.unit}
          points={currentConfig.points}
          referenceRange={currentConfig.referenceRange}
        />
      </section>

      {/* Longitudinal Change Summaries */}
      <section className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-[var(--text)]">
          Comparative Insights & Detected Shifts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChangeCard
            observation="Fasting Blood Glucose"
            previousValue="104"
            currentValue="94"
            unit="mg/dL"
            period="Jan vs Oct 2026"
            neutralDescription="Observation has moved within standard laboratory reference boundaries."
          />
          <ChangeCard
            observation="Total Serum Cholesterol"
            previousValue="204"
            currentValue="182"
            unit="mg/dL"
            period="Jan vs Oct 2026"
            neutralDescription="Recorded value decreased by 22 mg/dL across three comparative profiles."
          />
        </div>
      </section>
    </div>
  );
}
