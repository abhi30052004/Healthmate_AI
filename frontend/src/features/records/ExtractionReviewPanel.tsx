import React, { useState } from "react";
import { Check, X, Edit2, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import type { ObservationItem, DocumentItem } from "../../api/client";

export interface ExtractionReviewPanelProps {
  document: DocumentItem;
  rawText?: string;
  initialObservations: ObservationItem[];
  onConfirmVerification: (confirmedItems: ObservationItem[]) => Promise<void>;
  onClose: () => void;
}

export function ExtractionReviewPanel({
  document: doc,
  rawText = "Automated OCR Extracted Text: Hemoglobin: 14.2 g/dL (Ref: 13.0 - 17.0). Fasting Glucose: 94 mg/dL (Ref: 70 - 100). Serum Creatinine: 0.88 mg/dL (Ref: 0.7 - 1.2). Total Cholesterol: 182 mg/dL.",
  initialObservations,
  onConfirmVerification,
  onClose,
}: ExtractionReviewPanelProps) {
  const [items, setItems] = useState<ObservationItem[]>(initialObservations);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdateItem = (id: string, updates: Partial<ObservationItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRejectItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveAll = async () => {
    try {
      setLoading(true);
      await onConfirmVerification(items);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-[var(--border)] shadow-2 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-[var(--border)] flex items-center justify-between gap-4 bg-[var(--bg)]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base text-[var(--green-900)]">
                Human Verification & Extraction Review
              </span>
              <Badge variant="review" size="sm">
                Requires Confirmation
              </Badge>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Document: <span className="font-medium text-[var(--text)]">{doc.filename}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Side: Original Document / OCR Preview */}
          <div className="w-full md:w-1/2 p-5 border-b md:border-b-0 md:border-r border-[var(--border)] overflow-y-auto bg-[var(--bg)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-[var(--green-700)]" />
                <span>Extracted Document Provenance</span>
              </span>
              <span className="text-[11px] text-[var(--muted)] font-mono">OCR Text Source</span>
            </div>

            <div className="p-4 rounded-lg bg-white border border-[var(--border)] font-mono text-xs text-[var(--text)] leading-relaxed whitespace-pre-wrap shadow-sm">
              {rawText}
            </div>

            <div className="p-3 rounded-lg bg-[var(--green-50)] border border-[var(--green-100)] text-[11px] text-[var(--muted)] space-y-1">
              <p className="font-semibold text-[var(--green-900)]">Verification Policy:</p>
              <p>
                Confirm values, units, and ranges exactly as stated in the clinical report before saving.
              </p>
            </div>
          </div>

          {/* Right Side: Candidate Fields with Edit/Accept */}
          <div className="w-full md:w-1/2 p-5 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[var(--green-600)]" />
                <span>Extracted Clinical Facts ({items.length})</span>
              </span>
              <span className="text-[11px] text-[var(--muted)]">Review Each Observation</span>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-[var(--border)] bg-white shadow-1 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-sm text-[var(--text)]">{item.test_name}</span>
                      <p className="text-[11px] text-[var(--muted)]">
                        Page: {item.source_page || 1} · Source: {item.source_text || "OCR extracted"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                        className="p-1 rounded text-[var(--muted)] hover:text-[var(--green-800)] transition-colors"
                        title="Edit value"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectItem(item.id)}
                        className="p-1 rounded text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                        title="Reject item"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {editingId === item.id ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Input
                        label="Value"
                        defaultValue={item.value}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            value: e.target.value,
                            numeric_value: parseFloat(e.target.value) || null,
                          })
                        }
                      />
                      <Input
                        label="Unit"
                        defaultValue={item.unit ?? ""}
                        onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold font-display tabular-nums text-[var(--green-900)]">
                          {item.value}
                        </span>
                        {item.unit && (
                          <span className="text-xs text-[var(--muted)]">{item.unit}</span>
                        )}
                      </div>

                      {item.reference_range && (
                        <span className="text-xs text-[var(--muted)]">
                          Ref: <span className="font-mono text-[var(--text)]">{item.reference_range}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border)] bg-white flex items-center justify-between gap-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="verified"
            size="md"
            loading={loading}
            iconLeft={<CheckCircle2 size={16} />}
            onClick={handleSaveAll}
          >
            Confirm & Save Verified Facts ({items.length})
          </Button>
        </div>
      </div>
    </div>
  );
}
