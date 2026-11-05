import React, { useEffect, useState, useRef } from "react";
import {
  createConversation,
  deleteConversation,
  getConversation,
  getDocument,
  listConversations,
  sendChatMessage,
  type ChatAnswerResponse,
  type ChatConversationDetail,
  type ChatConversationSummary,
  type ChatMessage,
  type CitationItem,
  type DocumentItem,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { DocumentViewerModal } from "./DocumentViewerModal";

export function MedicalChat() {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ChatConversationDetail | null>(null);

  const [inputMessage, setInputMessage] = useState("");
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Document modal viewer for citations
  const [viewerDoc, setViewerDoc] = useState<DocumentItem | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "Summarize my latest blood test.",
    "How has my glucose changed across my reports?",
    "Compare my latest and previous HbA1c results.",
    "Which reports mention my hemoglobin?",
    "What does this result mean according to the reference range printed in my report?",
  ];

  const loadConversations = async (autoSelectId?: string) => {
    if (!token) return;
    try {
      setLoadingList(true);
      const list = await listConversations(token);
      setConversations(list);

      const targetId = autoSelectId || (list.length > 0 ? list[0].id : null);
      if (targetId) {
        selectConversation(targetId);
      } else {
        setActiveConversationId(null);
        setActiveConversation(null);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load conversations.");
    } finally {
      setLoadingList(false);
    }
  };

  const selectConversation = async (convId: string) => {
    if (!token) return;
    try {
      setLoadingChat(true);
      setErrorMessage(null);
      setActiveConversationId(convId);
      const detail = await getConversation(token, convId);
      setActiveConversation(detail);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load conversation messages.");
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [token]);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConversation?.messages, sendingMessage]);

  const handleNewConversation = async () => {
    if (!token) return;
    try {
      setErrorMessage(null);
      const newConv = await createConversation(token, "New Medical Chat");
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setActiveConversation({
        id: newConv.id,
        owner_id: newConv.owner_id,
        title: newConv.title,
        created_at: newConv.created_at,
        updated_at: newConv.updated_at,
        messages: [],
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create new conversation.");
    }
  };

  const handleDeleteConversation = async (convId: string, title: string) => {
    if (!token) return;
    const confirmed = window.confirm(`Are you sure you want to delete the conversation "${title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteConversation(token, convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (activeConversationId === convId) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setActiveConversation(null);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete conversation.");
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputMessage).trim();
    if (!text || sendingMessage || !token) return;

    let convId = activeConversationId;
    setSendingMessage(true);
    setErrorMessage(null);
    setLastFailedMessage(null);

    // Optimistically update conversation or create one if none active
    try {
      if (!convId) {
        const newConv = await createConversation(token, text.slice(0, 35));
        convId = newConv.id;
        setActiveConversationId(newConv.id);
        setConversations((prev) => [newConv, ...prev]);
      }

      // Add temporary user message
      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: convId,
        role: "user",
        content: text,
        citations: null,
        created_at: new Date().toISOString(),
      };

      setActiveConversation((prev) =>
        prev
          ? { ...prev, messages: [...prev.messages, tempUserMsg] }
          : {
              id: convId!,
              owner_id: "",
              title: text.slice(0, 35),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              messages: [tempUserMsg],
            }
      );
      setInputMessage("");

      // Send to server
      const answerRes: ChatAnswerResponse = await sendChatMessage(
        token,
        convId,
        text,
        includeUnverified
      );

      const asstMsg: ChatMessage = {
        id: answerRes.message_id,
        conversation_id: convId,
        role: "assistant",
        content: answerRes.answer,
        citations: answerRes.citations,
        created_at: new Date().toISOString(),
      };

      setActiveConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, asstMsg] } : null
      );

      // Refresh conversations list to update title and timestamps
      const updatedList = await listConversations(token);
      setConversations(updatedList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate answer. Please try again.";
      setErrorMessage(msg);
      setLastFailedMessage(text);
      setInputMessage(text); // restore typed message
    } finally {
      setSendingMessage(false);
    }
  };

  const openDocumentViewer = async (docId: string) => {
    if (!token) return;
    try {
      setLoadingDocId(docId);
      const doc = await getDocument(token, docId);
      setViewerDoc(doc);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load original document.");
    } finally {
      setLoadingDocId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="medical-chat-container">
      {/* Sidebar: Conversation history */}
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <button
            type="button"
            className="btn btn-primary btn-sm new-chat-btn"
            onClick={handleNewConversation}
            id="new-conversation-btn"
          >
            + New Clinical Chat
          </button>
        </div>

        <div className="conversation-list" role="list">
          {loadingList ? (
            <div className="sidebar-loading">
              <span className="spinner" />
              <span>Loading conversations…</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="sidebar-empty">
              <p>No past conversations.</p>
              <small>Start a chat to ask questions about your records.</small>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                role="listitem"
                className={`conversation-tab ${activeConversationId === conv.id ? "active" : ""}`}
                onClick={() => selectConversation(conv.id)}
              >
                <div className="conv-title-row">
                  <span className="conv-title" title={conv.title}>
                    💬 {conv.title}
                  </span>
                  <button
                    type="button"
                    className="conv-del-btn"
                    title="Delete conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id, conv.title);
                    }}
                    id={`delete-conv-${conv.id}`}
                  >
                    ×
                  </button>
                </div>
                <span className="conv-date">
                  {new Date(conv.updated_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main-area">
        {/* Chat Header */}
        <div className="chat-main-header">
          <div>
            <h3>
              {activeConversation ? activeConversation.title : "Medical AI Records Assistant"}
            </h3>
            <p className="chat-header-desc">
              Evidence-grounded medical Q&A with source report citations. Not a diagnostic tool.
            </p>
          </div>

          <div className="chat-header-controls">
            <label className="unverified-toggle-label" htmlFor="chat-unverified-toggle">
              <input
                id="chat-unverified-toggle"
                type="checkbox"
                checked={includeUnverified}
                onChange={(e) => setIncludeUnverified(e.target.checked)}
              />
              <span>Include Unverified Observations</span>
            </label>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="alert alert-error chat-alert" role="alert">
            <span>{errorMessage}</span>
            {lastFailedMessage && (
              <button
                type="button"
                className="btn btn-secondary btn-sm retry-btn"
                onClick={() => handleSendMessage(lastFailedMessage)}
              >
                Retry Request
              </button>
            )}
          </div>
        )}

        {/* Chat Feed */}
        <div className="chat-messages-scroll" id="chat-messages-container">
          {loadingChat ? (
            <div className="chat-loading-state">
              <span className="spinner" />
              <span>Loading conversation history…</span>
            </div>
          ) : !activeConversation || activeConversation.messages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="empty-chat-icon">🩺</div>
              <h4>Ask Questions Grounded in Your Medical Reports</h4>
              <p>
                HealthMate AI answers questions using your uploaded laboratory records,
                providing verifiable source citations for every statement.
              </p>

              <div className="suggested-questions-box">
                <span className="sq-title">Suggested clinical queries:</span>
                <div className="sq-grid">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="sq-pill-btn"
                      onClick={() => handleSendMessage(q)}
                    >
                      "{q}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="messages-stream">
              {activeConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-row ${msg.role === "user" ? "user-row" : "assistant-row"}`}
                >
                  <div className={`message-bubble ${msg.role}`}>
                    <div className="message-header-meta">
                      <span className="message-author">
                        {msg.role === "user" ? "You" : "HealthMate AI Assistant"}
                      </span>
                    </div>

                    <div className="message-content-body">
                      {msg.content.split("\n").map((line, idx) => (
                        <p key={idx} className="message-paragraph">
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* Citations Card Section for Assistant Responses */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="citations-container">
                        <div className="citations-header">
                          <span className="citations-title">
                            📎 Supporting Clinical Evidence ({msg.citations.length} sources):
                          </span>
                        </div>
                        <div className="citations-grid">
                          {msg.citations.map((c: CitationItem) => (
                            <div key={c.citation_id} className="citation-card" id={`citation-${c.citation_id.replace(/[\[\]]/g, "")}`}>
                              <div className="citation-top-row">
                                <span className="citation-badge">{c.citation_id}</span>
                                <span className="citation-doc-name" title={c.document_title}>
                                  {c.document_title}
                                </span>
                                {c.is_reviewed ? (
                                  <span className="reviewed-badge">Reviewed</span>
                                ) : (
                                  <span className="auto-badge">Unverified</span>
                                )}
                              </div>

                              <div className="citation-details">
                                {c.clinical_date && (
                                  <span className="cit-detail-item">
                                    <strong>Date:</strong> {c.clinical_date} ({c.date_type})
                                  </span>
                                )}
                                {c.page_number && (
                                  <span className="cit-detail-item">
                                    <strong>Page:</strong> {c.page_number}
                                  </span>
                                )}
                                {c.normalized_test_name && (
                                  <span className="cit-detail-item">
                                    <strong>Analyte:</strong> {c.normalized_test_name}
                                  </span>
                                )}
                                {c.value && (
                                  <span className="cit-detail-item">
                                    <strong>Recorded:</strong> {c.value} {c.unit || ""}
                                  </span>
                                )}
                                {c.reference_range && (
                                  <span className="cit-detail-item">
                                    <strong>Reference:</strong> {c.reference_range}
                                  </span>
                                )}
                              </div>

                              {c.source_text && (
                                <div className="citation-source-excerpt">
                                  <span className="cit-excerpt-label">Excerpt:</span>
                                  <code className="cit-excerpt-code">"{c.source_text}"</code>
                                </div>
                              )}

                              <div className="citation-card-footer">
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm cit-open-btn"
                                  onClick={() => openDocumentViewer(c.document_id)}
                                  disabled={loadingDocId === c.document_id}
                                  id={`open-doc-${c.citation_id.replace(/[\[\]]/g, "")}`}
                                >
                                  {loadingDocId === c.document_id ? "Loading…" : "Open Source Report →"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {sendingMessage && (
                <div className="message-row assistant-row">
                  <div className="message-bubble assistant loading-bubble">
                    <span className="message-author">HealthMate AI Assistant</span>
                    <div className="thinking-dots">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                    <span className="thinking-text">
                      Searching verified records and synthesizing citations…
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="chat-input-container">
          <form
            className="chat-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <textarea
              className="chat-textarea"
              placeholder="Ask a question about your reports (e.g. 'How has my glucose changed over time?'). Press Enter to send."
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sendingMessage}
              id="medical-chat-input"
            />
            <button
              type="submit"
              className="btn btn-primary chat-send-btn"
              disabled={!inputMessage.trim() || sendingMessage}
              id="medical-chat-send-btn"
            >
              {sendingMessage ? "Analyzing…" : "Send Inquiry →"}
            </button>
          </form>

          <div className="chat-footer-disclaimer">
            <small>
              <strong>Clinical Guardrail:</strong> HealthMate AI provides evidence-grounded insights strictly based on your uploaded records.
              It does not diagnose medical conditions, prescribe treatments, or replace qualified medical evaluation.
            </small>
          </div>
        </div>
      </main>

      {/* Document Viewer Modal for Source Traceability */}
      {viewerDoc && (
        <DocumentViewerModal
          document={viewerDoc}
          onClose={() => setViewerDoc(null)}
          onVerified={() => {}}
          onReprocessed={() => {}}
        />
      )}
    </div>
  );
}
