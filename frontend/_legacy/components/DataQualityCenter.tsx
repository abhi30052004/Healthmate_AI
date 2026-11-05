import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getDataQualitySummary,
  listDuplicateCandidates,
  getDuplicateComparison,
  scanDuplicates,
  confirmDuplicateCandidate,
  dismissDuplicateCandidate,
  resolveDuplicateCandidate,
  getDataQualityAuditHistory,
  ApiError,
  type DuplicateCandidateItem,
  type DuplicateComparisonView,
  type DataQualitySummary,
  type DataQualityAuditLogItem,
  type FamilyProfile,
} from "../api/client";

interface DataQualityCenterProps {
  token: string;
  activeProfile: FamilyProfile | null;
  profiles: FamilyProfile[];
}

export function DataQualityCenter({
  token,
  activeProfile,
  profiles,
}: DataQualityCenterProps) {
  // Summary & list states
  const [summary, setSummary] = useState<DataQualitySummary | null>(null);
  const [candidates, setCandidates] = useState<DuplicateCandidateItem[]>([]);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Loading & notification states
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals & views
  const [comparisonCandidateId, setComparisonCandidateId] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<DuplicateComparisonView | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  const [resolvingCandidate, setResolvingCandidate] = useState<DuplicateCandidateItem | null>(null);
  const [retainedRecordId, setRetainedRecordId] = useState<string>("");
  const [decisionNotes, setDecisionNotes] = useState<string>("");
  const [resolving, setResolving] = useState(false);

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<DataQualityAuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Load summary and candidate list
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const [sumRes, listRes] = await Promise.all([
        getDataQualitySummary(token, activeProfile?.id),
        listDuplicateCandidates(token, {
          profileId: activeProfile?.id,
          status: statusFilter === "all" ? undefined : statusFilter,
          recordType: typeFilter === "all" ? undefined : typeFilter,
          page,
          pageSize,
        }),
      ]);
      setSummary(sumRes);
      setCandidates(listRes.items);
      setTotalCandidates(listRes.total);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load Data Quality Center data.");
      }
    } finally {
      setLoading(false);
    }
  }, [token, activeProfile?.id, statusFilter, typeFilter, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Trigger manual duplicate scan
  const handleScan = async () => {
    if (!token) return;
    try {
      setScanning(true);
      setError(null);
      setSuccessMessage(null);
      const res = await scanDuplicates(token, activeProfile?.id);
      setSummary(res);
      setSuccessMessage(
        `Scan complete! Found ${res.pending_candidates} pending candidate(s) for review.`
      );
      setPage(1);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to complete duplicate scan.");
      }
    } finally {
      setScanning(false);
    }
  };

  // Open comparison view
  const handleOpenComparison = async (candidateId: string) => {
    setComparisonCandidateId(candidateId);
    setLoadingComparison(true);
    try {
      const data = await getDuplicateComparison(token, candidateId);
      setComparisonData(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load comparison view.");
      }
      setComparisonCandidateId(null);
    } finally {
      setLoadingComparison(false);
    }
  };

  const closeComparisonModal = () => {
    setComparisonCandidateId(null);
    setComparisonData(null);
  };

  // Confirm duplicate
  const handleConfirm = async (candidateId: string) => {
    if (!token) return;
    try {
      setError(null);
      await confirmDuplicateCandidate(token, candidateId);
      setSuccessMessage("Candidate marked as Confirmed Duplicate. You can now safely resolve it.");
      if (comparisonData && comparisonData.candidate_id === candidateId) {
        setComparisonData({ ...comparisonData, status: "confirmed_duplicate" });
      }
      await loadData();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to confirm duplicate.");
      }
    }
  };

  // Dismiss candidate (not a duplicate)
  const handleDismiss = async (candidateId: string) => {
    if (!token) return;
    try {
      setError(null);
      await dismissDuplicateCandidate(token, candidateId, "User verified non-duplicate");
      setSuccessMessage("Candidate dismissed as Not a Duplicate.");
      closeComparisonModal();
      await loadData();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to dismiss candidate.");
      }
    }
  };

  // Open resolution modal
  const handleOpenResolution = (candidate: DuplicateCandidateItem) => {
    setResolvingCandidate(candidate);
    // Default to retaining primary record
    setRetainedRecordId(candidate.primary_record_id);
    setDecisionNotes("");
  };

  // Submit resolution
  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingCandidate || !retainedRecordId) return;

    try {
      setResolving(true);
      setError(null);
      await resolveDuplicateCandidate(token, resolvingCandidate.id, {
        retained_record_id: retainedRecordId,
        decision_notes: decisionNotes.trim() || undefined,
      });
      setSuccessMessage("Duplicate safely resolved! The non-retained record has been archived.");
      setResolvingCandidate(null);
      closeComparisonModal();
      await loadData();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to resolve duplicate.");
      }
    } finally {
      setResolving(false);
    }
  };

  // View audit trail
  const handleOpenAudit = async () => {
    setShowAuditModal(true);
    setLoadingAudit(true);
    try {
      const logs = await getDataQualityAuditHistory(token, 50);
      setAuditLogs(logs);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load audit trail.");
      }
    } finally {
      setLoadingAudit(false);
    }
  };

  // Filter candidates by search query locally
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter((c) => {
      const pTitle = c.primary_summary?.title?.toLowerCase() || "";
      const sTitle = c.secondary_summary?.title?.toLowerCase() || "";
      const reasons = c.match_reasons.map((r) => r.description.toLowerCase()).join(" ");
      return pTitle.includes(q) || sTitle.includes(q) || reasons.includes(q);
    });
  }, [candidates, searchQuery]);

  // Profile lookup helper
  const getProfileName = (profileId?: string | null) => {
    if (!profileId) return "Primary Account";
    const found = profiles.find((p) => p.id === profileId);
    return found ? `${found.name} (${found.relationship})` : "Family Profile";
  };

  // Format confidence badge
  const renderConfidenceBadge = (confidence: number) => {
    const pct = Math.round(confidence * 100);
    if (confidence >= 0.85) {
      return (
        <span
          className="badge-confidence high"
          style={{
            backgroundColor: "#dcfce7",
            color: "#15803d",
            padding: "3px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          ● {pct}% High Match
        </span>
      );
    }
    if (confidence >= 0.7) {
      return (
        <span
          className="badge-confidence med"
          style={{
            backgroundColor: "#fef3c7",
            color: "#b45309",
            padding: "3px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          ▲ {pct}% Medium Match
        </span>
      );
    }
    return (
      <span
        className="badge-confidence low"
        style={{
          backgroundColor: "#f1f5f9",
          color: "#475569",
          padding: "3px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        ○ {pct}% Review Required
      </span>
    );
  };

  // Format status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="pill wait">Pending Review</span>;
      case "confirmed_duplicate":
        return (
          <span
            className="pill bad"
            style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}
          >
            Confirmed Duplicate
          </span>
        );
      case "resolved":
        return <span className="pill ok">Resolved & Archived</span>;
      case "not_duplicate":
        return (
          <span
            className="pill"
            style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
          >
            Dismissed
          </span>
        );
      default:
        return <span className="pill">{status}</span>;
    }
  };

  return (
    <div className="data-quality-center" style={{ width: "100%" }}>
      {/* Top Banner / Actions */}
      <div
        className="section-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "1.5rem", fontWeight: 700 }}>
            🛡️ Data Quality & Duplicate Detection Center
          </h2>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Identify potentially duplicated medical documents and observations, inspect differences, and resolve them safely without data loss.
            {activeProfile && (
              <span style={{ fontWeight: 600, marginLeft: "6px", color: "var(--primary)" }}>
                Viewing profile: {activeProfile.name}
              </span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            id="btn-audit-history"
            className="btn btn-secondary btn-sm"
            onClick={handleOpenAudit}
          >
            📜 Audit Trail
          </button>
          <button
            type="button"
            id="btn-run-duplicate-scan"
            className="btn btn-primary btn-sm"
            onClick={handleScan}
            disabled={scanning || loading}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            {scanning ? "🔄 Scanning Records…" : "🔍 Run Duplicate Scan"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="alert alert-error"
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #f87171",
            color: "#991b1b",
            padding: "10px 14px",
            borderRadius: "6px",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="alert alert-success"
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            color: "#166534",
            padding: "10px 14px",
            borderRadius: "6px",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>✅ {successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#166534" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div
        className="kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="card stat-card" style={{ padding: "16px" }}>
          <div className="stat-header">
            <span className="stat-title">Pending Review</span>
            <span className="pill wait" id="kpi-pending-count">
              {summary?.pending_candidates ?? 0}
            </span>
          </div>
          <p className="stat-desc">Pairs awaiting clinical validation</p>
        </div>

        <div className="card stat-card" style={{ padding: "16px" }}>
          <div className="stat-header">
            <span className="stat-title">High-Confidence</span>
            <span
              className="pill"
              id="kpi-high-confidence-count"
              style={{ backgroundColor: "#dcfce7", color: "#166534" }}
            >
              {summary?.high_confidence_candidates ?? 0}
            </span>
          </div>
          <p className="stat-desc">Exact hash & identical observations</p>
        </div>

        <div className="card stat-card" style={{ padding: "16px" }}>
          <div className="stat-header">
            <span className="stat-title">Confirmed Duplicates</span>
            <span
              className="pill bad"
              id="kpi-confirmed-count"
              style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
            >
              {summary?.confirmed_duplicates ?? 0}
            </span>
          </div>
          <p className="stat-desc">Marked for safe resolution</p>
        </div>

        <div className="card stat-card" style={{ padding: "16px" }}>
          <div className="stat-header">
            <span className="stat-title">Safely Resolved</span>
            <span className="pill ok" id="kpi-resolved-count">
              {summary?.resolved_duplicates ?? 0}
            </span>
          </div>
          <p className="stat-desc">Archived with preserved provenance</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: "16px",
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          {/* Status filter tabs */}
          <div
            className="filter-pills"
            role="group"
            aria-label="Filter candidates by status"
            style={{ display: "flex", gap: "4px" }}
          >
            {[
              { id: "all", label: "All Candidates" },
              { id: "pending", label: "Pending" },
              { id: "confirmed_duplicate", label: "Confirmed" },
              { id: "resolved", label: "Resolved" },
              { id: "not_duplicate", label: "Dismissed" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                id={`filter-status-${f.id}`}
                className={`btn btn-sm ${statusFilter === f.id ? "btn-primary" : "btn-secondary"}`}
                onClick={() => {
                  setStatusFilter(f.id);
                  setPage(1);
                }}
                style={{ fontSize: "12px", padding: "4px 10px" }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Record type filter */}
          <select
            id="filter-record-type"
            className="form-input"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: "4px 8px", fontSize: "13px", width: "auto", margin: 0 }}
            aria-label="Filter by record type"
          >
            <option value="all">All Types (Documents & Observations)</option>
            <option value="document">📄 Medical Documents</option>
            <option value="observation">🧪 Health Observations</option>
          </select>
        </div>

        {/* Search Input */}
        <div style={{ minWidth: "220px", flex: "1 1 220px", maxWidth: "340px" }}>
          <input
            type="text"
            id="input-candidate-search"
            className="form-input"
            placeholder="Search candidates or reasons…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", margin: 0, padding: "6px 12px", fontSize: "13px" }}
            aria-label="Search candidates"
          />
        </div>
      </div>

      {/* Candidate List Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          <p>⏳ Loading duplicate candidates…</p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "10px" }}>✨</div>
          <h3 style={{ margin: "0 0 6px 0", color: "var(--text)" }}>No Duplicate Candidates Found</h3>
          <p style={{ margin: "0 0 16px 0", maxWidth: "500px", marginInline: "auto" }}>
            {statusFilter !== "all" || typeFilter !== "all" || searchQuery
              ? "No records matched your current filter criteria. Try resetting your filters."
              : "All documents and health observations appear clean and unique for this profile. Run a scan anytime new records are uploaded."}
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? "Scanning…" : "Run New Scan"}
          </button>
        </div>
      ) : (
        <div
          className="candidates-list"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {filteredCandidates.map((c) => {
            const pSum = c.primary_summary;
            const sSum = c.secondary_summary;
            const isDoc = c.record_type === "document";

            return (
              <div
                key={c.id}
                id={`candidate-card-${c.id}`}
                className="card candidate-card"
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  borderLeft: `4px solid ${
                    c.status === "confirmed_duplicate"
                      ? "#ef4444"
                      : c.confidence >= 0.85
                      ? "#10b981"
                      : "#f59e0b"
                  }`,
                }}
              >
                {/* Header row: type, badges, and status */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {isDoc ? "📄 Document Duplicate" : "🧪 Observation Duplicate"}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>•</span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {getProfileName(c.profile_id)}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {renderConfidenceBadge(c.confidence)}
                    {renderStatusBadge(c.status)}
                  </div>
                </div>

                {/* Candidate Records Comparison snippet */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr",
                    gap: "12px",
                    alignItems: "center",
                    backgroundColor: "rgba(0, 0, 0, 0.02)",
                    padding: "12px 16px",
                    borderRadius: "6px",
                  }}
                >
                  {/* Record A */}
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      Record A {c.retained_record_id === c.primary_record_id && "⭐ (Retained)"}
                    </span>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        marginTop: "2px",
                        color: "var(--text)",
                      }}
                    >
                      {pSum?.title || c.primary_record_id.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      Date: {pSum?.clinical_date || "Unknown"}
                      {isDoc && pSum?.details?.file_size && (
                        <span> • {(pSum.details.file_size / 1024).toFixed(1)} KB</span>
                      )}
                      {!isDoc && pSum?.details?.value && (
                        <span>
                          {" "}
                          • {pSum.details.value} {pSum.details.unit || ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* VS Indicator */}
                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: "rgba(0,0,0,0.05)",
                    }}
                  >
                    VS
                  </div>

                  {/* Record B */}
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      Record B {c.retained_record_id === c.secondary_record_id && "⭐ (Retained)"}
                    </span>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        marginTop: "2px",
                        color: "var(--text)",
                      }}
                    >
                      {sSum?.title || c.secondary_record_id.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      Date: {sSum?.clinical_date || "Unknown"}
                      {isDoc && sSum?.details?.file_size && (
                        <span> • {(sSum.details.file_size / 1024).toFixed(1)} KB</span>
                      )}
                      {!isDoc && sSum?.details?.value && (
                        <span>
                          {" "}
                          • {sSum.details.value} {sSum.details.unit || ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Reasons */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {c.match_reasons.map((mr, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "4px",
                        padding: "3px 8px",
                        fontSize: "12px",
                        color: "#334155",
                      }}
                      title={mr.code}
                    >
                      💡 {mr.description}
                    </span>
                  ))}
                </div>

                {/* Footer Action buttons */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "4px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    id={`btn-compare-${c.id}`}
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenComparison(c.id)}
                  >
                    🔍 Compare Side-by-Side
                  </button>

                  {c.status !== "resolved" && (
                    <>
                      {c.status !== "not_duplicate" && (
                        <button
                          type="button"
                          id={`btn-dismiss-${c.id}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDismiss(c.id)}
                        >
                          ✕ Not a Duplicate
                        </button>
                      )}

                      {c.status !== "confirmed_duplicate" && (
                        <button
                          type="button"
                          id={`btn-confirm-${c.id}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleConfirm(c.id)}
                          style={{ borderColor: "#f87171", color: "#b91c1c" }}
                        >
                          ⚠️ Confirm Duplicate
                        </button>
                      )}

                      <button
                        type="button"
                        id={`btn-resolve-${c.id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenResolution(c)}
                      >
                        ✅ Resolve Duplicate
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalCandidates > pageSize && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            marginTop: "1.5rem",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </button>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Page {page} of {Math.ceil(totalCandidates / pageSize)}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page >= Math.ceil(totalCandidates / pageSize)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {comparisonCandidateId && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="comparison-modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            className="modal-content card"
            style={{
              width: "100%",
              maxWidth: "850px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 id="comparison-modal-title" style={{ margin: 0, fontSize: "1.25rem" }}>
                Side-by-Side Record Comparison
              </h3>
              <button
                type="button"
                id="btn-close-comparison"
                className="btn btn-secondary btn-sm"
                onClick={closeComparisonModal}
              >
                ✕ Close
              </button>
            </div>

            {loadingComparison || !comparisonData ? (
              <p style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                Loading record comparison…
              </p>
            ) : (
              <div>
                {/* Confidence & Reasons summary */}
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    marginBottom: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "13px" }}>Detection Confidence:</span>{" "}
                    {renderConfidenceBadge(comparisonData.confidence)}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "13px" }}>Status:</span>{" "}
                    {renderStatusBadge(comparisonData.status)}
                  </div>
                </div>

                {/* Two Column Comparison */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    marginBottom: "20px",
                  }}
                >
                  {/* Column A */}
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      padding: "14px",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 10px 0",
                        color: "var(--primary)",
                        fontSize: "14px",
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: "6px",
                      }}
                    >
                      Record A: {comparisonData.primary_record.title}
                    </h4>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        fontSize: "13px",
                        lineHeight: 1.6,
                      }}
                    >
                      <li>
                        <strong>Record ID:</strong>{" "}
                        <code style={{ fontSize: "11px" }}>{comparisonData.primary_record.id}</code>
                      </li>
                      <li>
                        <strong>Clinical Date:</strong>{" "}
                        {comparisonData.primary_record.clinical_date || "Not specified"}
                      </li>
                      {Object.entries(comparisonData.primary_record.details).map(([k, v]) => (
                        <li key={k}>
                          <strong>{k.replace(/_/g, " ")}:</strong>{" "}
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Column B */}
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      padding: "14px",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 10px 0",
                        color: "var(--primary)",
                        fontSize: "14px",
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: "6px",
                      }}
                    >
                      Record B: {comparisonData.secondary_record.title}
                    </h4>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        fontSize: "13px",
                        lineHeight: 1.6,
                      }}
                    >
                      <li>
                        <strong>Record ID:</strong>{" "}
                        <code style={{ fontSize: "11px" }}>{comparisonData.secondary_record.id}</code>
                      </li>
                      <li>
                        <strong>Clinical Date:</strong>{" "}
                        {comparisonData.secondary_record.clinical_date || "Not specified"}
                      </li>
                      {Object.entries(comparisonData.secondary_record.details).map(([k, v]) => (
                        <li key={k}>
                          <strong>{k.replace(/_/g, " ")}:</strong>{" "}
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Similarities & Differences */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div
                    style={{
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "6px",
                      padding: "12px",
                    }}
                  >
                    <strong style={{ color: "#166534", fontSize: "13px" }}>
                      ✅ Identified Similarities:
                    </strong>
                    <ul style={{ margin: "6px 0 0 0", paddingLeft: "18px", fontSize: "12px", color: "#166534" }}>
                      {comparisonData.similarities.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "6px",
                      padding: "12px",
                    }}
                  >
                    <strong style={{ color: "#92400e", fontSize: "13px" }}>
                      ℹ️ Differences & Discrepancies:
                    </strong>
                    <ul style={{ margin: "6px 0 0 0", paddingLeft: "18px", fontSize: "12px", color: "#92400e" }}>
                      {comparisonData.differences.map((d, idx) => (
                        <li key={idx}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginTop: "20px",
                    borderTop: "1px solid var(--border)",
                    paddingTop: "14px",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDismiss(comparisonData.candidate_id)}
                  >
                    ✕ Dismiss (Not Duplicate)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleConfirm(comparisonData.candidate_id)}
                    style={{ borderColor: "#f87171", color: "#b91c1c" }}
                  >
                    ⚠️ Confirm Duplicate
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const matched = candidates.find((c) => c.id === comparisonData.candidate_id);
                      if (matched) {
                        handleOpenResolution(matched);
                      }
                    }}
                  >
                    ✅ Proceed to Resolution
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resolution Confirmation Modal */}
      {resolvingCandidate && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resolve-modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "1rem",
          }}
        >
          <div
            className="modal-content card"
            style={{
              width: "100%",
              maxWidth: "600px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 id="resolve-modal-title" style={{ margin: "0 0 8px 0", fontSize: "1.25rem" }}>
              Resolve Duplicate Record Safely
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Select which record should be kept as the active canonical record. The non-retained record will be safely archived with links preserved.
            </p>

            <form onSubmit={handleResolve}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "8px" }}
                >
                  Choose Record to Retain (Active):
                </label>

                {/* Option 1: Retain Primary */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    marginBottom: "8px",
                    cursor: "pointer",
                    backgroundColor:
                      retainedRecordId === resolvingCandidate.primary_record_id
                        ? "#f0fdf4"
                        : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="retained_record"
                    id="radio-retain-primary"
                    checked={retainedRecordId === resolvingCandidate.primary_record_id}
                    onChange={() => setRetainedRecordId(resolvingCandidate.primary_record_id)}
                    style={{ marginTop: "4px" }}
                  />
                  <div>
                    <strong style={{ fontSize: "13px" }}>
                      Retain Record A:{" "}
                      {resolvingCandidate.primary_summary?.title ||
                        resolvingCandidate.primary_record_id.slice(0, 8)}
                    </strong>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Date: {resolvingCandidate.primary_summary?.clinical_date || "Unknown"} • Record
                      B will be archived.
                    </div>
                  </div>
                </label>

                {/* Option 2: Retain Secondary */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    backgroundColor:
                      retainedRecordId === resolvingCandidate.secondary_record_id
                        ? "#f0fdf4"
                        : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="retained_record"
                    id="radio-retain-secondary"
                    checked={retainedRecordId === resolvingCandidate.secondary_record_id}
                    onChange={() => setRetainedRecordId(resolvingCandidate.secondary_record_id)}
                    style={{ marginTop: "4px" }}
                  />
                  <div>
                    <strong style={{ fontSize: "13px" }}>
                      Retain Record B:{" "}
                      {resolvingCandidate.secondary_summary?.title ||
                        resolvingCandidate.secondary_record_id.slice(0, 8)}
                    </strong>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Date: {resolvingCandidate.secondary_summary?.clinical_date || "Unknown"} • Record
                      A will be archived.
                    </div>
                  </div>
                </label>
              </div>

              {/* Decision Notes */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="input-decision-notes"
                  style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}
                >
                  Resolution Notes (Optional):
                </label>
                <textarea
                  id="input-decision-notes"
                  className="form-input"
                  rows={2}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="e.g., Retained later scan with cleaner OCR extraction"
                  style={{ width: "100%", fontSize: "13px" }}
                />
              </div>

              {/* Safety notice banner */}
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  color: "#1e40af",
                  marginBottom: "20px",
                }}
              >
                🛡️ <strong>Safety Guarantee:</strong> HealthMate AI never deletes your original files
                or observation records. The non-retained record will be archived from regular views
                with a pointer to the retained record.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  id="btn-cancel-resolution"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setResolvingCandidate(null)}
                  disabled={resolving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-resolution"
                  className="btn btn-primary btn-sm"
                  disabled={resolving || !retainedRecordId}
                >
                  {resolving ? "Resolving…" : "Confirm & Archive Duplicate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {showAuditModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            className="modal-content card"
            style={{
              width: "100%",
              maxWidth: "750px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 id="audit-modal-title" style={{ margin: 0, fontSize: "1.25rem" }}>
                📜 Data Quality Audit Trail
              </h3>
              <button
                type="button"
                id="btn-close-audit"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAuditModal(false)}
              >
                ✕ Close
              </button>
            </div>

            {loadingAudit ? (
              <p style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                Loading audit trail…
              </p>
            ) : auditLogs.length === 0 ? (
              <p style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                No audit events recorded yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      padding: "10px 14px",
                      fontSize: "13px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <strong style={{ color: "var(--primary)" }}>{log.action}</strong>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                      Record Type: {log.record_type}
                      {log.retained_record_id && (
                        <span> • Retained: <code>{log.retained_record_id.slice(0, 8)}</code></span>
                      )}
                      {log.archived_record_id && (
                        <span> • Archived: <code>{log.archived_record_id.slice(0, 8)}</code></span>
                      )}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          fontFamily: "monospace",
                        }}
                      >
                        {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
