import React, { useState } from "react";
import { AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck, Search, Filter, ArrowUpDown } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export interface ObservationRow {
  id?: string;
  testName: string;
  category?: string;
  value: string | number;
  unit?: string;
  referenceRangeText?: string;
  classification?: "within_reference" | "above_reference" | "below_reference" | "critical" | string;
  laboratoryFlag?: string;
  isVerified?: boolean;
  testDate?: string;
  reportName?: string;
  flagDiscrepancy?: boolean;
}

export interface ObservationTableProps {
  observations: ObservationRow[];
  title?: string;
  showFilters?: boolean;
  onSelectRow?: (row: ObservationRow) => void;
  className?: string;
}

export function ObservationTable({
  observations,
  title = "Laboratory Observations",
  showFilters = true,
  onSelectRow,
  className = "",
}: ObservationTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "abnormal" | "normal">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"name" | "date" | "status">("name");
  const [sortAsc, setSortAsc] = useState(true);

  // Extract unique categories
  const categories = Array.from(
    new Set(observations.map((o) => o.category).filter(Boolean) as string[])
  );

  const filtered = observations
    .filter((obs) => {
      const matchesSearch =
        obs.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (obs.category && obs.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (obs.reportName && obs.reportName.toLowerCase().includes(searchTerm.toLowerCase()));

      const isAbnormal =
        obs.classification === "above_reference" ||
        obs.classification === "below_reference" ||
        obs.classification === "critical" ||
        (obs.laboratoryFlag && obs.laboratoryFlag.toUpperCase() !== "NORMAL");

      if (statusFilter === "abnormal" && !isAbnormal) return false;
      if (statusFilter === "normal" && isAbnormal) return false;

      if (categoryFilter !== "all" && obs.category !== categoryFilter) return false;

      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortField === "name") {
        return sortAsc
          ? a.testName.localeCompare(b.testName)
          : b.testName.localeCompare(a.testName);
      }
      if (sortField === "date") {
        const dateA = a.testDate ? new Date(a.testDate).getTime() : 0;
        const dateB = b.testDate ? new Date(b.testDate).getTime() : 0;
        return sortAsc ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });

  const getClassificationBadge = (obs: ObservationRow) => {
    const cls = obs.classification?.toLowerCase();
    if (cls === "above_reference" || cls === "critical") {
      return <StatusBadge variant="danger" text="Above Reference" size="sm" />;
    }
    if (cls === "below_reference") {
      return <StatusBadge variant="warning" text="Below Reference" size="sm" />;
    }
    if (cls === "within_reference" || cls === "normal") {
      return <StatusBadge variant="success" text="Within Reference" size="sm" />;
    }
    if (obs.laboratoryFlag) {
      return <StatusBadge variant="info" text={obs.laboratoryFlag} size="sm" />;
    }
    return <StatusBadge variant="neutral" text="Recorded" size="sm" />;
  };

  return (
    <div className={`hm-observation-table-card ${className}`}>
      <div className="hm-obs-table-header">
        <div className="hm-obs-table-title-area">
          <h3 className="hm-obs-table-title">{title}</h3>
          <span className="hm-obs-count-badge">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {showFilters && (
          <div className="hm-obs-filter-bar">
            {/* Search Input */}
            <div className="hm-search-field">
              <Search size={15} className="hm-search-icon" />
              <input
                type="text"
                placeholder="Search observation, lab panel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="hm-input hm-input-sm"
                aria-label="Filter observations"
              />
            </div>

            {/* Status Segmented Buttons */}
            <div className="hm-status-filter-pills" role="group" aria-label="Status filters">
              <button
                type="button"
                className={`hm-filter-pill ${statusFilter === "all" ? "is-active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`hm-filter-pill ${statusFilter === "abnormal" ? "is-active" : ""}`}
                onClick={() => setStatusFilter("abnormal")}
              >
                Flagged / Out of Range
              </button>
              <button
                type="button"
                className={`hm-filter-pill ${statusFilter === "normal" ? "is-active" : ""}`}
                onClick={() => setStatusFilter("normal")}
              >
                Normal
              </button>
            </div>

            {/* Category Dropdown */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="hm-select hm-select-sm"
                aria-label="Filter by category"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      <div className="hm-table-responsive-wrapper">
        <table className="hm-data-table hm-obs-data-table" role="table">
          <thead>
            <tr>
              <th
                onClick={() => {
                  setSortField("name");
                  setSortAsc(!sortAsc);
                }}
                className="is-sortable"
              >
                <span>Test & Marker</span>
                <ArrowUpDown size={12} />
              </th>
              <th>Category</th>
              <th>Observed Value</th>
              <th>Reference Range</th>
              <th>Range Assessment</th>
              <th>Verification</th>
              <th
                onClick={() => {
                  setSortField("date");
                  setSortAsc(!sortAsc);
                }}
                className="is-sortable"
              >
                <span>Report Date</span>
                <ArrowUpDown size={12} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="hm-table-empty-row">
                  No observations match the selected criteria.
                </td>
              </tr>
            ) : (
              filtered.map((obs, idx) => (
                <tr
                  key={obs.id || idx}
                  onClick={() => onSelectRow && onSelectRow(obs)}
                  className={onSelectRow ? "is-clickable" : ""}
                >
                  <td className="hm-td-test-name">
                    <span className="hm-test-name-text">{obs.testName}</span>
                    {obs.reportName && (
                      <span className="hm-test-report-hint">{obs.reportName}</span>
                    )}
                    {obs.flagDiscrepancy && (
                      <div className="hm-discrepancy-callout" role="alert">
                        <AlertTriangle size={12} />
                        <span>Flag discrepancy: Laboratory flag contradicts computed reference range.</span>
                      </div>
                    )}
                  </td>
                  <td>
                    {obs.category ? (
                      <span className="hm-category-chip">{obs.category}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="hm-td-value">
                    <span className="hm-value-number">{obs.value}</span>
                    {obs.unit && <span className="hm-value-unit"> {obs.unit}</span>}
                  </td>
                  <td className="hm-td-refrange">
                    {obs.referenceRangeText || "—"}
                  </td>
                  <td>{getClassificationBadge(obs)}</td>
                  <td>
                    {obs.isVerified ? (
                      <StatusBadge variant="verified" text="Verified" size="sm" />
                    ) : (
                      <StatusBadge variant="neutral" text="Extracted" size="sm" />
                    )}
                  </td>
                  <td className="hm-td-date">
                    {obs.testDate ? new Date(obs.testDate).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="hm-table-footer-disclaimer">
        <p>
          <strong>Clinical Advisory:</strong> Extracted laboratory ranges reflect reference intervals provided in source documents. Always confirm values with an authorized physician or certified laboratory report before clinical decisions.
        </p>
      </div>
    </div>
  );
}

