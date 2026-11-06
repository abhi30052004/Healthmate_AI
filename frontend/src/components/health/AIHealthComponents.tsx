import React, { useState } from "react";
import { ShieldAlert, BookOpen, AlertCircle, FileText, CheckCircle2, ChevronRight, Sparkles, X } from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";

export interface CitationData {
  id: string;
  sourceIndex: number;
  documentTitle: string;
  pageNumber?: number | null;
  date?: string;
  excerpt: string;
  testName?: string;
  confidence?: number;
  isVerified?: boolean;
}

export function SafetyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="region"
      aria-label="Medical safety notice"
      className={`rounded-xl border border-[var(--green-600)]/30 bg-[var(--green-50)] text-[var(--green-900)] ${
        compact ? "p-3 text-xs" : "p-4 text-sm"
      } flex items-start gap-3 shadow-sm`}
    >
      <ShieldAlert className="w-5 h-5 text-[var(--green-700)] shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <p className="font-semibold text-[var(--green-900)]">
          Clinical Guidance & Explanation Only
        </p>
        <p className="text-[var(--text)]/85 leading-relaxed">
          HealthMate AI explains records and supports doctor conversations. It never diagnoses or prescribes. Always consult your qualified healthcare clinician for medical diagnosis and treatment plans.
        </p>
      </div>
    </div>
  );
}

export function QuotaMeter({
  used = 8,
  limit = 20,
}: {
  used?: number;
  limit?: number;
}) {
  const remaining = Math.max(0, limit - used);
  const percentage = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="p-3.5 rounded-xl bg-white border border-[var(--border)] shadow-sm space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--muted)] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--green-600)]" />
          AI Chat Daily Quota
        </span>
        <span className="font-semibold text-[var(--text)] tabular-nums">
          {remaining} of {limit} chats left today
        </span>
      </div>
      <div className="h-2 w-full bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]/50">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            percentage > 85 ? "bg-[var(--warning)]" : "bg-[var(--green-600)]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        Resets at midnight. Unlimited document processing and manual records view.
      </p>
    </div>
  );
}

export function CitationChip({
  citation,
  onClick,
}: {
  citation: CitationData;
  onClick: (citation: CitationData) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(citation)}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--green-100)] hover:bg-[var(--green-100)]/80 text-[var(--green-900)] text-xs font-semibold transition-colors border border-[var(--green-600)]/30 mx-0.5"
      title={`Source [S${citation.sourceIndex}]: ${citation.documentTitle}${citation.pageNumber ? ` (Page ${citation.pageNumber})` : ""}`}
    >
      <BookOpen className="w-3 h-3 text-[var(--green-700)]" />
      <span>[S{citation.sourceIndex}]</span>
    </button>
  );
}

export function EvidenceDrawer({
  citation,
  isOpen,
  onClose,
}: {
  citation: CitationData | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!citation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="bg-[var(--bg)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="info" size="sm">
                Source Reference [S{citation.sourceIndex}]
              </Badge>
              {citation.isVerified && (
                <Badge variant="verified" size="sm">
                  Verified Fact
                </Badge>
              )}
            </div>
            <DialogTitle className="text-base font-display font-semibold text-[var(--text)]">
              {citation.documentTitle}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-[var(--muted)] block">Page Location</span>
              <span className="font-semibold text-[var(--text)]">{citation.pageNumber ? `Page ${citation.pageNumber}` : "Not available"}</span>
            </div>
            {citation.date && (
              <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                <span className="text-[var(--muted)] block">Report Date</span>
                <span className="font-semibold text-[var(--text)]">{citation.date}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              Exact Source Excerpt
            </p>
            <div className="p-3.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm font-mono text-[var(--text)] leading-relaxed whitespace-pre-wrap">
              "{citation.excerpt}"
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--green-50)] border border-[var(--green-100)] text-xs text-[var(--green-900)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--green-600)] shrink-0" />
            <span>This excerpt was matched directly from your verified clinical document archive.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AIAnswerCard({
  query,
  answer,
  citations = [],
  onCitationClick,
  onReportIssue,
}: {
  query: string;
  answer: string;
  citations?: CitationData[];
  onCitationClick?: (c: CitationData) => void;
  onReportIssue?: () => void;
}) {
  return (
    <Card className="border-[var(--green-600)]/30 bg-white shadow-md overflow-hidden">
      <div className="p-4 bg-[var(--green-50)]/70 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--green-900)]">
          <Sparkles className="w-4 h-4 text-[var(--green-700)]" />
          <span>HealthMate record explanation</span>
        </div>
        <Badge variant="verified" size="sm">
          Based on your records
        </Badge>
      </div>

      <CardContent className="p-5 space-y-4">
        <div className="text-sm font-medium text-[var(--muted)]">
          Q: "{query}"
        </div>

        <div className="text-base text-[var(--text)] leading-relaxed whitespace-pre-wrap font-sans">
          {answer}
        </div>

        {citations.length > 0 && (
          <div className="pt-3 border-t border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--muted)] mb-2">
              Verified Sources Cited:
            </p>
            <div className="flex flex-wrap gap-2">
              {citations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onCitationClick?.(c)}
                  title={`Source [S${c.sourceIndex}]: ${c.documentTitle}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg)] hover:bg-[var(--green-50)] text-xs font-medium text-[var(--text)] border border-[var(--border)] transition-colors text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--green-700)]" />
                  <span className="font-semibold text-[var(--green-800)]">[S{c.sourceIndex}]</span>
                  <span className="truncate max-w-[200px]">{c.documentTitle}</span>
                  {c.pageNumber ? <span className="text-[var(--muted)] text-[10px]">(p.{c.pageNumber})</span> : null}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--muted)] border-t border-[var(--border)]">
          <span>This explains your records. Discuss decisions with your doctor.</span>
          {onReportIssue && (
            <button
              onClick={onReportIssue}
              className="text-xs text-[var(--muted)] hover:text-[var(--danger)] transition-colors underline underline-offset-2 self-start sm:self-auto"
            >
              Report inaccuracy
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
