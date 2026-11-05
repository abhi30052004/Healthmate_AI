import React from "react";
import { Activity, ShieldCheck, HeartPulse, FileText, CheckCircle2 } from "lucide-react";

export function AuthIllustration() {
  return (
    <div className="auth-illustration-container" aria-hidden="true">
      <div className="auth-illustration-backdrop">
        {/* Soft background radial glows */}
        <div className="auth-glow-teal" />
        <div className="auth-glow-blue" />
      </div>

      <div className="auth-illustration-content">
        {/* Central Clinical Icon */}
        <div className="auth-illustration-main-icon">
          <Activity className="w-12 h-12 text-teal-600" />
        </div>

        <h3 className="auth-illustration-title">HealthMate AI</h3>
        <p className="auth-illustration-subtitle">
          Intelligent Clinical Records & Patient Workspace
        </p>

        {/* Feature Badges list */}
        <div className="auth-illustration-pills">
          <div className="auth-ill-pill">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Isolated Tenant Vault</span>
          </div>
          <div className="auth-ill-pill">
            <HeartPulse className="w-4 h-4 text-emerald-600" />
            <span>Biomarker Lab Analysis</span>
          </div>
          <div className="auth-ill-pill">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Doctor Visit Preparation</span>
          </div>
        </div>

        <div className="auth-illustration-footer-tag">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 inline mr-1" />
          <span>Non-Diagnostic Decision Support</span>
        </div>
      </div>
    </div>
  );
}

