import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface HealthStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: "teal" | "blue" | "emerald" | "amber" | "purple" | "slate";
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function HealthStatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = "teal",
  trend,
  badge,
  onClick,
  className = "",
}: HealthStatCardProps) {
  const getTrendIcon = (dir: "up" | "down" | "neutral") => {
    switch (dir) {
      case "up":
        return <TrendingUp size={13} className="stat-trend-icon" />;
      case "down":
        return <TrendingDown size={13} className="stat-trend-icon" />;
      default:
        return <Minus size={13} className="stat-trend-icon" />;
    }
  };

  return (
    <div
      className={`hm-stat-card hm-stat-card-${iconBg} ${onClick ? "hm-stat-card-clickable" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="hm-stat-card-header">
        <div className={`hm-stat-icon-wrapper hm-icon-bg-${iconBg}`}>{icon}</div>
        {badge && <div className="hm-stat-badge">{badge}</div>}
      </div>

      <div className="hm-stat-card-body">
        <span className="hm-stat-label">{title}</span>
        <div className="hm-stat-value-row">
          <span className="hm-stat-value">{value}</span>
          {trend && (
            <span className={`hm-stat-trend hm-trend-${trend.direction}`}>
              {getTrendIcon(trend.direction)}
              <span>{trend.value}</span>
              {trend.label && <span className="hm-trend-label">{trend.label}</span>}
            </span>
          )}
        </div>
        {subtitle && <p className="hm-stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

