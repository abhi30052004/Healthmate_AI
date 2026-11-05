import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  variant?: "text" | "rectangular" | "circular";
}

export function Skeleton({
  width,
  height,
  borderRadius,
  variant = "rectangular",
  className = "",
  style,
  ...props
}: SkeletonProps) {
  const dynamicStyles: React.CSSProperties = {
    width: width !== undefined ? width : "100%",
    height: height !== undefined ? height : variant === "text" ? "14px" : "100%",
    borderRadius:
      borderRadius !== undefined
        ? borderRadius
        : variant === "circular"
        ? "50%"
        : variant === "text"
        ? "4px"
        : "10px",
    ...style,
  };

  return (
    <div
      className={`ds-skeleton ds-skeleton-${variant} ${className}`.trim()}
      style={dynamicStyles}
      aria-hidden="true"
      {...props}
    />
  );
}

