import React, { useState, useEffect } from "react";
import {
  listDocuments,
  getDocument,
  compareReports,
  type DocumentItem,
  type ReportComparisonResponse,
  type ReportComparisonItem,
} from "../api/client";
import { DocumentViewerModal } from "./DocumentViewerModal";

interface ReportComparisonProps {
  token: string;
}

export function ReportComparison({ token }: ReportComparisonProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [orderingPreference, setOrderingPreference] = useState<"date_asc" | "date_desc" | "selection_order">("date_asc");
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ReportComparisonResponse | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedClassification, setSelectedClassification] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Modal for viewing source documents
  const [viewerDoc, setViewerDoc] = useState<DocumentItem | null>(null);
  const [loadingViewerDoc, setLoadingViewerDoc] = useState(false);

  useEffect(() => {
    loadUserDocuments();
  }, [token]);

  async function loadUserDocuments() {
    setLoadingDocs(true);
    setError(null);
    try {
      const docs = await listDocuments(token);
      setDocuments(docs);
      // Auto-select first two if available and none selected yet
      if (docs.length >= 2 && selectedDocIds.length === 0) {
        setSelectedDocIds([docs[0].id, docs[1].id]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load documents";
      setError(msg);
    } finally {
      setLoadingDocs(false);
    }
  }

  function toggleDocSelection(id: string) {
    setSelectedDocIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((dId) => dId !== id);
      } else {
        if (prev.length >= 5) {
          setError("You may select up to 5 reports at a time for comparison.");
          return prev;
        }
        setError(null);
        return [...prev, id];
      }
    });
  }

  async function handleCompare() {
    if (selectedDocIds.length < 2) {
      setError("Please select at least 2 reports to generate a clinical comparison.");
      return;
    }
    setComparing(true);
    setError(null);
    try {
      const res = await compareReports(token, {
        document_ids: selectedDocIds,
        include_unverified: includeUnverified,
        ordering_preference: orderingPreference,
      });
      setComparisonResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate report comparison";
      setError(msg);
    } finally {
      setComparing(false);
    }
  }

  async function handleOpenDocument(docId: string | null) {
    if (!docId) return;
    setLoadingViewerDoc(true);
    try {
      const found = documents.find((d) => d.id === docId);
      if (found) {
        setViewerDoc(found);
      } else {
        const fetched = await getDocument(token, docId);
        setViewerDoc(fetched);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load document preview";
      setError(msg);
    } finally {
      setLoadingViewerDoc(false);
    }
  }

  // Filter items
  const filteredItems = (comparisonResult?.items || []).filter((item: ReportComparisonItem) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.test_name.toLowerCase().includes(q) || item.normalized_test_name.toLowerCase().includes(q);
      if (!matchName) return false;
    }
    if (selectedCategory !== "all" && item.category !== selectedCategory) {
      return false;
    }
    if (selectedClassification !== "all" && item.classification !== selectedClassification) {
      return false;
    }
    if (verifiedOnly) {
      const isBaseVerified = item.baseline_is_verified ?? true;
      const isNewerVerified = item.newer_is_verified ?? true;
      if (!isBaseVerified || !isNewerVerified) return false;
    }
    return true;
  });

  const categories = Array.from(
    new Set((comparisonResult?.items || []).map((i) => i.category).filter(Boolean))
  );

  return (
    <div className="report-comparison-container" data-testid="report-comparison">
      <div className="section-header">
        <div>
          <h2>🔄 Medical Report Comparison</h2>
          <p className="subtitle">
            Compare structured clinical observations between two or more uploaded medical reports to inspect
            longitudinal changes, new tests, and reference range variations.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert" data-testid="comparison-error">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError(null)} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      {/* 1. Document Selection Card */}
      <div className="card comparison-selection-card">
        <div className="card-header-row">
          <div>
            <h3>Select Reports to Compare</h3>
            <p className="helper-text">
              Choose at least 2 reports (maximum 5). Reports are compared chronologically based on their clinical dates.
            </p>
          </div>
          <div className="selection-badge-wrap">
            <span
              className={`badge ${selectedDocIds.length >= 2 ? "badge-success" : "badge-secondary"}`}
              data-testid="selected-count-badge"
            >
              {selectedDocIds.length} Selected (Min: 2, Max: 5)
            </span>
          </div>
        </div>

        {loadingDocs ? (
          <div className="loading-state" data-testid="loading-docs">
            <span className="spinner" /> Loading your medical reports…
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state-box" data-testid="no-documents-state">
            <p>You have not uploaded any medical reports yet.</p>
            <p className="helper-text">Please upload at least 2 reports in the Medical Documents tab to use comparison.</p>
          </div>
        ) : (
          <div className="report-selection-grid" data-testid="report-selection-grid">
            {documents.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              return (
                <label
                  key={doc.id}
                  className={`report-select-item ${isSelected ? "selected" : ""}`}
                  htmlFor={`report-checkbox-${doc.id}`}
                >
                  <input
                    type="checkbox"
                    id={`report-checkbox-${doc.id}`}
                    checked={isSelected}
                    onChange={() => toggleDocSelection(doc.id)}
                    aria-label={`Select ${doc.filename}`}
                  />
                  <div className="report-select-info">
                    <span className="report-filename">{doc.filename}</span>
                    <div className="report-meta-row">
                      <span className="meta-tag">
                        📅 {doc.document_date ? doc.document_date : "Date unstated"}
                      </span>
                      {!doc.document_date && doc.created_at && (
                        <span className="meta-tag meta-inferred" title="Clinical date was inferred from upload timestamp">
                          Inferred Date
                        </span>
                      )}
                      <span className="meta-tag">🏥 {doc.lab_name || "Lab unstated"}</span>
                      <span className={`meta-tag ${doc.is_verified ? "meta-verified" : "meta-unverified"}`}>
                        {doc.is_verified ? "✓ Verified" : "⏳ Extracted"}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* Comparison Options Controls */}
        <div className="comparison-options-bar">
          <div className="option-group">
            <label htmlFor="ordering-preference-select">Report Ordering:</label>
            <select
              id="ordering-preference-select"
              value={orderingPreference}
              onChange={(e) => setOrderingPreference(e.target.value as "date_asc" | "date_desc" | "selection_order")}
              className="form-select form-select-sm"
            >
              <option value="date_asc">Chronological (Oldest Baseline → Newest)</option>
              <option value="date_desc">Reverse Chronological (Newest Baseline → Oldest)</option>
              <option value="selection_order">Manual Selection Order</option>
            </select>
          </div>

          <div className="option-group checkbox-group">
            <label htmlFor="include-unverified-checkbox">
              <input
                type="checkbox"
                id="include-unverified-checkbox"
                checked={includeUnverified}
                onChange={(e) => setIncludeUnverified(e.target.checked)}
              />
              Include Unverified Observations
            </label>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCompare}
            disabled={selectedDocIds.length < 2 || comparing}
            id="compare-reports-btn"
            data-testid="compare-reports-button"
          >
            {comparing ? (
              <>
                <span className="spinner-sm" /> Comparing…
              </>
            ) : (
              "Compare Reports"
            )}
          </button>
        </div>
      </div>

      {/* 2. Comparison Results Area */}
      {comparisonResult && (
        <div className="comparison-results-area" data-testid="comparison-results">
          {/* Comparison Header & Summary Metrics */}
          <div className="card comparison-summary-card">
            <div className="comparison-meta-header">
              <div className="report-meta-box baseline-box">
                <span className="role-label">BASELINE REPORT</span>
                <h4 className="report-name">{comparisonResult.baseline_report.filename}</h4>
                <p className="report-sub">
                  Date: <strong>{comparisonResult.baseline_report.clinical_date || "Unstated"}</strong>{" "}
                  ({comparisonResult.baseline_report.date_provenance} date) |{" "}
                  {comparisonResult.baseline_report.laboratory_name || "Lab unstated"}
                </p>
                <button
                  type="button"
                  className="btn btn-link btn-sm"
                  onClick={() => handleOpenDocument(comparisonResult.baseline_report.document_id)}
                >
                  📄 View Baseline Report
                </button>
              </div>

              <div className="comparison-arrow">➔</div>

              <div className="report-meta-box newer-box">
                <span className="role-label">NEWER REPORT</span>
                <h4 className="report-name">{comparisonResult.newer_report.filename}</h4>
                <p className="report-sub">
                  Date: <strong>{comparisonResult.newer_report.clinical_date || "Unstated"}</strong>{" "}
                  ({comparisonResult.newer_report.date_provenance} date) |{" "}
                  {comparisonResult.newer_report.laboratory_name || "Lab unstated"}
                </p>
                <button
                  type="button"
                  className="btn btn-link btn-sm"
                  onClick={() => handleOpenDocument(comparisonResult.newer_report.document_id)}
                >
                  📄 View Newer Report
                </button>
              </div>
            </div>

            {/* Metric Chips */}
            <div className="summary-metrics-grid" data-testid="comparison-metrics-grid">
              <div className="metric-chip chip-total">
                <span className="metric-num">{comparisonResult.summary.total_comparisons}</span>
                <span className="metric-lbl">Total Analytes</span>
              </div>
              <div className="metric-chip chip-increased">
                <span className="metric-num">{comparisonResult.summary.increased_count}</span>
                <span className="metric-lbl">Increased</span>
              </div>
              <div className="metric-chip chip-decreased">
                <span className="metric-num">{comparisonResult.summary.decreased_count}</span>
                <span className="metric-lbl">Decreased</span>
              </div>
              <div className="metric-chip chip-unchanged">
                <span className="metric-num">{comparisonResult.summary.unchanged_count}</span>
                <span className="metric-lbl">Unchanged</span>
              </div>
              <div className="metric-chip chip-new">
                <span className="metric-num">{comparisonResult.summary.new_tests_count}</span>
                <span className="metric-lbl">New Tests</span>
              </div>
              <div className="metric-chip chip-missing">
                <span className="metric-num">{comparisonResult.summary.missing_tests_count}</span>
                <span className="metric-lbl">Absent from Newer</span>
              </div>
              {comparisonResult.summary.incompatible_units_count > 0 && (
                <div className="metric-chip chip-incompatible">
                  <span className="metric-num">{comparisonResult.summary.incompatible_units_count}</span>
                  <span className="metric-lbl">Incompatible Units</span>
                </div>
              )}
              {comparisonResult.summary.needs_review_count > 0 && (
                <div className="metric-chip chip-review">
                  <span className="metric-num">{comparisonResult.summary.needs_review_count}</span>
                  <span className="metric-lbl">Review Required</span>
                </div>
              )}
            </div>

            {/* Warnings list */}
            {comparisonResult.warnings.length > 0 && (
              <div className="comparison-warnings-box" data-testid="comparison-warnings">
                <h5>⚠️ Notices & Disclosures</h5>
                <ul>
                  {comparisonResult.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                  <li>
                    <strong>Absence disclosure:</strong> An observation listed as &quot;Absent from Newer Report&quot; means
                    the analyte was not tested or extracted in the newer report. It does <em>not</em> imply that any
                    medical condition has resolved or is absent.
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* 3. Detailed Comparison Table Card */}
          <div className="card comparison-table-card">
            {/* Table Filters Toolbar */}
            <div className="table-filter-toolbar">
              <div className="filter-item">
                <input
                  type="text"
                  placeholder="🔍 Search analyte name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control form-control-sm"
                  aria-label="Search analyte name"
                  id="search-analyte-input"
                />
              </div>

              <div className="filter-item">
                <label htmlFor="classification-filter-select" className="sr-only">Classification</label>
                <select
                  id="classification-filter-select"
                  value={selectedClassification}
                  onChange={(e) => setSelectedClassification(e.target.value)}
                  className="form-select form-select-sm"
                >
                  <option value="all">All Classifications</option>
                  <option value="increased">Increased</option>
                  <option value="decreased">Decreased</option>
                  <option value="unchanged">Unchanged</option>
                  <option value="new">New in Newer Report</option>
                  <option value="not_found">Absent from Newer Report</option>
                  <option value="incompatible_units">Incompatible Units</option>
                  <option value="needs_review">Review Required</option>
                  <option value="qualitative_changed">Qualitative Changed</option>
                </select>
              </div>

              {categories.length > 0 && (
                <div className="filter-item">
                  <label htmlFor="category-filter-select" className="sr-only">Category</label>
                  <select
                    id="category-filter-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="form-select form-select-sm"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="filter-item checkbox-filter">
                <label htmlFor="verified-only-toggle">
                  <input
                    type="checkbox"
                    id="verified-only-toggle"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                  />
                  Verified Only
                </label>
              </div>

              <div className="filter-count">
                Showing {filteredItems.length} of {comparisonResult.items.length} analytes
              </div>
            </div>

            {/* Table */}
            {filteredItems.length === 0 ? (
              <div className="empty-state-box" data-testid="no-filtered-items">
                <p>No comparison items match the selected filters.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="comparison-table" data-testid="comparison-table">
                  <thead>
                    <tr>
                      <th scope="col">Test Analyte</th>
                      <th scope="col">Baseline Result</th>
                      <th scope="col">Newer Result</th>
                      <th scope="col">Difference</th>
                      <th scope="col">Classification</th>
                      <th scope="col">Clinical Note & Provenance</th>
                      <th scope="col">Source Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, index) => {
                      const isIncreased = item.classification === "increased";
                      const isDecreased = item.classification === "decreased";
                      const isUnchanged = item.classification === "unchanged";
                      const isNew = item.classification === "new";
                      const isNotFound = item.classification === "not_found";
                      const isIncompatible = item.classification === "incompatible_units";
                      const isReview = item.classification === "needs_review";

                      let badgeClass = "badge-secondary";
                      if (isIncreased) badgeClass = "badge-warning";
                      if (isDecreased) badgeClass = "badge-info";
                      if (isUnchanged) badgeClass = "badge-neutral";
                      if (isNew) badgeClass = "badge-primary";
                      if (isNotFound) badgeClass = "badge-muted";
                      if (isIncompatible) badgeClass = "badge-danger";
                      if (isReview) badgeClass = "badge-caution";

                      return (
                        <tr key={`${item.normalized_test_name}-${index}`} data-testid={`comparison-row-${item.normalized_test_name}`}>
                          {/* Test Analyte */}
                          <td className="cell-test-name">
                            <strong>{item.test_name}</strong>
                            <span className="canonical-sub">{item.normalized_test_name}</span>
                            <span className="category-sub">{item.category}</span>
                          </td>

                          {/* Baseline Result */}
                          <td className="cell-result">
                            {item.baseline_value !== null ? (
                              <>
                                <span className="val-text">
                                  {item.baseline_value} {item.baseline_unit || ""}
                                </span>
                                {item.baseline_reference_range && (
                                  <span className="range-sub">Ref: {item.baseline_reference_range}</span>
                                )}
                                {item.baseline_flag && item.baseline_flag !== "NORMAL" && (
                                  <span className="flag-tag">{item.baseline_flag}</span>
                                )}
                                <span className={`verif-sub ${item.baseline_is_verified ? "verif-true" : "verif-false"}`}>
                                  {item.baseline_is_verified ? "✓ Verified" : "⏳ Unverified"}
                                </span>
                              </>
                            ) : (
                              <span className="not-tested-sub">— (Not in baseline)</span>
                            )}
                          </td>

                          {/* Newer Result */}
                          <td className="cell-result">
                            {item.newer_value !== null ? (
                              <>
                                <span className="val-text">
                                  {item.newer_value} {item.newer_unit || ""}
                                </span>
                                {item.newer_reference_range && (
                                  <span className="range-sub">Ref: {item.newer_reference_range}</span>
                                )}
                                {item.newer_flag && item.newer_flag !== "NORMAL" && (
                                  <span className="flag-tag">{item.newer_flag}</span>
                                )}
                                <span className={`verif-sub ${item.newer_is_verified ? "verif-true" : "verif-false"}`}>
                                  {item.newer_is_verified ? "✓ Verified" : "⏳ Unverified"}
                                </span>
                              </>
                            ) : (
                              <span className="not-tested-sub">— (Not in newer)</span>
                            )}
                          </td>

                          {/* Difference */}
                          <td className="cell-diff">
                            {item.absolute_change !== null ? (
                              <div className="diff-block">
                                <span className={`diff-delta ${isIncreased ? "diff-up" : isDecreased ? "diff-down" : "diff-flat"}`}>
                                  {item.absolute_change > 0 ? `+${item.absolute_change}` : item.absolute_change}{" "}
                                  {item.standard_unit || ""}
                                </span>
                                {item.percentage_change !== null && (
                                  <span className="diff-pct">
                                    ({item.percentage_change > 0 ? `+${item.percentage_change}` : item.percentage_change}%)
                                  </span>
                                )}
                                {item.has_converted_units && (
                                  <span className="conv-indicator" title="Units were harmonized safely to a standard scale">
                                    Units Harmonized
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="diff-none">—</span>
                            )}
                          </td>

                          {/* Classification */}
                          <td className="cell-classification">
                            <span className={`badge ${badgeClass}`} title={item.classification_label}>
                              {item.classification_label}
                            </span>
                          </td>

                          {/* Clinical Note & Provenance */}
                          <td className="cell-notes">
                            <p className="clinical-desc">{item.clinical_change_description}</p>
                            {item.requires_review && item.review_explanation && (
                              <p className="review-expl">⚠️ {item.review_explanation}</p>
                            )}
                          </td>

                          {/* Source Reports Actions */}
                          <td className="cell-actions">
                            <div className="source-btn-group">
                              {item.baseline_document_id && (
                                <button
                                  type="button"
                                  className="btn btn-outline-sm"
                                  onClick={() => handleOpenDocument(item.baseline_document_id)}
                                  title={`Open baseline report (Page ${item.baseline_page || 1})`}
                                >
                                  📄 Baseline (p. {item.baseline_page || 1})
                                </button>
                              )}
                              {item.newer_document_id && (
                                <button
                                  type="button"
                                  className="btn btn-outline-sm"
                                  onClick={() => handleOpenDocument(item.newer_document_id)}
                                  title={`Open newer report (Page ${item.newer_page || 1})`}
                                >
                                  📄 Newer (p. {item.newer_page || 1})
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Safety Disclaimer Banner */}
          <div className="comparison-disclaimer-box" data-testid="comparison-disclaimer">
            <h4>🛡️ Medical Safety & Diagnostic Disclaimer</h4>
            <p>{comparisonResult.disclaimer}</p>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewerDoc && (
        <DocumentViewerModal
          document={viewerDoc}
          onClose={() => setViewerDoc(null)}
          onVerified={() => {
            loadUserDocuments();
            if (selectedDocIds.length >= 2) handleCompare();
          }}
        />
      )}
    </div>
  );
}
