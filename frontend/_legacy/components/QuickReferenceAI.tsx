import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Sparkles,
  FileText,
  HelpCircle,
  Stethoscope,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  User,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  queryQuickReference,
  queryProfileQuickReference,
  getQuickReferenceSuggestions,
  getMyAiUsage,
  type QuickReferenceMode,
  type QuickReferenceResponse,
  type QuickReferenceSuggestionMode,
  type AiUsageResponse,
  type FamilyProfile,
  type DocumentItem,
} from "../api/client";

export interface QuickReferenceAIProps {
  token: string;
  activeProfile: FamilyProfile | null;
  documents?: DocumentItem[];
  initialMode?: QuickReferenceMode;
}

export function QuickReferenceAI({
  token,
  activeProfile,
  documents = [],
  initialMode = "medical_term",
}: QuickReferenceAIProps) {
  const [mode, setMode] = useState<QuickReferenceMode>(initialMode);
  const [question, setQuestion] = useState("");
  const [responseStyle, setResponseStyle] = useState<"concise" | "expanded">("concise");
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<QuickReferenceResponse | null>(null);
  const [expandedView, setExpandedView] = useState(false);

  const [suggestions, setSuggestions] = useState<QuickReferenceSuggestionMode[]>([]);
  const [aiUsage, setAiUsage] = useState<AiUsageResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<"helpful" | "not_helpful" | null>(null);

  // Fetch initial suggestions and AI quota
  useEffect(() => {
    getQuickReferenceSuggestions()
      .then((res) => setSuggestions(res.suggestions))
      .catch(() => {});

    if (token) {
      getMyAiUsage(token)
        .then((res) => setAiUsage(res))
        .catch(() => {});
    }
  }, [token]);

  const activeSuggestion = suggestions.find((s) => s.mode === mode);
  const isRecordMode = mode === "explain_report" || mode === "find_records" || mode === "prepare_doctor_questions";

  const handleModeChange = (newMode: QuickReferenceMode) => {
    setMode(newMode);
    setError(null);
    setResponse(null);
    setExpandedView(false);
    setFeedbackGiven(null);
  };

  const handleSuggestionClick = (prompt: string) => {
    setQuestion(prompt);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setFeedbackGiven(null);

    try {
      let res: QuickReferenceResponse;
      if (isRecordMode && activeProfile?.id) {
        const recordIds = selectedDocId ? [selectedDocId] : [];
        res = await queryProfileQuickReference(token, activeProfile.id, {
          mode: mode as any,
          question: question.trim(),
          record_ids: recordIds,
          include_archived: includeArchived,
          response_style: responseStyle,
        });
      } else {
        res = await queryQuickReference(token, {
          mode,
          question: question.trim(),
          response_style: responseStyle,
        });
      }
      setResponse(res);

      // Refresh AI quota
      getMyAiUsage(token)
        .then((u) => setAiUsage(u))
        .catch(() => {});
    } catch (err: any) {
      setError(err?.message || "Failed to process request. Please check your network or try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAnswer = () => {
    if (!response?.answer) return;
    navigator.clipboard.writeText(response.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="hm-quick-ref-container p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Sparkles size={20} />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Quick Reference AI Assistant</h2>
          </div>
          <p className="text-sm text-slate-500">
            Source-grounded medical terminology explanations, test references, and verified health record navigation.
          </p>
        </div>

        {/* Profile & Quota Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {activeProfile && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
              <User size={14} />
              <span>Profile: <strong>{activeProfile.name}</strong></span>
            </div>
          )}
          {aiUsage && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>AI Quota: <strong>{aiUsage.quick_reference_remaining}</strong> / {aiUsage.quick_reference_limit} remaining</span>
            </div>
          )}
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Select Assistant Mode
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { id: "medical_term", label: "Medical Term", icon: <BookOpen size={16} /> },
            { id: "understand_test", label: "Understand Test", icon: <HelpCircle size={16} /> },
            { id: "explain_report", label: "Explain Report", icon: <FileText size={16} /> },
            { id: "find_records", label: "Find Records", icon: <Search size={16} /> },
            { id: "prepare_doctor_questions", label: "Doctor Questions", icon: <Stethoscope size={16} /> },
            { id: "general_reference", label: "General Health", icon: <Info size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleModeChange(tab.id as QuickReferenceMode)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Mode Banner & Scope Tag */}
      <div className="flex items-center justify-between p-3.5 mb-5 bg-slate-50 rounded-lg border border-slate-100 text-sm">
        <div className="flex items-center gap-2">
          <Info size={17} className="text-slate-500" />
          <span className="text-slate-700 font-medium">{activeSuggestion?.description}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
              isRecordMode
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
          >
            {isRecordMode ? "From Your Records" : "General Medical Reference"}
          </span>
        </div>
      </div>

      {/* Prompt Suggestion Chips */}
      {activeSuggestion?.example_prompts && activeSuggestion.example_prompts.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Example Prompts:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSuggestion.example_prompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestionClick(prompt)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition-colors text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Query Form */}
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div>
          <label htmlFor="qr-question-input" className="sr-only">
            Enter your question
          </label>
          <div className="relative">
            <input
              id="qr-question-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                mode === "medical_term"
                  ? "Enter a medical term (e.g. HbA1c, Creatinine, Dyslipidemia)..."
                  : mode === "understand_test"
                  ? "Enter test name (e.g. Complete Blood Count, Lipid Panel)..."
                  : mode === "explain_report"
                  ? "What would you like explained about your report?"
                  : mode === "find_records"
                  ? "What test result or observation are you looking for?"
                  : mode === "prepare_doctor_questions"
                  ? "What upcoming visit or clinical concern are you preparing for?"
                  : "Ask any general health or wellness question..."
              }
              className="w-full px-4 py-3 pr-28 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm shadow-sm"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="absolute right-2 top-2 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Searching…</span>
                </>
              ) : (
                <>
                  <Search size={14} />
                  <span>Query</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Options Row */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-4 pt-1">
          <div className="flex items-center gap-4">
            {/* Style Selector */}
            <div className="flex items-center gap-1.5">
              <span>Answer Style:</span>
              <button
                type="button"
                onClick={() => setResponseStyle("concise")}
                className={`px-2 py-1 rounded ${
                  responseStyle === "concise" ? "bg-slate-200 font-semibold text-slate-900" : "hover:bg-slate-100"
                }`}
              >
                Concise
              </button>
              <button
                type="button"
                onClick={() => setResponseStyle("expanded")}
                className={`px-2 py-1 rounded ${
                  responseStyle === "expanded" ? "bg-slate-200 font-semibold text-slate-900" : "hover:bg-slate-100"
                }`}
              >
                Expanded
              </button>
            </div>

            {/* Document Selector for explain_report mode */}
            {mode === "explain_report" && documents.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span>Select Report:</span>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="">All Verified Reports</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.filename} {d.document_date ? `(${d.document_date})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Archived toggle for record modes */}
          {isRecordMode && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Include archived documents</span>
            </label>
          )}
        </div>
      </form>

      {/* Error Notice */}
      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-800">
          <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
          <div>
            <strong>Query Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Result Card */}
      {response && (
        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Result Header */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  response.status === "emergency_redirect"
                    ? "bg-red-500 animate-pulse"
                    : response.status === "grounded"
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                {response.status === "emergency_redirect"
                  ? "Emergency Safety Notice"
                  : response.status === "grounded"
                  ? "Evidence Grounded"
                  : "Information Notice"}
              </span>
              <span className="text-xs text-slate-400">• {response.request_id}</span>
            </div>

            <div className="flex items-center gap-2">
              {response.generation?.provider && (
                <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Engine: {response.generation.provider} {response.generation.cached ? "(Cached)" : ""}
                </span>
              )}
              <button
                type="button"
                onClick={handleCopyAnswer}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                title="Copy Answer"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Result Body */}
          <div className="p-6">
            <div className="prose prose-slate max-w-none text-slate-800 whitespace-pre-line text-sm leading-relaxed">
              {response.answer}
            </div>

            {/* Optional Expanded Content Accordion */}
            {response.expanded_answer && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExpandedView(!expandedView)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  {expandedView ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  <span>{expandedView ? "Hide Detailed Reference" : "Show Detailed Reference"}</span>
                </button>
                {expandedView && (
                  <div className="mt-3 p-4 bg-slate-50 rounded-lg text-xs text-slate-700 whitespace-pre-line border border-slate-200 leading-relaxed">
                    {response.expanded_answer}
                  </div>
                )}
              </div>
            )}

            {/* Suggested Doctor Questions */}
            {response.questions_to_ask && response.questions_to_ask.length > 0 && (
              <div className="mt-5 p-4 bg-sky-50 rounded-lg border border-sky-100">
                <div className="flex items-center gap-2 mb-2 text-sky-900 font-semibold text-xs uppercase tracking-wider">
                  <Stethoscope size={15} />
                  <span>Neutral Questions for Your Doctor</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs text-sky-950">
                  {response.questions_to_ask.map((q, qIdx) => (
                    <li key={qIdx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Record Citations Section */}
            {response.record_citations && response.record_citations.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-200">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                  <FileText size={15} />
                  <span>Cited Verified Record Sources</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {response.record_citations.map((cit, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700"
                    >
                      <div className="flex items-center justify-between font-semibold mb-1">
                        <span className="text-slate-900">
                          {cit.id} {cit.test_name}
                        </span>
                        {cit.abnormal_flag && cit.abnormal_flag !== "NORMAL" && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                            {cit.abnormal_flag}
                          </span>
                        )}
                      </div>
                      <div className="text-slate-600">
                        Value: <strong>{cit.value} {cit.unit || ""}</strong>
                        {cit.reference_range ? ` (Ref: ${cit.reference_range})` : ""}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        Report: {cit.document_title} • Page {cit.page_number}
                        {cit.clinical_date ? ` • ${cit.clinical_date}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Curated Sources Section */}
            {response.sources && response.sources.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-200">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                  <ShieldCheck size={15} />
                  <span>Curated Medical Knowledge Sources</span>
                </h4>
                <div className="space-y-2">
                  {response.sources.map((src, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{src.title}</div>
                        <div className="text-slate-500 text-[11px]">
                          Publisher: {src.publisher}
                          {src.license_or_reuse_note ? ` • ${src.license_or_reuse_note}` : ""}
                        </div>
                      </div>
                      {src.url && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:underline shrink-0 ml-3"
                        >
                          <span>Reference</span>
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mandatory Safety Limitations Footer */}
            <div className="mt-6 p-3.5 bg-slate-100 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-slate-500 mt-0.5 shrink-0" />
              <div>
                <strong>Clinical Safety Notice:</strong>{" "}
                {response.limitations.join(" ")}
              </div>
            </div>

            {/* Feedback Bar */}
            <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px]">Was this answer helpful?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackGiven("helpful")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-colors ${
                    feedbackGiven === "helpful"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <ThumbsUp size={13} />
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackGiven("not_helpful")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-colors ${
                    feedbackGiven === "not_helpful"
                      ? "bg-amber-50 text-amber-700 border-amber-200 font-semibold"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <ThumbsDown size={13} />
                  <span>No</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

