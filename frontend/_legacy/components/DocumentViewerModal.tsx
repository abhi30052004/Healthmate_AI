import React, { useEffect, useState } from "react";
import {
  downloadDocument,
  getDocumentText,
  getObservations,
  reprocessDocument,
  updateObservation,
  verifyDocument,
  type DocumentItem,
  type DocumentText,
  type ObservationItem,
  type ObservationUpdatePayload,
} from "../api/client";
import { useAuth } from "../context/AuthContext";

interface DocumentViewerModalProps {
  document: DocumentItem;
  onClose: () => void;
  onVerified: (updatedDocId: string) => void;
  onReprocessed?: (updatedDoc: DocumentItem) => void;
}

export function DocumentViewerModal({
  document,
  onClose,
  onVerified,
  onReprocessed,
}: DocumentViewerModalProps) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"observations" | "raw_text">("observations");
  const [docText, setDocText] = useState<DocumentText | null>(null);
  const [observations, setObservations] = useState<ObservationItem[]>(document.observations ?? []);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(document.is_verified);

  // Correction state
  const [editingObs, setEditingObs] = useState<ObservationItem | null>(null);
  const [correctionValue, setCorrectionValue] = useState("");
  const [correctionUnit, setCorrectionUnit] = useState("");
  const [correctionRange, setCorrectionRange] = useState("");
  const [correctionFlag, setCorrectionFlag] = useState<string>("");
  const [savingCorrection, setSavingCorrection] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [textData, obsData] = await Promise.all([
          getDocumentText(token, document.id),
          getObservations(token, document.id).catch(() => []),
        ]);
        if (isMounted) {
          setDocText(textData);
          setObservations(obsData);
          setIsVerified(textData.is_verified);
          if (obsData.length === 0 && textData.extracted_text) {
            setActiveTab("raw_text");
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load document content."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [document.id, token]);

  const handleVerify = async () => {
    if (!token) return;
    try {
      setVerifying(true);
      setError(null);
      await verifyDocument(token, document.id);
      setIsVerified(true);
      setObservations((prev) => prev.map((o) => ({ ...o, is_reviewed: true })));
      setSuccessMessage("Extracted clinical data and observations confirmed.");
      onVerified(document.id);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Verification request failed."
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleReprocess = async () => {
    if (!token) return;
    try {
      setReprocessing(true);
      setError(null);
      const reprocessed = await reprocessDocument(token, document.id);
      setIsVerified(false);
      setObservations(reprocessed.observations ?? []);
      setDocText({
        document_id: reprocessed.id,
        filename: reprocessed.filename,
        processing_status: reprocessed.processing_status,
        page_count: reprocessed.page_count,
        ocr_applied: reprocessed.ocr_applied,
        extracted_text: reprocessed.extracted_text ?? "",
        is_verified: false,
      });
      setSuccessMessage("Document successfully reprocessed with OCR extraction.");
      if (onReprocessed) {
        onReprocessed(reprocessed);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to reprocess document."
      );
    } finally {
      setReprocessing(false);
    }
  };

  const handleDownload = async () => {
    if (!token) return;
    try {
      setDownloading(true);
      setError(null);
      await downloadDocument(token, document.id, document.filename);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to download document file."
      );
    } finally {
      setDownloading(false);
    }
  };

  const openCorrectionModal = (obs: ObservationItem) => {
    setEditingObs(obs);
    setCorrectionValue(obs.value);
    setCorrectionUnit(obs.unit ?? "");
    setCorrectionRange(obs.reference_range ?? "");
    setCorrectionFlag(obs.flag ?? "");
  };

  const saveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingObs) return;

    try {
      setSavingCorrection(true);
      setError(null);
      const payload: ObservationUpdatePayload = {
        value: correctionValue.trim(),
        unit: correctionUnit.trim() || undefined,
        reference_range: correctionRange.trim() || undefined,
        flag: correctionFlag || undefined,
        is_reviewed: true,
      };

      const updated = await updateObservation(token, document.id, editingObs.id, payload);
      setObservations((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o))
      );
      setEditingObs(null);
      setSuccessMessage(`Observation "${updated.test_name}" successfully corrected.`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to save observation correction."
      );
    } finally {
      setSavingCorrection(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

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

  const hasLowConfidence = observations.some((o) => o.is_low_confidence);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: "860px" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{document.filename}</h3>
            <span className="modal-sub">
              {formatSize(document.file_size)} • {document.mime_type} • {document.page_count ?? 1} page(s)
            </span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error" style={{ margin: "14px 24px 0" }}>
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="alert alert-success" style={{ margin: "14px 24px 0" }}>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Top Status and Engine Bar */}
        <div style={{ padding: "16px 24px 0" }}>
          <div className="metadata-bar">
            <div className="meta-pill-group">
              <span className="detail-label">Status:</span>
              <span className={`pill ${document.processing_status === "extracted" ? "ok" : document.processing_status === "ocr_required" ? "wait" : "bad"}`}>
                {document.processing_status.replace("_", " ").toUpperCase()}
              </span>
            </div>

            <div className="meta-pill-group">
              <span className="detail-label">Extraction Engine:</span>
              <span className={`pill ${docText?.ocr_applied || document.ocr_applied ? "wait" : "ok"}`}>
                {docText?.ocr_applied || document.ocr_applied ? "OCR Engine" : "Native Text"}
              </span>
            </div>

            <div className="meta-pill-group">
              <span className="detail-label">Verification:</span>
              <span className={`pill ${isVerified ? "ok" : "wait"}`}>
                {isVerified ? "Verified by User" : "Unverified"}
              </span>
            </div>
          </div>

          {/* Clinical Header Metadata (Patient, Lab, Date) */}
          {(document.patient_name || document.lab_name || document.document_date) && (
            <div className="report-meta-box">
              {document.patient_name && (
                <div className="report-meta-item">
                  <span className="meta-label">Patient Name</span>
                  <span className="meta-val">{document.patient_name}</span>
                </div>
              )}
              {document.lab_name && (
                <div className="report-meta-item">
                  <span className="meta-label">Healthcare Provider / Lab</span>
                  <span className="meta-val">{document.lab_name}</span>
                </div>
              )}
              {document.document_date && (
                <div className="report-meta-item">
                  <span className="meta-label">Report Date</span>
                  <span className="meta-val">{document.document_date}</span>
                </div>
              )}
            </div>
          )}

          {hasLowConfidence && (
            <div className="ocr-notice-card" style={{ marginBottom: "12px" }}>
              <div className="ocr-icon">⚠️</div>
              <div>
                <strong>Low-Confidence Readings Detected</strong>
                <p>
                  Some extracted values or units may require manual human verification.
                  Please review the observations below and use the "Correct" action if needed.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === "observations" ? "modal-tab-active" : ""}`}
            onClick={() => setActiveTab("observations")}
            id="tab-observations-btn"
          >
            Structured Observations ({observations.length})
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === "raw_text" ? "modal-tab-active" : ""}`}
            onClick={() => setActiveTab("raw_text")}
            id="tab-rawtext-btn"
          >
            Verbatim Report Text
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ minHeight: "280px" }}>
          {loading ? (
            <div className="text-loading-state">
              <span className="spinner" />
              <span>Analyzing report and extracting clinical values…</span>
            </div>
          ) : activeTab === "observations" ? (
            <div>
              {document.processing_status === "failed" ? (
                <div className="alert alert-error">
                  <span>Extraction failed: {document.error_message || "Document unreadable"}</span>
                </div>
              ) : observations.length === 0 ? (
                <div className="empty-state-card" style={{ padding: "32px 16px" }}>
                  <div className="empty-icon">🩺</div>
                  <h4>No Structured Observations Found</h4>
                  <p>
                    No tabular laboratory analytes or observations were detected in this document.
                    Check the "Verbatim Report Text" tab to view extracted text.
                  </p>
                </div>
              ) : (
                <div className="observations-table-container">
                  <table className="obs-table" id="observations-table">
                    <thead>
                      <tr>
                        <th>Test / Analyte</th>
                        <th>Result</th>
                        <th>Unit</th>
                        <th>Reference Range</th>
                        <th>Flag</th>
                        <th>Source Provenance</th>
                        <th>Review Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {observations.map((obs) => (
                        <tr key={obs.id} id={`obs-row-${obs.id}`}>
                          <td className="obs-test-name">{obs.test_name}</td>
                          <td className="obs-value">{obs.value}</td>
                          <td>{obs.unit ?? "—"}</td>
                          <td>{obs.reference_range ?? "—"}</td>
                          <td>{getFlagBadge(obs.flag)}</td>
                          <td>
                            <div className="source-provenance-box">
                              <span className="source-page-tag">Page {obs.source_page}</span>
                              <span className="source-provenance-text" title={obs.source_text}>
                                "{obs.source_text}"
                              </span>
                            </div>
                          </td>
                          <td>
                            {obs.is_reviewed ? (
                              <span className="reviewed-badge">✓ Reviewed</span>
                            ) : obs.is_low_confidence ? (
                              <span className="low-conf-badge">⚠️ Low Conf.</span>
                            ) : (
                              <span className="auto-badge">Auto-extracted</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => openCorrectionModal(obs)}
                              id={`edit-obs-${obs.id}`}
                              style={{ padding: "3px 8px", fontSize: "11px" }}
                            >
                              Correct
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-viewer-container">
              {docText?.extracted_text ? (
                <pre className="extracted-text-box" id="extracted-raw-text">
                  {docText.extracted_text}
                </pre>
              ) : (
                <p className="no-text-message">No text available.</p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="verification-notice">
            <small>
              <strong>Clinical Provenance:</strong> Values and reference ranges are extracted strictly
              from the document without synthetic hallucination. Confirming validates user review.
            </small>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReprocess}
              disabled={reprocessing}
              id="reprocess-doc-btn"
              title="Re-run text extraction and structured parsing"
            >
              {reprocessing ? "Reprocessing…" : "Retry / Reprocess OCR"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownload}
              disabled={downloading}
              id="modal-download-btn"
            >
              {downloading ? "Downloading…" : "Download"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              id="modal-close-btn"
            >
              Close
            </button>

            {document.processing_status === "extracted" && !isVerified && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleVerify}
                disabled={verifying}
                id="confirm-verify-btn"
              >
                {verifying ? "Confirming…" : "Confirm & Verify Medical Records"}
              </button>
            )}
          </div>
        </div>

        {/* Observation Correction Modal / Overlay */}
        {editingObs && (
          <div className="correction-overlay" onClick={() => setEditingObs(null)}>
            <div className="correction-card" onClick={(e) => e.stopPropagation()}>
              <h4>Correct Extracted Value: {editingObs.test_name}</h4>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "-8px 0 16px" }}>
                Supporting text: <em>"{editingObs.source_text}"</em> (Page {editingObs.source_page})
              </p>

              <form onSubmit={saveCorrection} id="correction-form">
                <div className="correction-field">
                  <label htmlFor="corr-value">Measured Value / Finding</label>
                  <input
                    id="corr-value"
                    type="text"
                    value={correctionValue}
                    onChange={(e) => setCorrectionValue(e.target.value)}
                    required
                  />
                </div>

                <div className="correction-field">
                  <label htmlFor="corr-unit">Measurement Unit</label>
                  <input
                    id="corr-unit"
                    type="text"
                    value={correctionUnit}
                    onChange={(e) => setCorrectionUnit(e.target.value)}
                    placeholder="e.g. g/dL, mg/dL, mmol/L"
                  />
                </div>

                <div className="correction-field">
                  <label htmlFor="corr-range">Reference Range</label>
                  <input
                    id="corr-range"
                    type="text"
                    value={correctionRange}
                    onChange={(e) => setCorrectionRange(e.target.value)}
                    placeholder="e.g. 13.5-17.5, <200"
                  />
                </div>

                <div className="correction-field">
                  <label htmlFor="corr-flag">Clinical Flag</label>
                  <select
                    id="corr-flag"
                    value={correctionFlag}
                    onChange={(e) => setCorrectionFlag(e.target.value)}
                  >
                    <option value="">Auto-calculate / None</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="LOW">LOW</option>
                    <option value="ABNORMAL">ABNORMAL</option>
                  </select>
                </div>

                <div className="correction-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingObs(null)}
                    disabled={savingCorrection}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingCorrection}
                    id="save-correction-btn"
                  >
                    {savingCorrection ? "Saving…" : "Save Correction"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
