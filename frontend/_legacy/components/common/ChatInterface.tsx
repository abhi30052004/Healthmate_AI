import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, AlertCircle, RefreshCw, Paperclip, FileText, Check } from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  citations?: Array<{
    document_title?: string;
    snippet?: string;
    observation_id?: string;
  }>;
}

export interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  suggestedQuestions?: string[];
  placeholder?: string;
  disclaimer?: string;
  onClearHistory?: () => void;
  className?: string;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  suggestedQuestions = [
    "What do my latest fasting blood glucose results indicate?",
    "Summarize my active medications for my next doctor visit.",
    "Are there any flag discrepancies in my recent lab reports?",
    "Explain what high total cholesterol means in my lipid panel.",
  ],
  placeholder = "Ask anything about your medical reports and observations...",
  disclaimer = "HealthMate AI provides evidence-grounded medical explanations for informational purposes. It is not a substitute for professional medical advice, diagnosis, or treatment.",
  onClearHistory,
  className = "",
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleSelectSuggested = (question: string) => {
    if (isLoading) return;
    onSendMessage(question);
  };

  return (
    <div className={`hm-chat-interface-card ${className}`}>
      {/* Chat Header */}
      <div className="hm-chat-header">
        <div className="hm-chat-title-group">
          <div className="hm-chat-avatar-icon">
            <Sparkles size={18} className="text-teal" />
          </div>
          <div>
            <h3 className="hm-chat-title">AI Medical Assistant</h3>
            <span className="hm-chat-status">
              <span className="hm-online-dot" /> Evidence-Grounded in Your Clinical Records
            </span>
          </div>
        </div>

        {onClearHistory && messages.length > 0 && (
          <button
            type="button"
            className="hm-btn hm-btn-xs hm-btn-ghost"
            onClick={onClearHistory}
            title="Reset conversation"
          >
            <RefreshCw size={13} />
            <span>Reset Chat</span>
          </button>
        )}
      </div>

      {/* Medical Safety Banner */}
      <div className="hm-chat-disclaimer-banner" role="note">
        <AlertCircle size={14} className="text-teal flex-shrink-0" />
        <p>{disclaimer}</p>
      </div>

      {/* Messages Scroll Area */}
      <div className="hm-chat-messages-container">
        {messages.length === 0 ? (
          <div className="hm-chat-empty-intro">
            <div className="hm-chat-intro-circle">
              <Bot size={36} className="text-teal" />
            </div>
            <h4>How can I help you understand your health records today?</h4>
            <p>
              I can analyze your lab reports, explain medical terms, identify trends in your observations, and help you draft questions for your next clinician visit.
            </p>

            <div className="hm-suggested-prompts-section">
              <span className="hm-suggested-label">Suggested clinical queries:</span>
              <div className="hm-suggested-chips-grid">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="hm-suggested-chip"
                    onClick={() => handleSelectSuggested(q)}
                  >
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`hm-message-bubble-wrapper is-${msg.role}`}
            >
              <div className={`hm-msg-avatar is-${msg.role}`}>
                {msg.role === "assistant" ? (
                  <Bot size={16} />
                ) : (
                  <User size={16} />
                )}
              </div>

              <div className="hm-msg-content-box">
                <div className="hm-msg-text">{msg.content}</div>

                {msg.citations && msg.citations.length > 0 && (
                  <div className="hm-msg-citations-strip">
                    <span className="hm-citations-title">Referenced Sources:</span>
                    {msg.citations.map((cite, cIdx) => (
                      <div key={cIdx} className="hm-citation-item">
                        <FileText size={12} className="text-teal" />
                        <span>{cite.document_title || "Laboratory Report"}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.timestamp && (
                  <span className="hm-msg-timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="hm-message-bubble-wrapper is-assistant">
            <div className="hm-msg-avatar is-assistant">
              <Bot size={16} />
            </div>
            <div className="hm-msg-content-box is-loading">
              <div className="hm-typing-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="hm-typing-label">Analyzing clinical records…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="hm-chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="hm-chat-input-field"
          aria-label="Ask medical question"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="hm-chat-send-btn"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

