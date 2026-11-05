import React from "react";
import { FolderHeart, Plus } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`hm-empty-state-box ${className}`}>
      <div className="hm-empty-icon-wrapper">
        {icon || <FolderHeart size={40} className="text-teal" />}
      </div>
      <h3 className="hm-empty-title">{title}</h3>
      <p className="hm-empty-desc">{description}</p>

      {(actionText || secondaryActionText) && (
        <div className="hm-empty-actions">
          {actionText && onAction && (
            <button
              type="button"
              className="hm-btn hm-btn-primary"
              onClick={onAction}
            >
              <Plus size={16} />
              <span>{actionText}</span>
            </button>
          )}

          {secondaryActionText && onSecondaryAction && (
            <button
              type="button"
              className="hm-btn hm-btn-secondary"
              onClick={onSecondaryAction}
            >
              <span>{secondaryActionText}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

