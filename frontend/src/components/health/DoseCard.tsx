import React from "react";
import { motion } from "motion/react";
import { Pill, Check, Clock, X, BellRing, Undo2 } from "lucide-react";
import { Button } from "../ui/Button";

export interface DoseItem {
  id: string;
  name: string;
  dosage: string;
  /** Already formatted for display, e.g. "8:00 AM". */
  time: string;
  instructions?: string;
  status?: "pending" | "taken" | "skipped" | "snoozed";
  /** The scheduled time has passed and nothing has been recorded. */
  overdue?: boolean;
  /** Pre-formatted "until 8:15 AM" text for snoozed doses. */
  snoozeLabel?: string;
}

export interface DoseCardProps {
  dose: DoseItem;
  onTake: (id: string) => void;
  onSkip: (id: string) => void;
  onSnooze: (id: string) => void;
  onUndo?: (id: string) => void;
  busy?: boolean;
  discreetMode?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  taken: "Marked taken",
  skipped: "Skipped",
};

export function DoseCard({ dose, onTake, onSkip, onSnooze, onUndo, busy = false, discreetMode = false }: DoseCardProps) {
  const status = dose.status ?? "pending";
  const isDone = status === "taken" || status === "skipped";

  const displayName = discreetMode ? "Scheduled dose" : dose.name;
  const displayDosage = discreetMode ? "" : dose.dosage;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border transition-colors ${
        status === "taken"
          ? "bg-[var(--green-50)] border-[var(--green-600)]"
          : status === "skipped"
          ? "bg-[var(--bg)] border-[var(--border)]"
          : dose.overdue
          ? "bg-white border-[var(--warning)] shadow-1"
          : "bg-white border-[var(--border)] shadow-1"
      }`}
      data-testid="dose-card"
      data-status={status}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              status === "taken" ? "bg-[var(--green-600)] text-white" : "bg-[var(--green-50)] text-[var(--green-800)]"
            }`}
          >
            {status === "taken" ? <Check size={18} aria-hidden="true" /> : <Pill size={18} aria-hidden="true" />}
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-semibold text-sm text-[var(--text)]">{displayName}</span>
              {displayDosage && <span className="text-xs text-[var(--muted)]">{displayDosage}</span>}
            </div>
            <p className="text-xs text-[var(--muted)] flex items-center gap-1.5 flex-wrap">
              <Clock size={12} aria-hidden="true" />
              <span>{dose.time}</span>
              {dose.instructions && !discreetMode && <span>· {dose.instructions}</span>}
            </p>
          </div>
        </div>

        {isDone && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
              status === "taken" ? "bg-[var(--green-100)] text-[var(--green-800)]" : "bg-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {STATUS_LABEL[status]}
          </span>
        )}
        {status === "snoozed" && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 bg-[var(--warning-bg)] text-[var(--warning)]">
            Snoozed {dose.snoozeLabel}
          </span>
        )}
        {!isDone && status !== "snoozed" && dose.overdue && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 bg-[var(--warning-bg)] text-[var(--warning)]">
            Not recorded yet
          </span>
        )}
      </div>

      {!isDone ? (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
          <Button variant="verified" size="sm" iconLeft={<Check size={14} />} onClick={() => onTake(dose.id)} disabled={busy} className="flex-1">
            I took it
          </Button>
          <Button variant="outline" size="sm" iconLeft={<BellRing size={14} />} onClick={() => onSnooze(dose.id)} disabled={busy}>
            Snooze
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<X size={14} />}
            onClick={() => onSkip(dose.id)}
            disabled={busy}
            className="text-[var(--muted)] hover:text-[var(--danger)]"
          >
            Skip
          </Button>
        </div>
      ) : (
        onUndo && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => onUndo(dose.id)}
              disabled={busy}
              className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] inline-flex items-center gap-1.5"
            >
              <Undo2 size={12} aria-hidden="true" /> Undo
            </button>
          </div>
        )
      )}
    </motion.div>
  );
}
