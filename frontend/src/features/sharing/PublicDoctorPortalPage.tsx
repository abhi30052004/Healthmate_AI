import React from "react";
import { useParams, Link } from "react-router-dom";
import { PublicDoctorPortalView } from "./PublicDoctorPortalView";
import { ArrowLeft } from "lucide-react";

export function PublicDoctorPortalPage() {
  const { token } = useParams<{ token: string }>();
  const activeToken = token || "SH-9281-DEMO";

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center">
        <Link
          to="/"
          className="text-xs text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to HealthMate AI</span>
        </Link>
        <span className="text-xs text-[var(--muted)] font-mono">Token: {activeToken}</span>
      </div>
      <PublicDoctorPortalView shareToken={activeToken} />
    </div>
  );
}

export default PublicDoctorPortalPage;
