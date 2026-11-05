import React, { useEffect, useState, useMemo } from "react";
import {
  getDocument,
  getInsightsOverview,
  getInsightsFindings,
  getInsightsTrends,
  getInsightsSummary,
  getInsightsDataQuality,
  type DocumentItem,
  type InsightsOverviewMetrics,
  type FindingItem,
  type LongitudinalTrendItem,
  type DataQualityReport,
  type PersonalizedHealthSummary,
  type ReferenceClassification,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { DocumentViewerModal } from "./DocumentViewerModal";

interface MedicalInsightsProps {
  onNavigateTab?: (tab: "documents" | "timeline" | "chat" | "insights") => void;
}

export function MedicalInsights({ onNavigateTab }: MedicalInsightsProps) {
  const { token } = useAuth();

  // Primary data states
  const [overview, setOverview] = useState<InsightsOverviewMetrics | null>(null);
  const [summary, setSummary] = useState<PersonalizedHealthSummary | null>(null);
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [trends, setTrends] = useState<LongitudinalTrendItem[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualityReport | null>(null);

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls
  const [classificationFilter, setClassificationFilter] = useState<
    "all" | "noteworthy" | "within_reference" | "unknown"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [includeUnverified, setIncludeUnverified] = useState<boolean>(false);
  const [summaryMode, setSummaryMode] = useState<"offline" | "llm_assisted">(
    "offline"
  );

  // Document modal viewer state
  const [viewerDoc, setViewerDoc] = useState<DocumentItem | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const categories = [
    "All",
    "Hematology",
    "Lipids",
    "Metabolic",
    "Endocrine",
    "Immunology",
  ];

  // Load all initial insights
  useEffect(() => {
    if (!token) return;
    loadInsightsData();
  }, [token, includeUnverified]);

  const loadInsightsData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [ovData, findData, trendData, dqData, sumData] = await Promise.all([
        getInsightsOverview(token),
        getInsightsFindings(token, { includeUnverified, limit: 100 }),
        getInsightsTrends(token, includeUnverified),
        getInsightsDataQuality(token),
        getInsightsSummary(token, summaryMode),
      ]);

      setOverview(ovData);
      setFindings(findData.items);
      setTrends(trendData.items);
      setDataQuality(dqData);
      setSummary(sumData);
    } catch (err: any) {
      setError(err?.message || "Failed to load medical insights.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateSummary = async (mode: "offline" | "llm_assisted") => {
    if (!token) return;
    setSummaryMode(mode);
    setSummaryLoading(true);
    try {
      const updatedSummary = await getInsightsSummary(token, mode);
      setSummary(updatedSummary);
    } catch (err: any) {
      setError(err?.message || "Failed to update health summary.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleOpenSourceDocument = async (documentId: string) => {
    if (!token) return;
    setLoadingDocId(documentId);
    try {
      const doc = await getDocument(token, documentId);
      setViewerDoc(doc);
    } catch (err: any) {
      alert("Unable to load source document: " + (err?.message || "Not found"));
    } finally {
      setLoadingDocId(null);
    }
  };

  // Filtered findings
  const filteredFindings = useMemo(() => {
    return findings.filter((item) => {
      // Classification filter
      if (classificationFilter === "noteworthy") {
        if (
          item.classification !== "above_reference" &&
          item.classification !== "below_reference" &&
          item.classification !== "qualitative_flagged"
        ) {
          return false;
        }
      } else if (classificationFilter === "within_reference") {
        if (item.classification !== "within_reference") return false;
      } else if (classificationFilter === "unknown") {
        if (item.classification !== "unknown") return false;
      }

      // Category filter
      if (
        categoryFilter !== "All" &&
        item.category.toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.test_name.toLowerCase().includes(query);
        const matchesNorm = item.normalized_test_name
          .toLowerCase()
          .includes(query);
        const matchesDoc = item.document_title.toLowerCase().includes(query);
        if (!matchesName && !matchesNorm && !matchesDoc) return false;
      }

      return true;
    });
  }, [findings, classificationFilter, categoryFilter, searchQuery]);

  const getClassificationBadge = (classification: ReferenceClassification) => {
    switch (classification) {
      case "above_reference":
        return <span className="classification-badge badge-above">Above Reference</span>;
      case "below_reference":
        return <span className="classification-badge badge-below">Below Reference</span>;
      case "qualitative_flagged":
        return <span className="classification-badge badge-flagged">Flagged Qualitative</span>;
      case "within_reference":
        return <span className="classification-badge badge-normal">Within Reference</span>;
      default:
        return <span className="classification-badge badge-unknown">Reference Unknown</span>;
    }
  };

  if (loading) {
    return (
      <div className="insights-container loading-state" data-testid="insights-loading">
        <div className="spinner" />
        <p>Analyzing clinical observations and calculating medical insights...</p>
      </div>
    );
  }

  return (
    <div className="medical-insights-container" data-testid="medical-insights">
      {/* Header & Clinical Disclaimer Banner */}
      <header className="insights-header">
        <div className="insights-header-top">
          <div>
            <h2>📊 AI Medical Insights & Health Record Summary</h2>
            <p className="subtitle">
              Evidence-based longitudinal analysis, reference-range comparisons, and data-quality indicators.
            </p>
          </div>
          <div className="insights-controls">
            <label className="toggle-unverified-label">
              <input
                type="checkbox"
                checked={includeUnverified}
                onChange={(e) => setIncludeUnverified(e.target.checked)}
                id="toggle-include-unverified"
              />
              <span>Include Unverified Observations</span>
            </label>
            <button
              className="refresh-btn"
              onClick={loadInsightsData}
              title="Refresh all calculations"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Mandatory Safety Guardrail Alert */}
        <div className="medical-safety-banner" role="alert">
          <div className="banner-icon">⚠️</div>
          <div className="banner-content">
            <strong>Important Clinical Safety Information:</strong>
            <p>
              HealthMate AI calculates insights strictly based on available reference ranges printed on your uploaded
              medical records. It does <strong>not</strong> diagnose medical conditions, predict disease risks, evaluate
              unsupported clinical scores, or prescribe medications. A flagged observation is not a clinical diagnosis.
              Always consult a qualified healthcare provider regarding abnormal or conflicting results.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="insights-error-banner" role="alert">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* A. Health-Record Overview Cards */}
      {overview && (
        <section className="insights-overview-grid" aria-label="Health Record Overview">
          <div className="overview-card" data-testid="metric-reports">
            <span className="card-label">Uploaded Reports</span>
            <span className="card-value">{overview.total_reports}</span>
            <span className="card-subtext">
              {overview.reports_with_missing_dates_count > 0
                ? `${overview.reports_with_missing_dates_count} without printed dates`
                : "All reports dated"}
            </span>
          </div>

          <div className="overview-card" data-testid="metric-verified">
            <span className="card-label">Verified Observations</span>
            <span className="card-value">{overview.verified_observations_count}</span>
            <span className="card-subtext">
              {overview.unverified_observations_count > 0
                ? `${overview.unverified_observations_count} pending review`
                : "All observations reviewed"}
            </span>
          </div>

          <div className="overview-card" data-testid="metric-noteworthy">
            <span className="card-label">Noteworthy Results</span>
            <span
              className={`card-value ${
                overview.noteworthy_findings_count > 0 ? "highlight-warning" : ""
              }`}
            >
              {overview.noteworthy_findings_count}
            </span>
            <span className="card-subtext">Outside printed lab range</span>
          </div>

          <div className="overview-card" data-testid="metric-distinct-tests">
            <span className="card-label">Distinct Test Types</span>
            <span className="card-value">{overview.distinct_test_types_count}</span>
            <span className="card-subtext">
              {overview.comparable_tests_with_history_count} with 2+ readings
            </span>
          </div>

          <div className="overview-card date-span-card" data-testid="metric-date-span">
            <span className="card-label">Clinical Record Span</span>
            <span className="card-value-sm">
              {overview.earliest_date && overview.latest_date
                ? `${overview.earliest_date} → ${overview.latest_date}`
                : "No clinical dates available"}
            </span>
            <span className="card-subtext">Chronological boundaries</span>
          </div>
        </section>
      )}

      {/* B. Personalized Health-Record Summary Card */}
      {summary && (
        <section className="personalized-summary-section" data-testid="personalized-summary-card">
          <div className="summary-card-header">
            <div>
              <h3>📋 Personalized Health-Record Summary</h3>
              <p className="summary-meta">
                Mode: <strong className="mode-badge">{summary.summary_mode}</strong>
              </p>
            </div>
            <div className="summary-mode-actions">
              <button
                className={`mode-toggle-btn ${summaryMode === "offline" ? "active" : ""}`}
                onClick={() => handleRegenerateSummary("offline")}
                disabled={summaryLoading}
              >
                🔒 Deterministic Offline
              </button>
              <button
                className={`mode-toggle-btn ${summaryMode === "llm_assisted" ? "active" : ""}`}
                onClick={() => handleRegenerateSummary("llm_assisted")}
                disabled={summaryLoading}
              >
                🤖 LLM-Assisted Phrasing
              </button>
            </div>
          </div>

          {summaryLoading ? (
            <div className="summary-loading-placeholder">
              <div className="spinner-small" /> Phrasing verified health summary...
            </div>
          ) : (
            <div className="summary-card-body">
              {/* Narrative Summary Text */}
              <div className="narrative-box">
                <p className="narrative-paragraph">{summary.narrative_summary}</p>
              </div>

              {/* Key Findings with Citations */}
              {summary.key_findings.length > 0 && (
                <div className="summary-block">
                  <h4>🔍 Key Findings from Uploaded Reports</h4>
                  <ul className="findings-bullet-list">
                    {summary.key_findings.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Longitudinal Highlights */}
              {summary.longitudinal_highlights.length > 0 && (
                <div className="summary-block">
                  <h4>📈 Measurement Changes Over Time</h4>
                  <ul className="trends-bullet-list">
                    {summary.longitudinal_highlights.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Quality & Incomplete History Limitations */}
              {(summary.data_quality_disclosures || []).length > 0 && (
                <div className="summary-block limitations-block">
                  <h4>⚠️ Health-Record Limitations & Incomplete Data</h4>
                  <ul className="limitations-bullet-list">
                    {summary.data_quality_disclosures.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions for Healthcare Professional */}
              {summary.suggested_clinician_questions.length > 0 && (
                <div className="summary-block questions-block">
                  <h4>🩺 Questions to Discuss with Your Doctor</h4>
                  <ul className="doctor-questions-list">
                    {summary.suggested_clinician_questions.map((q, idx) => (
                      <li key={idx} className="question-item">
                        <span className="question-bullet">💬</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Supporting Citations List */}
              {summary.citations.length > 0 && (
                <div className="summary-block citations-block">
                  <h4>📚 Traceable Source Citations</h4>
                  <div className="citations-grid">
                    {summary.citations.map((c) => (
                      <div key={c.citation_id || c.document_id} className="citation-chip-card">
                        <div className="citation-header">
                          <span className="citation-id-tag">[{c.citation_id || "Ref"}]</span>
                          <span className="citation-test-name">
                            {c.original_test_name || c.normalized_test_name || "General Record"}
                          </span>
                        </div>
                        <div className="citation-title">{c.document_title}</div>
                        {c.source_text && (
                          <div className="citation-excerpt">"{c.source_text}"</div>
                        )}
                        <div className="citation-footer">
                          <span>
                            {c.page_number ? `Page ${c.page_number}` : "Page unstated"}
                          </span>
                          <button
                            className="citation-open-btn"
                            onClick={() => handleOpenSourceDocument(c.document_id)}
                            disabled={loadingDocId === c.document_id}
                          >
                            {loadingDocId === c.document_id ? "Loading..." : "Open Report ↗"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Clinical Disclaimer */}
              <div className="summary-disclaimer">
                <small>{summary.medical_disclaimer}</small>
              </div>
            </div>
          )}
        </section>
      )}

      {/* C. Potentially Noteworthy Results & Laboratory Findings Panel */}
      <section className="findings-section" aria-label="Laboratory Findings and Reference Ranges">
        <div className="section-header-row">
          <div>
            <h3>🔬 Reference-Range Classifications</h3>
            <p className="subtitle">
              Observations compared specifically against the reference ranges printed on each respective laboratory report.
            </p>
          </div>

          <div className="filters-toolbar">
            {/* Classification Filters */}
            <div className="filter-pill-group" role="group" aria-label="Classification Filters">
              <button
                className={`filter-pill ${classificationFilter === "all" ? "active" : ""}`}
                onClick={() => setClassificationFilter("all")}
              >
                All ({findings.length})
              </button>
              <button
                className={`filter-pill pill-warning ${
                  classificationFilter === "noteworthy" ? "active" : ""
                }`}
                onClick={() => setClassificationFilter("noteworthy")}
              >
                Outside Reference (
                {
                  findings.filter(
                    (f) =>
                      f.classification === "above_reference" ||
                      f.classification === "below_reference" ||
                      f.classification === "qualitative_flagged"
                  ).length
                }
                )
              </button>
              <button
                className={`filter-pill ${
                  classificationFilter === "within_reference" ? "active" : ""
                }`}
                onClick={() => setClassificationFilter("within_reference")}
              >
                Within Range (
                {
                  findings.filter((f) => f.classification === "within_reference")
                    .length
                }
                )
              </button>
              <button
                className={`filter-pill ${
                  classificationFilter === "unknown" ? "active" : ""
                }`}
                onClick={() => setClassificationFilter("unknown")}
              >
                Unknown Range (
                {findings.filter((f) => f.classification === "unknown").length})
              </button>
            </div>

            {/* Category Filter */}
            <select
              className="category-dropdown"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <input
              type="text"
              className="search-input"
              placeholder="Search test or document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search test name or document"
            />
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="empty-state-box" data-testid="findings-empty">
            <p>No observations match your current filter criteria.</p>
          </div>
        ) : (
          <div className="findings-table-wrapper">
            <table className="insights-table" data-testid="findings-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Observed Value</th>
                  <th>Laboratory Reference Range</th>
                  <th>Classification</th>
                  <th>Clinical Date</th>
                  <th>Source Document</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFindings.map((item) => (
                  <tr
                    key={item.observation_id}
                    className={`finding-row ${
                      item.requires_review ? "row-requires-review" : ""
                    }`}
                  >
                    <td>
                      <div className="test-name-cell">
                        <strong>{item.test_name}</strong>
                        {item.normalized_test_name !== item.test_name && (
                          <span className="normalized-tag">
                            Norm: {item.normalized_test_name}
                          </span>
                        )}
                        <span className="category-tag">{item.category}</span>
                      </div>
                    </td>
                    <td>
                      <div className="value-cell">
                        <span className="value-text">
                          {item.value} {item.unit || ""}
                        </span>
                        {item.lab_flag && (
                          <span className="lab-flag-badge">Lab: {item.lab_flag}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="range-cell">
                        {item.reference_range ? (
                          <code>{item.reference_range}</code>
                        ) : (
                          <span className="text-muted">Unspecified by lab</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="classification-cell">
                        {getClassificationBadge(item.classification)}
                        <small className="explanation-text">
                          {item.classification_explanation}
                        </small>
                        {item.requires_review && item.discrepancy_explanation && (
                          <div className="discrepancy-alert" role="alert">
                            ⚠️ Review: {item.discrepancy_explanation}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        <span>{item.clinical_date}</span>
                        <span
                          className={`provenance-tag tag-${item.date_provenance}`}
                          title={
                            item.date_provenance === "inferred"
                              ? "Date inferred from document upload metadata"
                              : "Date explicitly extracted from report"
                          }
                        >
                          {item.date_provenance}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="doc-title-cell" title={item.document_title}>
                        {item.document_title}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-view-doc"
                        onClick={() => handleOpenSourceDocument(item.document_id)}
                        disabled={loadingDocId === item.document_id}
                        title="Open report in document viewer"
                      >
                        {loadingDocId === item.document_id ? "..." : "📄 View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* D. Longitudinal Trends & Comparable Historical Measurements */}
      <section className="trends-section" aria-label="Historical Changes in Comparable Measurements">
        <div className="section-header-row">
          <div>
            <h3>📈 Changes in Comparable Measurements Over Time</h3>
            <p className="subtitle">
              Calculated historical delta between readings with standardized unit harmonization.
            </p>
          </div>
        </div>

        {trends.length === 0 ? (
          <div className="empty-state-box" data-testid="trends-empty">
            <p>
              No comparable historical measurements found. At least two observations with compatible units are required to
              calculate longitudinal changes.
            </p>
          </div>
        ) : (
          <div className="trends-grid" data-testid="trends-grid">
            {trends.map((tr) => (
              <div key={tr.normalized_test_name} className="trend-card">
                <div className="trend-card-top">
                  <div>
                    <h4 className="trend-title">{tr.test_name}</h4>
                    <span className="trend-category">{tr.category}</span>
                  </div>
                  <div
                    className={`delta-badge badge-${tr.direction}`}
                    data-testid={`delta-${tr.direction}`}
                  >
                    {tr.direction === "increased" && "▲"}
                    {tr.direction === "decreased" && "▼"}
                    {tr.direction === "stable" && "•"}{" "}
                    {tr.absolute_change !== null
                      ? `${tr.absolute_change > 0 ? "+" : ""}${tr.absolute_change} ${tr.standard_unit}`
                      : "N/A"}{" "}
                    {tr.percentage_change !== null &&
                      `(${tr.percentage_change > 0 ? "+" : ""}${tr.percentage_change}%)`}
                  </div>
                </div>

                <div className="trend-readings-row">
                  <div className="reading-col">
                    <span className="reading-label">Previous Reading</span>
                    <span className="reading-val">{tr.previous_value}</span>
                    <span className="reading-date">{tr.previous_date}</span>
                    <button
                      className="reading-doc-link"
                      onClick={() => handleOpenSourceDocument(tr.previous_document_id)}
                    >
                      {tr.previous_document_title} ↗
                    </button>
                  </div>

                  <div className="reading-arrow">➔</div>

                  <div className="reading-col">
                    <span className="reading-label">Latest Reading</span>
                    <span className="reading-val">{tr.latest_value}</span>
                    <span className="reading-date">{tr.latest_date}</span>
                    <button
                      className="reading-doc-link"
                      onClick={() => handleOpenSourceDocument(tr.latest_document_id)}
                    >
                      {tr.latest_document_title} ↗
                    </button>
                  </div>
                </div>

                <div className="trend-card-footer">
                  <p className="trend-desc">{tr.clinical_change_description}</p>
                  {tr.has_converted_units && (
                    <small className="unit-conversion-note">
                      ℹ️ Units converted to standard {tr.standard_unit} for mathematical comparison.
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* E. Data-Quality Insights & Incomplete Information Indicators */}
      {dataQuality && (
        <section className="data-quality-section" data-testid="data-quality-section">
          <div className="section-header-row">
            <div>
              <h3>🛡️ Health-Record Data Quality & Completeness Indicators</h3>
              <p className="subtitle">
                Transparent identification of missing metadata, inferred dates, and records needing clinical review.
              </p>
            </div>
            {onNavigateTab && (
              <button
                className="btn-review-workflow"
                onClick={() => onNavigateTab("documents")}
              >
                Go to Review Workflow →
              </button>
            )}
          </div>

          <div className="dq-metrics-row">
            <div className="dq-metric-chip">
              <span className="dq-num">{dataQuality.missing_dates_count}</span>
              <span className="dq-label">Missing Dates</span>
            </div>
            <div className="dq-metric-chip">
              <span className="dq-num">{dataQuality.inferred_dates_count}</span>
              <span className="dq-label">Inferred Dates</span>
            </div>
            <div className="dq-metric-chip">
              <span className="dq-num">{dataQuality.missing_units_count}</span>
              <span className="dq-label">Missing Units</span>
            </div>
            <div className="dq-metric-chip">
              <span className="dq-num">{dataQuality.missing_ranges_count}</span>
              <span className="dq-label">Missing Ranges</span>
            </div>
            <div className="dq-metric-chip">
              <span className="dq-num">{dataQuality.unverified_observations_count}</span>
              <span className="dq-label">Unreviewed Records</span>
            </div>
            <div className="dq-metric-chip">
              <span className="dq-num">{dataQuality.flag_discrepancies_count}</span>
              <span className="dq-label">Flag Discrepancies</span>
            </div>
          </div>

          {dataQuality.issues.length === 0 ? (
            <div className="clean-quality-box">
              <span>✅ No data-quality or completeness issues detected across your uploaded reports.</span>
            </div>
          ) : (
            <div className="dq-issues-list">
              {dataQuality.issues.map((issue, idx) => (
                <div key={idx} className={`dq-issue-card severity-${issue.severity}`}>
                  <div className="dq-issue-main">
                    <span className={`severity-tag tag-${issue.severity}`}>
                      {issue.severity.toUpperCase()}
                    </span>
                    <div className="dq-issue-text">
                      <strong>
                        {issue.test_name ? `${issue.test_name} • ` : ""}
                        {issue.document_title}
                      </strong>
                      <p>{issue.description}</p>
                      <small className="recommendation">👉 {issue.recommendation}</small>
                    </div>
                  </div>
                  <div className="dq-issue-action">
                    <button
                      className="btn-open-issue-doc"
                      onClick={() => handleOpenSourceDocument(issue.document_id)}
                      disabled={loadingDocId === issue.document_id}
                    >
                      Review Report ↗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Document Viewer Modal for Provenance and Traceability */}
      {viewerDoc && (
        <DocumentViewerModal
          document={viewerDoc}
          onClose={() => setViewerDoc(null)}
          onVerified={() => {
            loadInsightsData();
          }}
          onReprocessed={() => {
            loadInsightsData();
          }}
        />
      )}
    </div>
  );
}
