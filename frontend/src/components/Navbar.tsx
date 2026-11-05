import React from "react";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();

  const scrollToAuth = (mode?: "login" | "register") => {
    const el = document.getElementById("auth-portal-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      if (mode === "register") {
        const regTab = document.getElementById("tab-register");
        if (regTab) regTab.click();
      } else if (mode === "login") {
        const loginTab = document.getElementById("tab-login");
        if (loginTab) loginTab.click();
      }
    }
  };

  return (
    <header className="navbar" role="banner">
      <div className="navbar-container">
        {/* Brand Logo & Name */}
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              <path d="M12 9v6" />
              <path d="M9 12h6" />
            </svg>
          </div>
          <div>
            <span className="brand-name">HealthMate AI</span>
            <span className="brand-badge">Clinical Workspace</span>
          </div>
        </div>

        {/* Unauthenticated Navigation Links */}
        {!user && (
          <nav className="navbar-public-nav" aria-label="Public navigation">
            <a href="#capabilities" className="nav-link">Capabilities</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#showcase" className="nav-link">Showcase</a>
            <a href="#trust" className="nav-link">Privacy & Trust</a>
          </nav>
        )}

        {/* Right Action Area */}
        <div className="user-nav">
          {!user ? (
            <div className="navbar-public-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => scrollToAuth("login")}
              >
                Log In
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => scrollToAuth("register")}
              >
                Get Started
              </button>
            </div>
          ) : (
            <div className="user-logged-in-box">
              <div className="user-profile-badge">
                <span className="avatar-circle">
                  {(user.name || user.email || "U")[0].toUpperCase()}
                </span>
                <div className="user-info-text">
                  <span className="user-nav-name">{user.name || "User"}</span>
                  <span className="user-nav-email">{user.email}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={logout}
                id="logout-btn"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
