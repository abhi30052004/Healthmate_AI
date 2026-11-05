import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onCancel();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="hm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="hm-modal-container hm-confirm-modal">
        <div className="hm-modal-header">
          <div className="hm-modal-title-row">
            <div className={`hm-confirm-icon-circle is-${variant}`}>
              <AlertTriangle size={20} />
            </div>
            <h3 id="dialog-title" className="hm-modal-title">{title}</h3>
          </div>
          <button
            type="button"
            className="hm-btn-icon hm-btn-ghost"
            onClick={onCancel}
            disabled={isLoading}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="hm-modal-body">
          <p className="hm-confirm-message">{message}</p>
        </div>

        <div className="hm-modal-footer">
          <button
            type="button"
            className="hm-btn hm-btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`hm-btn ${variant === "danger" ? "hm-btn-danger" : variant === "warning" ? "hm-btn-warning" : "hm-btn-primary"}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

