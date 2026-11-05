import React, { useRef } from "react";
import { LandingNavbar } from "./landing/LandingNavbar";
import { LandingHero } from "./landing/LandingHero";
import { FeatureSection } from "./landing/FeatureSection";
import { HowItWorks } from "./landing/HowItWorks";
import { SecuritySection } from "./landing/SecuritySection";
import { LandingCTA } from "./landing/LandingCTA";
import { LandingFooter } from "./landing/LandingFooter";
import { AuthCard } from "./AuthCard";
import { CheckCircle2 } from "lucide-react";

interface LandingPageProps {
  onGetStarted?: () => void;
  initialAuthMode?: "login" | "register";
}

export function LandingPage({ onGetStarted, initialAuthMode = "login" }: LandingPageProps) {
  const authSectionRef = useRef<HTMLDivElement>(null);

  const scrollToAuth = (mode?: "login" | "register") => {
    const el = document.getElementById("auth-portal-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    if (mode === "register") {
      const regTab = document.getElementById("tab-register");
      if (regTab) regTab.click();
    } else if (mode === "login") {
      const loginTab = document.getElementById("tab-login");
      if (loginTab) loginTab.click();
    }
    if (onGetStarted) {
      onGetStarted();
    }
  };

  return (
    <div className="landing-page-root">
      {/* Sticky Navigation Bar */}
      <LandingNavbar
        onOpenLogin={() => scrollToAuth("login")}
        onOpenRegister={() => scrollToAuth("register")}
      />

      {/* Hero Section with Layered Sample Product Preview */}
      <LandingHero
        onOpenRegister={() => scrollToAuth("register")}
        onOpenLogin={() => scrollToAuth("login")}
      />

      {/* Bento Grid Healthcare Features */}
      <FeatureSection />

      {/* 3-Step Interactive Workflow */}
      <HowItWorks />

      {/* Verified Privacy Architecture & Non-Diagnostic Notice */}
      <SecuritySection />

      {/* Embedded 3D Flip Authentication Portal */}
      <section className="landing-auth-section" id="auth-portal-section" ref={authSectionRef}>
        <div className="landing-container">
          <div className="landing-auth-grid">
            <div className="landing-auth-intro">
              <div className="landing-pill-badge">
                <span className="landing-pill-dot" />
                <span>Secure Patient & Caregiver Access</span>
              </div>
              <h2 className="landing-auth-title">
                Access your health records and clinical timeline
              </h2>
              <p className="landing-auth-desc">
                Log in to review extracted lab reports, chat with the grounded AI assistant, or prepare your personalized doctor visit pack.
              </p>

              <div className="landing-auth-perks-list">
                <div className="auth-perk-row">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>Per-user isolated database partitioning</span>
                </div>
                <div className="auth-perk-row">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>Deterministic SHA-256 duplicate report protection</span>
                </div>
                <div className="auth-perk-row">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>Private RAG grounded strictly in authorized records</span>
                </div>
              </div>
            </div>

            <div className="landing-auth-card-col">
              <AuthCard initialMode={initialAuthMode} />
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <LandingCTA
        onOpenRegister={() => scrollToAuth("register")}
        onOpenLogin={() => scrollToAuth("login")}
      />

      {/* Comprehensive Footer with Medical Non-Diagnostic Disclaimer */}
      <LandingFooter
        onOpenLogin={() => scrollToAuth("login")}
        onOpenRegister={() => scrollToAuth("register")}
      />
    </div>
  );
}
