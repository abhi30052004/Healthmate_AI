import React, { useState } from "react";
import {
  generateVisitPackDraft,
  exportVisitPackPdf,
  ApiError,
  type DoctorVisitPackData,
  type VisitPackQuestionItem,
  type FamilyProfile,
} from "../api/client";
import { useAuth } from "../context/AuthContext";

interface DoctorVisitPackProps {
  activeProfile?: FamilyProfile | null;
}

export function DoctorVisitPack({ activeProfile }: DoctorVisitPackProps = {}) {
  const { token, handleSessionExpired } = useAuth();

  // Filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "documents",
    "observations",
    "trends",
    "medications",
    "care_schedule",
    "clinician_questions",
    "patient_notes",
  ]);
  const [clinicianNameInput, setClinicianNameInput] = useState("");
  const [chiefComplaintInput, setChiefComplaintInput] = useState("");

  // Draft & Generation state
  const [draft, setDraft] = useState<DoctorVisitPackData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // New question input
  const [newQuestionText, setNewQuestionText] = useState("");

  const handleCategoryToggle = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleGenerateDraft = async () => {
    if (!token) return;
    setStatusMessage(null);
    setIsGenerating(true);

    try {
      const draftData = await generateVisitPackDraft(token, {
        start_date: startDate.trim() || null,
        end_date: endDate.trim() || null,
        include_unverified: includeUnverified,
        categories: selectedCategories,
        clinician_name: clinicianNameInput.trim() || null,
        chief_complaint: chiefComplaintInput.trim() || null,
        profile_id: activeProfile?.id || null,
      });

      setDraft(draftData);
      setStatusMessage({
        type: "success",
        text: `Visit pack draft assembled for ${draftData.patient_name} with ${draftData.observations.length} observation(s), ${draftData.medications.length} medication(s), and ${draftData.clinician_questions.length} discussion question(s).`,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        handleSessionExpired("Your session expired. Please sign in again.");
      } else {
        const msg = err instanceof ApiError ? err.message : "Failed to generate visit pack draft.";
        setStatusMessage({ type: "error", text: msg });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!token || !draft) return;
    setStatusMessage(null);
    setIsExporting(true);

    try {
      const blob = await exportVisitPackPdf(token, draft);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `doctor_visit_pack_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatusMessage({
        type: "success",
        text: "Doctor Visit Pack PDF downloaded successfully.",
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        handleSessionExpired("Your session expired. Please sign in again.");
      } else {
        const msg = err instanceof ApiError ? err.message : "Failed to export visit pack PDF.";
        setStatusMessage({ type: "error", text: msg });
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle helpers inside draft
  const toggleObservationIncluded = (obsId: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      observations: draft.observations.map((o) =>
        o.observation_id === obsId ? { ...o, included: !o.included } : o
      ),
    });
  };

  const toggleTrendIncluded = (testName: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      trends: draft.trends.map((t) =>
        t.test_name === testName ? { ...t, included: !t.included } : t
      ),
    });
  };

  const toggleMedicationIncluded = (medId: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      medications: draft.medications.map((m) =>
        m.id === medId ? { ...m, included: !m.included } : m
      ),
    });
  };

  const toggleAppointmentIncluded = (apptId: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      appointments: draft.appointments.map((a) =>
        a.id === apptId ? { ...a, included: !a.included } : a
      ),
    });
  };

  const toggleTaskIncluded = (taskId: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      follow_up_tasks: draft.follow_up_tasks.map((tk) =>
        tk.id === taskId ? { ...tk, included: !tk.included } : tk
      ),
    });
  };

  const toggleQuestionIncluded = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      clinician_questions: draft.clinician_questions.map((q, idx) =>
        idx === index ? { ...q, included: !q.included } : q
      ),
    });
  };

  const handleAddCustomQuestion = () => {
    if (!draft || !newQuestionText.trim()) return;
    const newQ: VisitPackQuestionItem = {
      question: newQuestionText.trim(),
      rationale: "Patient-entered inquiry for doctor visit",
      source_reference: "Patient Notes",
      included: true,
    };
    setDraft({
      ...draft,
      clinician_questions: [...draft.clinician_questions, newQ],
    });
    setNewQuestionText("");
  };

  const handleRemoveQuestion = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      clinician_questions: draft.clinician_questions.filter((_, idx) => idx !== index),
    });
  };

  return (
    <div className="doctor-visit-pack-container">
      {/* Header Banner */}
      <div className="section-header-row">
        <div>
          <h2>Doctor Visit Preparation Pack</h2>
          <p className="section-description">
            Prepare a clear, evidence-grounded summary of your clinical records, test observations,
            medications, and discussion questions for an upcoming doctor appointment.
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="clinical-notice-box" role="note" style={{ marginBottom: "1.25rem" }}>
        <strong>CLINICAL DISCUSSION TOOL:</strong> This visit pack is a personal record-organization
        summary. It does not provide medical diagnoses or alter prescribed treatment. All factual findings
        derive strictly from your uploaded reports and user-logged records.
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`alert ${
            statusMessage.type === "success"
              ? "alert-success"
              : statusMessage.type === "error"
              ? "alert-danger"
              : "alert-info"
          }`}
          role="status"
          aria-live="polite"
          style={{ marginBottom: "1rem" }}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Generator Configuration Panel */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <h3>1. Configure Visit Pack Scope</h3>
        </div>
        <div className="card-body">
          <div className="grid-2-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
            <div className="form-group">
              <label htmlFor="vp-start-date">Start Date Filter (Optional)</label>
              <input
                id="vp-start-date"
                type="date"
                className="input-text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="vp-end-date">End Date Filter (Optional)</label>
              <input
                id="vp-end-date"
                type="date"
                className="input-text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
            <div className="form-group">
              <label htmlFor="vp-clinician-name">Physician or Clinic Name (Optional)</label>
              <input
                id="vp-clinician-name"
                type="text"
                className="input-text"
                placeholder="e.g. Dr. Emily Thorne, Endocrinology"
                value={clinicianNameInput}
                onChange={(e) => setClinicianNameInput(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="vp-chief-complaint">Primary Reason for Visit / Chief Symptoms</label>
              <input
                id="vp-chief-complaint"
                type="text"
                className="input-text"
                placeholder="e.g. 6-month checkup on blood sugar and fatigue"
                value={chiefComplaintInput}
                onChange={(e) => setChiefComplaintInput(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              Include Record Categories:
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              <label className="checkbox-label" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes("documents")}
                  onChange={() => handleCategoryToggle("documents")}
                />
                Analyzed Reports
              </label>
              <label className="checkbox-label" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes("observations")}
                  onChange={() => handleCategoryToggle("observations")}
                />
                Clinical & Lab Results
              </label>
              <label className="checkbox-label" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes("trends")}
                  onChange={() => handleCategoryToggle("trends")}
                />
                Longitudinal Trends
              </label>
              <label className="checkbox-label" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes("medications")}
                  onChange={() => handleCategoryToggle("medications")}
                />
                Current Medications
              </label>
              <label className="checkbox-label" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes("care_schedule")}
                  onChange={() => handleCategoryToggle("care_schedule")}
                />
                Care Schedule & Tasks
              </label>
              <label className="checkbox-label" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes("clinician_questions")}
                  onChange={() => handleCategoryToggle("clinician_questions")}
                />
                Discussion Questions
              </label>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label className="checkbox-label" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={includeUnverified}
                onChange={(e) => setIncludeUnverified(e.target.checked)}
              />
              <span>Include unverified extracted observations</span>
            </label>
            {includeUnverified && (
              <span className="pill wait" style={{ marginLeft: "0.75rem", fontSize: "0.75rem" }}>
                Caution: Unreviewed OCR observations will be included
              </span>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerateDraft}
            disabled={isGenerating}
            id="btn-generate-visit-pack"
          >
            {isGenerating ? "Assembling Visit Pack…" : "⚡ Generate Visit Pack Draft"}
          </button>
        </div>
      </div>

      {/* Review & Edit Preview Section */}
      {draft && (
        <div className="visit-pack-draft-review">
          <div className="section-header-row" style={{ alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3>2. Review and Customize Your Pack</h3>
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                Generated on {draft.generated_at} for {draft.patient_name} ({draft.patient_email}).
                Uncheck items you do not wish to share, or edit questions and notes before exporting.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              id="btn-download-visit-pack-pdf"
            >
              {isExporting ? "Rendering PDF…" : "📥 Download Doctor Visit Pack (PDF)"}
            </button>
          </div>

          {/* Patient Details & Chief Complaint Customization */}
          <div className="card" style={{ marginBottom: "1.25rem" }}>
            <div className="card-header">
              <h4>Patient Notes & Visit Purpose</h4>
            </div>
            <div className="card-body">
              <div className="grid-2-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
                <div className="form-group">
                  <label htmlFor="edit-clinician-name">Attending Clinician / Facility</label>
                  <input
                    id="edit-clinician-name"
                    type="text"
                    className="input-text"
                    value={draft.clinician_name || ""}
                    onChange={(e) => setDraft({ ...draft, clinician_name: e.target.value })}
                    placeholder="e.g. Dr. Emily Thorne"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-chief-complaint">Primary Reason for Visit / Chief Complaint</label>
                  <input
                    id="edit-chief-complaint"
                    type="text"
                    className="input-text"
                    value={draft.chief_complaint || ""}
                    onChange={(e) => setDraft({ ...draft, chief_complaint: e.target.value })}
                    placeholder="e.g. Follow-up on blood glucose and fatigue"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit-patient-notes">Personal Notes & Context for Doctor</label>
                <textarea
                  id="edit-patient-notes"
                  className="input-text"
                  rows={3}
                  value={draft.patient_notes || ""}
                  onChange={(e) => setDraft({ ...draft, patient_notes: e.target.value })}
                  placeholder="Add any specific questions, daily symptoms, or notes you want your doctor to see…"
                />
              </div>
            </div>
          </div>

          {/* Clinician Discussion Questions */}
          <div className="card" style={{ marginBottom: "1.25rem" }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4>Questions to Discuss with Clinician ({draft.clinician_questions.filter((q) => q.included).length} Included)</h4>
            </div>
            <div className="card-body">
              {draft.clinician_questions.length === 0 ? (
                <p className="text-muted">No discussion questions generated.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                  {draft.clinician_questions.map((q, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        padding: "0.75rem",
                        background: q.included ? "var(--bg-panel, #f8fafc)" : "var(--bg-muted, #f1f5f9)",
                        border: "1px solid var(--border-color, #e2e8f0)",
                        borderRadius: "6px",
                        opacity: q.included ? 1 : 0.6,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={q.included}
                        onChange={() => toggleQuestionIncluded(idx)}
                        style={{ marginTop: "0.25rem" }}
                        id={`q-check-${idx}`}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: "var(--text-main, #0f172a)" }}>
                          {q.question}
                        </div>
                        {q.rationale && (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)", marginTop: "0.2rem" }}>
                            Context: {q.rationale}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRemoveQuestion(idx)}
                        title="Remove question"
                        style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Custom Question */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Type a custom question to ask your doctor…"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomQuestion();
                    }
                  }}
                  id="input-custom-question"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddCustomQuestion}
                  disabled={!newQuestionText.trim()}
                  id="btn-add-custom-question"
                >
                  Add Question
                </button>
              </div>
            </div>
          </div>

          {/* Clinical Observations Table */}
          <div className="card" style={{ marginBottom: "1.25rem" }}>
            <div className="card-header">
              <h4>Clinical Observations & Lab Results ({draft.observations.filter((o) => o.included).length} of {draft.observations.length} Selected)</h4>
            </div>
            <div className="card-body">
              {draft.observations.length === 0 ? (
                <div className="empty-state-notice">
                  <p className="text-muted">No clinical observations found for the selected scope.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ width: "100%", fontSize: "0.85rem" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "40px" }}>Include</th>
                        <th>Test Analyte</th>
                        <th>Category</th>
                        <th>Value & Unit</th>
                        <th>Reference Range</th>
                        <th>Flag</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Source Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.observations.map((obs) => {
                        const isFlagged = obs.flag === "HIGH" || obs.flag === "LOW" || obs.flag === "ABNORMAL";
                        return (
                          <tr key={obs.observation_id} style={{ opacity: obs.included ? 1 : 0.5 }}>
                            <td>
                              <input
                                type="checkbox"
                                checked={obs.included}
                                onChange={() => toggleObservationIncluded(obs.observation_id)}
                                id={`obs-check-${obs.observation_id}`}
                              />
                            </td>
                            <td><strong>{obs.test_name}</strong></td>
                            <td>{obs.category}</td>
                            <td>{obs.value} {obs.unit || ""}</td>
                            <td>{obs.reference_range || "—"}</td>
                            <td>
                              {isFlagged ? (
                                <span className="pill bad">{obs.flag}</span>
                              ) : (
                                <span className="pill ok">NORMAL</span>
                              )}
                            </td>
                            <td>{obs.clinical_date || "—"}</td>
                            <td>
                              {obs.is_verified ? (
                                <span className="pill ok" style={{ fontSize: "0.7rem" }}>Verified</span>
                              ) : (
                                <span className="pill wait" style={{ fontSize: "0.7rem" }}>Unverified</span>
                              )}
                            </td>
                            <td>{obs.document_title}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Current Medications List */}
          <div className="card" style={{ marginBottom: "1.25rem" }}>
            <div className="card-header">
              <h4>Current Active Medications ({draft.medications.filter((m) => m.included).length} Included)</h4>
            </div>
            <div className="card-body">
              {draft.medications.length === 0 ? (
                <p className="text-muted">No active medications recorded in your Care Organizer.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {draft.medications.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.6rem 0.8rem",
                        background: m.included ? "var(--bg-panel, #f8fafc)" : "var(--bg-muted, #f1f5f9)",
                        border: "1px solid var(--border-color, #e2e8f0)",
                        borderRadius: "6px",
                        opacity: m.included ? 1 : 0.5,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={m.included}
                        onChange={() => toggleMedicationIncluded(m.id)}
                        id={`med-check-${m.id}`}
                      />
                      <div style={{ flex: 1 }}>
                        <strong>{m.name}</strong> {m.strength && <span>({m.strength})</span>}
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>
                          {m.dosage_instructions || m.frequency || "Regular schedule"}
                          {m.prescriber && ` • Prescribed by: ${m.prescriber}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Longitudinal Trends */}
          {draft.trends.length > 0 && (
            <div className="card" style={{ marginBottom: "1.25rem" }}>
              <div className="card-header">
                <h4>Measurable Longitudinal Trends ({draft.trends.filter((t) => t.included).length} Included)</h4>
              </div>
              <div className="card-body">
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {draft.trends.map((t) => (
                    <div
                      key={t.test_name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.6rem 0.8rem",
                        background: t.included ? "var(--bg-panel, #f8fafc)" : "var(--bg-muted, #f1f5f9)",
                        border: "1px solid var(--border-color, #e2e8f0)",
                        borderRadius: "6px",
                        opacity: t.included ? 1 : 0.5,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={t.included}
                        onChange={() => toggleTrendIncluded(t.test_name)}
                        id={`trend-check-${t.test_name}`}
                      />
                      <div style={{ flex: 1 }}>
                        <strong>{t.test_name}</strong> ({t.category}): {t.baseline_value} ({t.baseline_date}) → {t.latest_value} ({t.latest_date})
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>
                          {t.change_description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Care Schedule: Appointments and Tasks */}
          {(draft.appointments.length > 0 || draft.follow_up_tasks.length > 0) && (
            <div className="card" style={{ marginBottom: "1.25rem" }}>
              <div className="card-header">
                <h4>Scheduled Care & Follow-Up Tasks</h4>
              </div>
              <div className="card-body">
                {draft.appointments.length > 0 && (
                  <div style={{ marginBottom: "1rem" }}>
                    <h5 style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>Upcoming Appointments:</h5>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {draft.appointments.map((a) => (
                        <label
                          key={a.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.85rem",
                            opacity: a.included ? 1 : 0.5,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={a.included}
                            onChange={() => toggleAppointmentIncluded(a.id)}
                            id={`appt-check-${a.id}`}
                          />
                          <span>
                            <strong>{a.title}</strong> — {a.scheduled_at} {a.provider_name && `(${a.provider_name})`}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {draft.follow_up_tasks.length > 0 && (
                  <div>
                    <h5 style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>Pending Follow-Up Tasks:</h5>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {draft.follow_up_tasks.map((tk) => (
                        <label
                          key={tk.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.85rem",
                            opacity: tk.included ? 1 : 0.5,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={tk.included}
                            onChange={() => toggleTaskIncluded(tk.id)}
                            id={`task-check-${tk.id}`}
                          />
                          <span>
                            [ ] <strong>{tk.title}</strong> {tk.due_at && `(Due: ${tk.due_at})`}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownloadPdf}
              disabled={isExporting}
            >
              {isExporting ? "Rendering PDF…" : "📥 Download Doctor Visit Pack (PDF)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
