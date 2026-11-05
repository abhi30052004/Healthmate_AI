import React from "react";
import { Activity, ArrowLeft } from "lucide-react";
import { FlipAuthCard } from "./FlipAuthCard";
import { AuthIllustration } from "./AuthIllustration";

interface AuthLayoutProps {
  initialMode?: "login" | "register";
  onBackToHome?: () => void;
  onModeChange?: (mode: "login" | "register") => void;
}

export function AuthLayout({
  initialMode = "login",
  onBackToHome,
  onModeChange,
}: AuthLayoutProps) {
  return (
    <div className="auth-layout-root">
      {/* Top Bar with Brand & Back Button */}
      <header className="auth-layout-header">
        <div className="auth-layout-header-inner">
          <button
            type="button"
            className="auth-layout-back-btn"
            onClick={onBackToHome}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Back to Home</span>
          </button>

          <div className="auth-layout-brand">
            <div className="auth-layout-brand-icon">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="auth-layout-brand-title">HealthMate AI</span>
          </div>

          <div className="auth-layout-header-spacer" />
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="auth-layout-main">
        <div className="auth-layout-card-container">
          <div className="auth-layout-grid">
            {/* Left Side: Modern Clinical Illustration */}
            <div className="auth-layout-illustration-side">
              <AuthIllustration />
            </div>

            {/* Right Side: 3D Animated Flip Card */}
            <div className="auth-layout-form-side">
              <FlipAuthCard
                initialMode={initialMode}
                onModeChange={onModeChange}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="auth-layout-footer">
        <p>
          Protected clinical session • HealthMate AI is an organizational tool and does not provide medical advice.
        </p>
      </footer>
    </div>
  );
}

