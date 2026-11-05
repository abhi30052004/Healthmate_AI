import React, { useRef, useState } from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "standard" | "bento" | "glass" | "subtle";
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
}

export function Card({
  children,
  variant = "standard",
  padding = "md",
  hoverable = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`ds-card ds-card-${variant} ds-card-pad-${padding} ${
        hoverable ? "ds-card-hover" : ""
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

export function SpotlightCard({
  children,
  spotlightColor = "rgba(13, 148, 136, 0.09)",
  padding = "md",
  className = "",
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`ds-card ds-spotlight-card ds-card-pad-${padding} ${className}`.trim()}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Radial Highlight */}
      <div
        className="ds-spotlight-overlay"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightColor}, transparent 70%)`,
        }}
        aria-hidden="true"
      />
      <div className="ds-spotlight-content">{children}</div>
    </div>
  );
}

