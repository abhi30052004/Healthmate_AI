import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pill, Check, Clock, X, BellRing } from "lucide-react";
import { Button } from "../ui/Button";

export interface DoseItem {
  id: string;
  name: string;
  dosage: string;
  time: string;
  instructions?: string;
  status?: "pending" | "taken" | "skipped" | "snoozed";
}

export interface DoseCardProps {
  dose: DoseItem;
  onTake: (id: string) => void;
  onSkip: (id: string) => void;
  onSnooze: (id: string) => void;
  discreetMode?: boolean;
}

export function DoseCard({
  dose,
  onTake,
  onSkip,
  onSnooze,
  discreetMode = false,
}: DoseCardProps) {
  const [isTaken, setIsTaken] = useState(dose.status === "taken");

  const displayName = discreetMode ? "Scheduled Dose" : dose.name;
  const displayDosage = discreetMode ? "Prescribed strength" : dose.dosage;

  const handleTake = () => {
    setIsTaken(true);
    onTake(dose.id);
  };

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className={`p-4 rounded-xl border transition-colors ${
          isTaken
            ? "bg-[var(--green-50)] border-[var(--green-600)]"
            : "bg-white border-[var(--border)] shadow-1"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                isTaken
                  ? "bg-[var(--green-600)] text-white"
                  : "bg-[var(--green-50)] text-[var(--green-800)]"
              }`}
            >
              {isTaken ? <Check size={18} /> : <Pill size={18} />}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-sm text-[var(--text)]">
                  {displayName}
                </span>
                <span className="text-xs text-[var(--muted)]">{displayDosage}</span>
              </div>
              <p className="text-xs text-[var(--muted)] flex items-center gap-1.5">
                <Clock size={12} />
                <span>{dose.time}</span>
                {dose.instructions && <span>· {dose.instructions}</span>}
              </p>
            </div>
          </div>

          {/* If already taken, display badge */}
          {isTaken && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--green-100)] text-[var(--green-800)]">
              Confirmed Taken
            </span>
          )}
        </div>

        {/* Action Buttons: Taken / Skip / Snooze */}
        {!isTaken && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
            <Button
              variant="verified"
              size="sm"
              iconLeft={<Check size={14} />}
              onClick={handleTake}
              className="flex-1"
            >
              Take
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconLeft={<BellRing size={14} />}
              onClick={() => onSnooze(dose.id)}
            >
              Snooze
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<X size={14} />}
              onClick={() => onSkip(dose.id)}
              className="text-[var(--muted)] hover:text-[var(--danger)]"
            >
              Skip
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

