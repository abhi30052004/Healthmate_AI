import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { LoginForm } from "./LoginForm";

export interface LoginPageProps {
  onSuccess?: () => void;
  onNavigateRegister?: () => void;
}

export function LoginPage({ onSuccess, onNavigateRegister }: LoginPageProps) {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to review and manage your family health records"
    >
      <LoginForm
        onSuccess={() => {
          if (onSuccess) onSuccess();
          else navigate("/app/dashboard");
        }}
        onNavigateRegister={() => {
          if (onNavigateRegister) onNavigateRegister();
          else navigate("/register");
        }}
        onNavigateForgotPassword={() => {
          alert("Password reset instructions sent to registered synthetic email.");
        }}
      />
    </AuthLayout>
  );
}

export default LoginPage;
