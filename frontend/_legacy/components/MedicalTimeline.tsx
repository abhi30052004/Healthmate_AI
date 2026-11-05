import React, { useEffect, useState } from "react";
import {
  getDocument,
  getTimeline,
  getTimelineSummary,
  getTimelineTrends,
  type DocumentItem,
  type RepeatedTestMetric,
  type TimelineItem,
  type TimelineSummaryResponse,
  type TrendResponse,
  type TrendSeries,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { DocumentViewerModal } from "./DocumentViewerModal";

interface MedicalTimelineProps {
  onRefreshNeeded?: () => void;
}

export function MedicalTimeline({ onRefreshNeeded }: MedicalTimelineProps) {
  const { token } = useAuth();
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [summary, setSummary] = useState<TimelineSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchTest, setSearchTest] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [includeUnverified, setIncludeUnverified] = useState<boolean>(false);

  // Chart selection
  const [selectedTrendTest, setSelectedTrendTest] = useState<string>("");
  const [showTabularAlternative, setShowTabularAlternative] = useState<boolean>(false);

  // Document modal viewer
  const [viewerDoc, setViewerDoc] = useState<DocumentItem | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const categories = ["All", "Hematology", "Lipids", "Metabolic", "Endocrine"];

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      const [tlRes, trRes, sumRes] = await Promise.all([
        getTimeline(token, {
          include_unverified: includeUnverified,
          category: selectedCategory !== "All" ? selectedCategory : undefined,
          test_name: searchTest.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        getTimelineTrends(token, {
          include_unverified: includeUnverified,
          category: selectedCategory !== "All" ? selectedCategory : undefined,
          test_name: searchTest.trim() || undefined,
        }),
        getTimelineSummary(token, includeUnverified),
      ]);

      setTimelineItems(tlRes.items);
      setTrendData(trRes);
      setSummary(sumRes);

      // Auto-select first multi-point trend series if none selected
      if (trRes.series.length > 0) {
        const firstMulti = trRes.series.find((s) => s.has_multiple_points);
        setSelectedTrendTest((prev) => {
          if (prev && trRes.series.some((s) => s.normalized_test_name === prev)) {
            return prev;
          }
          return firstMulti ? firstMulti.normalized_test_name : trRes.series[0].normalized_test_name;
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load medical timeline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, selectedCategory, searchTest, startDate, endDate, includeUnverified]);

  const openDocumentViewer = async (docId: string) => {
    if (!token) return;
    try {
      setLoadingDocId(docId);
      const doc = await getDocument(token, docId);
      setViewerDoc(doc);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load original document.");
    } finally {
      setLoadingDocId(null);
    }
  };

  // Group timeline items by clinical date
  const groupedByDate = timelineItems.reduce<Record<string, TimelineItem[]>>((acc, item) => {
    acc[item.clinical_date] = acc[item.clinical_date] || [];
    acc[item.clinical_date].push(item);
    return acc;
  }, {});

  const getFlagBadge = (flag?: string | null) => {
    if (!flag) return <span className="flag-badge flag-none">—</span>;
    switch (flag.toUpperCase()) {
      case "HIGH":
        return <span className="flag-badge flag-high">▲ HIGH</span>;
      case "LOW":
        return <span className="flag-badge flag-low">▼ LOW</span>;
      case "NORMAL":
        return <span className="flag-badge flag-normal">● NORMAL</span>;
      case "ABNORMAL":
        return <span className="flag-badge flag-abnormal">! ABNORMAL</span>;
      default:
        return <span className="flag-badge flag-none">{flag}</span>;
    }
  };

  const selectedSeries: TrendSeries | undefined = trendData?.series.find(
    (s) => s.normalized_test_name === selectedTrendTest
  );

  return (
    <div className="medical-timeline-container">
      {/* Top Header */}
      <div className="timeline-header-card">
        <div className="timeline-header-text">
          <h2>Medical Observation Timeline & Longitudinal Trends</h2>
          <p>
            Chronological clinical history synthesized from your verified medical reports.
            Track values over time with source evidence and unit normalization.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: "20px" }}>
          <span>{error}</span>
        </div>
      )}

      {/* Summary Metrics Banner */}
      {summary && (
        <div className="timeline-summary-grid">
          <div className="summary-stat-card">
            <span className="stat-label">Reports Analyzed</span>
            <span className="stat-number">{summary.total_reports}</span>
            <span className="stat-sub">
              {summary.earliest_date && summary.latest_date
                ? `${summary.earliest_date} to ${summary.latest_date}`
                : "No date span"}
            </span>
          </div>

          <div className="summary-stat-card">
            <span className="stat-label">Total Observations</span>
            <span className="stat-number">{summary.total_observations}</span>
            <span className="stat-sub">
              {summary.reviewed_observations_count} reviewed • {summary.unverified_observations_count} unverified
            </span>
          </div>

          <div className="summary-stat-card">
            <span className="stat-label">Repeated Test Series</span>
            <span className="stat-number">{summary.repeated_tests.length}</span>
            <span className="stat-sub">Longitudinal trend comparisons available</span>
          </div>

          <div className="summary-stat-card">
            <span className="stat-label">Abnormal Findings</span>
            <span className="stat-number" style={{ color: summary.abnormal_findings_count > 0 ? "#b91c1c" : "#047857" }}>
              {summary.abnormal_findings_count}
            </span>
            <span className="stat-sub">Exceeding standard laboratory reference bounds</span>
          </div>
        </div>
      )}

      {/* Repeated Measurements / Trajectory Highlights */}
      {summary && summary.repeated_tests.length > 0 && (
        <div className="repeated-tests-box">
          <h4>Longitudinal Trajectory Highlights</h4>
          <div className="repeated-tests-grid">
            {summary.repeated_tests.map((rt: RepeatedTestMetric) => (
              <div key={rt.normalized_test_name} className="repeated-test-card">
                <div className="rt-header">
                  <strong>{rt.normalized_test_name}</strong>
                  <span className="rt-pill">{rt.count} readings</span>
                </div>
                <p className="rt-desc">{rt.trajectory_summary}</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedTrendTest(rt.normalized_test_name);
                    const el = document.getElementById("trend-chart-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  id={`view-trend-${rt.normalized_test_name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  View Trend Chart →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Trend Chart Section */}
      <div className="trend-section-card" id="trend-chart-section">
        <div className="trend-section-header">
          <div>
            <h3>Longitudinal Trend Visualization</h3>
            <span className="trend-section-sub">
              Plots repeated laboratory values across time with standard unit harmonization.
            </span>
          </div>

          <div className="trend-actions-row">
            {trendData && trendData.series.length > 0 && (
              <select
                className="trend-select"
                value={selectedTrendTest}
                onChange={(e) => setSelectedTrendTest(e.target.value)}
                id="select-trend-test"
              >
                {trendData.series.map((s) => (
                  <option key={s.normalized_test_name} value={s.normalized_test_name}>
                    {s.normalized_test_name} ({s.points.length} points • {s.standard_unit})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowTabularAlternative((prev) => !prev)}
              id="toggle-tabular-alt-btn"
            >
              {showTabularAlternative ? "Show Visual Chart" : "Show Tabular Data"}
            </button>
          </div>
        </div>

        {selectedSeries ? (
          <div className="chart-wrapper">
            {selectedSeries.has_converted_units && (
              <div className="unit-conversion-notice">
                <span>⚡ <strong>Unit Harmonization:</strong> Observations were recorded in mixed units (e.g. mmol/L and mg/dL) and safely standardized to <strong>{selectedSeries.standard_unit}</strong> using clinical conversion factors.</span>
              </div>
            )}

            {selectedSeries.warning_message && (
              <div className="alert alert-warning" style={{ margin: "10px 0" }}>
                <span>{selectedSeries.warning_message}</span>
              </div>
            )}

            {!showTabularAlternative ? (
              <div className="svg-chart-container" role="img" aria-label={`Trend chart for ${selectedSeries.normalized_test_name}`}>
                {/* SVG Line Chart */}
                <svg className="trend-svg" viewBox="0 0 600 240" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="50" y1="30" x2="570" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="90" x2="570" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="150" x2="570" y2="150" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="200" x2="570" y2="200" stroke="#cbd5e1" strokeWidth="1.5" />

                  {/* Draw Connecting Line if >= 2 points */}
                  {selectedSeries.points.length >= 2 && (() => {
                    const vals = selectedSeries.points.map((p) => p.standardized_numeric_value);
                    const minV = Math.min(...vals) * 0.9;
                    const maxV = Math.max(...vals) * 1.1 || 1;
                    const xStep = selectedSeries.points.length > 1 ? (520 / (selectedSeries.points.length - 1)) : 0;

                    const coords = selectedSeries.points.map((p, idx) => {
                      const x = 50 + idx * xStep;
                      const y = 200 - ((p.standardized_numeric_value - minV) / (maxV - minV || 1)) * 160;
                      return { x, y, p };
                    });

                    const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

                    return (
                      <g>
                        <path d={pathD} fill="none" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
                        {coords.map((c, idx) => (
                          <g key={c.p.observation_id || idx} className="chart-node">
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r="6"
                              fill={c.p.flag === "HIGH" ? "#ef4444" : c.p.flag === "LOW" ? "#3b82f6" : "#0d9488"}
                              stroke="white"
                              strokeWidth="2"
                            />
                            <text x={c.x} y={c.y - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
                              {c.p.standardized_numeric_value}
                            </text>
                            <text x={c.x} y="222" textAnchor="middle" fontSize="10" fill="#64748b">
                              {c.p.date}
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}

                  {/* Single point fallback */}
                  {selectedSeries.points.length === 1 && (
                    <g>
                      <circle cx="310" cy="110" r="7" fill="#0d9488" stroke="white" strokeWidth="2" />
                      <text x="310" y="90" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">
                        {selectedSeries.points[0].standardized_numeric_value} {selectedSeries.standard_unit}
                      </text>
                      <text x="310" y="222" textAnchor="middle" fontSize="10" fill="#64748b">
                        {selectedSeries.points[0].date} (Single reading recorded)
                      </text>
                    </g>
                  )}
                </svg>

                {selectedSeries.points.length < 2 && (
                  <p className="sparse-data-note">
                    Only 1 measurement recorded for {selectedSeries.normalized_test_name}.
                    Upload additional reports with this analyte to render full multi-point trajectory lines.
                  </p>
                )}
              </div>
            ) : (
              /* Accessible Tabular Alternative */
              <div className="observations-table-container">
                <table className="obs-table" id="trend-tabular-alt-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Source Document</th>
                      <th>Measured Value</th>
                      <th>Original Unit</th>
                      <th>Standardized ({selectedSeries.standard_unit})</th>
                      <th>Reference Range</th>
                      <th>Flag</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSeries.points.map((pt) => (
                      <tr key={pt.observation_id}>
                        <td><strong>{pt.date}</strong></td>
                        <td>{pt.document_filename}</td>
                        <td className="obs-value">{pt.value}</td>
                        <td>{pt.original_unit ?? "—"}</td>
                        <td><strong>{pt.standardized_numeric_value}</strong></td>
                        <td>{pt.reference_range ?? "—"}</td>
                        <td>{getFlagBadge(pt.flag)}</td>
                        <td>
                          {pt.is_reviewed ? (
                            <span className="reviewed-badge">Reviewed</span>
                          ) : (
                            <span className="auto-badge">Unverified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="trend-disclaimer">
              <small>
                <strong>Clinical Disclaimer:</strong> Longitudinal charts illustrate laboratory observations over time.
                HealthMate AI does not generate medical diagnoses, predict outcomes, or prescribe clinical actions.
              </small>
            </div>
          </div>
        ) : (
          <div className="empty-state-card" style={{ padding: "30px 16px" }}>
            <div className="empty-icon">📊</div>
            <h4>No Numeric Trend Data Available</h4>
            <p>Upload reports containing numeric laboratory observations to generate visual trend charts.</p>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="timeline-filter-card">
        <div className="filter-pills-row">
          <span className="filter-title">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`filter-pill-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
              id={`filter-cat-${cat.toLowerCase()}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="filter-controls-row">
          <div className="filter-input-group">
            <label htmlFor="search-test-input">Search Test:</label>
            <input
              id="search-test-input"
              type="text"
              placeholder="e.g. Glucose, Hemoglobin, Cholesterol…"
              value={searchTest}
              onChange={(e) => setSearchTest(e.target.value)}
            />
          </div>

          <div className="filter-input-group">
            <label htmlFor="start-date-input">From Date:</label>
            <input
              id="start-date-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="filter-input-group">
            <label htmlFor="end-date-input">To Date:</label>
            <input
              id="end-date-input"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="filter-checkbox-group">
            <label className="checkbox-label" htmlFor="include-unverified-checkbox">
              <input
                id="include-unverified-checkbox"
                type="checkbox"
                checked={includeUnverified}
                onChange={(e) => setIncludeUnverified(e.target.checked)}
              />
              <span>Include Unverified Observations</span>
            </label>
          </div>
        </div>
      </div>

      {/* Chronological Timeline Feed */}
      <div className="timeline-feed-section">
        <h3>Chronological Medical Observation Feed ({timelineItems.length} records)</h3>

        {loading ? (
          <div className="list-loading-state">
            <span className="spinner" />
            <span>Loading chronological medical history…</span>
          </div>
        ) : timelineItems.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon">📅</div>
            <h4>No Timeline Entries Found</h4>
            <p>
              {includeUnverified
                ? "No observations match your current category and date filters."
                : "No verified observations found. Try toggling 'Include Unverified Observations' above or review uploaded reports."}
            </p>
          </div>
        ) : (
          <div className="timeline-tree">
            {Object.entries(groupedByDate).map(([dateStr, items]) => (
              <div key={dateStr} className="timeline-date-group" id={`date-group-${dateStr}`}>
                <div className="timeline-date-marker">
                  <div className="marker-dot" />
                  <div className="marker-info">
                    <span className="marker-date">{dateStr}</span>
                    <span className="marker-lab">
                      {items[0].lab_name ? `• ${items[0].lab_name}` : ""}
                      {items[0].date_type === "inferred" && " (inferred from upload date)"}
                    </span>
                  </div>
                </div>

                <div className="timeline-group-cards">
                  {items.map((item) => (
                    <div key={item.id} className="timeline-obs-card" id={`timeline-item-${item.id}`}>
                      <div className="toc-header">
                        <div>
                          <span className="toc-cat">{item.category}</span>
                          <h4 className="toc-title">
                            {item.normalized_test_name}
                            {item.original_test_name !== item.normalized_test_name && (
                              <span className="toc-orig-name"> (as "{item.original_test_name}")</span>
                            )}
                          </h4>
                        </div>
                        <div className="toc-status-badges">
                          {getFlagBadge(item.flag)}
                          {item.is_reviewed ? (
                            <span className="reviewed-badge">Reviewed</span>
                          ) : (
                            <span className="auto-badge">Unverified</span>
                          )}
                        </div>
                      </div>

                      <div className="toc-values-row">
                        <div className="toc-val-box">
                          <span className="tv-label">Recorded Finding</span>
                          <span className="tv-value">
                            {item.value} {item.unit ?? ""}
                          </span>
                        </div>

                        {item.reference_range && (
                          <div className="toc-val-box">
                            <span className="tv-label">Reference Range</span>
                            <span className="tv-range">{item.reference_range}</span>
                          </div>
                        )}

                        <div className="toc-val-box">
                          <span className="tv-label">Source Document</span>
                          <span className="tv-doc" title={item.document_filename}>
                            {item.document_filename} (p. {item.source_page})
                          </span>
                        </div>
                      </div>

                      <div className="toc-provenance-box">
                        <span className="prov-label">Supporting Line Text:</span>
                        <code className="prov-text">"{item.source_text}"</code>
                      </div>

                      <div className="toc-card-footer">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openDocumentViewer(item.document_id)}
                          disabled={loadingDocId === item.document_id}
                          id={`view-source-${item.id}`}
                        >
                          {loadingDocId === item.document_id ? "Loading Report…" : "View Original Report →"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Viewer Modal for Source Traceability */}
      {viewerDoc && (
        <DocumentViewerModal
          document={viewerDoc}
          onClose={() => setViewerDoc(null)}
          onVerified={() => {
            loadData();
            if (onRefreshNeeded) onRefreshNeeded();
          }}
          onReprocessed={() => {
            loadData();
            if (onRefreshNeeded) onRefreshNeeded();
          }}
        />
      )}
    </div>
  );
}
