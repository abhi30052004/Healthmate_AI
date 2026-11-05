import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Clock, ShieldCheck, FileCheck, RefreshCw } from "lucide-react";

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "verified"
  | "extracted"
  | "pending"
  | "failed";

export interface StatusBadgeProps {
  variant?: BadgeVariant;
  text: string;
  size?: "sm" | "md" | "lg";
  icon?: boolean;
  pulse?: boolean;
  className?: string;
  title?: string;
}

export function StatusBadge({
  variant = "neutral",
  text,
  size = "md",
  icon = true,
  pulse = false,
  className = "",
  title,
}: StatusBadgeProps) {
  const getIcon = () => {
    if (!icon) return null;
    const iconSize = size === "sm" ? 11 : size === "lg" ? 14 : 12;
    switch (variant) {
      case "success":
      case "verified":
        return <CheckCircle2 size={iconSize} className="badge-icon" aria-hidden="true" />;
      case "danger":
      case "failed":
        return <AlertCircle size={iconSize} className="badge-icon" aria-hidden="true" />;
      case "warning":
        return <AlertTriangle size={iconSize} className="badge-icon" aria-hidden="true" />;
      case "pending":
        return <RefreshCw size={iconSize} className="badge-icon badge-spin" aria-hidden="true" />;
      case "extracted":
        return <FileCheck size={iconSize} className="badge-icon" aria-hidden="true" />;
      case "info":
        return <Clock size={iconSize} className="badge-icon" aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`hm-status-badge hm-badge-${variant} hm-badge-${size} ${pulse ? "hm-badge-pulse" : ""} ${className}`}
      title={title || text}
    >
      {pulse && <span className="hm-badge-dot" aria-hidden="true" />}
      {getIcon()}
      <span className="hm-badge-text">{text}</span>
    </span>
  );
}

