import React from "react";
import { Activity, ShieldCheck } from "lucide-react";

interface LandingFooterProps {
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

export function LandingFooter({ onOpenLogin, onOpenRegister }: LandingFooterProps) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navigateTo = (path: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <footer className="landing-footer" role="contentinfo">
      <div className="landing-container">
        <div className="landing-footer-grid">
          {/* Brand Column */}
          <div className="landing-footer-brand-col">
            <div className="landing-footer-brand">
              <div className="landing-footer-logo-icon">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="landing-footer-brand-title">HealthMate AI</span>
            </div>
            <p className="landing-footer-tagline">
              Intelligent medical record organization, longitudinal lab biomarker tracking, and proactive doctor visit preparation.
            </p>
            <div className="landing-footer-badge">
              <ShieldCheck className="w-4 h-4 text-teal-400 mr-1.5" />
              <span>Patient-Centric Health Intelligence</span>
            </div>
          </div>

          {/* Product Navigation */}
          <div className="landing-footer-col">
            <h4 className="landing-footer-col-title">Product</h4>
            <ul className="landing-footer-links">
              <li>
                <a href="#home" onClick={(e) => { e.preventDefault(); scrollTo("home"); }}>
                  Home
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo("features"); }}>
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollTo("how-it-works"); }}>
                  How It Works
                </a>
              </li>
              <li>
                <a href="#security" onClick={(e) => { e.preventDefault(); scrollTo("security"); }}>
                  Privacy & Security
                </a>
              </li>
            </ul>
          </div>

          {/* Core Capabilities */}
          <div className="landing-footer-col">
            <h4 className="landing-footer-col-title">Capabilities</h4>
            <ul className="landing-footer-links">
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo("features"); }}>
                  Smart Medical Records
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo("features"); }}>
                  AI Health Assistant
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo("features"); }}>
                  Medical Timeline
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo("features"); }}>
                  Doctor Visit Preparation
                </a>
              </li>
            </ul>
          </div>

          {/* Account & Policies */}
          <div className="landing-footer-col">
            <h4 className="landing-footer-col-title">Account & Policies</h4>
            <ul className="landing-footer-links">
              <li>
                <a
                  href="/login"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenLogin) onOpenLogin();
                    else navigateTo("/login");
                  }}
                >
                  Sign In
                </a>
              </li>
              <li>
                <a
                  href="/register"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenRegister) onOpenRegister();
                    else navigateTo("/register");
                  }}
                >
                  Create Free Account
                </a>
              </li>
              <li>
                <a href="#security" onClick={(e) => { e.preventDefault(); scrollTo("security"); }}>
                  Privacy Architecture
                </a>
              </li>
              <li>
                <a href="#medical-disclaimer" onClick={(e) => { e.preventDefault(); scrollTo("medical-disclaimer"); }}>
                  Medical Disclaimer
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Medical Non-Diagnostic Disclaimer Banner */}
        <div className="landing-footer-disclaimer-box" id="footer-medical-disclaimer">
          <p className="landing-footer-disclaimer-text">
            <strong>Medical Disclaimer:</strong> HealthMate AI is a personal health record management and organizational tool. It is not a diagnostic device and does not provide clinical diagnoses, medical advice, or treatment plans. Always consult your physician or qualified healthcare provider with any questions regarding your medical condition or treatment.
          </p>
        </div>

        {/* Copyright */}
        <div className="landing-footer-bottom">
          <p className="landing-footer-copyright">
            &copy; {new Date().getFullYear()} HealthMate AI. All rights reserved.
          </p>
          <div className="landing-footer-bottom-meta">
            <span>Built for patients, families, and clinicians</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
