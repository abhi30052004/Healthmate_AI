import React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Reveal } from "../design-system/Reveal";

interface LandingCTAProps {
  onOpenRegister?: () => void;
  onOpenLogin?: () => void;
}

export function LandingCTA({ onOpenRegister, onOpenLogin }: LandingCTAProps) {
  const navigateTo = (path: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <section className="landing-cta-section">
      <div className="landing-container">
        <Reveal>
          <div className="landing-cta-card">
            <div className="landing-cta-content">
              <h2 className="landing-cta-title">
                Take a More Organized Approach to Your Health.
              </h2>

              <p className="landing-cta-subtitle">
                Bring your scattered medical documents into an intelligent health record workspace. Upload your first report or start organizing your clinical timeline today.
              </p>

              <div className="landing-cta-buttons">
                <a
                  href="/register"
                  className="btn-cta-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenRegister) onOpenRegister();
                    else navigateTo("/register");
                  }}
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-5 h-5 ml-1.5" />
                </a>

                <a
                  href="/login"
                  className="btn-cta-secondary"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenLogin) onOpenLogin();
                    else navigateTo("/login");
                  }}
                >
                  Sign In
                </a>
              </div>

              <div className="landing-cta-perks">
                <div className="cta-perk">
                  <CheckCircle2 className="w-4 h-4 text-teal-200" />
                  <span>Free account creation</span>
                </div>
                <div className="cta-perk">
                  <CheckCircle2 className="w-4 h-4 text-teal-200" />
                  <span>Per-user data isolation</span>
                </div>
                <div className="cta-perk">
                  <CheckCircle2 className="w-4 h-4 text-teal-200" />
                  <span>Grounded clinical assistant</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
