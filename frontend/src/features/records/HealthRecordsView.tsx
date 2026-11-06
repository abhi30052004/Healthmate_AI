import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Search, Trash2, Download, RefreshCw, PencilLine, Loader2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Dialog } from "../../components/ui/Dialog";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusPill } from "../../components/ui/Badge";
import { FileDropzone } from "./FileDropzone";
import { ExtractionReviewPanel } from "./ExtractionReviewPanel";
import { ManualEntryDialog } from "./ManualEntryDialog";
import { EmptyState, ErrorState } from "../../components/feedback/States";
import { profileQueryKeys } from "../../app/queryClient";
import {
  MANUAL_ENTRY_MIME,
  deleteDocument,
  downloadDocument,
  listDocuments,
  reprocessDocument,
  uploadDocument,
  type DocumentItem,
  type FamilyProfile,
} from "../../api/client";
import { errorMessage, formatDate } from "../../lib/dates";

export interface HealthRecordsViewProps {
  token: string;
  activeProfile: FamilyProfile | null;
}

type UiState = "processing" | "needs_review" | "verified" | "failed";

/** One place that decides how a document is presented. `is_verified` is the source of truth. */
export function documentUiState(doc: DocumentItem): UiState {
  if (doc.is_verified) return "verified";
  if (["uploaded", "queued", "processing"].includes(doc.processing_status)) return "processing";
  if (doc.processing_status === "failed") return "failed";
  return "needs_review";
}

