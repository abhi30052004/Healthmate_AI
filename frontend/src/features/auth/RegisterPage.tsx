import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { RegisterForm } from "./RegisterForm";

export interface RegisterPageProps {
  onSuccess?: () => void;
  onNavigateLogin?: () => void;
}

export function RegisterPage({ onSuccess, onNavigateLogin }: RegisterPageProps) {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Create your free health vault"
      subtitle="3 simple steps with strict medical safety consent"
    >
      <RegisterForm
        onSuccess={() => {
          if (onSuccess) onSuccess();
          else navigate("/app/dashboard");
        }}
        onNavigateLogin={() => {
          if (onNavigateLogin) onNavigateLogin();
          else navigate("/login");
        }}
      />
    </AuthLayout>
  );
}

export default RegisterPage;
