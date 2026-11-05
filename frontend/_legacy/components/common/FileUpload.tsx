import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeBytes?: number;
  isUploading?: boolean;
  uploadProgress?: number;
  profileName?: string;
  error?: string | null;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  accept = ".pdf,.png,.jpg,.jpeg",
  maxSizeBytes = 20 * 1024 * 1024, // 20 MB
  isUploading = false,
  uploadProgress = 0,
  profileName,
  error = null,
  className = "",
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = (file: File) => {
    setValidationError(null);

    // Validate size
    if (file.size > maxSizeBytes) {
      setValidationError(`File size exceeds ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB limit.`);
      return;
    }

    // Validate type
    const validExtensions = [".pdf", ".png", ".jpg", ".jpeg"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setValidationError("Unsupported file format. Please upload a PDF, PNG, or JPEG file.");
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`hm-file-upload-container ${className}`}>
      <div
        className={`hm-dropzone ${isDragOver ? "is-dragover" : ""} ${isUploading ? "is-uploading" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload medical document"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          style={{ display: "none" }}
          aria-hidden="true"
        />

        <div className="hm-dropzone-content">
          <div className="hm-upload-icon-circle">
            <UploadCloud size={32} className="text-teal" />
          </div>

          <h4 className="hm-dropzone-title">
            Drag & drop medical report or <span className="text-teal">browse files</span>
          </h4>

          <p className="hm-dropzone-hints">
            Supports PDF, PNG, JPG up to 20MB. Fast text extraction & verification.
          </p>

          {profileName && (
            <div className="hm-dropzone-profile-hint">
              Target Profile: <strong>{profileName}</strong>
            </div>
          )}
        </div>
      </div>

      {(validationError || error) && (
        <div className="hm-upload-alert is-error" role="alert">
          <AlertCircle size={15} />
          <span>{validationError || error}</span>
        </div>
      )}

      {selectedFile && !validationError && (
        <div className="hm-selected-file-card">
          <div className="hm-selected-file-info">
            <FileText size={18} className="text-teal" />
            <div className="hm-selected-file-names">
              <span className="hm-filename">{selectedFile.name}</span>
              <span className="hm-filesize">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </div>

          {!isUploading ? (
            <button
              type="button"
              className="hm-btn-icon hm-btn-ghost"
              onClick={(e) => {
                e.stopPropagation();
                clearSelectedFile();
              }}
              aria-label="Remove selected file"
            >
              <X size={16} />
            </button>
          ) : (
            <div className="hm-upload-progress-box">
              <div className="hm-progress-bar-bg">
                <div
                  className="hm-progress-bar-fill"
                  style={{ width: `${uploadProgress || 65}%` }}
                />
              </div>
              <span className="hm-progress-text">Uploading & analyzing…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

