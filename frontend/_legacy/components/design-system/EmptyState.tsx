import React from "react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`ds-empty-state ${className}`.trim()}>
      {icon && <div className="ds-empty-state-icon">{icon}</div>}
      <h3 className="ds-empty-state-title">{title}</h3>
      <p className="ds-empty-state-desc">{description}</p>
      {action && <div className="ds-empty-state-action">{action}</div>}
    </div>
  );
}

