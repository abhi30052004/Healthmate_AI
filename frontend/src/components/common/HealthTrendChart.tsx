import React, { useState } from "react";
import { TrendingUp, TrendingDown, Info, Table as TableIcon, Activity } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export interface DataPoint {
  date: string;
  value: number;
  unit?: string;
  flag?: string;
  documentTitle?: string;
}

export interface HealthTrendChartProps {
  title: string;
  dataPoints: DataPoint[];
  unit?: string;
  referenceRange?: {
    low?: number;
    high?: number;
    text?: string;
  };
  subtitle?: string;
  category?: string;
  className?: string;
}

export function HealthTrendChart({
  title,
  dataPoints,
  unit = "",
  referenceRange,
  subtitle,
  category,
  className = "",
}: HealthTrendChartProps) {
  const [showTable, setShowTable] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div className={`hm-chart-card ${className}`}>
        <div className="hm-chart-header">
          <div className="hm-chart-header-left">
            <h4 className="hm-chart-title">{title}</h4>
            {subtitle && <p className="hm-chart-subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="hm-chart-empty">
          <Activity size={24} className="text-muted" />
          <p>No numeric trend data recorded yet for this observation.</p>
        </div>
      </div>
    );
  }

  // Sort chronological
  const sortedPoints = [...dataPoints].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const values = sortedPoints.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const refLow = referenceRange?.low ?? minVal;
  const refHigh = referenceRange?.high ?? maxVal;

  const chartMin = Math.max(0, Math.min(minVal, refLow) * 0.85);
  const chartMax = Math.max(maxVal, refHigh) * 1.15;
  const valueRange = chartMax - chartMin || 1;

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };

  const innerWidth = svgWidth - padding.left - padding.right;
  const innerHeight = svgHeight - padding.top - padding.bottom;

  const getX = (index: number) => {
    if (sortedPoints.length === 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (sortedPoints.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const normalized = (val - chartMin) / valueRange;
    return padding.top + innerHeight - normalized * innerHeight;
  };

  // Generate SVG path line
  const pathD = sortedPoints.reduce((acc, point, index) => {
    const x = getX(index);
    const y = getY(point.value);
    return index === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  // Generate SVG area fill under curve
  const areaD =
    sortedPoints.length > 1
      ? `${pathD} L ${getX(sortedPoints.length - 1)} ${padding.top + innerHeight} L ${getX(0)} ${
          padding.top + innerHeight
        } Z`
      : "";

  // Normal range band coordinates
  const hasRefRange =
    referenceRange &&
    referenceRange.low !== undefined &&
    referenceRange.high !== undefined;

  const refY1 = hasRefRange ? getY(referenceRange.high!) : 0;
  const refY2 = hasRefRange ? getY(referenceRange.low!) : 0;
  const refBandHeight = Math.max(0, refY2 - refY1);

  // Latest observation trend calculation
  const latest = sortedPoints[sortedPoints.length - 1];
  const previous = sortedPoints.length > 1 ? sortedPoints[sortedPoints.length - 2] : null;
  const diff = previous ? latest.value - previous.value : 0;
  const diffPercent = previous && previous.value ? ((diff / previous.value) * 100).toFixed(1) : null;

  return (
    <div className={`hm-chart-card ${className}`}>
      <div className="hm-chart-header">
        <div className="hm-chart-header-left">
          <div className="hm-chart-title-row">
            <h4 className="hm-chart-title">{title}</h4>
            {category && <span className="hm-chart-category-tag">{category}</span>}
          </div>
          {subtitle && <p className="hm-chart-subtitle">{subtitle}</p>}
        </div>

        <div className="hm-chart-header-right">
          <div className="hm-chart-latest-stat">
            <span className="hm-latest-value">
              {latest.value} <span className="hm-latest-unit">{unit}</span>
            </span>
            {diffPercent !== null && (
              <span className={`hm-latest-delta ${diff > 0 ? "is-up" : diff < 0 ? "is-down" : "is-flat"}`}>
                {diff > 0 ? <TrendingUp size={12} /> : diff < 0 ? <TrendingDown size={12} /> : null}
                <span>{diff > 0 ? `+${diffPercent}%` : `${diffPercent}%`}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            className="hm-btn hm-btn-sm hm-btn-secondary"
            onClick={() => setShowTable(!showTable)}
            aria-label={showTable ? "Hide Tabular Data" : "Show Tabular Data"}
          >
            <TableIcon size={14} />
            <span>{showTable ? "Show Graph" : "Show Tabular Data"}</span>
          </button>
        </div>
      </div>

      {referenceRange && (
        <div className="hm-chart-ref-note">
          <Info size={13} className="text-teal" />
          <span>
            Target Reference Range: <strong>{referenceRange.text || `${referenceRange.low ?? "—"} – ${referenceRange.high ?? "—"} ${unit}`}</strong>
          </span>
        </div>
      )}

      {showTable ? (
        <div className="hm-chart-table-view">
          <table className="hm-data-table" role="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Observed Value</th>
                <th>Target Range</th>
                <th>Flag</th>
                <th>Source Report</th>
              </tr>
            </thead>
            <tbody>
              {sortedPoints.map((pt, idx) => (
                <tr key={idx}>
                  <td>{new Date(pt.date).toLocaleDateString()}</td>
                  <td>
                    <strong>
                      {pt.value} {unit}
                    </strong>
                  </td>
                  <td>{referenceRange?.text || "—"}</td>
                  <td>
                    {pt.flag ? (
                      <StatusBadge
                        variant={
                          pt.flag.toUpperCase().includes("HIGH") || pt.flag === "H"
                            ? "danger"
                            : pt.flag.toUpperCase().includes("LOW") || pt.flag === "L"
                            ? "warning"
                            : "success"
                        }
                        text={pt.flag}
                        size="sm"
                      />
                    ) : (
                      <StatusBadge variant="neutral" text="Standard" size="sm" />
                    )}
                  </td>
                  <td>{pt.documentTitle || "Laboratory Panel"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="hm-chart-svg-container" style={{ position: "relative" }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="hm-chart-svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id={`grad-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = padding.top + innerHeight * pct;
              const val = chartMax - pct * valueRange;
              return (
                <g key={idx}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + innerWidth}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#94a3b8"
                  >
                    {val.toFixed(val > 10 ? 0 : 1)}
                  </text>
                </g>
              );
            })}

            {/* Reference Range Shaded Band */}
            {hasRefRange && (
              <g className="hm-chart-ref-band">
                <rect
                  x={padding.left}
                  y={refY1}
                  width={innerWidth}
                  height={refBandHeight}
                  fill="#10b981"
                  fillOpacity="0.08"
                />
                <line
                  x1={padding.left}
                  y1={refY1}
                  x2={padding.left + innerWidth}
                  y2={refY1}
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <line
                  x1={padding.left}
                  y1={refY2}
                  x2={padding.left + innerWidth}
                  y2={refY2}
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              </g>
            )}

            {/* Area Fill */}
            {areaD && (
              <path
                d={areaD}
                fill={`url(#grad-${title.replace(/\s+/g, "")})`}
              />
            )}

            {/* Line Path */}
            <path
              d={pathD}
              fill="none"
              stroke="#0d9488"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points */}
            {sortedPoints.map((point, index) => {
              const x = getX(index);
              const y = getY(point.value);
              const isHovered = hoveredPoint === point;

              return (
                <g key={index} className="hm-chart-point-group">
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 4.5}
                    fill="#ffffff"
                    stroke="#0d9488"
                    strokeWidth="2.5"
                    className="hm-chart-point"
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    tabIndex={0}
                  />

                  {/* Date labels on X-axis */}
                  <text
                    x={x}
                    y={padding.top + innerHeight + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#64748b"
                  >
                    {new Date(point.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip Hover Overlay */}
          {hoveredPoint && (
            <div className="hm-chart-tooltip">
              <div className="hm-tooltip-title">
                {new Date(hoveredPoint.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="hm-tooltip-value">
                {hoveredPoint.value} {unit}
              </div>
              {hoveredPoint.flag && (
                <div className="hm-tooltip-flag">Flag: {hoveredPoint.flag}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

