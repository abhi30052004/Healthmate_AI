import React from "react";
import { Sparkles, FileText, ArrowRight, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export interface AIInsightCardProps {
  title: string;
  description: string;
  category?: string;
  type?: "shift" | "alert" | "trend" | "summary" | "recommendation";
  sourceDocument?: string;
  date?: string;
  metric?: {
    name: string;
    previous?: string | number;
    current?: string | number;
    unit?: string;
    delta?: string;
    direction?: "up" | "down" | "neutral";
  };
  onDiscuss?: () => void;
  onViewSource?: () => void;
  className?: string;
}

export function AIInsightCard({
  title,
  description,
  category,
  type = "trend",
  sourceDocument,
  date,
  metric,
  onDiscuss,
  onViewSource,
  className = "",
}: AIInsightCardProps) {
  const getTypeBadge = () => {
    switch (type) {
      case "shift":
        return <StatusBadge variant="warning" text="Observation Shift" size="sm" />;
      case "alert":
        return <StatusBadge variant="danger" text="Attention Recommended" size="sm" />;
      case "summary":
        return <StatusBadge variant="info" text="Clinical Summary" size="sm" />;
      case "recommendation":
        return <StatusBadge variant="success" text="Care Consideration" size="sm" />;
      default:
        return <StatusBadge variant="neutral" text="Health Trend" size="sm" />;
    }
  };

  return (
    <div className={`hm-ai-insight-card hm-insight-${type} ${className}`}>
      <div className="hm-insight-header">
        <div className="hm-insight-header-left">
          <div className="hm-insight-icon-pill">
            <Sparkles size={14} className="text-teal" />
            <span className="hm-insight-ai-label">AI Analysis</span>
          </div>
          {getTypeBadge()}
          {category && <span className="hm-category-chip">{category}</span>}
        </div>

        {date && <span className="hm-insight-date">{new Date(date).toLocaleDateString()}</span>}
      </div>

      <div className="hm-insight-body">
        <h4 className="hm-insight-title">{title}</h4>
        <p className="hm-insight-desc">{description}</p>

        {metric && (
          <div className="hm-insight-metric-strip">
            <div className="hm-insight-metric-name">{metric.name}</div>
            <div className="hm-insight-metric-comparison">
              {metric.previous !== undefined && (
                <span className="hm-metric-prev">
                  Previous: {metric.previous} {metric.unit}
                </span>
              )}
              {metric.previous !== undefined && <ArrowRight size={13} className="text-muted" />}
              <span className="hm-metric-curr">
                Current: <strong>{metric.current} {metric.unit}</strong>
              </span>
              {metric.delta && (
                <span
                  className={`hm-metric-delta-tag ${
                    metric.direction === "up"
                      ? "is-up"
                      : metric.direction === "down"
                      ? "is-down"
                      : "is-neutral"
                  }`}
                >
                  {metric.direction === "up" ? (
                    <TrendingUp size={12} />
                  ) : metric.direction === "down" ? (
                    <TrendingDown size={12} />
                  ) : null}
                  {metric.delta}
                </span>
              )}
            </div>
          </div>
        )}

        {sourceDocument && (
          <div className="hm-insight-source-badge">
            <FileText size={12} className="text-muted" />
            <span>Grounded in: <strong>{sourceDocument}</strong></span>
          </div>
        )}
      </div>

      <div className="hm-insight-footer">
        {onViewSource && (
          <button
            type="button"
            className="hm-btn hm-btn-xs hm-btn-secondary"
            onClick={onViewSource}
          >
            <span>Review Source Report</span>
          </button>
        )}

        {onDiscuss && (
          <button
            type="button"
            className="hm-btn hm-btn-xs hm-btn-primary ml-auto"
            onClick={onDiscuss}
          >
            <Sparkles size={12} />
            <span>Discuss with AI Assistant</span>
          </button>
        )}
      </div>
    </div>
  );
}

