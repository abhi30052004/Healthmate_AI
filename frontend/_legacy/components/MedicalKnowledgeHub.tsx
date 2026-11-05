import React, { useState, useEffect, useCallback } from "react";
import {
  searchMedicalRecords,
  getDocument,
  type SearchResultItem,
  type SearchResponse,
  type DocumentItem,
  ApiError,
} from "../api/client";
import { DocumentViewerModal } from "./DocumentViewerModal";

interface MedicalKnowledgeHubProps {
  token: string;
  onNavigateTab?: (tab: string) => void;
}

const EXAMPLE_QUERIES = [
  "Fasting Glucose",
  "Total Cholesterol",
  "Dr. Emily Vance",
  "Metformin",
  "Cardiology consultation",
  "Blood work reports",
  "Fasting lipid draw",
];

export function MedicalKnowledgeHub({ token, onNavigateTab }: MedicalKnowledgeHubProps) {
  const [query, setQuery] = useState("");
  const [sourceType, setSourceType] = useState<
    "all" | "document" | "observation" | "medication" | "appointment" | "follow_up"
  >("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [sortBy, setSortBy] = useState<"relevance" | "date">("relevance");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Document modal viewer state
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [fetchingDocId, setFetchingDocId] = useState<string | null>(null);

  const executeSearch = useCallback(
    async (targetPage = 1, searchQuery = query) => {
      const qClean = searchQuery.trim();
      if (!qClean) return;

      setLoading(true);
      setError(null);

      try {
        const res = await searchMedicalRecords(token, {
          q: qClean,
          source_type: sourceType,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          verified_only: verifiedOnly,
          sort_by: sortBy,
          page: targetPage,
          page_size: pageSize,
        });
        setResponse(res);
        setPage(targetPage);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to execute search. Please check your network connection.");
        }
      } finally {
        setLoading(false);
      }
    },
    [token, query, sourceType, startDate, endDate, verifiedOnly, sortBy, pageSize]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(1);
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    executeSearch(1, example);
  };

  const handleClear = () => {
    setQuery("");
    setResponse(null);
    setError(null);
  };

  const handleOpenDocument = async (docId: string) => {
    setFetchingDocId(docId);
    try {
      const doc = await getDocument(token, docId);
      setViewingDoc(doc);
    } catch (err: unknown) {
      alert("Unable to open source document: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setFetchingDocId(null);
    }
  };

  const totalPages = response ? Math.ceil(response.total_results / pageSize) : 0;

  const getSourceBadge = (type: SearchResultItem["result_type"]) => {
    switch (type) {
      case "observation":
        return <span className="kh-badge kh-badge-obs">Observation</span>;
      case "document":
        return <span className="kh-badge kh-badge-doc">Document</span>;
      case "medication":
        return <span className="kh-badge kh-badge-med">Medication</span>;
      case "appointment":
        return <span className="kh-badge kh-badge-appt">Appointment</span>;
      case "follow_up":
        return <span className="kh-badge kh-badge-task">Follow-Up</span>;
      default:
        return <span className="kh-badge">{type}</span>;
    }
  };

  return (
    <div className="knowledge-hub-container" id="medical-knowledge-hub">
      {/* Medical Safety Disclaimer Banner */}
      <div className="kh-safety-banner" role="note">
        <span className="kh-safety-icon">🛡️</span>
        <div>
          <strong>Medical Safety Notice:</strong> This unified search hub retrieves and organizes
          your stored health records and evidence. It does not provide clinical diagnoses, treatment
          recommendations, or medical advice.
        </div>
      </div>

      {/* Main Search Bar & Header */}
      <div className="kh-search-box-card">
        <div className="kh-header">
          <div>
            <h2 className="kh-title">Personal Health Knowledge Hub</h2>
            <p className="kh-subtitle">
              Natural-language search across your medical documents, lab observations, medications,
              and care events with full evidence provenance.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="kh-search-form" role="search">
          <div className="kh-input-wrapper">
            <span className="kh-search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              id="medical-search-input"
              className="kh-search-input"
              placeholder="Search reports, tests (e.g. Glucose, Lipid panel), medications, doctors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Medical records search query"
            />
            {query && (
              <button
                type="button"
                className="kh-clear-btn"
                onClick={handleClear}
                title="Clear query"
                aria-label="Clear query"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary kh-submit-btn"
              disabled={loading || !query.trim()}
              id="medical-search-submit"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </form>

        {/* Suggested Example Queries */}
        <div className="kh-examples">
          <span className="kh-examples-label">Suggested queries:</span>
          <div className="kh-chips-row">
            {EXAMPLE_QUERIES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="kh-chip"
                onClick={() => handleExampleClick(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="kh-filters-bar">
          <div className="kh-filter-group">
            <label htmlFor="kh-source-filter" className="kh-filter-label">
              Source:
            </label>
            <select
              id="kh-source-filter"
              className="kh-select"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as any)}
            >
              <option value="all">All Sources</option>
              <option value="observation">Clinical Observations</option>
              <option value="document">Medical Documents</option>
              <option value="medication">Medications</option>
              <option value="appointment">Appointments</option>
              <option value="follow_up">Follow-Up Tasks</option>
            </select>
          </div>

          <div className="kh-filter-group">
            <label htmlFor="kh-start-date" className="kh-filter-label">
              From:
            </label>
            <input
              type="date"
              id="kh-start-date"
              className="kh-date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="kh-filter-group">
            <label htmlFor="kh-end-date" className="kh-filter-label">
              To:
            </label>
            <input
              type="date"
              id="kh-end-date"
              className="kh-date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="kh-filter-group">
            <label htmlFor="kh-sort-by" className="kh-filter-label">
              Sort by:
            </label>
            <select
              id="kh-sort-by"
              className="kh-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
            </select>
          </div>

          <div className="kh-filter-group kh-toggle-group">
            <label className="kh-checkbox-label">
              <input
                type="checkbox"
                id="kh-verified-only-toggle"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
              />
              <span>Reviewed / Verified Only</span>
            </label>
          </div>

          {(sourceType !== "all" || startDate || endDate || !verifiedOnly || sortBy !== "relevance") && (
            <button
              type="button"
              className="btn btn-secondary btn-sm kh-reset-filters-btn"
              onClick={() => {
                setSourceType("all");
                setStartDate("");
                setEndDate("");
                setVerifiedOnly(true);
                setSortBy("relevance");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="alert alert-error kh-alert" role="alert">
          <strong>Search Error:</strong> {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="kh-loading-state" aria-live="polite">
          <div className="kh-spinner" />
          <p>Searching through your medical documents and health records…</p>
        </div>
      )}

      {/* Search Results Summary Header */}
      {!loading && response && (
        <div className="kh-summary-header">
          <div className="kh-summary-text">
            <span>
              Found <strong>{response.total_results}</strong> matching record
              {response.total_results === 1 ? "" : "s"} for "<em>{response.query}</em>"
            </span>
            {response.parsed_intent && (
              <span className="kh-intent-badge">
                🎯 Intent: {response.parsed_intent}
              </span>
            )}
          </div>
          <div className="kh-page-indicator">
            Page {response.page} of {Math.max(totalPages, 1)}
          </div>
        </div>
      )}

      {/* Results List */}
      {!loading && response && response.results.length > 0 && (
        <div className="kh-results-list" role="feed">
          {response.results.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`kh-result-card ${item.verification_status === "unverified" ? "kh-unverified-card" : ""}`}
                id={`result-${item.id}`}
              >
                <div className="kh-result-top-row">
                  <div className="kh-result-type-title">
                    {getSourceBadge(item.result_type)}
                    <h3 className="kh-result-title">{item.title}</h3>
                    {item.verification_status === "verified" && (
                      <span className="pill pill-ok kh-status-pill">Reviewed</span>
                    )}
                    {item.verification_status === "unverified" && (
                      <span className="pill pill-bad kh-status-pill">⚠️ Unverified Record</span>
                    )}
                  </div>

                  <div className="kh-result-date-badge">
                    {item.date && (
                      <span className="kh-date-meta" title={`Date provenance: ${item.date_provenance}`}>
                        📅 {item.date} ({item.date_provenance})
                      </span>
                    )}
                  </div>
                </div>

                {/* Stored Value & Reference Highlight (for Observations) */}
                {item.value && (
                  <div className="kh-observation-highlight">
                    <span className="kh-obs-value-tag">
                      <strong>Result:</strong> {item.value} {item.unit || ""}
                    </span>
                    {item.reference_range && (
                      <span className="kh-obs-ref-tag">
                        <strong>Reference:</strong> {item.reference_range}
                      </span>
                    )}
                    {item.flag && (
                      <span
                        className={`kh-flag-tag ${
                          item.flag === "HIGH" || item.flag === "ABNORMAL" ? "kh-flag-high" : "kh-flag-normal"
                        }`}
                      >
                        {item.flag}
                      </span>
                    )}
                  </div>
                )}

                {/* Snippet */}
                <p className="kh-snippet-text">{item.snippet}</p>

                {/* Provenance & Actions Bar */}
                <div className="kh-result-footer">
                  <div className="kh-provenance-info">
                    {item.source_document_title && (
                      <span className="kh-source-doc-link">
                        📄 <strong>Source Document:</strong> {item.source_document_title}
                        {item.page_number ? ` (Page ${item.page_number})` : ""}
                      </span>
                    )}
                  </div>

                  <div className="kh-action-btns">
                    {item.source_document_id && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenDocument(item.source_document_id!)}
                        disabled={fetchingDocId === item.source_document_id}
                      >
                        {fetchingDocId === item.source_document_id ? "Loading Doc…" : "📄 View Document"}
                      </button>
                    )}

                    {onNavigateTab && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (item.result_type === "observation") onNavigateTab("timeline");
                          else if (item.result_type === "document") onNavigateTab("documents");
                          else if (
                            item.result_type === "medication" ||
                            item.result_type === "appointment" ||
                            item.result_type === "follow_up"
                          ) {
                            onNavigateTab("care");
                          }
                        }}
                      >
                        Open in {item.result_type === "observation" ? "Timeline" : item.result_type === "document" ? "Documents" : "Care"}
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? "Hide Details" : "Details"}
                    </button>
                  </div>
                </div>

                {/* Expandable Supporting Metadata Details */}
                {isExpanded && (
                  <div className="kh-expanded-details" id={`details-${item.id}`}>
                    <h4>Supporting Record Provenance</h4>
                    <div className="kh-details-grid">
                      <div>
                        <strong>Record ID:</strong> <code>{item.record_id}</code>
                      </div>
                      <div>
                        <strong>Result Type:</strong> {item.result_type}
                      </div>
                      <div>
                        <strong>Date Provenance:</strong> {item.date_provenance}
                      </div>
                      <div>
                        <strong>Verification Status:</strong> {item.verification_status || "Not applicable"}
                      </div>
                      <div>
                        <strong>Relevance Score:</strong> {item.relevance_score}
                      </div>
                      {item.page_number && (
                        <div>
                          <strong>Page Number:</strong> {item.page_number}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && response && response.results.length === 0 && (
        <div className="kh-empty-state" role="status">
          <div className="kh-empty-icon">🔍</div>
          <h3>No matching records found</h3>
          <p>
            No records matched your search query in your HealthMate AI clinical data.
            Try searching for another test (e.g. Glucose, Hemoglobin), doctor name, or clearing date filters.
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && response && totalPages > 1 && (
        <div className="kh-pagination-row">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => executeSearch(page - 1)}
            disabled={page <= 1 || loading}
          >
            ← Previous
          </button>
          <span className="kh-page-label">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => executeSearch(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Next →
          </button>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <DocumentViewerModal
          document={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onVerified={() => {
            // refresh or update local state if needed
          }}
        />
      )}
    </div>
  );
}
