import React from "react";
import { FileText, Image as ImageIcon, Calendar, CheckCircle2, AlertCircle, Eye, Download, Trash2, Clock, ShieldCheck } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { DocumentItem } from "../../api/client";

export interface MedicalRecordCardProps {
  document: DocumentItem;
  onView?: (doc: DocumentItem) => void;
  onVerify?: (doc: DocumentItem) => void;
  onDelete?: (doc: DocumentItem) => void;
  onDownload?: (doc: DocumentItem) => void;
  isVerifying?: boolean;
}

export function MedicalRecordCard({
  document,
  onView,
  onVerify,
  onDelete,
  onDownload,
  isVerifying = false,
}: MedicalRecordCardProps) {
  const isPdf = document.mime_type.toLowerCase().includes("pdf");
  const isImage = document.mime_type.toLowerCase().includes("image");

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formattedDate = new Date(document.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const getStatusVariant = () => {
    switch (document.processing_status) {
      case "extracted":
        return "extracted";
      case "processing":
      case "pending":
        return "pending";
      case "failed":
        return "failed";
      default:
        return "neutral";
    }
  };

  const getStatusLabel = () => {
    switch (document.processing_status) {
      case "extracted":
        return "Extracted";
      case "processing":
        return "Analyzing…";
      case "pending":
        return "Queued";
      case "failed":
        return "Failed";
      default:
        return document.processing_status;
    }
  };

  return (
    <div className={`hm-record-card ${document.is_verified ? "hm-record-verified" : ""}`}>
      <div className="hm-record-header">
        <div className={`hm-record-type-icon ${isPdf ? "is-pdf" : isImage ? "is-image" : "is-doc"}`}>
          {isPdf ? <FileText size={20} /> : isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
        </div>
        <div className="hm-record-badges">
          <StatusBadge
            variant={getStatusVariant()}
            text={getStatusLabel()}
            size="sm"
            pulse={document.processing_status === "processing"}
          />
          {document.is_verified && (
            <StatusBadge
              variant="verified"
              text="Clinician Verified"
              size="sm"
            />
          )}
        </div>
      </div>

      <div className="hm-record-body">
        <h4 className="hm-record-title" title={document.filename}>
          {document.filename}
        </h4>

        <div className="hm-record-metadata">
          <span className="hm-record-meta-item">
            <Calendar size={13} />
            <span>{formattedDate}</span>
          </span>
          <span className="hm-record-meta-divider">•</span>
          <span className="hm-record-meta-item">
            <span>{formatFileSize(document.file_size)}</span>
          </span>
        </div>

        {document.error_message && (
          <div className="hm-record-error-snippet" role="alert">
            <AlertCircle size={13} />
            <span>{document.error_message}</span>
          </div>
        )}
      </div>

      <div className="hm-record-footer">
        <div className="hm-record-actions-left">
          {onView && (
            <button
              type="button"
              className="hm-btn hm-btn-sm hm-btn-secondary"
              onClick={() => onView(document)}
              aria-label={`View ${document.filename}`}
            >
              <Eye size={14} />
              <span>Review Details</span>
            </button>
          )}
        </div>

        <div className="hm-record-actions-right">
          {onVerify && document.processing_status === "extracted" && (
            <button
              type="button"
              className={`hm-btn hm-btn-sm ${document.is_verified ? "hm-btn-ghost-success" : "hm-btn-outline-primary"}`}
              onClick={() => onVerify(document)}
              disabled={isVerifying}
              title={document.is_verified ? "Mark as unverified" : "Mark as verified by clinician"}
            >
              <CheckCircle2 size={14} />
              <span>{document.is_verified ? "Verified" : "Verify"}</span>
            </button>
          )}

          {onDownload && (
            <button
              type="button"
              className="hm-btn-icon hm-btn-ghost"
              onClick={() => onDownload(document)}
              title="Download file"
              aria-label="Download document"
            >
              <Download size={15} />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              className="hm-btn-icon hm-btn-ghost-danger"
              onClick={() => onDelete(document)}
              title="Delete document"
              aria-label="Delete document"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

