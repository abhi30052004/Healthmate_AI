import React, { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, iconLeft, iconRight, id, className = "", ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const hintId = inputId ? `${inputId}-hint` : undefined;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text)]">
            {label}
            {props.required && <span className="text-[var(--danger)] ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {iconLeft && (
            <div className="absolute left-3.5 pointer-events-none text-[var(--muted)] flex items-center">
              {iconLeft}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={`w-full min-h-[44px] px-3.5 py-2 rounded-md bg-white border text-[var(--text)] text-sm transition-colors placeholder:text-[var(--muted)] focus:outline-none focus:shadow-[var(--focus)] disabled:bg-[var(--bg)] disabled:opacity-60 ${
              iconLeft ? "pl-10" : ""
            } ${iconRight ? "pr-10" : ""} ${
              error
                ? "border-[var(--danger)] focus:border-[var(--danger)]"
                : "border-[var(--border)] focus:border-[var(--green-700)]"
            } ${className}`}
            {...props}
          />

          {iconRight && (
            <div className="absolute right-3.5 pointer-events-none text-[var(--muted)] flex items-center">
              {iconRight}
            </div>
          )}
        </div>

        {hint && !error && (
          <p id={hintId} className="text-xs text-[var(--muted)]">
            {hint}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-xs text-[var(--danger)] font-medium flex items-center gap-1 mt-1"
          >
            <AlertCircle size={13} aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface PasswordInputProps extends Omit<InputProps, "type"> {}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          iconRight={
            <button
              type="button"
              tabIndex={0}
              onClick={() => setShow(!show)}
              aria-label={show ? "Hide password" : "Show password"}
              className="pointer-events-auto p-1 text-[var(--muted)] hover:text-[var(--text)] transition-colors focus:outline-none focus-visible:shadow-[var(--focus)] rounded"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          {...props}
        />
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className = "", ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const hintId = inputId ? `${inputId}-hint` : undefined;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text)]">
            {label}
            {props.required && <span className="text-[var(--danger)] ml-0.5">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`w-full min-h-[96px] p-3 rounded-md bg-white border text-[var(--text)] text-sm transition-colors placeholder:text-[var(--muted)] focus:outline-none focus:shadow-[var(--focus)] disabled:bg-[var(--bg)] disabled:opacity-60 ${
            error
              ? "border-[var(--danger)] focus:border-[var(--danger)]"
              : "border-[var(--border)] focus:border-[var(--green-700)]"
          } ${className}`}
          {...props}
        />

        {hint && !error && (
          <p id={hintId} className="text-xs text-[var(--muted)]">
            {hint}
          </p>
        )}

        {error && (
          <p id={errorId} role="alert" className="text-xs text-[var(--danger)] font-medium flex items-center gap-1">
            <AlertCircle size={13} aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
