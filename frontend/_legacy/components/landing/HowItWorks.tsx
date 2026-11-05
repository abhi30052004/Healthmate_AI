import React from "react";
import { UploadCloud, FileSearch, Sparkles, ArrowRight } from "lucide-react";
import { Reveal } from "../design-system/Reveal";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="landing-how-section">
      <div className="landing-container">
        <div className="landing-section-header">
          <Reveal>
            <div className="landing-pill-badge">
              <span className="landing-pill-dot" />
              <span>Step-by-Step Clinical Workflow</span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="landing-section-title">
              From scattered medical files to organized clinical intelligence
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="landing-section-subtitle">
              HealthMate AI streamlines health document management into a reliable, verifiable three-step process.
            </p>
          </Reveal>
        </div>

        <div className="landing-steps-container">
          {/* Connecting Progress Line (Desktop) */}
          <div className="landing-steps-progress-line" aria-hidden="true" />

          <div className="landing-steps-grid">
            {/* Step 1 */}
            <Reveal delay={0.1}>
              <div className="landing-step-card">
                <div className="landing-step-num-badge">01</div>
                <div className="landing-step-icon-box">
                  <UploadCloud className="w-6 h-6 text-teal-700" />
                </div>
                <h3 className="landing-step-title">Upload your medical documents</h3>
                <p className="landing-step-desc">
                  Securely upload lab tests, clinic notes, imaging summaries, or discharge letters in PDF or image format. Each file is verified with SHA-256 duplicate protection.
                </p>
              </div>
            </Reveal>

            {/* Step 2 */}
            <Reveal delay={0.25}>
              <div className="landing-step-card">
                <div className="landing-step-num-badge">02</div>
                <div className="landing-step-icon-box">
                  <FileSearch className="w-6 h-6 text-blue-700" />
                </div>
                <h3 className="landing-step-title">Review extracted information & history</h3>
                <p className="landing-step-desc">
                  The extraction engine parses medical observations, values, units, reference intervals, and encounter dates for your interactive timeline and personal review.
                </p>
              </div>
            </Reveal>

            {/* Step 3 */}
            <Reveal delay={0.4}>
              <div className="landing-step-card">
                <div className="landing-step-num-badge">03</div>
                <div className="landing-step-icon-box">
                  <Sparkles className="w-6 h-6 text-emerald-700" />
                </div>
                <h3 className="landing-step-title">Use AI-assisted insights & prepare for visits</h3>
                <p className="landing-step-desc">
                  Query your records with the grounded assistant, track longitudinal observation trends across visits, and generate a structured doctor visit preparation pack.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
