import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthLayout } from "./AuthLayout";
import { RegisterForm, type RegisterSuccessDetails } from "./RegisterForm";
import { useAuth } from "../../context/AuthContext";
import {
  createFamilyProfile,
  listFamilyProfiles,
  updateFamilyProfile,
} from "../../api/client";

export interface RegisterPageProps {
  onSuccess?: () => void;
  onNavigateLogin?: () => void;
}

export function RegisterPage({ onSuccess, onNavigateLogin }: RegisterPageProps) {
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const handleSuccess = async (email: string, details?: RegisterSuccessDetails) => {
    if (onSuccess) {
      onSuccess();
      return;
    }
    if (!details?.login) {
      // Account exists but automatic sign-in failed: continue at the login screen.
      navigate("/login", { replace: true });
      return;
    }

    await setSession(details.login);
    const token = details.login.access_token;

    // Apply the profile choice made during sign-up. Failure here must not block entry.
    try {
      const existing = await listFamilyProfiles(token); // also provisions the primary profile
      if (details.managingFor === "self") {
        const primary = existing.find((p) => p.is_primary);
        if (primary && details.profileName && primary.name !== details.profileName) {
          await updateFamilyProfile(token, primary.id, { name: details.profileName });
        }
      } else {
        await createFamilyProfile(token, {
          name: details.profileName,
          relationship: details.managingFor,
          is_dependent: details.managingFor === "child" || details.managingFor === "parent",
          consent_status: "authorized",
        });
      }
    } catch {
      toast.warning("Your account is ready, but the profile name couldn't be saved. You can edit it under Family.");
    }
    navigate("/app/dashboard", { replace: true });
  };

  return (
    <AuthLayout
      title="Create your free health vault"
      subtitle="3 simple steps with strict medical safety consent"
    >
      <RegisterForm
        onSuccess={handleSuccess}
        onNavigateLogin={() => {
          if (onNavigateLogin) onNavigateLogin();
          else navigate("/login");
        }}
      />
    </AuthLayout>
  );
}

export default RegisterPage;
