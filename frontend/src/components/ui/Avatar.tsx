import React from "react";

export interface AvatarProps {
  name: string;
  relationship?: string | null;
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

export function Avatar({
  name,
  relationship,
  size = "md",
  color,
  className = "",
}: AvatarProps) {
  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : "P";

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const bg = color || "var(--green-700)";

  return (
    <div className={`relative inline-flex items-center shrink-0 ${className}`}>
      <div
        style={{ backgroundColor: bg }}
        className={`flex items-center justify-center font-bold text-white rounded-full select-none shadow-1 ${sizeClasses[size]}`}
      >
        <span>{initial}</span>
      </div>

      {relationship && (
        <span
          title={`Relationship: ${relationship}`}
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--green-600)] border-2 border-white"
        />
      )}
    </div>
  );
}

