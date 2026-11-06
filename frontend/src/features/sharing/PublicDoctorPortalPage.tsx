import React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PublicDoctorPortalView } from "./PublicDoctorPortalView";

export function PublicDoctorPortalPage() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center">
        <Link
          to="/"
          className="text-xs text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>HealthMate AI</span>
        </Link>
      </div>
      <div className="max-w-4xl mx-auto">
        {token ? (
          <PublicDoctorPortalView shareToken={token} />
        ) : (
          <p role="alert" className="text-sm text-center text-[var(--muted)] mt-16">
            This link is incomplete. Please ask the patient to send it again.
          </p>
        )}
      </div>
    </div>
  );
}

export default PublicDoctorPortalPage;
