import React from "react";
import { Link } from "react-router-dom";
import { HeartPulse, ArrowLeft, Home } from "lucide-react";
import { Button } from "../../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[var(--border)] shadow-raised p-8 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--green-50)] text-[var(--green-800)] flex items-center justify-center mx-auto">
          <HeartPulse className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-[var(--green-600)] uppercase tracking-wider">
            404 • Page Not Found
          </span>
          <h1 className="text-2xl font-display font-bold text-[var(--green-900)]">
            We couldn't find that health record
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
            The link you clicked may have expired, moved, or is temporarily unavailable.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="secondary" size="md" className="w-full gap-2">
              <Home className="w-4 h-4" />
              <span>Landing Page</span>
            </Button>
          </Link>
          <Link to="/app/dashboard" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full gap-2 shadow-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Button>
          </Link>
        </div>

        <p className="text-[11px] text-[var(--muted)] pt-2 border-t border-[var(--border)]">
          HealthMate AI strictly isolates patient records.
        </p>
      </div>
    </div>
  );
}

export default NotFoundPage;
