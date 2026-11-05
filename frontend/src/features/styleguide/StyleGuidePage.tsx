import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Sparkles, Eye, ShieldCheck, HeartPulse } from "lucide-react";

export function StyleGuidePage() {
  const [simpleMode, setSimpleMode] = useState(false);

  const toggleSimpleMode = () => {
    const next = !simpleMode;
    setSimpleMode(next);
    if (next) {
      document.body.classList.add("mode-simple");
    } else {
      document.body.classList.remove("mode-simple");
    }
  };

  const brandColors = [
    { name: "--green-900", hex: "#053F44", role: "Deep Brand / Dark Mesh", textLight: true },
    { name: "--green-800", hex: "#075B63", role: "Primary Actions / Brand Focus", textLight: true },
    { name: "--green-700", hex: "#087A83", role: "Active Nav / Interactive Links", textLight: true },
    { name: "--green-600", hex: "#2E9B79", role: "Accent / Verified State", textLight: true },
    { name: "--green-500", hex: "#43B58F", role: "Subtle Accent / Borders", textLight: false },
    { name: "--green-100", hex: "#DDF3EA", role: "Tints / Verified Chips", textLight: false },
    { name: "--green-50",  hex: "#EEF8F4", role: "Section Tints / Card Highlights", textLight: false },
  ];

  const neutralColors = [
    { name: "--bg", hex: "#F5F8F8", role: "Application Background", border: true },
    { name: "--surface", hex: "#FFFFFF", role: "Cards & Elevated Surfaces", border: true },
    { name: "--border", hex: "#DCE6E7", role: "Dividers & Structural Borders", border: true },
    { name: "--text", hex: "#172B32", role: "Primary Body & Heading Text", textLight: true },
    { name: "--muted", hex: "#647780", role: "Secondary Muted Metadata", textLight: true },
  ];

  const statusColors = [
    { name: "Verified / Success", fg: "var(--green-600)", bg: "var(--green-100)", border: "var(--green-500)", icon: <CheckCircle2 size={16} /> },
    { name: "Needs Review", fg: "var(--warning)", bg: "var(--warning-bg)", border: "var(--warning)", icon: <AlertTriangle size={16} /> },
    { name: "Error / Action Required", fg: "var(--danger)", bg: "var(--danger-bg)", border: "var(--danger)", icon: <AlertCircle size={16} /> },
    { name: "Informational", fg: "var(--info)", bg: "var(--info-bg)", border: "var(--info)", icon: <Info size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 md:p-12 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <header className="border-b border-[var(--border)] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--green-700)] font-semibold text-sm mb-1">
            <HeartPulse size={18} />
            <span>HealthMate AI Design System (v4)</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-[var(--green-900)]">
            Design Tokens & UI Foundations
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1 max-w-2xl">
            Green + White identity, strict WCAG AA contrast pairings, Plus Jakarta Sans display typography, Inter body with tabular-numeric measurement figures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSimpleMode}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors border ${
              simpleMode
                ? "bg-[var(--green-800)] text-white border-[var(--green-800)] shadow-sm"
                : "bg-white text-[var(--text)] border-[var(--border)] hover:bg-[var(--green-50)]"
            }`}
          >
            {simpleMode ? "Simple Mode: ON (20px)" : "Simple Mode: OFF (16px)"}
          </button>
        </div>
      </header>

      {/* 1. Brand Tokens */}
      <section className="space-y-4" data-testid="token-section-brand">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-semibold text-[var(--text)]">
            1. Brand Palette (Green & Teal)
          </h2>
          <span className="text-xs text-[var(--muted)]">Section 5 Tokens</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {brandColors.map((color) => (
            <div
              key={color.name}
              className="rounded-lg border border-[var(--border)] bg-white p-3 shadow-1 space-y-2"
            >
              <div
                className="h-16 rounded-md flex items-end p-2 transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: color.hex }}
              >
                <span
                  className="text-xs font-mono font-semibold"
                  style={{ color: color.textLight ? "#FFFFFF" : "#172B32" }}
                >
                  {color.hex}
                </span>
              </div>
              <div>
                <p className="text-xs font-mono font-bold text-[var(--text)]">{color.name}</p>
                <p className="text-[11px] text-[var(--muted)] leading-tight">{color.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Neutrals */}
      <section className="space-y-4" data-testid="token-section-neutrals">
        <h2 className="text-xl font-display font-semibold text-[var(--text)]">
          2. Surface & Neutral System
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {neutralColors.map((color) => (
            <div
              key={color.name}
              className="rounded-lg border border-[var(--border)] bg-white p-3 shadow-1 space-y-2"
            >
              <div
                className="h-14 rounded-md flex items-end p-2 border border-[var(--border)]"
                style={{ backgroundColor: color.hex }}
              >
                <span className="text-xs font-mono font-semibold text-[var(--text)]">
                  {color.hex}
                </span>
              </div>
              <div>
                <p className="text-xs font-mono font-bold text-[var(--text)]">{color.name}</p>
                <p className="text-[11px] text-[var(--muted)] leading-tight">{color.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Status Badges & Verification Semantics */}
      <section className="space-y-4" data-testid="token-section-status">
        <h2 className="text-xl font-display font-semibold text-[var(--text)]">
          3. Verification & Clinical Semantics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {statusColors.map((status) => (
            <div
              key={status.name}
              className="p-4 rounded-lg bg-white border border-[var(--border)] shadow-1 space-y-2"
            >
              <span className="text-xs font-medium text-[var(--muted)]">Status State</span>
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: status.bg,
                  color: status.fg,
                  border: `1px solid ${status.fg}33`,
                }}
              >
                {status.icon}
                <span>{status.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Typography & Tabular Figures */}
      <section className="space-y-4 bg-white p-6 rounded-lg border border-[var(--border)] shadow-1" data-testid="token-section-typography">
        <h2 className="text-xl font-display font-semibold text-[var(--text)]">
          4. Typography Hierarchy & Measurement Numerics
        </h2>

        <div className="space-y-6 pt-2">
          <div>
            <span className="text-xs text-[var(--muted)] font-mono">Display (Hero): Plus Jakarta Sans 48-64 / 700</span>
            <p className="font-display text-4xl font-bold text-[var(--green-900)] mt-1">
              One place for your family’s health records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-[var(--muted)] font-mono">H1 (32px / 650)</span>
              <h1 className="mt-1">Interactive Medical Timeline</h1>
            </div>
            <div>
              <span className="text-xs text-[var(--muted)] font-mono">H2 (24px / 650)</span>
              <h2 className="mt-1">Recent Laboratory Findings</h2>
            </div>
            <div>
              <span className="text-xs text-[var(--muted)] font-mono">H3 (20px / 650)</span>
              <h3 className="mt-1">Doctor Visit Preparation Pack</h3>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <span className="text-xs text-[var(--muted)] font-mono">Body & Tabular Numerics for Laboratory Values:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <div className="p-3 bg-[var(--green-50)] rounded-md border border-[var(--green-100)]">
                <span className="text-xs text-[var(--green-800)] font-medium">Blood Pressure</span>
                <p className="text-2xl font-bold tabular-nums text-[var(--text)] mt-0.5">
                  120/80 <span className="text-xs font-normal text-[var(--muted)]">mmHg</span>
                </p>
              </div>
              <div className="p-3 bg-[var(--green-50)] rounded-md border border-[var(--green-100)]">
                <span className="text-xs text-[var(--green-800)] font-medium">HbA1c Glycated</span>
                <p className="text-2xl font-bold tabular-nums text-[var(--text)] mt-0.5">
                  5.6 <span className="text-xs font-normal text-[var(--muted)]">%</span>
                </p>
              </div>
              <div className="p-3 bg-[var(--green-50)] rounded-md border border-[var(--green-100)]">
                <span className="text-xs text-[var(--green-800)] font-medium">Fasting Blood Glucose</span>
                <p className="text-2xl font-bold tabular-nums text-[var(--text)] mt-0.5">
                  94 <span className="text-xs font-normal text-[var(--muted)]">mg/dL</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Radius, Elevation, Focus */}
      <section className="space-y-4" data-testid="token-section-shapes">
        <h2 className="text-xl font-display font-semibold text-[var(--text)]">
          5. Shapes, Shadows & Focus State
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-sm border border-[var(--border)] shadow-1">
            <p className="text-xs font-mono font-bold">--radius-sm (8px)</p>
            <p className="text-xs text-[var(--muted)] mt-1">Input fields, compact pills, tooltips</p>
          </div>
          <div className="p-4 bg-white rounded border border-[var(--border)] shadow-1">
            <p className="text-xs font-mono font-bold">--radius (12px)</p>
            <p className="text-xs text-[var(--muted)] mt-1">Cards, dialogs, buttons, standard panels</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-[var(--border)] shadow-2">
            <p className="text-xs font-mono font-bold">--radius-lg (20px)</p>
            <p className="text-xs text-[var(--muted)] mt-1">Hero banners, modals, bottom sheets</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-[var(--border)] shadow-2">
            <p className="text-xs font-mono font-bold">--radius-xl (28px)</p>
            <p className="text-xs text-[var(--muted)] mt-1">Large container shells, brand blocks</p>
          </div>
        </div>

        {/* Buttons & Focus preview */}
        <div className="p-6 bg-white rounded-lg border border-[var(--border)] shadow-1 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">Interactive Buttons & Focus Rings</h3>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="px-5 py-2.5 rounded-lg font-medium text-white bg-[var(--green-800)] hover:bg-[var(--green-900)] transition-colors shadow-1 flex items-center gap-2"
            >
              <ShieldCheck size={16} />
              <span>Primary Button (--green-800)</span>
            </button>

            <button
              type="button"
              className="px-5 py-2.5 rounded-lg font-medium text-white bg-[var(--green-600)] hover:bg-[var(--green-700)] transition-colors shadow-1 flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              <span>Verified / Confirm (--green-600)</span>
            </button>

            <button
              type="button"
              className="px-5 py-2.5 rounded-lg font-medium text-[var(--green-800)] bg-[var(--green-50)] border border-[var(--green-100)] hover:bg-[var(--green-100)] transition-colors"
            >
              <span>Secondary Button</span>
            </button>

            <button
              type="button"
              className="px-5 py-2.5 rounded-lg font-medium text-[var(--danger)] bg-[var(--danger-bg)] border border-[var(--danger)] hover:opacity-90 transition-opacity"
            >
              <span>Danger Action</span>
            </button>
          </div>
        </div>

        {/* Skeleton Shimmer preview */}
        <div className="p-6 bg-white rounded-lg border border-[var(--border)] shadow-1 space-y-3">
          <span className="text-xs text-[var(--muted)] font-mono">Skeleton Shimmer State (--border shimmer):</span>
          <div className="space-y-2">
            <div className="h-6 w-1/3 rounded-md skeleton-shimmer"></div>
            <div className="h-4 w-full rounded-md skeleton-shimmer"></div>
            <div className="h-4 w-2/3 rounded-md skeleton-shimmer"></div>
          </div>
        </div>
      </section>

      {/* Safety Notice Footer */}
      <footer className="pt-6 border-t border-[var(--border)] text-xs text-[var(--muted)] text-center">
        HealthMate AI explains records and supports doctor conversations. It never diagnoses or prescribes. Demo screens use synthetic data only.
      </footer>
    </div>
  );
}