export function HealthRecordsView({ token, activeProfile }: HealthRecordsViewProps) {
  const queryClient = useQueryClient();
  const profileId = activeProfile?.id ?? "";
  const key = profileQueryKeys.documents(profileId);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "needs_review">("all");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [deleting, setDeleting] = useState<DocumentItem | null>(null);

  const docsQuery = useQuery({
    queryKey: key,
    queryFn: () => listDocuments(token, profileId),
    enabled: !!profileId,
    // Poll while anything is still being read so status flips without a manual refresh.
    refetchInterval: (q) =>
      (q.state.data ?? []).some((d) => documentUiState(d) === "processing") ? 3000 : false,
  });
  const documents = docsQuery.data ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(5);
      const doc = await uploadDocument(token, file, setUploadProgress, profileId);
      setUploadProgress(100);
      await refresh();
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.trends(profileId) });
      if (documentUiState(doc) === "needs_review") {
        toast.success(`${file.name} was read. Please review the results.`, {
          action: { label: "Review now", onClick: () => setReviewingId(doc.id) },
        });
      } else if (doc.processing_status === "ocr_required") {
        toast.warning(`${file.name} needs OCR that isn't available. You can add the values manually.`);
      } else {
        toast.success(`${file.name} uploaded.`);
      }
    } catch (err) {
      toast.error(errorMessage(err, "Upload failed."));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (doc: DocumentItem) => deleteDocument(token, doc.id),
    onSuccess: async () => {
      toast.success("Record deleted.");
      setDeleting(null);
      await refresh();
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.trends(profileId) });
    },
    onError: (err) => toast.error(errorMessage(err, "Couldn't delete this record.")),
  });

  const retryMutation = useMutation({
    mutationFn: (doc: DocumentItem) => reprocessDocument(token, doc.id),
    onSuccess: () => {
      toast.success("Reading the file again…");
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err, "Couldn't retry processing.")),
  });

  const filtered = documents.filter((doc) => {
    const q = search.trim().toLowerCase();
    const matches =
      !q ||
      doc.filename.toLowerCase().includes(q) ||
      (doc.lab_name ?? "").toLowerCase().includes(q) ||
      (doc.observations ?? []).some((o) => o.test_name.toLowerCase().includes(q));
    if (!matches) return false;
    const state = documentUiState(doc);
    if (filter === "verified") return state === "verified";
    if (filter === "needs_review") return state === "needs_review" || state === "failed";
    return true;
  });

  const reviewing = documents.find((d) => d.id === reviewingId) ?? null;
  const tabClass = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
      active ? "bg-[var(--green-50)] text-[var(--green-900)] border border-[var(--green-100)]" : "text-[var(--muted)] hover:text-[var(--text)]"
    }`;

  return (
    <div className="space-y-8" data-testid="health-records-view">
      <PageHeader
        title="Health Records & Laboratory Findings"
        subtitle={`Upload reports or type results in for ${activeProfile?.name ?? "this profile"}, then confirm them before they appear in trends.`}
        actions={
          <Button variant="outline" size="sm" iconLeft={<PencilLine size={14} />} onClick={() => setManualOpen(true)}>
            Add results manually
          </Button>
        }
      />

      <section>
        <FileDropzone onFileSelect={handleUpload} uploading={uploading} uploadProgress={uploadProgress} />
      </section>

      <section className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border)]">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search records"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file, lab or test name…"
            className="w-full min-h-[40px] pl-9 pr-3 text-xs bg-white border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--green-700)] focus:shadow-[var(--focus)]"
          />
        </div>
        <div role="group" aria-label="Filter by status" className="inline-flex items-center p-1 rounded-lg bg-white border border-[var(--border)] self-start sm:self-auto">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={tabClass(filter === "all")}>
            All ({documents.length})
          </button>
          <button type="button" aria-pressed={filter === "verified"} onClick={() => setFilter("verified")} className={tabClass(filter === "verified")}>
            Verified
          </button>
          <button type="button" aria-pressed={filter === "needs_review"} onClick={() => setFilter("needs_review")} className={tabClass(filter === "needs_review")}>
            Needs review
          </button>
        </div>
      </section>

      <section className="space-y-3" aria-live="polite">
        {docsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Loading records">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={132} rounded="lg" />
            ))}
          </div>
        ) : docsQuery.isError ? (
          <ErrorState title="Couldn't load records" message={errorMessage(docsQuery.error)} onRetry={() => docsQuery.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={documents.length === 0 ? "No records yet" : "No matching records"}
            description={
              documents.length === 0
                ? "Upload a lab report or prescription above, or add results by hand."
                : "Try a different search or filter."
            }
            actionLabel={documents.length === 0 ? "Add results manually" : undefined}
            onAction={documents.length === 0 ? () => setManualOpen(true) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doc) => {
              const state = documentUiState(doc);
              const isManual = doc.mime_type === MANUAL_ENTRY_MIME;
              const count = doc.observations?.length ?? 0;
              return (
                <Card key={doc.id} className="p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-[var(--green-50)] text-[var(--green-700)] shrink-0">
                        <FileText size={18} aria-hidden="true" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-semibold text-xs truncate" title={doc.filename}>{doc.filename}</p>
                        <p className="text-[10px] text-[var(--muted)]">
                          {formatDate(doc.document_date ?? doc.created_at)}
                          {doc.lab_name ? ` · ${doc.lab_name}` : ""}
                          {!isManual ? ` · ${(doc.file_size / 1024).toFixed(0)} KB` : ""}
                        </p>
                      </div>
                    </div>
                    {state === "processing" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)]" role="status">
                        <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Reading…
                      </span>
                    ) : (
                      <StatusPill status={state} />
                    )}
                  </div>

                  <p className="text-xs text-[var(--muted)]">
                    {state === "failed"
                      ? doc.error_message || "This file couldn't be read."
                      : state === "processing"
                      ? "We're extracting the text and results."
                      : `${count} result${count === 1 ? "" : "s"} found`}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] gap-2">
                    {state === "failed" ? (
                      <Button variant="outline" size="sm" className="flex-1 text-xs" iconLeft={<RefreshCw size={13} />} loading={retryMutation.isPending && retryMutation.variables?.id === doc.id} onClick={() => retryMutation.mutate(doc)}>
                        Try again
                      </Button>
                    ) : (
                      <Button
                        variant={state === "needs_review" ? "primary" : "outline"}
                        size="sm"
                        className="flex-1 text-xs"
                        disabled={state === "processing"}
                        onClick={() => setReviewingId(doc.id)}
                      >
                        {state === "needs_review" ? "Review results" : "View record"}
                      </Button>
                    )}
                    {!isManual && (
                      <button
                        type="button"
                        aria-label={`Download ${doc.filename}`}
                        onClick={() => downloadDocument(token, doc.id, doc.filename).catch((e) => toast.error(errorMessage(e)))}
                        className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--green-800)] hover:bg-[var(--green-50)]"
                      >
                        <Download size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleting(doc)}
                      aria-label={`Delete ${doc.filename}`}
                      className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]"
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

      {reviewing && (
        <ExtractionReviewPanel
          key={reviewing.id}
          token={token}
          document={reviewing}
          onChanged={() => {
            refresh();
            queryClient.invalidateQueries({ queryKey: profileQueryKeys.trends(profileId) });
          }}
          onClose={() => setReviewingId(null)}
        />
      )}

      <ManualEntryDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        token={token}
        profileId={profileId}
        profileName={activeProfile?.name ?? "this profile"}
        onCreated={async () => {
          setManualOpen(false);
          toast.success("Results saved.");
          await refresh();
          queryClient.invalidateQueries({ queryKey: profileQueryKeys.trends(profileId) });
        }}
      />

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} maxWidth="sm" title="Delete this record?" description="This permanently removes the file and its results. This can't be undone.">
        <p className="text-sm break-words mb-5">{deleting?.filename}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting)}>
            Delete record
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
