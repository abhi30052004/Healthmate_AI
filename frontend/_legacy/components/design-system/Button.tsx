import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "positive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText,
  icon,
  iconPosition = "left",
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = "ds-btn";
  const variantClass = `ds-btn-${variant}`;
  const sizeClass = `ds-btn-${size}`;
  const widthClass = fullWidth ? "ds-btn-block" : "";
  const loadingClass = isLoading ? "is-loading" : "";

  return (
    <button
      className={`${baseClasses} ${variantClass} ${sizeClass} ${widthClass} ${loadingClass} ${className}`.trim()}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin ds-btn-spinner" aria-hidden="true" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <span className="ds-btn-icon-left" aria-hidden="true">
              {icon}
            </span>
          )}
          <span>{children}</span>
          {icon && iconPosition === "right" && (
            <span className="ds-btn-icon-right" aria-hidden="true">
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
}

