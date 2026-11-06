import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, RefreshCw, Info, BookOpen, MessageSquare, ExternalLink } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  SafetyNotice,
  QuotaMeter,
  EvidenceDrawer,
  AIAnswerCard,
  type CitationData,
} from "../../components/health/AIHealthComponents";
import {
  createConversation,
  getMyAiUsage,
  queryQuickReference,
  sendChatMessage,
  type CitationItem,
  type FamilyProfile,
  type QuickReferenceMode,
  type QuickReferenceResponse,
} from "../../api/client";
import { errorMessage, formatDate } from "../../lib/dates";

interface ChatItem {
  id: string;
  sender: "user" | "assistant";
  content: string;
  question?: string;
  citations?: CitationData[];
}

const RECORD_SUGGESTIONS = [
  "What was my latest HbA1c result?",
  "List the results from my most recent report",
  "Which medications are in my records?",
  "Do I have any results above the range printed on the report?",
];

const REFERENCE_MODES: { id: QuickReferenceMode; label: string; placeholder: string }[] = [
  { id: "medical_term", label: "Medical term", placeholder: "e.g. hypertension" },
  { id: "understand_test", label: "What a test measures", placeholder: "e.g. HbA1c" },
  { id: "general_reference", label: "General question", placeholder: "e.g. what is cholesterol?" },
];

export function toCitationData(c: CitationItem, index: number): CitationData {
  const sourceIndex = Number(c.citation_id.replace(/\D/g, "")) || index + 1;
  const measured = [c.original_test_name, [c.value, c.unit].filter(Boolean).join(" ")].filter(Boolean).join(": ");
  return {
    id: c.citation_id + c.document_id,
    sourceIndex,
    documentTitle: c.document_title,
    pageNumber: c.page_number ?? null,
    date: c.clinical_date ? formatDate(c.clinical_date) : undefined,
    excerpt: c.source_text || measured || "Source excerpt unavailable",
    testName: c.original_test_name ?? undefined,
    isVerified: c.is_reviewed,
  };
}

