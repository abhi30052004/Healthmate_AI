import React from "react";
import {
  FileText,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Activity,
  Bot,
  ExternalLink,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "../design-system/Badge";

export function DashboardPreview() {
  const shouldReduceMotion = useReducedMotion();

  const floatAnimationLeft = shouldReduceMotion
    ? {}
    : {
        y: [0, -6, 0],
        transition: {
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };

  const floatAnimationRight = shouldReduceMotion
    ? {}
    : {
        y: [0, 6, 0],
        transition: {
          duration: 5,
          repeat: Infinity,
          repeatType: "loop" as const,
          ease: "easeInOut" as const,
          delay: 0.5,
        },
      };

  return (
    <div className="preview-layered-container">
      {/* Layer 1: Main Dashboard Window */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="preview-window-frame"
      >
        {/* Window Title Bar */}
        <div className="preview-window-header">
          <div className="preview-window-controls">
            <span className="dot dot-close" />
            <span className="dot dot-min" />
            <span className="dot dot-max" />
          </div>
          <div className="preview-window-title">
            <Activity className="w-3.5 h-3.5 text-teal-600 inline mr-1.5" />
            <span>HealthMate AI — Clinical Workspace</span>
          </div>
          <div className="preview-window-badge">
            <Badge variant="teal" size="sm" dot>
              Sample preview
            </Badge>
          </div>
        </div>

        {/* Window Body */}
        <div className="preview-window-body">
          {/* Top greeting / sub bar */}
          <div className="preview-top-bar">
            <div>
              <div className="preview-greeting">Patient Health Overview</div>
              <div className="preview-subtitle">
                Chronological record organization & longitudinal tracking
              </div>
            </div>
            <div className="preview-profile-tag">
              <span className="preview-profile-avatar">P</span>
              <span className="preview-profile-name">Sample Patient Profile</span>
            </div>
          </div>

          {/* 3 Metric Cards with neutral indicators */}
          <div className="preview-metrics-grid">
            <div className="preview-metric-card">
              <div className="preview-metric-header">
                <span className="preview-metric-label">Medical Records</span>
                <FileText className="w-4 h-4 text-teal-600" />
              </div>
              <div className="preview-metric-desc">
                Clinical PDFs & lab reports indexed
              </div>
              <div className="preview-skeleton-strip">
                <div className="preview-skeleton-bar w-3/4" />
                <div className="preview-skeleton-bar w-1/2" />
              </div>
              <div className="preview-metric-footer">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                <span>Deterministic hash verified</span>
              </div>
            </div>

            <div className="preview-metric-card">
              <div className="preview-metric-header">
                <span className="preview-metric-label">Biomarker Tracking</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="preview-metric-desc">
                Longitudinal trends across reports
              </div>
              <div className="preview-skeleton-strip">
                <div className="preview-skeleton-bar w-5/6" />
                <div className="preview-skeleton-bar w-2/3" />
              </div>
              <div className="preview-metric-footer">
                <Activity className="w-3.5 h-3.5 text-teal-600 mr-1" />
                <span>Standardized reference ranges</span>
              </div>
            </div>

            <div className="preview-metric-card">
              <div className="preview-metric-header">
                <span className="preview-metric-label">Visit Preparation</span>
                <Sparkles className="w-4 h-4 text-teal-600" />
              </div>
              <div className="preview-metric-desc">
                Synthesized summary for consultations
              </div>
              <div className="preview-skeleton-strip">
                <div className="preview-skeleton-bar w-2/3" />
                <div className="preview-skeleton-bar w-4/5" />
              </div>
              <div className="preview-metric-footer">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                <span>Physician summary ready</span>
              </div>
            </div>
          </div>

          {/* Biomarker Table */}
          <div className="preview-content-box">
            <div className="preview-box-title">
              <span>Extracted Observations (Sample Lab Panel)</span>
              <span className="preview-sample-pill">Sample data</span>
            </div>
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Biomarker</th>
                    <th>Extracted Value</th>
                    <th>Reference Interval</th>
                    <th>Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-semibold text-slate-800">Fasting Blood Glucose</td>
                    <td className="tabular-nums font-medium">95 mg/dL</td>
                    <td className="text-slate-500 tabular-nums">70 – 99 mg/dL</td>
                    <td>
                      <Badge variant="normal" size="sm">
                        Normal
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-800">Total Serum Cholesterol</td>
                    <td className="tabular-nums font-medium">180 mg/dL</td>
                    <td className="text-slate-500 tabular-nums">&lt; 200 mg/dL</td>
                    <td>
                      <Badge variant="normal" size="sm">
                        Normal
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-800">Hemoglobin A1c</td>
                    <td className="tabular-nums font-medium">5.4 %</td>
                    <td className="text-slate-500 tabular-nums">4.0 – 5.6 %</td>
                    <td>
                      <Badge variant="normal" size="sm">
                        Optimal
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Layer 2: Floating AI Chat Bubble (Top Left) */}
      <motion.div
        animate={floatAnimationLeft}
        className="preview-floating-card preview-floating-chat"
      >
        <div className="preview-card-badge-row">
          <div className="flex items-center gap-1.5 text-teal-700 font-semibold text-xs">
            <Bot className="w-4 h-4" />
            <span>AI Health Assistant</span>
          </div>
          <Badge variant="neutral" size="sm">
            Sample preview
          </Badge>
        </div>
        <div className="preview-chat-query">
          "What was my fasting glucose level in the last lab report?"
        </div>
        <div className="preview-chat-response">
          "Based on your uploaded record, your fasting glucose was <strong>95 mg/dL</strong>, which is within the standard normal reference range (70–99 mg/dL)."
        </div>
        <div className="preview-chat-citation">
          <ExternalLink className="w-3 h-3 inline mr-1 text-teal-600" />
          <span>Grounded in sample_lab_report.pdf (Page 2) • Non-diagnostic</span>
        </div>
      </motion.div>

      {/* Layer 3: Floating Lab Observation Card (Bottom Right) */}
      <motion.div
        animate={floatAnimationRight}
        className="preview-floating-card preview-floating-observation"
      >
        <div className="preview-card-badge-row">
          <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-xs">
            <Activity className="w-4 h-4" />
            <span>Observation Range</span>
          </div>
          <Badge variant="teal" size="sm">
            Sample preview
          </Badge>
        </div>
        <div className="preview-obs-metric">
          <div>
            <div className="preview-obs-name">Fasting Glucose</div>
            <div className="preview-obs-val tabular-nums">95 <span className="text-xs font-normal text-slate-500">mg/dL</span></div>
          </div>
          <Badge variant="normal" size="sm">Within Target</Badge>
        </div>
        <div className="preview-obs-track">
          <div className="preview-obs-bar" style={{ width: "55%" }} />
        </div>
        <div className="preview-obs-labels tabular-nums">
          <span>70</span>
          <span className="text-teal-700 font-medium">95 (Extracted)</span>
          <span>99</span>
        </div>
      </motion.div>
    </div>
  );
}
