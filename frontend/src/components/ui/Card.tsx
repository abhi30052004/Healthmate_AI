import React from "react";
import { motion, HTMLMotionProps } from "motion/react";

export interface CardProps extends HTMLMotionProps<"div"> {
  variant?: "flat" | "raised" | "interactive";
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "raised", className = "", children, ...props }, ref) => {
    const baseClasses = "rounded-lg border border-[var(--border)] bg-white text-[var(--text)]";

    const variantClasses = {
      flat: "shadow-none",
      raised: "shadow-1",
      interactive:
        "shadow-1 transition-all duration-200 hover:shadow-2 hover:-translate-y-0.5 cursor-pointer",
    };

    return (
      <motion.div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";

export function CardHeader({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`p-5 border-b border-[var(--border)] ${className}`}>{children}</div>;
}

export function CardContent({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-4 bg-[var(--bg)] border-t border-[var(--border)] rounded-b-lg ${className}`}>
      {children}
    </div>
  );
}

