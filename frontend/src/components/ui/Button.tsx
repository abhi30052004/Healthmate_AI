import React from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "verified" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      iconLeft,
      iconRight,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "relative inline-flex items-center justify-center font-medium rounded-lg transition-colors select-none focus-visible:outline-none focus-visible:shadow-[var(--focus)] disabled:opacity-50 disabled:cursor-not-allowed";

    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs min-h-[36px] gap-1.5",
      md: "px-4 py-2 text-sm min-h-[44px] gap-2",
      lg: "px-6 py-3 text-base min-h-[52px] gap-2.5",
    };

    const variantClasses = {
      primary:
        "bg-[var(--green-800)] text-white hover:bg-[var(--green-900)] shadow-1 active:bg-[var(--green-900)]",
      secondary:
        "bg-[var(--green-50)] text-[var(--green-800)] border border-[var(--green-100)] hover:bg-[var(--green-100)] active:bg-[var(--green-100)]",
      verified:
        "bg-[var(--green-600)] text-white hover:bg-[var(--green-700)] shadow-1 active:bg-[var(--green-700)]",
      outline:
        "bg-white text-[var(--text)] border border-[var(--border)] hover:bg-[var(--bg)] hover:border-[var(--green-700)]",
      ghost:
        "bg-transparent text-[var(--text)] hover:bg-[var(--green-50)] hover:text-[var(--green-800)]",
      danger:
        "bg-[var(--danger)] text-white hover:opacity-90 shadow-1",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        disabled={disabled || loading}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {loading && (
          <Loader2
            className="animate-spin text-current"
            size={size === "sm" ? 14 : size === "lg" ? 18 : 16}
            aria-hidden="true"
          />
        )}
        {!loading && iconLeft && <span className="inline-flex shrink-0">{iconLeft}</span>}
        <span>{children}</span>
        {!loading && iconRight && <span className="inline-flex shrink-0">{iconRight}</span>}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

