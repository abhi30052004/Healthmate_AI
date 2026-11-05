import React, { useState } from "react";
import { Table, LineChart, TrendingUp, TrendingDown, Minus, ExternalLink, Info } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

export interface TrendPoint {
  date: string;
  value: number;
  unit: string;
  documentId?: string;
  documentTitle?: string;
  isVerified?: boolean;
}

export interface TrendChartProps {
  title: string;
  unit: string;
  points: TrendPoint[];
  referenceRange?: {
    min: number;
    max: number;
    label?: string;
  };
  onSelectPoint?: (point: TrendPoint) => void;
}

export function TrendChart({
  title,
  unit,
  points,
  referenceRange,
  onSelectPoint,
}: TrendChartProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [hoveredPoint, setHoveredPoint] = useState<TrendPoint | null>(null);

  if (points.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--muted)] border border-dashed rounded-lg">
        No observation trend data available for this metric.
      </div>
    );
  }

  // Calculate scales for SVG
  const values = points.map((p) => p.value);
  const minVal = referenceRange ? Math.min(...values, referenceRange.min * 0.9) : Math.min(...values) * 0.9;
  const maxVal = referenceRange ? Math.max(...values, referenceRange.max * 1.1) : Math.max(...values) * 1.1;
  const range = maxVal - minVal || 1;

  const width = 600;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const getY = (val: number) => height - paddingY - ((val - minVal) / range) * chartH;
  const getX = (idx: number) =>
    paddingX + (points.length === 1 ? chartW / 2 : (idx / (points.length - 1)) * chartW);

  // Reference range band coordinates
  const refTopY = referenceRange ? getY(referenceRange.max) : null;
  const refBottomY = referenceRange ? getY(referenceRange.min) : null;

  // SVG path line
  const pathD = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx)} ${getY(p.value)}`)
    .join(" ");

  // Delta between earliest and latest
  const delta = points.length > 1 ? points[points.length - 1].value - points[0].value : 0;

  return (
    <div className="p-5 rounded-xl border border-[var(--border)] bg-white shadow-1 space-y-4">
      {/* Header with Title, Delta Chip, and Table/Chart Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-base text-[var(--green-900)]">
              {title}
            </h3>
            {points.length > 1 && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  delta === 0
                    ? "bg-[var(--bg)] text-[var(--muted)]"
                    : "bg-[var(--green-100)] text-[var(--green-800)]"
                }`}
              >
                {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                <span>
                  {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} {unit}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted)]">
            Longitudinal trend from verified clinical records ({points.length} measurements)
          </p>
        </div>

        {/* View Toggle Button */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <Button
            variant={viewMode === "chart" ? "primary" : "outline"}
            size="sm"
            onClick={() => setViewMode("chart")}
            iconLeft={<LineChart size={14} />}
          >
            Chart
          </Button>
          <Button
            variant={viewMode === "table" ? "primary" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            iconLeft={<Table size={14} />}
          >
            Table
          </Button>
        </div>
      </div>

      {viewMode === "chart" ? (
        <div className="space-y-3">
          {/* SVG Chart */}
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-56 select-none"
              role="img"
              aria-label={`${title} trend chart showing ${points.length} observations`}
            >
              {/* Reference Range Band */}
              {refTopY !== null && refBottomY !== null && (
                <g>
                  <rect
                    x={paddingX}
                    y={refTopY}
                    width={chartW}
                    height={Math.max(refBottomY - refTopY, 2)}
                    fill="var(--green-50)"
                    opacity="0.8"
                  />
                  <line
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={refTopY}
                    y2={refTopY}
                    stroke="var(--green-500)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <line
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={refBottomY}
                    y2={refBottomY}
                    stroke="var(--green-500)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX + 6}
                    y={refTopY + 12}
                    fill="var(--green-800)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    Standard Reference: {referenceRange?.min} - {referenceRange?.max} {unit}
                  </text>
                </g>
              )}

              {/* Connecting Line */}
              <path
                d={pathD}
                fill="none"
                stroke="var(--green-700)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Points */}
              {points.map((p, idx) => {
                const cx = getX(idx);
                const cy = getY(p.value);
                const isHovered = hoveredPoint === p;

                return (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => onSelectPoint && onSelectPoint(p)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${p.date}: ${p.value} ${unit}`}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 6 : 4.5}
                      fill={p.isVerified !== false ? "var(--green-600)" : "var(--warning)"}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                    <text
                      x={cx}
                      y={height - 8}
                      textAnchor="middle"
                      fill="var(--muted)"
                      fontSize="10"
                    >
                      {p.date}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Details */}
            {hoveredPoint && (
              <div className="absolute top-2 right-2 p-2.5 rounded-lg bg-[var(--green-900)] text-white text-xs shadow-2 z-10 space-y-1">
                <p className="font-semibold">{hoveredPoint.date}</p>
                <p className="text-base font-bold tabular-nums">
                  {hoveredPoint.value} {unit}
                </p>
                {hoveredPoint.documentTitle && (
                  <p className="text-[10px] text-[var(--green-100)] opacity-80">
                    Source: {hoveredPoint.documentTitle}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Accessible Table Alternative */
        <div className="overflow-x-auto" tabIndex={0}>
          <table className="w-full text-left text-xs border border-[var(--border)] rounded-lg">
            <thead className="bg-[var(--bg)] text-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                <th className="p-3 font-semibold">Date of Record</th>
                <th className="p-3 font-semibold">Observation Value</th>
                <th className="p-3 font-semibold">Unit</th>
                <th className="p-3 font-semibold">Reference Range</th>
                <th className="p-3 font-semibold">Verification</th>
                <th className="p-3 font-semibold">Source Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {points.map((p, idx) => (
                <tr key={idx} className="hover:bg-[var(--bg)] transition-colors">
                  <td className="p-3 font-medium text-[var(--text)]">{p.date}</td>
                  <td className="p-3 font-bold tabular-nums text-[var(--green-900)] text-sm">
                    {p.value}
                  </td>
                  <td className="p-3 text-[var(--muted)]">{unit}</td>
                  <td className="p-3 text-[var(--muted)]">
                    {referenceRange ? `${referenceRange.min} - ${referenceRange.max} ${unit}` : "—"}
                  </td>
                  <td className="p-3">
                    <Badge variant={p.isVerified !== false ? "verified" : "review"} size="sm">
                      {p.isVerified !== false ? "Verified" : "Unverified"}
                    </Badge>
                  </td>
                  <td className="p-3 text-[var(--green-700)] hover:underline">
                    {p.documentTitle || "Clinical Report"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
