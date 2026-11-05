import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Clock, ShieldCheck, Info } from "lucide-react";

export type BadgeVariant =
  | "verified"
  | "review"
  | "unverified"
  | "failed"
  | "info"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md";
}

export function Badge({
  variant = "neutral",
  icon,
  children,
  size = "md",
  className = "",
  ...props
}: BadgeProps) {
  const defaultIcons: Record<BadgeVariant, React.ReactNode> = {
    verified: <CheckCircle2 size={13} aria-hidden="true" />,
    review: <AlertTriangle size={13} aria-hidden="true" />,
    unverified: <Clock size={13} aria-hidden="true" />,
    failed: <AlertCircle size={13} aria-hidden="true" />,
    info: <Info size={13} aria-hidden="true" />,
    neutral: <ShieldCheck size={13} aria-hidden="true" />,
  };

  const variantClasses: Record<BadgeVariant, string> = {
    verified:
      "bg-[var(--green-100)] text-[var(--green-600)] border border-[rgba(46,155,121,0.25)]",
    review:
      "bg-[var(--warning-bg)] text-[var(--warning)] border border-[rgba(169,101,19,0.25)]",
    unverified:
      "bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)]",
    failed:
      "bg-[var(--danger-bg)] text-[var(--danger)] border border-[rgba(180,35,50,0.25)]",
    info:
      "bg-[var(--info-bg)] text-[var(--info)] border border-[rgba(37,99,235,0.25)]",
    neutral:
      "bg-[var(--green-50)] text-[var(--green-800)] border border-[var(--green-100)]",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  const activeIcon = icon !== undefined ? icon : defaultIcons[variant];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {activeIcon && <span className="inline-flex shrink-0">{activeIcon}</span>}
      <span>{children}</span>
    </span>
  );
}

export function StatusPill({
  status,
  label,
}: {
  status: "verified" | "needs_review" | "unverified" | "failed";
  label?: string;
}) {
  const map: Record<
    string,
    { variant: BadgeVariant; text: string }
  > = {
    verified: { variant: "verified", text: label || "Verified" },
    needs_review: { variant: "review", text: label || "Needs Review" },
    unverified: { variant: "unverified", text: label || "Unverified" },
    failed: { variant: "failed", text: label || "Failed" },
  };

  const conf = map[status] || map.unverified;

  return <Badge variant={conf.variant}>{conf.text}</Badge>;
}
