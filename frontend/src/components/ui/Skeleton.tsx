import React from "react";
export { Avatar } from "./Avatar";

export function Skeleton({
  className = "",
  width,
  height,
  rounded = "md",
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
}) {
  const roundedClasses = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };

  return (
    <div
      aria-hidden="true"
      style={{ width, height }}
      className={`skeleton-shimmer bg-[var(--border)] ${roundedClasses[rounded]} ${className}`}
    />
  );
}
