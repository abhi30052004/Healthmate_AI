import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Activity, ArrowRight, Menu, X, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LandingNavbarProps {
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

export function LandingNavbar({ onOpenLogin, onOpenRegister }: LandingNavbarProps) {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navigateTo = (path: string) => {
    setMobileMenuOpen(false);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <header
      className={`landing-nav-header ${isScrolled ? "is-scrolled" : "is-transparent"}`}
      role="banner"
    >
      <div className="landing-nav-container">
        {/* Brand Logo */}
        <a
          href="#home"
          className="landing-nav-brand"
          onClick={(e) => scrollToSection(e, "home")}
          aria-label="HealthMate AI Home"
        >
          <div className="landing-nav-logo-icon" aria-hidden="true">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="landing-nav-logo-text">
            <span className="landing-nav-brand-title">HealthMate AI</span>
            <span className="landing-nav-brand-badge">Clinical Platform</span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="landing-nav-menu" aria-label="Main Navigation">
          <a
            href="#home"
            className="landing-nav-link"
            onClick={(e) => scrollToSection(e, "home")}
          >
            Home
          </a>
          <a
            href="#features"
            className="landing-nav-link"
            onClick={(e) => scrollToSection(e, "features")}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="landing-nav-link"
            onClick={(e) => scrollToSection(e, "how-it-works")}
          >
            How It Works
          </a>
          <a
            href="#security"
            className="landing-nav-link"
            onClick={(e) => scrollToSection(e, "security")}
          >
            Privacy & Security
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="landing-nav-actions">
          {user ? (
            <a
              href="/dashboard"
              className="btn-nav-dashboard"
              onClick={(e) => {
                e.preventDefault();
                navigateTo("/dashboard");
              }}
            >
              <LayoutDashboard className="w-4 h-4 mr-1.5" />
              <span>Go to Dashboard</span>
            </a>
          ) : (
            <div className="landing-nav-auth-buttons">
              <a
                href="/login"
                className="btn-nav-signin"
                onClick={(e) => {
                  e.preventDefault();
                  if (onOpenLogin) onOpenLogin();
                  else navigateTo("/login");
                }}
              >
                Sign In
              </a>
              <a
                href="/register"
                className="btn-nav-register"
                onClick={(e) => {
                  e.preventDefault();
                  if (onOpenRegister) onOpenRegister();
                  else navigateTo("/register");
                }}
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="landing-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Animated Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="landing-mobile-nav-drawer"
          >
            <a
              href="#home"
              className="landing-mobile-nav-link"
              onClick={(e) => scrollToSection(e, "home")}
            >
              Home
            </a>
            <a
              href="#features"
              className="landing-mobile-nav-link"
              onClick={(e) => scrollToSection(e, "features")}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="landing-mobile-nav-link"
              onClick={(e) => scrollToSection(e, "how-it-works")}
            >
              How It Works
            </a>
            <a
              href="#security"
              className="landing-mobile-nav-link"
              onClick={(e) => scrollToSection(e, "security")}
            >
              Privacy & Security
            </a>

            <div className="landing-mobile-nav-divider" />

            {user ? (
              <a
                href="/dashboard"
                className="btn-nav-dashboard w-full justify-center"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo("/dashboard");
                }}
              >
                <LayoutDashboard className="w-4 h-4 mr-1.5" />
                <span>Go to Dashboard</span>
              </a>
            ) : (
              <div className="landing-mobile-nav-auth">
                <a
                  href="/login"
                  className="btn btn-secondary btn-block text-center"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenLogin) onOpenLogin();
                    else navigateTo("/login");
                  }}
                >
                  Sign In
                </a>
                <a
                  href="/register"
                  className="btn btn-primary btn-block text-center"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenRegister) onOpenRegister();
                    else navigateTo("/register");
                  }}
                >
                  Get Started
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