const nowLabel = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function AssistantView({ token, activeProfile }: { token: string; activeProfile?: FamilyProfile | null }) {
  const queryClient = useQueryClient();
  const profileId = activeProfile?.id ?? "";
  const [mode, setMode] = useState<"records" | "reference">("records");

  // --- Records chat (one conversation per profile; reset whenever the profile changes)
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<CitationData | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    setConversationId(null);
    setSelectedCitation(null);
    setInputValue("");
  }, [profileId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length]);

  const usage = useQuery({ queryKey: ["ai-usage"], queryFn: () => getMyAiUsage(token), retry: false });

  const chat = useMutation({
    mutationFn: async (text: string) => {
      let convId = conversationId;
      if (!convId) {
        const conv = await createConversation(token, `Chat about ${activeProfile?.name ?? "records"}`);
        convId = conv.id;
        setConversationId(conv.id);
      }
      return sendChatMessage(token, convId, text, includeUnverified, profileId);
    },
    onSuccess: (res, text) => {
      setMessages((prev) => [
        ...prev,
        {
          id: res.message_id,
          sender: "assistant",
          question: text,
          content: res.answer,
          citations: res.citations.map(toCitationData),
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
    },
    onError: (err) => {
      const status = (err as { status?: number }).status;
      toast.error(
        status === 429
          ? "You've used today's AI questions. Your records, trends and search still work."
          : errorMessage(err, "The assistant couldn't answer right now.")
      );
    },
  });

  const send = (textToSend?: string) => {
    const text = (textToSend ?? inputValue).trim();
    if (!text || chat.isPending) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: "user", content: text }]);
    setInputValue("");
    chat.mutate(text);
  };

  // --- General reference
  const [refMode, setRefMode] = useState<QuickReferenceMode>("medical_term");
  const [refText, setRefText] = useState("");
  const [refResult, setRefResult] = useState<QuickReferenceResponse | null>(null);
  const reference = useMutation({
    mutationFn: (text: string) =>
      queryQuickReference(token, {
        mode: refMode,
        question: refMode === "general_reference" ? text : `What is ${text}?`,
        term: refMode === "general_reference" ? undefined : text,
        response_style: "concise",
      }),
    onSuccess: (res) => {
      setRefResult(res);
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
    },
    onError: (err) => toast.error(errorMessage(err, "Couldn't look that up right now.")),
  });

  const limit = usage.data?.chat_limit ?? 20;
  const used = usage.data?.chat_used ?? 0;
  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold ${active ? "bg-white shadow-1 text-[var(--green-900)]" : "text-[var(--muted)]"}`;

  return (
    <div className="space-y-6 max-w-[760px] mx-auto pb-12" data-testid="assistant-view">
      <PageHeader
        title="AI Health Assistant"
        subtitle={`Plain-language explanations based on ${activeProfile?.name ?? "your"} records, and a glossary of medical terms.`}
      />

      <SafetyNotice />
      {usage.data && <QuotaMeter used={used} limit={limit} />}

      <div role="tablist" aria-label="Assistant mode" className="inline-flex p-1 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
        <button type="button" role="tab" aria-selected={mode === "records"} onClick={() => setMode("records")} className={tabClass(mode === "records")}>
          <MessageSquare size={14} aria-hidden="true" /> From my records
        </button>
        <button type="button" role="tab" aria-selected={mode === "reference"} onClick={() => setMode("reference")} className={tabClass(mode === "reference")}>
          <BookOpen size={14} aria-hidden="true" /> Medical terms
        </button>
      </div>

      {mode === "records" ? (
        <>
          <div className="p-3 rounded-xl bg-[var(--green-50)]/50 border border-[var(--border)] text-xs text-[var(--muted)] flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--green-700)] shrink-0" aria-hidden="true" />
            <span>
              Answers come only from <strong>{activeProfile?.name ?? "this profile"}</strong>'s{" "}
              {includeUnverified ? "records (including unverified values, which are labelled)" : "verified records"} and cite their source. If something isn't in the records, it says so.
            </span>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={includeUnverified} onChange={(e) => setIncludeUnverified(e.target.checked)} />
            Also search values I haven't verified yet
          </label>

          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Try asking</p>
              <div className="flex flex-wrap gap-2">
                {RECORD_SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="px-3 py-1.5 rounded-full bg-white hover:bg-[var(--green-50)] text-xs font-medium text-[var(--green-900)] border border-[var(--border)] hover:border-[var(--green-600)]">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-5 pt-2" aria-live="polite">
            {messages.map((msg) =>
              msg.sender === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[var(--green-800)] text-white p-4 shadow-sm">
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <AIAnswerCard
                  key={msg.id}
                  query={msg.question ?? ""}
                  answer={msg.content}
                  citations={msg.citations}
                  onCitationClick={setSelectedCitation}
                  onReportIssue={() => toast.info("Thanks. Please share the question and answer with your administrator so it can be reviewed.")}
                />
              )
            )}
            {chat.isPending && (
              <div role="status" className="p-4 rounded-xl bg-white border border-[var(--border)] flex items-center gap-3 text-xs text-[var(--muted)] shadow-sm">
                <RefreshCw className="w-4 h-4 text-[var(--green-600)] animate-spin" aria-hidden="true" />
                <span>Searching {activeProfile?.name ?? "your"} records…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="sticky bottom-4 z-20 flex items-center gap-2 p-2 bg-white/95 backdrop-blur-md rounded-2xl border border-[var(--border)] shadow-lg"
          >
            <Input
              aria-label="Ask a question about your records"
              value={inputValue}
              maxLength={2000}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Ask about ${activeProfile?.name ?? "your"} tests or medications…`}
              className="border-0 shadow-none focus:ring-0 text-sm"
              disabled={chat.isPending}
            />
            <Button type="submit" variant="primary" size="md" disabled={!inputValue.trim() || chat.isPending} className="shrink-0 gap-1.5 px-4">
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>Ask</span>
            </Button>
          </form>

          <EvidenceDrawer citation={selectedCitation} isOpen={!!selectedCitation} onClose={() => setSelectedCitation(null)} />
        </>
      ) : (
        <section className="space-y-4" aria-label="Medical term lookup">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Lookup type">
            {REFERENCE_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={refMode === m.id}
                onClick={() => {
                  setRefMode(m.id);
                  setRefResult(null);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${refMode === m.id ? "bg-[var(--green-800)] text-white border-[var(--green-800)]" : "border-[var(--border)] text-[var(--muted)]"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (refText.trim()) reference.mutate(refText.trim());
            }}
            className="flex gap-2"
          >
            <Input
              aria-label="Term or question"
              value={refText}
              maxLength={300}
              onChange={(e) => setRefText(e.target.value)}
              placeholder={REFERENCE_MODES.find((m) => m.id === refMode)?.placeholder}
            />
            <Button type="submit" loading={reference.isPending} disabled={!refText.trim()}>
              Look up
            </Button>
          </form>

          {refResult && (
            <Card className="p-5 space-y-3" data-testid="reference-result">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">General reference, not from your records</span>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{refResult.answer}</p>
              {refResult.expanded_answer && <p className="text-sm text-[var(--muted)] whitespace-pre-wrap">{refResult.expanded_answer}</p>}
              {refResult.sources.length > 0 && (
                <ul className="pt-2 border-t border-[var(--border)] space-y-1 text-xs">
                  {refResult.sources.map((s) => (
                    <li key={s.id}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--green-800)] hover:underline">
                        {s.title} <ExternalLink size={11} aria-hidden="true" />
                      </a>
                      <span className="text-[var(--muted)]"> · {s.publisher}</span>
                    </li>
                  ))}
                </ul>
              )}
              {refResult.limitations.length > 0 && (
                <ul className="text-[11px] text-[var(--muted)] list-disc pl-4">
                  {refResult.limitations.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-[var(--muted)]">This information helps explain health records and general medical terms. It does not diagnose or prescribe. Discuss decisions with your doctor.</p>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
