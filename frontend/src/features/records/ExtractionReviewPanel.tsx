import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Edit2, ShieldCheck, FileText, CheckCircle2, Trash2, Plus, Save } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import {
  MANUAL_ENTRY_MIME,
  addObservation,
  deleteObservation,
  fetchDocumentBlob,
  getDocumentText,
  updateObservation,
  verifyDocument,
  type DocumentItem,
  type ObservationItem,
} from "../../api/client";
import { errorMessage, formatDate } from "../../lib/dates";

export interface ExtractionReviewPanelProps {
  token: string;
  document: DocumentItem;
  onClose: () => void;
  /** Called after any change so the parent can refresh its list. */
  onChanged: () => void;
}

type SourceTab = "original" | "text";

export function ExtractionReviewPanel({ token, document: doc, onClose, onChanged }: ExtractionReviewPanelProps) {
  const isManual = doc.mime_type === MANUAL_ENTRY_MIME;
  const [items, setItems] = useState<ObservationItem[]>(doc.observations ?? []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ObservationItem>>({});
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ test_name: "", value: "", unit: "", reference_range: "" });
  const [tab, setTab] = useState<SourceTab>(isManual ? "text" : "original");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => setItems(doc.observations ?? []), [doc.observations]);

  const textQuery = useQuery({
    queryKey: ["document-text", doc.id],
    queryFn: () => getDocumentText(token, doc.id),
    enabled: !isManual,
  });

  // Load the original file for side-by-side comparison (needs the auth header, so fetch as a blob).
  useEffect(() => {
    if (isManual) return undefined;
    let revoked = false;
    let url: string | null = null;
    fetchDocumentBlob(token, doc.id)
      .then((blob) => {
        if (revoked) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      })
      .catch((err) => !revoked && setPreviewError(errorMessage(err, "Original file unavailable.")));
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [token, doc.id, isManual]);

  const startEdit = (item: ObservationItem) => {
    setEditingId(item.id);
    setDraft({
      test_name: item.test_name,
      value: item.value,
      unit: item.unit ?? "",
      reference_range: item.reference_range ?? "",
    });
  };

  const saveEdit = async (item: ObservationItem) => {
    if (!draft.test_name?.trim() || !draft.value?.trim()) {
      toast.error("Name and value can't be empty.");
      return;
    }
    setBusy(item.id);
    try {
      const updated = await updateObservation(token, doc.id, item.id, {
        test_name: draft.test_name.trim(),
        value: draft.value.trim(),
        unit: (draft.unit ?? "").trim(),
        reference_range: (draft.reference_range ?? "").trim(),
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      setEditingId(null);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save the correction."));
    } finally {
      setBusy(null);
    }
  };

  const reject = async (item: ObservationItem) => {
    setBusy(item.id);
    try {
      await deleteObservation(token, doc.id, item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setRemovingId(null);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't remove this result."));
    } finally {
      setBusy(null);
    }
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.test_name.trim() || !newItem.value.trim()) {
      toast.error("Enter a test name and a value.");
      return;
    }
    setBusy("new");
    try {
      const created = await addObservation(token, doc.id, {
        test_name: newItem.test_name.trim(),
        value: newItem.value.trim(),
        unit: newItem.unit.trim() || null,
        reference_range: newItem.reference_range.trim() || null,
      });
      setItems((prev) => [...prev, created]);
      setNewItem({ test_name: "", value: "", unit: "", reference_range: "" });
      setAdding(false);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't add this result."));
    } finally {
      setBusy(null);
    }
  };

  const confirmAll = async () => {
    setVerifying(true);
    try {
      await verifyDocument(token, doc.id);
      toast.success("Marked as verified. These values now appear in your trends.");
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't verify this record."));
    } finally {
      setVerifying(false);
    }
  };

  const isImage = doc.mime_type.startsWith("image/");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Review extracted results">
      <div className="bg-white rounded-xl border border-[var(--border)] shadow-2 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 md:p-5 border-b border-[var(--border)] flex items-center justify-between gap-4 bg-[var(--bg)]">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-base text-[var(--green-900)]">
                {doc.is_verified ? "Verified record" : "Review extracted results"}
              </span>
              <Badge variant={doc.is_verified ? "verified" : "review"} size="sm">
                {doc.is_verified ? "Verified" : "Requires confirmation"}
              </Badge>
            </div>
            <p className="text-xs text-[var(--muted)] truncate">
              <span className="font-medium text-[var(--text)]">{doc.filename}</span>
              {doc.document_date ? ` · ${formatDate(doc.document_date)}` : ""}
              {doc.lab_name ? ` · ${doc.lab_name}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close review" className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Source */}
          <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg)] flex flex-col min-h-[240px]">
            <div className="flex items-center gap-1 p-3 border-b border-[var(--border)]">
              <FileText size={14} className="text-[var(--green-700)] mr-1" aria-hidden="true" />
              {!isManual && (
                <>
                  <button type="button" aria-pressed={tab === "original"} onClick={() => setTab("original")} className={`px-2.5 py-1 rounded text-xs font-semibold ${tab === "original" ? "bg-white shadow-sm" : "text-[var(--muted)]"}`}>
                    Original
                  </button>
                  <button type="button" aria-pressed={tab === "text"} onClick={() => setTab("text")} className={`px-2.5 py-1 rounded text-xs font-semibold ${tab === "text" ? "bg-white shadow-sm" : "text-[var(--muted)]"}`}>
                    Extracted text
                  </button>
                </>
              )}
              {isManual && <span className="text-xs font-semibold">Entered by you</span>}
            </div>
            <div className="flex-1 overflow-auto p-3">
              {isManual ? (
                <p className="text-xs text-[var(--muted)]">
                  This record was typed in by hand, so there is no original file. Values are treated as verified.
                </p>
              ) : tab === "original" ? (
                previewError ? (
                  <p role="alert" className="text-xs text-[var(--danger)]">{previewError}</p>
                ) : !previewUrl ? (
                  <p className="text-xs text-[var(--muted)]">Loading original…</p>
                ) : isImage ? (
                  <img src={previewUrl} alt={`Original ${doc.filename}`} className="max-w-full rounded border border-[var(--border)]" />
                ) : (
                  <iframe title={`Original ${doc.filename}`} src={previewUrl} className="w-full h-full min-h-[360px] rounded border border-[var(--border)] bg-white" />
                )
              ) : textQuery.isLoading ? (
                <p className="text-xs text-[var(--muted)]">Loading text…</p>
              ) : textQuery.isError ? (
                <p role="alert" className="text-xs text-[var(--danger)]">Couldn't load extracted text.</p>
              ) : (
                <pre className="p-3 rounded-lg bg-white border border-[var(--border)] font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {textQuery.data?.extracted_text?.trim() || "No text could be extracted from this file."}
                </pre>
              )}
            </div>
            <div className="m-3 p-3 rounded-lg bg-[var(--green-50)] border border-[var(--green-100)] text-[11px] text-[var(--muted)]">
              <span className="font-semibold text-[var(--green-900)]">Verification policy: </span>
              check every value, unit and range against the original before confirming.
            </div>
          </div>

          {/* Results */}
          <div className="w-full md:w-1/2 p-5 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[var(--green-600)]" aria-hidden="true" />
                Results ({items.length})
              </span>
              <Button variant="outline" size="sm" iconLeft={<Plus size={13} />} onClick={() => setAdding((v) => !v)}>
                Add missed result
              </Button>
            </div>

            {adding && (
              <form onSubmit={submitNew} className="p-4 rounded-lg border border-[var(--green-100)] bg-[var(--green-50)] grid grid-cols-2 gap-2" aria-label="Add a result">
                <div className="col-span-2">
                  <Input id="new-obs-test" label="Test" value={newItem.test_name} onChange={(e) => setNewItem({ ...newItem, test_name: e.target.value })} />
                </div>
                <Input id="new-obs-value" label="Value" value={newItem.value} onChange={(e) => setNewItem({ ...newItem, value: e.target.value })} />
                <Input id="new-obs-unit" label="Unit" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
                <div className="col-span-2">
                  <Input id="new-obs-range" label="Reference range" value={newItem.reference_range} onChange={(e) => setNewItem({ ...newItem, reference_range: e.target.value })} />
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                  <Button type="submit" size="sm" loading={busy === "new"}>Add</Button>
                </div>
              </form>
            )}

            {items.length === 0 && !adding && (
              <p className="text-xs text-[var(--muted)] p-4 border border-dashed border-[var(--border)] rounded-lg">
                No results were found in this file. Use “Add missed result” to enter them from the original.
              </p>
            )}

            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="p-4 rounded-lg border border-[var(--border)] bg-white shadow-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-semibold text-sm">{item.test_name}</span>
                      <p className="text-[11px] text-[var(--muted)]">
                        Page {item.source_page || 1}
                        {item.is_low_confidence && <span className="ml-1.5 text-[var(--warning)] font-semibold">· low confidence, please check</span>}
                        {item.is_reviewed && <span className="ml-1.5 text-[var(--green-700)]">· checked</span>}
                      </p>
                    </div>
                    {editingId !== item.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => startEdit(item)} aria-label={`Edit ${item.test_name}`} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--green-800)]">
                          <Edit2 size={14} />
                        </button>
                        {removingId === item.id ? (
                          <Button variant="danger" size="sm" loading={busy === item.id} onClick={() => reject(item)}>
                            Confirm remove
                          </Button>
                        ) : (
                          <button type="button" onClick={() => setRemovingId(item.id)} aria-label={`Remove ${item.test_name}`} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--danger)]">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {editingId === item.id ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Input id={`edit-${item.id}-test`} label="Test" value={draft.test_name ?? ""} onChange={(e) => setDraft({ ...draft, test_name: e.target.value })} />
                      </div>
                      <Input id={`edit-${item.id}-value`} label="Value" value={draft.value ?? ""} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
                      <Input id={`edit-${item.id}-unit`} label="Unit" value={draft.unit ?? ""} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
                      <div className="col-span-2">
                        <Input id={`edit-${item.id}-range`} label="Reference range" value={draft.reference_range ?? ""} onChange={(e) => setDraft({ ...draft, reference_range: e.target.value })} />
                      </div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                        <Button size="sm" iconLeft={<Save size={13} />} loading={busy === item.id} onClick={() => saveEdit(item)}>Save correction</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold font-display tabular-nums text-[var(--green-900)]">{item.value}</span>
                        {item.unit && <span className="text-xs text-[var(--muted)]">{item.unit}</span>}
                        {item.flag && item.flag !== "NORMAL" && (
                          <Badge variant="review" size="sm">{item.flag === "HIGH" ? "Above range on report" : item.flag === "LOW" ? "Below range on report" : item.flag}</Badge>
                        )}
                      </div>
                      {item.reference_range && (
                        <span className="text-xs text-[var(--muted)]">
                          Report range: <span className="font-mono text-[var(--text)]">{item.reference_range}</span>
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] bg-white flex items-center justify-between gap-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            {doc.is_verified ? "Close" : "Review later"}
          </Button>
          {!doc.is_verified && (
            <Button variant="verified" size="md" loading={verifying} disabled={items.length === 0} iconLeft={<CheckCircle2 size={16} />} onClick={confirmAll}>
              Confirm & save as verified ({items.length})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
