import React from "react";
import { ArrowRight, ShieldCheck, Activity, FileText } from "lucide-react";
import { DashboardPreview } from "./DashboardPreview";
import { BackgroundEffects } from "../design-system/BackgroundEffects";
import { Reveal } from "../design-system/Reveal";

interface LandingHeroProps {
  onOpenRegister?: () => void;
  onOpenLogin?: () => void;
}

export function LandingHero({ onOpenRegister }: LandingHeroProps) {
  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("features");
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
    <section id="home" className="landing-hero-section">
      {/* Background Mesh Gradient, Dot Grid & Subtle Blurred Orbs */}
      <BackgroundEffects />

      <div className="landing-container relative z-10">
        {/* Top Hero Text Presentation */}
        <div className="landing-hero-center">
          <Reveal delay={0.1}>
            <div className="landing-pill-badge">
              <span className="landing-pill-dot" />
              <span>Intelligent Personal Health Record Platform</span>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <h1 className="landing-hero-title">
              Your Health Journey, Smarter and More Connected.
            </h1>
          </Reveal>

          <Reveal delay={0.3}>
            <p className="landing-hero-description">
              Bring your medical records, lab reports, health insights, and doctor preparation into one intelligent healthcare platform.
            </p>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="landing-hero-cta-group">
              <a
                href="/register"
                className="btn-hero-primary"
                onClick={(e) => {
                  e.preventDefault();
                  if (onOpenRegister) onOpenRegister();
                  else navigateTo("/register");
                }}
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5 ml-1.5" />
              </a>

              <a
                href="#features"
                className="btn-hero-secondary"
                onClick={scrollToFeatures}
              >
                Explore Features
              </a>
            </div>
          </Reveal>

          {/* Real capabilities pill indicators */}
          <Reveal delay={0.5}>
            <div className="landing-hero-pills">
              <div className="hero-pill">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Isolated User Records</span>
              </div>
              <div className="hero-pill">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Lab Report Extraction</span>
              </div>
              <div className="hero-pill">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Doctor Visit Preparation</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Layered Product Preview (Dashboard Window, Observation Card, AI Chat Bubble) */}
        <Reveal delay={0.4} direction="up">
          <div className="landing-hero-preview-wrapper">
            <DashboardPreview />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
