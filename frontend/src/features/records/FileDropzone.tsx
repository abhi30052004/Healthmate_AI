import React, { useState, useRef } from "react";
import { Upload, FileUp, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/Button";

export interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  uploading?: boolean;
  uploadProgress?: number;
  maxSizeMB?: number;
}

export function FileDropzone({
  onFileSelect,
  uploading = false,
  uploadProgress = 0,
  maxSizeMB = 10,
}: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

  const handleFile = (file: File) => {
    setError(null);
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a PDF document or image file (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`p-8 md:p-10 rounded-xl border-2 border-dashed text-center transition-colors flex flex-col items-center justify-center space-y-3 ${
          dragOver
            ? "border-[var(--green-700)] bg-[var(--green-50)]"
            : "border-[var(--border)] bg-white hover:border-[var(--green-500)]"
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-[var(--green-50)] text-[var(--green-800)] flex items-center justify-center border border-[var(--green-100)]">
          <Upload size={22} />
        </div>

        <div className="space-y-1">
          <p className="font-display font-semibold text-sm text-[var(--text)]">
            Drag and drop your medical report here
          </p>
          <p className="text-xs text-[var(--muted)]">
            Supported formats: PDF, PNG, JPG, WebP up to {maxSizeMB}MB
          </p>
        </div>

        {uploading ? (
          <div className="w-full max-w-xs space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs text-[var(--green-800)] font-semibold">
              <span>Uploading & Processing...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--green-600)] transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              iconLeft={<FileUp size={14} />}
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </Button>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              iconLeft={<Camera size={14} />}
              onClick={() => cameraInputRef.current?.click()}
            >
              Take Photo
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] text-xs flex items-center gap-2"
        >
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
