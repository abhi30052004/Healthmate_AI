import React from "react";
import { AlertCircle, ShieldAlert, RefreshCw, WifiOff, Server, Inbox } from "lucide-react";
import { Button } from "../ui/Button";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      role="region"
      aria-label={title}
      className="p-8 md:p-12 text-center rounded-xl border border-dashed border-[var(--border)] bg-white max-w-lg mx-auto flex flex-col items-center justify-center space-y-4"
    >
      <div className="w-14 h-14 rounded-full bg-[var(--green-50)] text-[var(--green-700)] flex items-center justify-center border border-[var(--green-100)]">
        {icon || <Inbox size={26} aria-hidden="true" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-display font-semibold text-[var(--text)]">{title}</h3>
        <p className="text-xs text-[var(--muted)] max-w-sm">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message = "We encountered an issue while loading your clinical records. Please try again.",
  onRetry,
  isPermissionDenied = false,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isPermissionDenied?: boolean;
}) {
  return (
    <div
      role="alert"
      className="p-6 md:p-8 text-center rounded-xl border border-[var(--border)] bg-white max-w-md mx-auto space-y-4 shadow-1"
    >
      <div
        className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
          isPermissionDenied
            ? "bg-[var(--warning-bg)] text-[var(--warning)]"
            : "bg-[var(--danger-bg)] text-[var(--danger)]"
        }`}
      >
        {isPermissionDenied ? (
          <ShieldAlert size={24} aria-hidden="true" />
        ) : (
          <AlertCircle size={24} aria-hidden="true" />
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-display font-semibold text-[var(--text)]">{title}</h3>
        <p className="text-xs text-[var(--muted)]">{message}</p>
      </div>

      {!isPermissionDenied && onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          iconLeft={<RefreshCw size={14} />}
          className="mx-auto"
        >
          Try Again
        </Button>
      )}
    </div>
  );
}

export function OfflineBanner({ lastSynced }: { lastSynced?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-[var(--green-900)] text-white text-xs py-2 px-4 flex items-center justify-center gap-2"
    >
      <WifiOff size={14} className="text-[var(--warning)]" />
      <span>You are currently offline. Viewing cached health records in read-only mode.</span>
      {lastSynced && <span className="opacity-75">· Last synced: {lastSynced}</span>}
    </div>
  );
}

export function ColdStartBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-[var(--green-50)] border-b border-[var(--green-100)] text-[var(--green-800)] text-xs py-2.5 px-4 flex items-center justify-center gap-2.5"
    >
      <Server size={14} className="animate-pulse text-[var(--green-600)]" />
      <span className="font-medium">
        Waking up the server, this can take up to a minute on free tier hosting...
      </span>
    </div>
  );
}

