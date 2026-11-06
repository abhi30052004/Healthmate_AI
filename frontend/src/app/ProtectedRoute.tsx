import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "../components/feedback/PageLoader";

/** Renders children only for an authenticated user; otherwise redirects to /login. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <PageLoader />;
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** For /login and /register: bounce signed-in users into the app. */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { token, user, isInitializing } = useAuth();
  if (isInitializing) return <PageLoader />;
  if (token && user) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}
