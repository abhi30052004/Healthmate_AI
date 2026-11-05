import React from "react";

export interface LoadingSkeletonProps {
  type?: "card" | "table" | "chart" | "text" | "stats";
  count?: number;
  className?: string;
}

export function LoadingSkeleton({
  type = "card",
  count = 1,
  className = "",
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count });

  if (type === "stats") {
    return (
      <div className={`hm-skeleton-grid-stats ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="hm-skeleton-card hm-skeleton-stat">
            <div className="hm-skeleton-circle" />
            <div className="hm-skeleton-lines">
              <div className="hm-skeleton-line short" />
              <div className="hm-skeleton-line medium bold" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className={`hm-skeleton-table-wrapper ${className}`}>
        <div className="hm-skeleton-table-header" />
        {items.map((_, i) => (
          <div key={i} className="hm-skeleton-table-row">
            <div className="hm-skeleton-cell wide" />
            <div className="hm-skeleton-cell" />
            <div className="hm-skeleton-cell" />
            <div className="hm-skeleton-cell short" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "chart") {
    return (
      <div className={`hm-skeleton-card hm-skeleton-chart ${className}`}>
        <div className="hm-skeleton-line medium" />
        <div className="hm-skeleton-chart-box" />
      </div>
    );
  }

  return (
    <div className={`hm-skeleton-list ${className}`}>
      {items.map((_, i) => (
        <div key={i} className="hm-skeleton-card">
          <div className="hm-skeleton-header">
            <div className="hm-skeleton-circle" />
            <div className="hm-skeleton-line long" />
          </div>
          <div className="hm-skeleton-body">
            <div className="hm-skeleton-line full" />
            <div className="hm-skeleton-line medium" />
          </div>
        </div>
      ))}
    </div>
  );
}

