import React from "react";
import { Calendar, Clock, Stethoscope, AlertTriangle, ArrowRight, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

export function AppointmentCard({
  date,
  time,
  doctor,
  specialty,
  checklistCompleted = 2,
  checklistTotal = 3,
  onPrepareClick,
}: {
  date: string;
  time?: string;
  doctor: string;
  specialty?: string;
  checklistCompleted?: number;
  checklistTotal?: number;
  onPrepareClick?: () => void;
}) {
  return (
    <Card className="p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-[var(--green-50)] text-[var(--green-800)] border border-[var(--green-100)]">
            <Calendar size={18} />
          </div>
          <div>
            <p className="font-display font-semibold text-sm text-[var(--text)]">{doctor}</p>
            {specialty && <p className="text-xs text-[var(--muted)]">{specialty}</p>}
          </div>
        </div>

        <Badge variant="neutral" size="sm">
          Upcoming
        </Badge>
      </div>

      <div className="my-3 space-y-1">
        <p className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
          <Clock size={13} className="text-[var(--muted)]" />
          <span>{date} {time ? `at ${time}` : ""}</span>
        </p>
        <div className="pt-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--muted)] mb-1">
            <span>Visit Preparation Checklist</span>
            <span className="font-semibold text-[var(--text)]">
              {checklistCompleted} of {checklistTotal} ready
            </span>
          </div>
          <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--green-600)] rounded-full"
              style={{ width: `${(checklistCompleted / checklistTotal) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {onPrepareClick && (
        <Button
          variant="outline"
          size="sm"
          onClick={onPrepareClick}
          iconRight={<ArrowRight size={13} />}
          className="w-full mt-1"
        >
          Prepare Visit Pack
        </Button>
      )}
    </Card>
  );
}

export function ReviewQueueCard({
  count,
  documentTitle,
  extractedDate,
  onReviewClick,
}: {
  count: number;
  documentTitle: string;
  extractedDate?: string;
  onReviewClick: () => void;
}) {
  return (
    <Card className="p-5 border-l-4 border-l-[var(--warning)] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-[var(--warning)]">
          <AlertTriangle size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Awaiting Human Review</span>
        </div>
        <Badge variant="review" size="sm">
          {count} {count === 1 ? "Item" : "Items"}
        </Badge>
      </div>

      <div className="my-2 space-y-0.5">
        <h3 className="font-display font-semibold text-sm text-[var(--text)]">{documentTitle}</h3>
        <p className="text-xs text-[var(--muted)]">
          Extracted lab observations require confirmation before appearing in longitudinal trends.
        </p>
        {extractedDate && <p className="text-[11px] text-[var(--muted)] pt-1">Date: {extractedDate}</p>}
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={onReviewClick}
        className="w-full mt-2"
        iconRight={<ArrowRight size={14} />}
      >
        Verify Extracted Values
      </Button>
    </Card>
  );
}

export function ChangeCard({
  observation,
  previousValue,
  currentValue,
  unit,
  period,
  neutralDescription,
}: {
  observation: string;
  previousValue: string | number;
  currentValue: string | number;
  unit?: string;
  period: string;
  neutralDescription: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-white border border-[var(--border)] shadow-1 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-[var(--green-50)] text-[var(--green-700)] shrink-0 mt-0.5">
        <TrendingUp size={18} />
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[var(--text)]">{observation}</span>
          <span className="text-[11px] text-[var(--muted)]">({period})</span>
        </div>
        <p className="text-[var(--muted)]">
          Recorded value moved from{" "}
          <span className="font-mono font-semibold text-[var(--text)]">{previousValue} {unit}</span> to{" "}
          <span className="font-mono font-semibold text-[var(--text)]">{currentValue} {unit}</span>.
        </p>
        <p className="text-[11px] text-[var(--muted)] italic pt-0.5">
          {neutralDescription}
        </p>
      </div>
    </div>
  );
}

