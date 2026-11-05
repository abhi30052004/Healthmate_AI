import React, { useState } from "react";
import { FileText, Download, CheckCircle2, AlertCircle, Eye, ExternalLink, Calendar, X } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { DocumentItem } from "../../api/client";

export interface ReportViewerProps {
  document: DocumentItem;
  isOpen: boolean;
  onClose: () => void;
  onVerify?: () => void;
  isVerifying?: boolean;
}

export function ReportViewer({
  document,
  isOpen,
  onClose,
  onVerify,
  isVerifying = false,
}: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "raw" | "provenance">("preview");

  if (!isOpen) return null;

  const isPdf = document.mime_type.toLowerCase().includes("pdf");

  return (
    <div className="hm-modal-backdrop" role="dialog" aria-modal="true">
      <div className="hm-modal-container hm-report-viewer-modal">
        <div className="hm-modal-header">
          <div className="hm-modal-title-row">
            <div className="hm-report-type-badge">
              <FileText size={18} className="text-teal" />
            </div>
            <div>
              <h3 className="hm-modal-title">{document.filename}</h3>
              <span className="hm-modal-subtitle">
                Uploaded {new Date(document.created_at).toLocaleDateString()} • {(document.file_size / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>

          <div className="hm-modal-header-actions">
            <StatusBadge
              variant={document.is_verified ? "verified" : "neutral"}
              text={document.is_verified ? "Verified Record" : "Extracted"}
              size="sm"
            />
            {onVerify && (
              <button
                type="button"
                className={`hm-btn hm-btn-sm ${document.is_verified ? "hm-btn-secondary" : "hm-btn-outline-primary"}`}
                onClick={onVerify}
                disabled={isVerifying}
              >
                <CheckCircle2 size={14} />
                <span>{document.is_verified ? "Mark Unverified" : "Mark Verified"}</span>
              </button>
            )}
            <button
              type="button"
              className="hm-btn-icon hm-btn-ghost"
              onClick={onClose}
              aria-label="Close viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="hm-viewer-tabs">
          <button
            type="button"
            className={`hm-viewer-tab ${activeTab === "preview" ? "is-active" : ""}`}
            onClick={() => setActiveTab("preview")}
          >
            Report Preview
          </button>
          <button
            type="button"
            className={`hm-viewer-tab ${activeTab === "raw" ? "is-active" : ""}`}
            onClick={() => setActiveTab("raw")}
          >
            Verbatim Report Text
          </button>
          <button
            type="button"
            className={`hm-viewer-tab ${activeTab === "provenance" ? "is-active" : ""}`}
            onClick={() => setActiveTab("provenance")}
          >
            Document Provenance & SHA-256
          </button>
        </div>

        <div className="hm-viewer-content">
          {activeTab === "preview" && (
            <div className="hm-viewer-preview-pane">
              <div className="hm-preview-frame-container">
                <iframe
                  src={`/api/documents/${document.id}/content`}
                  title={document.filename}
                  className="hm-doc-iframe"
                />
              </div>
            </div>
          )}

          {activeTab === "raw" && (
            <div className="hm-viewer-raw-pane">
              <div className="hm-raw-text-wrapper">
                <pre className="hm-raw-pre">
                  {document.extracted_text || "No raw text available or extracted yet."}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "provenance" && (
            <div className="hm-viewer-provenance-pane">
              <div className="hm-provenance-grid">
                <div className="hm-prov-item">
                  <span className="hm-prov-label">Document ID</span>
                  <code>{document.id}</code>
                </div>
                <div className="hm-prov-item">
                  <span className="hm-prov-label">SHA-256 Checksum</span>
                  <code>{document.checksum_sha256}</code>
                </div>
                <div className="hm-prov-item">
                  <span className="hm-prov-label">MIME Type</span>
                  <span>{document.mime_type}</span>
                </div>
                <div className="hm-prov-item">
                  <span className="hm-prov-label">Processing Status</span>
                  <span>{document.processing_status}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

