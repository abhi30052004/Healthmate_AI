import React from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export interface ToastProps {
  id?: string;
  type?: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export function Toast({
  type = "info",
  title,
  message,
  onClose,
  className = "",
}: ToastProps) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    info: <Info className="w-5 h-5 text-teal-600" />,
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`ds-toast ds-toast-${type} ${className}`.trim()}
    >
      <div className="ds-toast-icon">{icons[type]}</div>
      <div className="ds-toast-content">
        {title && <h4 className="ds-toast-title">{title}</h4>}
        <p className="ds-toast-message">{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ds-toast-close"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

