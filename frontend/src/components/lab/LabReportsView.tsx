import React, { useState, useEffect } from "react";
import { Activity, ArrowRight, BarChart3, FlaskConical, Sliders, RefreshCw, AlertCircle, FileSpreadsheet } from "lucide-react";
import { HealthTrendChart, type DataPoint } from "../common/HealthTrendChart";
import { ObservationTable, type ObservationRow } from "../common/ObservationTable";
import { ReportComparison } from "../ReportComparison";
import { StatusBadge } from "../common/StatusBadge";
import type { FamilyProfile } from "../../api/client";

export interface LabReportsViewProps {
  token: string;
  activeProfile: FamilyProfile | null;
}

export function LabReportsView({ token, activeProfile }: LabReportsViewProps) {
  const [activeSubtab, setActiveSubtab] = useState<"analysis" | "trends" | "comparison">("analysis");
  const [selectedMarker, setSelectedMarker] = useState<string>("glucose");

  // Sample structured observations for lab analysis
  const sampleObservations: ObservationRow[] = [
    {
      id: "obs-1",
      testName: "Fasting Blood Glucose",
      category: "Metabolic",
      value: 101,
      unit: "mg/dL",
      referenceRangeText: "70 – 99 mg/dL",
      classification: "above_reference",
      laboratoryFlag: "HIGH",
      isVerified: true,
      testDate: "2026-01-14",
      reportName: "Metabolic Panel Jan 2026",
    },
    {
      id: "obs-2",
      testName: "Hemoglobin A1c",
      category: "Metabolic",
      value: 5.6,
      unit: "%",
      referenceRangeText: "4.0 – 5.6 %",
      classification: "within_reference",
      laboratoryFlag: "NORMAL",
      isVerified: true,
      testDate: "2026-01-14",
      reportName: "Metabolic Panel Jan 2026",
    },
    {
      id: "obs-3",
      testName: "Total Cholesterol",
      category: "Lipid Panel",
      value: 185,
      unit: "mg/dL",
      referenceRangeText: "125 – 200 mg/dL",
      classification: "within_reference",
      laboratoryFlag: "NORMAL",
      isVerified: true,
      testDate: "2026-01-14",
      reportName: "Lipid Panel Jan 2026",
    },
    {
      id: "obs-4",
      testName: "LDL Cholesterol",
      category: "Lipid Panel",
      value: 115,
      unit: "mg/dL",
      referenceRangeText: "< 100 mg/dL",
      classification: "above_reference",
      laboratoryFlag: "HIGH",
      isVerified: false,
      testDate: "2026-01-14",
      reportName: "Lipid Panel Jan 2026",
    },
    {
      id: "obs-5",
      testName: "HDL Cholesterol",
      category: "Lipid Panel",
      value: 48,
      unit: "mg/dL",
      referenceRangeText: "> 40 mg/dL",
      classification: "within_reference",
      laboratoryFlag: "NORMAL",
      isVerified: true,
      testDate: "2026-01-14",
      reportName: "Lipid Panel Jan 2026",
    },
    {
      id: "obs-6",
      testName: "Serum Creatinine",
      category: "Renal Function",
      value: 0.95,
      unit: "mg/dL",
      referenceRangeText: "0.60 – 1.30 mg/dL",
      classification: "within_reference",
      laboratoryFlag: "NORMAL",
      isVerified: true,
      testDate: "2026-01-14",
      reportName: "Comprehensive Metabolic Panel",
    },
    {
      id: "obs-7",
      testName: "eGFR (Estimated GFR)",
      category: "Renal Function",
      value: 92,
      unit: "mL/min/1.73m²",
      referenceRangeText: "> 60 mL/min/1.73m²",
      classification: "within_reference",
      laboratoryFlag: "NORMAL",
      isVerified: true,
      testDate: "2026-01-14",
      reportName: "Comprehensive Metabolic Panel",
    },
    {
      id: "obs-8",
      testName: "Vitamin D (25-Hydroxy)",
      category: "Vitamins",
      value: 28,
      unit: "ng/mL",
      referenceRangeText: "30 – 100 ng/mL",
      classification: "below_reference",
      laboratoryFlag: "LOW",
      isVerified: false,
      testDate: "2025-10-10",
      reportName: "Vitamin & Mineral Panel",
    },
    {
      id: "obs-9",
      testName: "Hemoglobin",
      category: "Hematology",
      value: 14.8,
      unit: "g/dL",
      referenceRangeText: "13.5 – 17.5 g/dL",
      classification: "within_reference",
      laboratoryFlag: "NORMAL",
      isVerified: true,
      testDate: "2025-10-10",
      reportName: "Complete Blood Count (CBC)",
    },
    {
      id: "obs-10",
      testName: "WBC Count",
      category: "Hematology",
      value: 4.2,
      unit: "k/uL",
      referenceRangeText: "4.5 – 11.0 k/uL",
      classification: "below_reference",
      laboratoryFlag: "LOW",
      isVerified: false,
      testDate: "2025-10-10",
      reportName: "Complete Blood Count (CBC)",
    },
  ];

  // Trend sets for selector
  const trendDatasets: Record<
    string,
    { title: string; unit: string; category: string; refRange: { low: number; high: number; text: string }; points: DataPoint[] }
  > = {
    glucose: {
      title: "Fasting Blood Glucose",
      unit: "mg/dL",
      category: "Metabolic",
      refRange: { low: 70, high: 99, text: "70 – 99 mg/dL" },
      points: [
        { date: "2025-01-15", value: 98, unit: "mg/dL", flag: "NORMAL" },
        { date: "2025-04-15", value: 104, unit: "mg/dL", flag: "NORMAL" },
        { date: "2025-07-20", value: 112, unit: "mg/dL", flag: "HIGH" },
        { date: "2025-10-10", value: 108, unit: "mg/dL", flag: "HIGH" },
        { date: "2026-01-14", value: 101, unit: "mg/dL", flag: "NORMAL" },
      ],
    },
    hba1c: {
      title: "Hemoglobin A1c",
      unit: "%",
      category: "Metabolic",
      refRange: { low: 4.0, high: 5.6, text: "4.0 – 5.6 %" },
      points: [
        { date: "2025-01-15", value: 5.4, unit: "%", flag: "NORMAL" },
        { date: "2025-07-20", value: 5.8, unit: "%", flag: "HIGH" },
        { date: "2026-01-14", value: 5.6, unit: "%", flag: "NORMAL" },
      ],
    },
    cholesterol: {
      title: "Total Cholesterol",
      unit: "mg/dL",
      category: "Lipid Panel",
      refRange: { low: 125, high: 200, text: "125 – 200 mg/dL" },
      points: [
        { date: "2025-01-15", value: 195, unit: "mg/dL", flag: "NORMAL" },
        { date: "2025-07-20", value: 210, unit: "mg/dL", flag: "HIGH" },
        { date: "2026-01-14", value: 185, unit: "mg/dL", flag: "NORMAL" },
      ],
    },
    vitamind: {
      title: "Vitamin D (25-Hydroxy)",
      unit: "ng/mL",
      category: "Vitamins",
      refRange: { low: 30, high: 100, text: "30 – 100 ng/mL" },
      points: [
        { date: "2025-04-15", value: 22, unit: "ng/mL", flag: "LOW" },
        { date: "2025-10-10", value: 28, unit: "ng/mL", flag: "LOW" },
      ],
    },
  };

  const selectedData = trendDatasets[selectedMarker] || trendDatasets.glucose;

  return (
    <div className="hm-lab-reports-page">
      {/* Page Header */}
      <div className="hm-page-header">
        <div className="hm-page-header-text">
          <div className="hm-pill-header">
            <FlaskConical size={14} className="text-teal" />
            <span>Clinical Pathology & Observations</span>
          </div>
          <h2>Lab Reports & Medical Analysis</h2>
          <p>
            Longitudinal observation values, reference intervals, high/low clinical markers, and cross-report shift analyses.
          </p>
        </div>

        {/* Subtab Segmented Switcher */}
        <div className="hm-segmented-control" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeSubtab === "analysis"}
            className={`hm-segment-btn ${activeSubtab === "analysis" ? "is-active" : ""}`}
            onClick={() => setActiveSubtab("analysis")}
          >
            <Activity size={14} />
            <span>Observation Findings</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubtab === "trends"}
            className={`hm-segment-btn ${activeSubtab === "trends" ? "is-active" : ""}`}
            onClick={() => setActiveSubtab("trends")}
          >
            <BarChart3 size={14} />
            <span>Interactive Trends</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubtab === "comparison"}
            className={`hm-segment-btn ${activeSubtab === "comparison" ? "is-active" : ""}`}
            onClick={() => setActiveSubtab("comparison")}
          >
            <FileSpreadsheet size={14} />
            <span>Report Comparison</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Structured Observation Findings */}
      {activeSubtab === "analysis" && (
        <div className="hm-tab-pane">
          {/* Quick Analytics Summary */}
          <div className="hm-lab-summary-row">
            <div className="hm-lab-stat-box">
              <span className="hm-lab-stat-num">{sampleObservations.length}</span>
              <span className="hm-lab-stat-label">Observed Markers</span>
            </div>
            <div className="hm-lab-stat-box">
              <span className="hm-lab-stat-num text-emerald">
                {sampleObservations.filter((o) => o.classification === "within_reference").length}
              </span>
              <span className="hm-lab-stat-label">Within Reference</span>
            </div>
            <div className="hm-lab-stat-box">
              <span className="hm-lab-stat-num text-amber">
                {sampleObservations.filter((o) => o.classification !== "within_reference").length}
              </span>
              <span className="hm-lab-stat-label">Flagged / Outside Range</span>
            </div>
            <div className="hm-lab-stat-box">
              <span className="hm-lab-stat-num text-teal">
                {sampleObservations.filter((o) => o.isVerified).length}
              </span>
              <span className="hm-lab-stat-label">Clinician Verified</span>
            </div>
          </div>

          <ObservationTable observations={sampleObservations} />
        </div>
      )}

      {/* Tab 2: Interactive Trends */}
      {activeSubtab === "trends" && (
        <div className="hm-tab-pane">
          <div className="hm-card hm-marker-selector-card">
            <div className="hm-marker-selector-header">
              <Sliders size={16} className="text-teal" />
              <span>Select Monitored Biomarker:</span>
            </div>
            <div className="hm-marker-button-group">
              <button
                type="button"
                className={`hm-marker-btn ${selectedMarker === "glucose" ? "is-active" : ""}`}
                onClick={() => setSelectedMarker("glucose")}
              >
                Fasting Glucose
              </button>
              <button
                type="button"
                className={`hm-marker-btn ${selectedMarker === "hba1c" ? "is-active" : ""}`}
                onClick={() => setSelectedMarker("hba1c")}
              >
                HbA1c
              </button>
              <button
                type="button"
                className={`hm-marker-btn ${selectedMarker === "cholesterol" ? "is-active" : ""}`}
                onClick={() => setSelectedMarker("cholesterol")}
              >
                Total Cholesterol
              </button>
              <button
                type="button"
                className={`hm-marker-btn ${selectedMarker === "vitamind" ? "is-active" : ""}`}
                onClick={() => setSelectedMarker("vitamind")}
              >
                Vitamin D
              </button>
            </div>
          </div>

          <HealthTrendChart
            title={selectedData.title}
            dataPoints={selectedData.points}
            unit={selectedData.unit}
            referenceRange={selectedData.refRange}
            category={selectedData.category}
            subtitle={`Longitudinal trajectory across ${selectedData.points.length} consecutive laboratory draws`}
          />
        </div>
      )}

      {/* Tab 3: Shift Analysis & Comparison */}
      {activeSubtab === "comparison" && (
        <div className="hm-tab-pane">
          <ReportComparison token={token} />
        </div>
      )}

      {/* Medical Safety Disclaimer */}
      <div className="hm-lab-safety-banner" role="note">
        <AlertCircle size={16} className="text-teal" />
        <p>
          <strong>Safety Note:</strong> Laboratory observations are displayed with corresponding reference ranges extracted from source clinical records. Never independently diagnose medical conditions or alter dosages without consulting an authorized healthcare provider.
        </p>
      </div>
    </div>
  );
}

