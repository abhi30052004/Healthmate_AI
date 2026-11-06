import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { LoginForm } from "./LoginForm";
import { useAuth } from "../../context/AuthContext";
import type { LoginResponse } from "../../services/authService";

export interface LoginPageProps {
  onSuccess?: () => void;
  onNavigateRegister?: () => void;
}

export function LoginPage({ onSuccess, onNavigateRegister }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession, sessionError, clearSessionError } = useAuth();
  const from = (location.state as { from?: string } | null)?.from;

  const handleSuccess = async (res: LoginResponse) => {
    await setSession(res);
    if (onSuccess) onSuccess();
    else navigate(from && from.startsWith("/app") ? from : "/app/dashboard", { replace: true });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to review and manage your family health records"
    >
      {sessionError && (
        <div
          role="status"
          className="mb-4 p-3 rounded-lg bg-[var(--warning-bg)] border border-[var(--warning)] text-xs text-[var(--text)] flex items-center justify-between gap-2"
        >
          <span>{sessionError}</span>
          <button type="button" className="font-semibold underline" onClick={clearSessionError}>
            Dismiss
          </button>
        </div>
      )}
      <LoginForm
        onSuccess={handleSuccess}
        onNavigateRegister={() => {
          if (onNavigateRegister) onNavigateRegister();
          else navigate("/register");
        }}
        onNavigateForgotPassword={() => navigate("/forgot-password")}
      />
    </AuthLayout>
  );
}

export default LoginPage;
