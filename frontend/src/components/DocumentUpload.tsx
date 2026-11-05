import React, { useRef, useState } from "react";
import { uploadDocument, type DocumentItem } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface DocumentUploadProps {
  onUploadSuccess: (newDoc: DocumentItem) => void;
  profileId?: string;
  profileName?: string;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const VALID_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];

export function DocumentUpload({ onUploadSuccess, profileId, profileName }: DocumentUploadProps) {
  const { token, handleSessionExpired } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const validateFile = (file: File): string | null => {
    const fileExt = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (!VALID_EXTENSIONS.includes(fileExt)) {
      return `Unsupported file format (${fileExt || "unknown"}). Supported formats are PDF, PNG, JPG, and JPEG.`;
    }

    if (file.size === 0) {
      return "Selected file is empty (0 bytes). Please select a valid document.";
    }

    if (file.size > MAX_SIZE) {
      return `File exceeds the 10 MB size limit (current size: ${formatSize(file.size)}).`;
    }

    return null;
  };

  const executeUpload = async (fileToUpload: File) => {
    setError(null);
    setSuccessInfo(null);

    const validationError = validateFile(fileToUpload);
    if (validationError) {
      setError(validationError);
      setSelectedFile(fileToUpload);
      return;
    }

    if (!token) {
      handleSessionExpired("Authentication session expired. Please sign in again.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setSelectedFile(fileToUpload);

    try {
      const doc = profileId
        ? await uploadDocument(
            token,
            fileToUpload,
            (percent) => {
              setUploadProgress(percent);
            },
            profileId
          )
        : await uploadDocument(token, fileToUpload, (percent) => {
            setUploadProgress(percent);
          });
      setSuccessInfo(
        `Report "${doc.filename}" (${formatSize(doc.file_size)}) uploaded successfully${
          profileName ? ` to ${profileName}'s profile` : ""
        }.`
      );
      setSelectedFile(null);
      setUploadProgress(100);
      onUploadSuccess(doc);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Upload failed. Please check your document and try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      executeUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      executeUpload(e.target.files[0]);
    }
  };

  const handleRetry = () => {
    if (selectedFile) {
      executeUpload(selectedFile);
    }
  };

  return (
    <div className="upload-container">
      {/* Upload Dropzone */}
      <div
        className={`dropzone ${isDragging ? "dragging" : ""} ${isUploading ? "uploading" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
        aria-label="Upload medical report dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          style={{ display: "none" }}
          onChange={handleChange}
          disabled={isUploading}
          id="document-file-input"
          data-testid="file-input"
        />

        <div className="dropzone-content">
          <div className="upload-icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          {isUploading ? (
            <div className="upload-progress-state">
              <span className="spinner" />
              <p className="upload-status-text">
                Uploading {selectedFile?.name}… ({uploadProgress}%)
              </p>
              <div
                className="upload-progress-bar-container"
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="upload-progress-bar-fill"
                  style={{ width: `${Math.max(uploadProgress, 5)}%` }}
                />
              </div>
              <span className="upload-sub">Validating file signature and parsing clinical text</span>
            </div>
          ) : (
            <>
              <p className="upload-main-text">
                <strong>Click to upload</strong> or drag and drop your medical report
              </p>
              <p className="upload-sub">
                Supported formats: <strong>PDF, PNG, JPG, JPEG</strong> (Maximum size:{" "}
                <strong>10 MB</strong>)
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Choose File
              </button>
            </>
          )}
        </div>
      </div>

      {/* Selected file info card during or after selection */}
      {selectedFile && !isUploading && (
        <div className="selected-file-card">
          <div className="selected-file-info">
            <span className="selected-file-name">{selectedFile.name}</span>
            <span className="selected-file-meta">
              {formatSize(selectedFile.size)} • {selectedFile.type || "application/octet-stream"}
            </span>
          </div>
          {error && (
            <div className="selected-file-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleRetry}
                id="retry-upload-btn"
              >
                Retry Upload
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedFile(null);
                  setError(null);
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div
          className="alert alert-error"
          role="alert"
          id="upload-error-alert"
          style={{ marginTop: "14px" }}
        >
          <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div style={{ flex: 1 }}>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Success alert */}
      {successInfo && (
        <div
          className="alert alert-success"
          role="alert"
          id="upload-success-alert"
          style={{ marginTop: "14px" }}
        >
          <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <div style={{ flex: 1 }}>
            <span>{successInfo}</span>
          </div>
        </div>
      )}
    </div>
  );
}
