import React, { useState } from "react";
import { deleteDocument, downloadDocument, type DocumentItem } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { DocumentViewerModal } from "./DocumentViewerModal";

interface DocumentListProps {
  documents: DocumentItem[];
  loading: boolean;
  onRefresh: () => void;
}

export function DocumentList({
  documents,
  loading,
  onRefresh,
}: DocumentListProps) {
  const { token, handleSessionExpired } = useAuth();
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (doc: DocumentItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${doc.filename}"? This will remove the document and all associated extracted data.`
    );
    if (!confirmed) return;

    if (!token) {
      handleSessionExpired("Authentication session expired. Please sign in again.");
      return;
    }

    try {
      setDeletingId(doc.id);
      setError(null);
      await deleteDocument(token, doc.id);
      onRefresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to delete document."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    if (!token) {
      handleSessionExpired("Authentication session expired. Please sign in again.");
      return;
    }

    try {
      setDownloadingId(doc.id);
      setError(null);
      await downloadDocument(token, doc.id, doc.filename);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to download document file."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (doc: DocumentItem) => {
    if (doc.is_verified) {
      return <span className="pill ok">Verified</span>;
    }
    switch (doc.processing_status) {
      case "completed":
      case "extracted":
        return <span className="pill ok">Extracted</span>;
      case "ocr_required":
        return <span className="pill wait">OCR Required</span>;
      case "processing":
        return <span className="pill wait">Processing…</span>;
      case "queued":
        return <span className="pill wait">Queued</span>;
      case "uploaded":
        return <span className="pill wait">Uploaded</span>;
      case "failed":
        return <span className="pill bad">Failed</span>;
      default:
        return <span className="pill wait">{doc.processing_status}</span>;
    }
  };

  return (
    <div className="document-list-container">
      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: "16px" }}>
          <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="list-loading-state">
          <span className="spinner" />
          <span>Loading clinical documents…</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">📁</div>
          <h4>No Documents Uploaded</h4>
          <p>
            Upload your synthetic medical reports above (e.g. CBC, Lipid panel, Fasting glucose)
            to extract and review clinical values.
          </p>
        </div>
      ) : (
        <div className="documents-grid">
          {documents.map((doc) => (
            <div key={doc.id} className="document-card" id={`doc-card-${doc.id}`}>
              <div className="doc-card-header">
                <div className="doc-file-info">
                  <div className="file-type-icon">
                    {doc.mime_type.includes("pdf") ? "PDF" : "IMG"}
                  </div>
                  <div>
                    <h4 className="doc-filename" title={doc.filename}>
                      {doc.filename}
                    </h4>
                    <span className="doc-meta-sub">
                      {formatSize(doc.file_size)} • {formatDate(doc.created_at)}
                      {doc.ocr_applied && " • OCR"}
                    </span>
                    {doc.patient_name && (
                      <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                        Patient: <strong>{doc.patient_name}</strong>
                        {doc.document_date && ` • ${doc.document_date}`}
                      </div>
                    )}
                    {doc.observations && doc.observations.length > 0 && (
                      <div style={{ fontSize: "11px", color: "#0d9488", fontWeight: 600, marginTop: "2px" }}>
                        {doc.observations.length} clinical observation(s) extracted
                      </div>
                    )}
                  </div>
                </div>
                <div className="doc-status-badge">{getStatusBadge(doc)}</div>
              </div>

              {doc.processing_status === "ocr_required" && (
                <p className="doc-card-notice">
                  Scanned document or image. Optical Character Recognition pending.
                </p>
              )}

              {doc.processing_status === "failed" && doc.error_message && (
                <p className="doc-card-notice error">
                  {doc.error_message}
                </p>
              )}

              <div className="doc-card-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedDoc(doc)}
                  id={`review-doc-${doc.id}`}
                  title="Review metadata and extracted content"
                >
                  Review Content
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleDownload(doc)}
                  disabled={downloadingId === doc.id}
                  id={`download-doc-${doc.id}`}
                  title="Download raw document file"
                >
                  {downloadingId === doc.id ? "Downloading…" : "Download"}
                </button>
                <button
                  type="button"
                  className="btn btn-danger-outline btn-sm"
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  id={`delete-doc-${doc.id}`}
                  title="Delete document and remove storage file"
                >
                  {deletingId === doc.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDoc && (
        <DocumentViewerModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onVerified={() => {
            onRefresh();
            setSelectedDoc((prev) => (prev ? { ...prev, is_verified: true } : null));
          }}
        />
      )}
    </div>
  );
}
