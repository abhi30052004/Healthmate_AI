import React from "react";
import {
  FileText,
  Bot,
  Clock,
  Activity,
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { SpotlightCard } from "../design-system/Card";
import { Badge } from "../design-system/Badge";
import { Reveal } from "../design-system/Reveal";

export function FeatureSection() {
  return (
    <section id="features" className="landing-features-section">
      <div className="landing-container">
        {/* Section Header */}
        <div className="landing-section-header">
          <Reveal>
            <div className="landing-pill-badge">
              <span className="landing-pill-dot" />
              <span>Implemented Healthcare Capabilities</span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="landing-section-title">
              Engineered for clarity, accuracy, and patient empowerment
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="landing-section-subtitle">
              Every feature is built directly on top of your verified health records to deliver a cohesive,
              secure medical workspace for you and your healthcare team.
            </p>
          </Reveal>
        </div>

        {/* Bento Grid */}
        <div className="landing-bento-grid">
          {/* Card 1: Smart Medical Records (Wide Bento - Spans 2 Columns) */}
          <Reveal delay={0.1} className="bento-col-span-2">
            <SpotlightCard className="h-full">
              <div className="bento-card-header">
                <div className="bento-icon-box bg-accent-teal">
                  <FileText className="w-5 h-5 text-teal-700" />
                </div>
                <Badge variant="teal" size="sm">
                  Document Parsing
                </Badge>
              </div>

              <h3 className="bento-card-title">Smart Medical Records</h3>
              <p className="bento-card-desc">
                Upload and organize medical documents in PDF or image format. The extraction engine automatically categorizes reports, parses dates and biomarkers, and maintains SHA-256 duplicate protection.
              </p>

              {/* Mini Visual: Document Card Preview */}
              <div className="bento-mini-visual bento-doc-preview">
                <div className="bento-doc-row">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        Metabolic_Lipid_Panel.pdf
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Extracted • 4 Biomarkers Identified
                      </div>
                    </div>
                  </div>
                  <Badge variant="normal" size="sm">
                    Verified
                  </Badge>
                </div>
                <div className="bento-doc-tags">
                  <span className="bento-tag">SHA-256 Hashed</span>
                  <span className="bento-tag">Lab Observations</span>
                  <span className="bento-tag">Reference Ranges</span>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Card 2: AI Health Assistant (Bento - 1 Column) */}
          <Reveal delay={0.2}>
            <SpotlightCard className="h-full">
              <div className="bento-card-header">
                <div className="bento-icon-box bg-accent-blue">
                  <Bot className="w-5 h-5 text-blue-700" />
                </div>
                <Badge variant="blue" size="sm">
                  Grounded RAG
                </Badge>
              </div>

              <h3 className="bento-card-title">AI Health Assistant</h3>
              <p className="bento-card-desc">
                Ask questions about your health and medications. Responses are strictly grounded in your authorized medical records with verifiable source citations and non-diagnostic guardrails.
              </p>

              {/* Mini Visual: Grounded Query Chat Preview */}
              <div className="bento-mini-visual bento-chat-preview">
                <div className="bento-chat-bubble-user">
                  "Explain my recent HbA1c result."
                </div>
                <div className="bento-chat-bubble-ai">
                  <span>"Your HbA1c was <strong>5.4%</strong> (Optimal range: 4.0–5.6%)."</span>
                  <span className="bento-citation">
                    <ExternalLink className="w-2.5 h-2.5 inline mr-1" />
                    Source: Lab_Report.pdf
                  </span>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Card 3: Medical Timeline (Bento - 1 Column) */}
          <Reveal delay={0.3}>
            <SpotlightCard className="h-full">
              <div className="bento-card-header">
                <div className="bento-icon-box bg-accent-emerald">
                  <Clock className="w-5 h-5 text-emerald-700" />
                </div>
                <Badge variant="normal" size="sm">
                  Chronological
                </Badge>
              </div>

              <h3 className="bento-card-title">Medical Timeline</h3>
              <p className="bento-card-desc">
                Interactive chronological history consolidating clinic notes, lab reports, and medication changes with clear date markers and expandable observation details.
              </p>

              {/* Mini Visual: Timeline Nodes Preview */}
              <div className="bento-mini-visual bento-timeline-preview">
                <div className="bento-timeline-item">
                  <div className="bento-timeline-node" />
                  <div className="bento-timeline-info">
                    <span className="font-semibold text-slate-800">Comprehensive Lab Panel</span>
                    <span className="text-[11px] text-slate-500">Normal metabolic range</span>
                  </div>
                </div>
                <div className="bento-timeline-item">
                  <div className="bento-timeline-node node-secondary" />
                  <div className="bento-timeline-info">
                    <span className="font-semibold text-slate-800">Clinical Cardiology Visit</span>
                    <span className="text-[11px] text-slate-500">Visit summary indexed</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Card 4: Lab Report Analysis (Wide Bento - Spans 2 Columns) */}
          <Reveal delay={0.4} className="bento-col-span-2">
            <SpotlightCard className="h-full">
              <div className="bento-card-header">
                <div className="bento-icon-box bg-accent-indigo">
                  <Activity className="w-5 h-5 text-indigo-700" />
                </div>
                <Badge variant="blue" size="sm">
                  Biomarker Intervals
                </Badge>
              </div>

              <h3 className="bento-card-title">Lab Report Analysis</h3>
              <p className="bento-card-desc">
                Understand extracted clinical observations, measurement units, and reference ranges. Clear high, normal, and low indicators help you and your clinician track numeric markers over time.
              </p>

              {/* Mini Visual: Biomarker Range Gauges */}
              <div className="bento-mini-visual bento-ranges-preview">
                <div className="bento-range-row">
                  <div className="bento-range-header">
                    <span className="font-semibold text-slate-800">Fasting Glucose</span>
                    <span className="tabular-nums font-medium text-teal-700">95 mg/dL (70–99)</span>
                  </div>
                  <div className="bento-range-track">
                    <div className="bento-range-fill bg-emerald-500" style={{ width: "55%" }} />
                  </div>
                </div>
                <div className="bento-range-row">
                  <div className="bento-range-header">
                    <span className="font-semibold text-slate-800">Total Serum Cholesterol</span>
                    <span className="tabular-nums font-medium text-teal-700">180 mg/dL (&lt; 200)</span>
                  </div>
                  <div className="bento-range-track">
                    <div className="bento-range-fill bg-teal-600" style={{ width: "65%" }} />
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Card 5: Doctor Visit Preparation (Bento - 1 Column) */}
          <Reveal delay={0.5}>
            <SpotlightCard className="h-full">
              <div className="bento-card-header">
                <div className="bento-icon-box bg-accent-teal">
                  <ClipboardList className="w-5 h-5 text-teal-700" />
                </div>
                <Badge variant="teal" size="sm">
                  Clinician-Ready
                </Badge>
              </div>

              <h3 className="bento-card-title">Doctor Visit Preparation</h3>
              <p className="bento-card-desc">
                Generate structured appointment summaries synthesizing current symptoms, active medications, key observation changes, and patient questions for your physician.
              </p>

              {/* Mini Visual: Visit Pack Checklist */}
              <div className="bento-mini-visual bento-checklist-preview">
                <div className="bento-check-row">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Symptom & concern summary</span>
                </div>
                <div className="bento-check-row">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Current medication regimen</span>
                </div>
                <div className="bento-check-row">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Suggested clinical questions</span>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Card 6: Health Insights (Bento - 2 Columns on 3-col grid, or balanced) */}
          <Reveal delay={0.6} className="bento-col-span-2">
            <SpotlightCard className="h-full">
              <div className="bento-card-header">
                <div className="bento-icon-box bg-accent-blue">
                  <TrendingUp className="w-5 h-5 text-blue-700" />
                </div>
                <Badge variant="blue" size="sm">
                  Longitudinal Compare
                </Badge>
              </div>

              <h3 className="bento-card-title">Health Insights</h3>
              <p className="bento-card-desc">
                Explore historical observations across multiple visits to visualize changes over time. Longitudinal comparison tables allow side-by-side inspection of numeric lab values without unsupported predictions.
              </p>

              {/* Mini Visual: Multi-time Comparison Visual */}
              <div className="bento-mini-visual bento-compare-preview">
                <div className="bento-compare-table">
                  <div className="bento-compare-head">
                    <span>Observation</span>
                    <span>Baseline</span>
                    <span>Latest Test</span>
                    <span>Status</span>
                  </div>
                  <div className="bento-compare-row">
                    <span className="font-semibold text-slate-800">Lipid Profile (HDL)</span>
                    <span className="tabular-nums">52 mg/dL</span>
                    <span className="tabular-nums font-medium text-emerald-700">58 mg/dL</span>
                    <Badge variant="normal" size="sm">Target Met</Badge>
                  </div>
                  <div className="bento-compare-row">
                    <span className="font-semibold text-slate-800">Fasting Blood Sugar</span>
                    <span className="tabular-nums">98 mg/dL</span>
                    <span className="tabular-nums font-medium text-teal-700">95 mg/dL</span>
                    <Badge variant="normal" size="sm">Stable</Badge>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
