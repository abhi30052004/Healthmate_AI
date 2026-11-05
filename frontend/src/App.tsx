import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Dashboard } from "./components/Dashboard";
import { DoctorSharedPortal } from "./components/DoctorSharedPortal";
import { LandingPage } from "./components/LandingPage";
import { AuthLayout } from "./components/auth/AuthLayout";

function getSharedTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const pathMatch = window.location.pathname.match(/\/shared\/([^/?#]+)/);
  if (pathMatch && pathMatch[1]) return pathMatch[1];

  const hashMatch = window.location.hash.match(/#\/shared\/([^/?#]+)/);
  if (hashMatch && hashMatch[1]) return hashMatch[1];

  const params = new URLSearchParams(window.location.search);
  return params.get("share") || params.get("shared_token");
}

function getNormalizedPath(): string {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname.toLowerCase();
  if (path === "/login" || path === "/register" || path === "/dashboard") {
    return path;
  }
  return "/";
}

function MainContent() {
  const { user, isInitializing } = useAuth();
  const [sharedToken, setSharedToken] = useState<string | null>(getSharedTokenFromUrl());
  const [currentPath, setCurrentPath] = useState<string>(getNormalizedPath());

  useEffect(() => {
    const handlePopState = () => {
      setSharedToken(getSharedTokenFromUrl());
      setCurrentPath(getNormalizedPath());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (newPath: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", newPath);
      setCurrentPath(newPath);
    }
  };

  // If user is authenticated and is on /login or /register, redirect to dashboard
  useEffect(() => {
    if (user && (currentPath === "/login" || currentPath === "/register")) {
      navigate("/dashboard");
    }
  }, [user, currentPath]);

  if (sharedToken) {
    return (
      <DoctorSharedPortal
        token={sharedToken}
        onExit={() => {
          navigate("/");
          setSharedToken(null);
        }}
      />
    );
  }

  if (isInitializing) {
    return (
      <div className="app-layout">
        <main className="shell">
          <div className="auth-loading-screen" role="status" aria-live="polite">
            <div className="auth-loading-spinner" />
            <p className="auth-loading-text">Verifying clinical session…</p>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated state: render full Dashboard
  if (user) {
    return (
      <div className="app-layout">
        <main className="app-authenticated-main">
          <Dashboard />
        </main>
      </div>
    );
  }

  // Unauthenticated dedicated /login route
  if (currentPath === "/login") {
    return (
      <AuthLayout
        initialMode="login"
        onBackToHome={() => navigate("/")}
        onModeChange={(mode) => {
          if (mode === "register") navigate("/register");
        }}
      />
    );
  }

  // Unauthenticated dedicated /register route
  if (currentPath === "/register") {
    return (
      <AuthLayout
        initialMode="register"
        onBackToHome={() => navigate("/")}
        onModeChange={(mode) => {
          if (mode === "login") navigate("/login");
        }}
      />
    );
  }

  // Default: Premium Landing Page (with embedded 3D flip auth card)
  return (
    <div className="app-layout">
      <main className="landing-main">
        <LandingPage
          initialAuthMode="login"
          onGetStarted={() => {
            // Keep on page with smooth scroll to auth section
          }}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
