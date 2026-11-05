import React from "react";
import { TrendingUp, TrendingDown, Minus, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";

export interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  date?: string;
  delta?: {
    value: string;
    isIncrease?: boolean;
    period?: string;
    neutral?: boolean;
  };
  isVerified?: boolean;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  unit,
  date,
  delta,
  isVerified = true,
  onClick,
}: StatCardProps) {
  return (
    <Card
      variant={onClick ? "interactive" : "raised"}
      onClick={onClick}
      className="p-5 flex flex-col justify-between"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--muted)]">{label}</span>
        <Badge variant={isVerified ? "verified" : "review"} size="sm">
          {isVerified ? "Verified" : "Unverified"}
        </Badge>
      </div>

      <div className="my-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-display font-bold tabular-nums text-[var(--text)]">
            {value}
          </span>
          {unit && <span className="text-xs font-medium text-[var(--muted)]">{unit}</span>}
        </div>

        {delta && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs">
            {delta.neutral ? (
              <Minus size={14} className="text-[var(--muted)]" />
            ) : delta.isIncrease ? (
              <TrendingUp size={14} className="text-[var(--green-700)]" />
            ) : (
              <TrendingDown size={14} className="text-[var(--green-700)]" />
            )}
            <span className="font-semibold text-[var(--text)]">{delta.value}</span>
            {delta.period && <span className="text-[var(--muted)]">since {delta.period}</span>}
          </div>
        )}
      </div>

      {date && (
        <div className="text-[11px] text-[var(--muted)] pt-2 border-t border-[var(--border)] flex items-center justify-between">
          <span>Observed on</span>
          <span className="font-medium text-[var(--text)]">{date}</span>
        </div>
      )}
    </Card>
  );
}

