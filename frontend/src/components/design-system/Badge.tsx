import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "normal" | "high" | "low" | "pending" | "teal" | "blue" | "neutral";
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`ds-badge ds-badge-${variant} ds-badge-${size} ${className}`.trim()}
      {...props}
    >
      {dot && <span className="ds-badge-dot" aria-hidden="true" />}
      <span className="ds-badge-text">{children}</span>
    </span>
  );
}

