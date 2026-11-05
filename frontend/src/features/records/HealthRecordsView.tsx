import React, { useState } from "react";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Eye,
  Upload,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatusPill } from "../../components/ui/Badge";
import { FileDropzone } from "./FileDropzone";
import { ExtractionReviewPanel } from "./ExtractionReviewPanel";
import { EmptyState } from "../../components/feedback/States";
import {
  uploadDocument,
  verifyDocument,
  deleteDocument,
  type DocumentItem,
  type ObservationItem,
  type FamilyProfile,
} from "../../api/client";

export interface HealthRecordsViewProps {
  token: string;
  activeProfile: FamilyProfile | null;
  documents: DocumentItem[];
  onRefresh: () => void;
}

export function HealthRecordsView({
  token,
  activeProfile,
  documents,
  onRefresh,
}: HealthRecordsViewProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "verified" | "needs_review">("all");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [reviewingDoc, setReviewingDoc] = useState<DocumentItem | null>(null);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(10);
      await uploadDocument(
        token,
        file,
        (percent) => setUploadProgress(percent),
        activeProfile?.id
      );
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        onRefresh();
      }, 500);
    } catch {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVerify = async (docId: string, items: ObservationItem[]) => {
    await verifyDocument(token, docId);
    onRefresh();
  };

  const handleDelete = async (docId: string) => {
    if (window.confirm("Are you sure you want to delete this clinical report?")) {
      await deleteDocument(token, docId);
      onRefresh();
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.filename.toLowerCase().includes(search.toLowerCase());
    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "verified")
      return matchesSearch && (doc.processing_status === "completed" || doc.processing_status === "verified");
    if (filterStatus === "needs_review")
      return (
        matchesSearch &&
        (doc.processing_status === "extracted" || doc.processing_status === "ocr_required")
      );
    return matchesSearch;
  });

  // Mock observations for preview if none returned yet
  const sampleObservations: ObservationItem[] = [
    {
      id: "obs-1",
      document_id: reviewingDoc?.id || "doc-1",
      owner_id: activeProfile?.owner_id || "user-1",
      test_name: "Fasting Blood Glucose",
      value: "94",
      numeric_value: 94,
      unit: "mg/dL",
      reference_range: "70 - 100",
      source_page: 1,
      source_text: "Fasting Glucose 94 mg/dL",
      is_low_confidence: false,
      is_reviewed: false,
      created_at: "2026-10-28T10:00:00Z",
    },
    {
      id: "obs-2",
      document_id: reviewingDoc?.id || "doc-1",
      owner_id: activeProfile?.owner_id || "user-1",
      test_name: "HbA1c Glycated Hemoglobin",
      value: "5.6",
      numeric_value: 5.6,
      unit: "%",
      reference_range: "4.0 - 5.7",
      source_page: 1,
      source_text: "HbA1c 5.6%",
      is_low_confidence: false,
      is_reviewed: false,
      created_at: "2026-10-28T10:00:00Z",
    },
  ];

  return (
    <div className="space-y-8" data-testid="health-records-view">
      <PageHeader
        title="Health Records & Laboratory Findings"
        subtitle="Digitize medical documents, review extracted observations, and confirm data before inclusion in trends."
      />

      {/* Upload Dropzone Area */}
      <section>
        <FileDropzone
          onFileSelect={handleUpload}
          uploading={uploading}
          uploadProgress={uploadProgress}
        />
      </section>

      {/* Filter and Search Bar */}
      <section className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border)]">
        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter documents by filename..."
            className="w-full min-h-[40px] pl-9 pr-3 text-xs bg-white border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--green-700)] focus:shadow-[var(--focus)]"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="inline-flex items-center p-1 rounded-lg bg-white border border-[var(--border)] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              filterStatus === "all"
                ? "bg-[var(--green-50)] text-[var(--green-900)] border border-[var(--green-100)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            All ({documents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("verified")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              filterStatus === "verified"
                ? "bg-[var(--green-50)] text-[var(--green-900)] border border-[var(--green-100)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            Verified
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("needs_review")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              filterStatus === "needs_review"
                ? "bg-[var(--green-50)] text-[var(--green-900)] border border-[var(--green-100)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            Needs Review
          </button>
        </div>
      </section>

      {/* Document List / Cards */}
      <section className="space-y-3">
        {filteredDocs.length === 0 ? (
          <EmptyState
            title="No Documents Found"
            description="Upload your medical lab panels or prescription images above to get started."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => {
              const isVerified =
                doc.processing_status === "completed" || doc.processing_status === "verified";
              const isNeedsReview =
                doc.processing_status === "extracted" || doc.processing_status === "ocr_required";

              return (
                <Card key={doc.id} className="p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[var(--green-50)] text-[var(--green-700)]">
                        <FileText size={18} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-xs text-[var(--text)] truncate max-w-[180px]">
                          {doc.filename}
                        </p>
                        <p className="text-[10px] text-[var(--muted)]">
                          {(doc.file_size / 1024).toFixed(1)} KB · {doc.mime_type}
                        </p>
                      </div>
                    </div>

                    <StatusPill
                      status={
                        isVerified
                          ? "verified"
                          : isNeedsReview
                          ? "needs_review"
                          : "unverified"
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] gap-2">
                    {isNeedsReview ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setReviewingDoc(doc)}
                        className="flex-1 text-xs"
                      >
                        Review Findings
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewingDoc(doc)}
                        className="flex-1 text-xs"
                      >
                        View Record
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      aria-label={`Delete ${doc.filename}`}
                      className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Split-Screen Review Modal */}
      {reviewingDoc && (
        <ExtractionReviewPanel
          document={reviewingDoc}
          initialObservations={sampleObservations}
          onConfirmVerification={(items) => handleVerify(reviewingDoc.id, items)}
          onClose={() => setReviewingDoc(null)}
        />
      )}
    </div>
  );
}
