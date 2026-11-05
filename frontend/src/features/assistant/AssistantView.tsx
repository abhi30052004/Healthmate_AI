import React, { useState } from "react";
import { Send, Sparkles, MessageSquare, AlertCircle, RefreshCw, Info } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import {
  SafetyNotice,
  QuotaMeter,
  CitationChip,
  EvidenceDrawer,
  AIAnswerCard,
  type CitationData,
} from "../../components/health/AIHealthComponents";
import type { FamilyProfile } from "../../api/client";

interface ChatItem {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: CitationData[];
}

const INITIAL_SUGGESTIONS = [
  "What was my latest HbA1c result?",
  "Are my liver enzymes trending higher?",
  "List all my current morning prescriptions",
  "What questions should I ask my cardiologist?",
];

const INITIAL_CHAT: ChatItem[] = [
  {
    id: "msg-1",
    sender: "user",
    content: "What was my latest HbA1c and how does it compare to 6 months ago?",
    timestamp: "10:14 AM",
  },
  {
    id: "msg-2",
    sender: "assistant",
    content:
      "According to your latest Comprehensive Metabolic & Glycemic Panel from 14 October 2026, your HbA1c was 6.8% [S1].\n\nCompared to your test on 12 April 2026 (7.4% [S2]), your HbA1c has decreased by 0.6% points over the 6-month interval. This remains above the standard laboratory reference threshold of 5.7%, indicating ongoing diabetic management is advised.",
    timestamp: "10:14 AM",
    citations: [
      {
        id: "cit-1",
        sourceIndex: 1,
        documentTitle: "Metabolic & Glycemic Profile - Sample Diagnostics Lab",
        pageNumber: 2,
        date: "14 Oct 2026",
        excerpt: "HbA1c (Glycosylated Hemoglobin): 6.8 % [Reference: 4.0 - 5.6 %] Method: HPLC",
        isVerified: true,
      },
      {
        id: "cit-2",
        sourceIndex: 2,
        documentTitle: "Routine Health Checkup - SRL Labs",
        pageNumber: 1,
        date: "12 Apr 2026",
        excerpt: "HbA1c: 7.4 % [Reference: < 5.7 %] High",
        isVerified: true,
      },
    ],
  },
];

export function AssistantView({
  token,
  activeProfile,
}: {
  token: string;
  activeProfile?: FamilyProfile;
}) {
  const [messages, setMessages] = useState<ChatItem[]>(INITIAL_CHAT);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<CitationData | null>(null);
  const [usedChats, setUsedChats] = useState(8);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg: ChatItem = {
      id: `usr-${Date.now()}`,
      sender: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);
    setUsedChats((prev) => prev + 1);

    setTimeout(() => {
      const isCardio = text.toLowerCase().includes("cardio") || text.toLowerCase().includes("heart");
      const isLiver = text.toLowerCase().includes("liver") || text.toLowerCase().includes("alt");
      
      let replyContent = `Based on records in ${activeProfile?.name || "your"} health profile:\n\nYour verified records confirm current vitals are stable. You have 2 documented test results matching your inquiry.`;
      let replyCitations: CitationData[] = [
        {
          id: `cit-${Date.now()}`,
          sourceIndex: 1,
          documentTitle: "Verified Health Record",
          pageNumber: 1,
          date: "Current Records",
          excerpt: "Verified clinical parameters recorded under active medical profile.",
          isVerified: true,
        },
      ];

      if (isLiver) {
        replyContent = `Based on your recent Lipid & Liver Function panel from 14 Oct 2026:\n\nYour Alanine Aminotransferase (ALT/SGPT) was 42 U/L [S1], which is within the standard adult laboratory range (< 50 U/L). Your Aspartate Aminotransferase (AST/SGOT) was 38 U/L.`;
        replyCitations = [
          {
            id: `cit-liver-${Date.now()}`,
            sourceIndex: 1,
            documentTitle: "Lipid & Liver Function Profile",
            pageNumber: 2,
            date: "14 Oct 2026",
            excerpt: "ALT (SGPT): 42 U/L (Reference: 10 - 50 U/L). AST (SGOT): 38 U/L.",
            isVerified: true,
          },
        ];
      } else if (isCardio) {
        replyContent = `Here are structured questions prepared from your cardiology records:\n\n1. "My blood pressure averaged 128/82 mmHg this month on Telmisartan 40mg. Is this target on track?"\n2. "Should we schedule a follow-up 2D Echocardiogram in 6 months?" [S1]`;
        replyCitations = [
          {
            id: `cit-cardio-${Date.now()}`,
            sourceIndex: 1,
            documentTitle: "Cardiology Consultation Summary",
            pageNumber: 1,
            date: "05 Aug 2026",
            excerpt: "Advised BP monitoring; review in 6 months with repeat echo.",
            isVerified: true,
          },
        ];
      }

      const assistantMsg: ChatItem = {
        id: `asst-${Date.now()}`,
        sender: "assistant",
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        citations: replyCitations,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-[720px] mx-auto pb-12">
      <PageHeader
        title="AI Health Assistant"
        subtitle={`Explanations and summaries grounded strictly in ${activeProfile?.name || "your"} verified records.`}
      />

      <SafetyNotice />

      <QuotaMeter used={usedChats} limit={20} />

      <div className="p-3 rounded-xl bg-[var(--green-50)]/50 border border-[var(--border)] text-xs text-[var(--muted)] flex items-center gap-2">
        <Info className="w-4 h-4 text-[var(--green-700)] shrink-0" />
        <span>
          <strong>Grounding mode:</strong> The assistant only cites documents you have uploaded and verified. It refuses speculative diagnosis.
        </span>
      </div>

      {/* Suggested prompts */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
          Suggested record inquiries
        </p>
        <div className="flex flex-wrap gap-2">
          {INITIAL_SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-[var(--green-50)] text-xs font-medium text-[var(--green-900)] border border-[var(--border)] transition-colors shadow-2xs hover:border-[var(--green-600)]"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="space-y-5 pt-2">
        {messages.map((msg) => {
          if (msg.sender === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[var(--green-800)] text-white p-4 shadow-sm space-y-1">
                  <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                  <p className="text-[10px] text-emerald-100 text-right">{msg.timestamp}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="space-y-2">
              <AIAnswerCard
                query="Record Query"
                answer={msg.content}
                citations={msg.citations}
                onCitationClick={(cit) => setSelectedCitation(cit)}
                onReportIssue={() => alert("Issue reported to audit review queue.")}
              />
            </div>
          );
        })}

        {isTyping && (
          <div className="p-4 rounded-xl bg-white border border-[var(--border)] flex items-center gap-3 text-xs text-[var(--muted)] shadow-sm">
            <RefreshCw className="w-4 h-4 text-[var(--green-600)] animate-spin" />
            <span>Consulting verified patient documents and calculating longitudinal trends...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="sticky bottom-4 z-20 flex items-center gap-2 p-2 bg-white/95 backdrop-blur-md rounded-2xl border border-[var(--border)] shadow-lg"
      >
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Ask about ${activeProfile?.name || "your"} tests, trends or medications...`}
          className="border-0 shadow-none focus:ring-0 text-sm"
          disabled={isTyping}
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!inputValue.trim() || isTyping}
          className="shrink-0 gap-1.5 px-4"
        >
          <Send className="w-4 h-4" />
          <span>Ask</span>
        </Button>
      </form>

      {/* Citation Detail Modal */}
      <EvidenceDrawer
        citation={selectedCitation}
        isOpen={!!selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}

