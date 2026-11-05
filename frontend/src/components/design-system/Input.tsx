import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  startIcon,
  endIcon,
  fullWidth = true,
  id,
  className = "",
  disabled,
  ...props
}: InputProps) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  return (
    <div className={`ds-input-wrapper ${fullWidth ? "is-full-width" : ""}`}>
      {label && (
        <label htmlFor={inputId} className="ds-input-label">
          {label}
        </label>
      )}

      <div className={`ds-input-control-box ${error ? "has-error" : ""} ${disabled ? "is-disabled" : ""}`}>
        {startIcon && <span className="ds-input-icon ds-input-start-icon">{startIcon}</span>}
        <input
          id={inputId}
          disabled={disabled}
          className={`ds-input-field ${className}`.trim()}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {endIcon && <span className="ds-input-icon ds-input-end-icon">{endIcon}</span>}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="ds-input-error-text" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="ds-input-helper-text">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

