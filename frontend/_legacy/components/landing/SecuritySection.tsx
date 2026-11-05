import React from "react";
import { Database, Lock, Bot, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { Reveal } from "../design-system/Reveal";

export function SecuritySection() {
  return (
    <section id="security" className="landing-security-section">
      <div className="landing-container">
        <div className="landing-section-header">
          <Reveal>
            <div className="landing-pill-badge">
              <span className="landing-pill-dot" />
              <span>Verified Architecture & Privacy</span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="landing-section-title">
              Built for user data isolation, control, and verifiable privacy
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="landing-section-subtitle">
              We design HealthMate AI with intentional technical safeguards confirmed directly in the application architecture.
            </p>
          </Reveal>
        </div>

        {/* 4 Core Pillars of Verified Privacy Architecture */}
        <div className="landing-security-grid">
          <Reveal delay={0.1}>
            <div className="landing-security-card">
              <div className="landing-security-icon-box">
                <Database className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="landing-security-title">Per-User Data Isolation</h3>
              <p className="landing-security-desc">
                All patient profiles, uploaded documents, extracted observations, and timeline records are strictly partitioned by authenticated user ID in the database.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="landing-security-card">
              <div className="landing-security-icon-box">
                <Lock className="w-5 h-5 text-blue-700" />
              </div>
              <h3 className="landing-security-title">Token-Based Sessions</h3>
              <p className="landing-security-desc">
                API interactions utilize stateless authentication tokens stored in browser session storage, which are automatically cleared on sign out or session expiration.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="landing-security-card">
              <div className="landing-security-icon-box">
                <Bot className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="landing-security-title">Grounded in Your Records</h3>
              <p className="landing-security-desc">
                AI assistant interactions retrieve clinical context solely from your authorized uploaded documents, providing verifiable citations to the original files.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="landing-security-card">
              <div className="landing-security-icon-box">
                <Shield className="w-5 h-5 text-indigo-700" />
              </div>
              <h3 className="landing-security-title">Revocable Doctor Sharing</h3>
              <p className="landing-security-desc">
                Clinician access links utilize time-limited access tokens that expire automatically and can be revoked by the user at any time from the sharing dashboard.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Verified Feature Checklist */}
        <Reveal delay={0.4}>
          <div className="landing-security-checklist">
            <div className="checklist-item">
              <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>SHA-256 duplicate document detection</span>
            </div>
            <div className="checklist-item">
              <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>Per-profile consent and authorization controls</span>
            </div>
            <div className="checklist-item">
              <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>Verifiable extracted values with source links</span>
            </div>
          </div>
        </Reveal>

        {/* Clear Medical Non-Diagnostic Disclaimer */}
        <Reveal delay={0.5}>
          <div className="landing-security-disclaimer-box" id="medical-disclaimer">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-teal-700 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Assistive Health Management Platform Notice
                </h4>
                <p className="text-xs leading-relaxed text-slate-600 m-0">
                  HealthMate AI is an informational organization and visit preparation tool. It is not a diagnostic device and does not provide clinical diagnoses, medical treatments, or independent clinical judgments. Always consult a qualified physician or healthcare provider regarding any medical symptoms, lab results, or health conditions.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
