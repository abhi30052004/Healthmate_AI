import React, { useState, useEffect, useCallback } from "react";
import {
  getCareOverview,
  getCareCalendar,
  listMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  listFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  listDocuments,
  type MedicationRecord,
  type MedicationCreate,
  type AppointmentRecord,
  type AppointmentCreate,
  type FollowUpTask,
  type FollowUpTaskCreate,
  type CareCalendarItem,
  type CareOverviewResponse,
  type DocumentItem,
} from "../api/client";

import { SmartReminders } from "./SmartReminders";

interface CareOrganizerProps {
  token: string;
}

type CareSubTab = "overview" | "medications" | "appointments" | "follow_ups" | "calendar" | "reminders";

export function CareOrganizer({ token }: CareOrganizerProps) {
  const [activeSubTab, setActiveSubTab] = useState<CareSubTab>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // User documents for linking
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  // Overview data
  const [overview, setOverview] = useState<CareOverviewResponse | null>(null);

  // Medications state
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [medStatusFilter, setMedStatusFilter] = useState("all");
  const [medSearch, setMedSearch] = useState("");
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicationRecord | null>(null);
  const [medForm, setMedForm] = useState<MedicationCreate>({
    name: "",
    medication_type: "Prescription",
    strength: "",
    dosage_instructions: "",
    route: "Oral",
    frequency: "",
    start_date: "",
    end_date: "",
    prescriber: "",
    pharmacy: "",
    notes: "",
    status: "active",
    source_document_id: null,
  });

  // Appointments state
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [apptStatusFilter, setApptStatusFilter] = useState("all");
  const [apptTimeframeFilter, setApptTimeframeFilter] = useState<"all" | "upcoming" | "past">("all");
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<AppointmentRecord | null>(null);
  const [apptForm, setApptForm] = useState<AppointmentCreate>({
    title: "",
    appointment_type: "Follow-up",
    provider_name: "",
    location: "",
    scheduled_at: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    status: "scheduled",
    notes: "",
    source_document_id: null,
  });

  // Follow-Up Tasks state
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FollowUpTask | null>(null);
  const [taskForm, setTaskForm] = useState<FollowUpTaskCreate>({
    title: "",
    description: "",
    due_at: "",
    priority: "medium",
    status: "pending",
    appointment_id: null,
    source_document_id: null,
  });

  // Calendar state
  const [calendarItems, setCalendarItems] = useState<CareCalendarItem[]>([]);
  const [calStartDate, setCalStartDate] = useState("");
  const [calEndDate, setCalEndDate] = useState("");

  // Deletion confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "medication" | "appointment" | "task";
    id: string;
    title: string;
  } | null>(null);

  // Load documents for linking dropdowns
  useEffect(() => {
    listDocuments(token)
      .then(setDocuments)
      .catch(() => {});
  }, [token]);

  // Load current tab data
  const loadActiveTabData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeSubTab === "overview") {
        const ov = await getCareOverview(token);
        setOverview(ov);
      } else if (activeSubTab === "medications") {
        const meds = await listMedications(token, {
          status: medStatusFilter !== "all" ? medStatusFilter : undefined,
          search: medSearch || undefined,
        });
        setMedications(meds);
      } else if (activeSubTab === "appointments") {
        const appts = await listAppointments(token, {
          status: apptStatusFilter !== "all" ? apptStatusFilter : undefined,
        });
        setAppointments(appts);
      } else if (activeSubTab === "follow_ups") {
        const tasks = await listFollowUps(token, {
          status: taskStatusFilter !== "all" ? taskStatusFilter : undefined,
        });
        setFollowUps(tasks);
      } else if (activeSubTab === "calendar") {
        const cal = await getCareCalendar(token, {
          startDate: calStartDate || undefined,
          endDate: calEndDate || undefined,
        });
        setCalendarItems(cal.items);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load care data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, activeSubTab, medStatusFilter, medSearch, apptStatusFilter, taskStatusFilter, calStartDate, calEndDate]);

  useEffect(() => {
    loadActiveTabData();
  }, [loadActiveTabData]);

  // -------------------------------------------------------------------------
  // Medication Handlers
  // -------------------------------------------------------------------------

  function openMedModal(med?: MedicationRecord) {
    if (med) {
      setEditingMed(med);
      setMedForm({
        name: med.name,
        medication_type: med.medication_type || "Prescription",
        strength: med.strength || "",
        dosage_instructions: med.dosage_instructions || "",
        route: med.route || "Oral",
        frequency: med.frequency || "",
        start_date: med.start_date || "",
        end_date: med.end_date || "",
        prescriber: med.prescriber || "",
        pharmacy: med.pharmacy || "",
        notes: med.notes || "",
        status: med.status,
        source_document_id: med.source_document_id || null,
      });
    } else {
      setEditingMed(null);
      setMedForm({
        name: "",
        medication_type: "Prescription",
        strength: "",
        dosage_instructions: "",
        route: "Oral",
        frequency: "",
        start_date: "",
        end_date: "",
        prescriber: "",
        pharmacy: "",
        notes: "",
        status: "active",
        source_document_id: null,
      });
    }
    setMedModalOpen(true);
  }

  async function handleSaveMedication(e: React.FormEvent) {
    e.preventDefault();
    if (!medForm.name.trim()) {
      setError("Medication name is required.");
      return;
    }
    setError(null);
    try {
      const payload: MedicationCreate = {
        ...medForm,
        start_date: medForm.start_date || null,
        end_date: medForm.end_date || null,
        source_document_id: medForm.source_document_id || null,
      };

      if (editingMed) {
        await updateMedication(token, editingMed.id, payload);
        setSuccessMsg(`Updated medication "${payload.name}" successfully.`);
      } else {
        await createMedication(token, payload);
        setSuccessMsg(`Recorded medication "${payload.name}" successfully.`);
      }
      setMedModalOpen(false);
      loadActiveTabData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save medication";
      setError(msg);
    }
  }

  // -------------------------------------------------------------------------
  // Appointment Handlers
  // -------------------------------------------------------------------------

  function openApptModal(appt?: AppointmentRecord) {
    if (appt) {
      setEditingAppt(appt);
      // Format scheduled_at for datetime-local input
      const localIso = appt.scheduled_at ? new Date(appt.scheduled_at).toISOString().slice(0, 16) : "";
      setApptForm({
        title: appt.title,
        appointment_type: appt.appointment_type || "Follow-up",
        provider_name: appt.provider_name || "",
        location: appt.location || "",
        scheduled_at: localIso,
        timezone: appt.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        status: appt.status,
        notes: appt.notes || "",
        source_document_id: appt.source_document_id || null,
      });
    } else {
      setEditingAppt(null);
      // Default to tomorrow at 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setApptForm({
        title: "",
        appointment_type: "Follow-up",
        provider_name: "",
        location: "",
        scheduled_at: tomorrow.toISOString().slice(0, 16),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        status: "scheduled",
        notes: "",
        source_document_id: null,
      });
    }
    setApptModalOpen(true);
  }

  async function handleSaveAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!apptForm.title.trim()) {
      setError("Appointment title is required.");
      return;
    }
    if (!apptForm.scheduled_at) {
      setError("Appointment scheduled date and time is required.");
      return;
    }
    setError(null);
    try {
      const payload: AppointmentCreate = {
        ...apptForm,
        scheduled_at: new Date(apptForm.scheduled_at).toISOString(),
        source_document_id: apptForm.source_document_id || null,
      };

      if (editingAppt) {
        await updateAppointment(token, editingAppt.id, payload);
        setSuccessMsg(`Updated appointment "${payload.title}" successfully.`);
      } else {
        await createAppointment(token, payload);
        setSuccessMsg(`Scheduled appointment "${payload.title}" successfully.`);
      }
      setApptModalOpen(false);
      loadActiveTabData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save appointment";
      setError(msg);
    }
  }

  async function handleApptStatusQuickChange(apptId: string, newStatus: "scheduled" | "completed" | "cancelled" | "rescheduled") {
    try {
      await updateAppointment(token, apptId, { status: newStatus });
      setSuccessMsg(`Appointment status updated to ${newStatus}.`);
      loadActiveTabData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update appointment status";
      setError(msg);
    }
  }

  // -------------------------------------------------------------------------
  // Follow-Up Task Handlers
  // -------------------------------------------------------------------------

  function openTaskModal(task?: FollowUpTask, prelinkedApptId?: string) {
    if (task) {
      setEditingTask(task);
      const localIso = task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : "";
      setTaskForm({
        title: task.title,
        description: task.description || "",
        due_at: localIso,
        priority: task.priority,
        status: task.status,
        appointment_id: task.appointment_id || null,
        source_document_id: task.source_document_id || null,
      });
    } else {
      setEditingTask(null);
      // Default due in 3 days
      const due = new Date();
      due.setDate(due.getDate() + 3);
      due.setHours(17, 0, 0, 0);
      setTaskForm({
        title: "",
        description: "",
        due_at: due.toISOString().slice(0, 16),
        priority: "medium",
        status: "pending",
        appointment_id: prelinkedApptId || null,
        source_document_id: null,
      });
    }
    setTaskModalOpen(true);
  }

  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      setError("Task title is required.");
      return;
    }
    setError(null);
    try {
      const payload: FollowUpTaskCreate = {
        ...taskForm,
        due_at: taskForm.due_at ? new Date(taskForm.due_at).toISOString() : null,
        appointment_id: taskForm.appointment_id || null,
        source_document_id: taskForm.source_document_id || null,
      };

      if (editingTask) {
        await updateFollowUp(token, editingTask.id, payload);
        setSuccessMsg(`Updated task "${payload.title}" successfully.`);
      } else {
        await createFollowUp(token, payload);
        setSuccessMsg(`Created follow-up task "${payload.title}" successfully.`);
      }
      setTaskModalOpen(false);
      loadActiveTabData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save follow-up task";
      setError(msg);
    }
  }

  async function handleToggleTaskStatus(taskId: string, currentStatus: string) {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await updateFollowUp(token, taskId, { status: nextStatus });
      setSuccessMsg(`Task marked as ${nextStatus}.`);
      loadActiveTabData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update task status";
      setError(msg);
    }
  }

  // -------------------------------------------------------------------------
  // Deletion Handling
  // -------------------------------------------------------------------------

  async function confirmDelete() {
    if (!deleteTarget) return;
    setError(null);
    try {
      if (deleteTarget.type === "medication") {
        await deleteMedication(token, deleteTarget.id);
        setSuccessMsg(`Deleted medication "${deleteTarget.title}".`);
      } else if (deleteTarget.type === "appointment") {
        await deleteAppointment(token, deleteTarget.id);
        setSuccessMsg(`Deleted appointment "${deleteTarget.title}".`);
      } else if (deleteTarget.type === "task") {
        await deleteFollowUp(token, deleteTarget.id);
        setSuccessMsg(`Deleted task "${deleteTarget.title}".`);
      }
      setDeleteTarget(null);
      loadActiveTabData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete record";
      setError(msg);
      setDeleteTarget(null);
    }
  }

  // Filter appointments for timeframe
  const filteredAppointments = appointments.filter((a) => {
    if (apptTimeframeFilter === "upcoming") {
      return new Date(a.scheduled_at) >= new Date();
    }
    if (apptTimeframeFilter === "past") {
      return new Date(a.scheduled_at) < new Date();
    }
    return true;
  });

  return (
    <div className="care-organizer-container" data-testid="care-organizer">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2>🏥 Care Organizer & Follow-Up Planner</h2>
          <p className="subtitle">
            Manage your personal medication records, upcoming appointments, and care follow-up tasks in one unified
            workspace.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="alert alert-danger" role="alert" data-testid="care-error">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError(null)} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" role="alert" data-testid="care-success">
          <span className="alert-icon">✓</span>
          <span>{successMsg}</span>
          <button className="alert-close" onClick={() => setSuccessMsg(null)} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="care-subtabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "overview"}
          className={`care-subtab-btn ${activeSubTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveSubTab("overview")}
          data-testid="subtab-overview"
        >
          📌 Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "medications"}
          className={`care-subtab-btn ${activeSubTab === "medications" ? "active" : ""}`}
          onClick={() => setActiveSubTab("medications")}
          data-testid="subtab-medications"
        >
          💊 Medications
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "appointments"}
          className={`care-subtab-btn ${activeSubTab === "appointments" ? "active" : ""}`}
          onClick={() => setActiveSubTab("appointments")}
          data-testid="subtab-appointments"
        >
          📅 Appointments
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "follow_ups"}
          className={`care-subtab-btn ${activeSubTab === "follow_ups" ? "active" : ""}`}
          onClick={() => setActiveSubTab("follow_ups")}
          data-testid="subtab-follow-ups"
        >
          ✅ Follow-Up Tasks
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "calendar"}
          className={`care-subtab-btn ${activeSubTab === "calendar" ? "active" : ""}`}
          onClick={() => setActiveSubTab("calendar")}
          data-testid="subtab-calendar"
        >
          🗓️ Care Calendar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "reminders"}
          className={`care-subtab-btn ${activeSubTab === "reminders" ? "active" : ""}`}
          onClick={() => setActiveSubTab("reminders")}
          data-testid="subtab-reminders"
        >
          ⏰ Smart Reminders
        </button>
      </div>

      {loading && (
        <div className="loading-state" data-testid="care-loading">
          <span className="spinner" /> Loading care records…
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 1. OVERVIEW VIEW */}
      {/* --------------------------------------------------------------------- */}
      {!loading && activeSubTab === "overview" && overview && (
        <div className="care-overview-view" data-testid="care-overview-view">
          {/* Quick Metrics */}
          <div className="overview-metrics-grid">
            <div className="metric-card metric-meds">
              <span className="metric-icon">💊</span>
              <div>
                <span className="metric-val">{overview.active_medications_count}</span>
                <span className="metric-name">Active Medications</span>
              </div>
            </div>

            <div className="metric-card metric-appts">
              <span className="metric-icon">📅</span>
              <div>
                <span className="metric-val">{overview.upcoming_appointments_count}</span>
                <span className="metric-name">Upcoming Appointments</span>
              </div>
            </div>

            <div className="metric-card metric-tasks">
              <span className="metric-icon">✅</span>
              <div>
                <span className="metric-val">{overview.pending_follow_ups_count}</span>
                <span className="metric-name">Pending Tasks</span>
              </div>
            </div>

            <div className="metric-card metric-overdue">
              <span className="metric-icon">⏰</span>
              <div>
                <span className="metric-val">{overview.overdue_follow_ups_count}</span>
                <span className="metric-name">Overdue Tasks</span>
              </div>
            </div>
          </div>

          <div className="overview-two-col">
            {/* Upcoming Appointments Column */}
            <div className="card overview-card">
              <div className="card-header-row">
                <h3>Upcoming Appointments</h3>
                <button
                  type="button"
                  className="btn btn-outline-sm"
                  onClick={() => openApptModal()}
                  data-testid="quick-add-appt-btn"
                >
                  + New Appointment
                </button>
              </div>

              {overview.upcoming_appointments.length === 0 ? (
                <div className="empty-state-box">
                  <p>No upcoming appointments scheduled.</p>
                </div>
              ) : (
                <div className="overview-list">
                  {overview.upcoming_appointments.map((appt) => (
                    <div key={appt.id} className="overview-item appt-overview-item">
                      <div className="item-main">
                        <strong>{appt.title}</strong>
                        <span className="item-sub">
                          📅 {new Date(appt.scheduled_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {appt.provider_name && <span className="item-sub">👨‍⚕️ {appt.provider_name}</span>}
                      </div>
                      <span className="badge badge-primary">{appt.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Tasks Column */}
            <div className="card overview-card">
              <div className="card-header-row">
                <h3>Priority Follow-Up Tasks</h3>
                <button
                  type="button"
                  className="btn btn-outline-sm"
                  onClick={() => openTaskModal()}
                  data-testid="quick-add-task-btn"
                >
                  + New Task
                </button>
              </div>

              {overview.pending_tasks.length === 0 ? (
                <div className="empty-state-box">
                  <p>No pending follow-up tasks.</p>
                </div>
              ) : (
                <div className="overview-list">
                  {overview.pending_tasks.map((task) => (
                    <div key={task.id} className="overview-item task-overview-item">
                      <div className="item-main">
                        <strong>{task.title}</strong>
                        {task.due_at && (
                          <span className={`item-sub ${task.is_overdue ? "text-danger" : ""}`}>
                            ⏰ Due: {new Date(task.due_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="item-actions">
                        <span className={`badge priority-badge-${task.priority}`}>
                          {task.priority.toUpperCase()}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-sm"
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          title="Mark complete"
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Medications Row */}
          <div className="card overview-card" style={{ marginTop: "16px" }}>
            <div className="card-header-row">
              <h3>Active Medications</h3>
              <button
                type="button"
                className="btn btn-outline-sm"
                onClick={() => openMedModal()}
                data-testid="quick-add-med-btn"
              >
                + Record Medication
              </button>
            </div>

            {overview.active_medications.length === 0 ? (
              <div className="empty-state-box">
                <p>No active medications recorded yet.</p>
              </div>
            ) : (
              <div className="overview-meds-grid">
                {overview.active_medications.map((med) => (
                  <div key={med.id} className="med-mini-card">
                    <strong>{med.name}</strong>
                    {med.strength && <span className="strength-sub">{med.strength}</span>}
                    {med.dosage_instructions && (
                      <p className="instruction-sub">&ldquo;{med.dosage_instructions}&rdquo;</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medical Safety Disclaimer */}
          <div className="care-safety-banner" data-testid="care-safety-banner">
            <h4>🛡️ Medical Safety & Personal Recordkeeping Notice</h4>
            <p>{overview.disclaimer}</p>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. MEDICATIONS VIEW */}
      {/* --------------------------------------------------------------------- */}
      {!loading && activeSubTab === "medications" && (
        <div className="care-medications-view" data-testid="care-medications-view">
          {/* Controls Bar */}
          <div className="care-controls-bar">
            <div className="search-filter-group">
              <input
                type="text"
                placeholder="🔍 Search medication, prescriber…"
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                className="form-control form-control-sm"
                aria-label="Search medications"
                id="search-meds-input"
              />
              <select
                value={medStatusFilter}
                onChange={(e) => setMedStatusFilter(e.target.value)}
                className="form-select form-select-sm"
                aria-label="Filter medications by status"
                id="filter-meds-status"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => openMedModal()}
              data-testid="add-medication-button"
            >
              + Record Medication
            </button>
          </div>

          {/* Medication List */}
          {medications.length === 0 ? (
            <div className="empty-state-box" data-testid="no-medications-state">
              <p>No medication records found.</p>
              <p className="helper-text">
                Record your prescriptions or over-the-counter supplements to organize instructions and schedules.
              </p>
            </div>
          ) : (
            <div className="medications-grid" data-testid="medications-grid">
              {medications.map((med) => (
                <div key={med.id} className="card med-card" data-testid={`med-card-${med.id}`}>
                  <div className="med-card-header">
                    <div>
                      <h3 className="med-title">{med.name}</h3>
                      {med.strength && <span className="med-strength-tag">{med.strength}</span>}
                      {med.medication_type && <span className="med-type-tag">{med.medication_type}</span>}
                    </div>
                    <span className={`badge med-status-${med.status}`}>{med.status.toUpperCase()}</span>
                  </div>

                  {/* Dosage instructions (exact user text) */}
                  <div className="med-instructions-box">
                    <span className="box-label">EXACT INSTRUCTIONS</span>
                    <p className="instruction-text">
                      {med.dosage_instructions ? `"${med.dosage_instructions}"` : "No specific dosage instructions entered."}
                    </p>
                  </div>

                  <div className="med-details-grid">
                    {med.route && (
                      <div className="med-detail-item">
                        <span className="detail-lbl">Route:</span>
                        <span>{med.route}</span>
                      </div>
                    )}
                    {med.frequency && (
                      <div className="med-detail-item">
                        <span className="detail-lbl">Frequency:</span>
                        <span>{med.frequency}</span>
                      </div>
                    )}
                    {med.prescriber && (
                      <div className="med-detail-item">
                        <span className="detail-lbl">Prescriber:</span>
                        <span>{med.prescriber}</span>
                      </div>
                    )}
                    {med.pharmacy && (
                      <div className="med-detail-item">
                        <span className="detail-lbl">Pharmacy:</span>
                        <span>{med.pharmacy}</span>
                      </div>
                    )}
                    {(med.start_date || med.end_date) && (
                      <div className="med-detail-item">
                        <span className="detail-lbl">Course:</span>
                        <span>
                          {med.start_date || "Open"} to {med.end_date || "Ongoing"}
                        </span>
                      </div>
                    )}
                    {med.source_document_title && (
                      <div className="med-detail-item">
                        <span className="detail-lbl">Source Report:</span>
                        <span className="doc-link-tag">📄 {med.source_document_title}</span>
                      </div>
                    )}
                  </div>

                  {med.notes && <p className="med-user-notes">📝 {med.notes}</p>}

                  {/* Actions */}
                  <div className="card-actions-bar">
                    <button
                      type="button"
                      className="btn btn-outline-sm"
                      onClick={() => openMedModal(med)}
                      data-testid={`edit-med-${med.id}`}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-sm btn-danger-text"
                      onClick={() => setDeleteTarget({ type: "medication", id: med.id, title: med.name })}
                      data-testid={`delete-med-${med.id}`}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Safety Warning */}
          <div className="care-safety-banner" style={{ marginTop: "24px" }}>
            <h4>⚠️ Medication Recordkeeping Disclaimer</h4>
            <p>
              This organizer records information based strictly on your manual entries or confirmed document records.
              It does <strong>not</strong> validate medical prescriptions, detect drug interactions, or recommend
              dosage adjustments. Never change or discontinue a prescribed medication without direct consultation with
              your prescribing physician or licensed pharmacist.
            </p>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 3. APPOINTMENTS VIEW */}
      {/* --------------------------------------------------------------------- */}
      {!loading && activeSubTab === "appointments" && (
        <div className="care-appointments-view" data-testid="care-appointments-view">
          <div className="care-controls-bar">
            <div className="search-filter-group">
              <select
                value={apptTimeframeFilter}
                onChange={(e) => setApptTimeframeFilter(e.target.value as "all" | "upcoming" | "past")}
                className="form-select form-select-sm"
                aria-label="Filter by timeframe"
                id="filter-appt-timeframe"
              >
                <option value="all">All Appointments</option>
                <option value="upcoming">Upcoming Only</option>
                <option value="past">Past Only</option>
              </select>

              <select
                value={apptStatusFilter}
                onChange={(e) => setApptStatusFilter(e.target.value)}
                className="form-select form-select-sm"
                aria-label="Filter by status"
                id="filter-appt-status"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => openApptModal()}
              data-testid="add-appointment-button"
            >
              + Schedule Appointment
            </button>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="empty-state-box" data-testid="no-appointments-state">
              <p>No medical appointments found.</p>
              <p className="helper-text">Add upcoming doctor visits, lab tests, or follow-up consultations.</p>
            </div>
          ) : (
            <div className="appointments-grid" data-testid="appointments-grid">
              {filteredAppointments.map((appt) => (
                <div key={appt.id} className="card appt-card" data-testid={`appt-card-${appt.id}`}>
                  <div className="appt-card-header">
                    <div>
                      <h3 className="appt-title">{appt.title}</h3>
                      {appt.appointment_type && <span className="badge badge-secondary">{appt.appointment_type}</span>}
                    </div>
                    <span className={`badge appt-status-${appt.status}`}>{appt.status.toUpperCase()}</span>
                  </div>

                  <div className="appt-time-box">
                    <span className="appt-datetime">
                      📅 {new Date(appt.scheduled_at).toLocaleString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="tz-label">({appt.timezone || "UTC"})</span>
                  </div>

                  <div className="appt-meta-info">
                    {appt.provider_name && <div>👨‍⚕️ <strong>Provider:</strong> {appt.provider_name}</div>}
                    {appt.location && <div>📍 <strong>Location:</strong> {appt.location}</div>}
                    {appt.source_document_title && (
                      <div>📄 <strong>Referenced Report:</strong> {appt.source_document_title}</div>
                    )}
                    {appt.notes && <p className="appt-notes">📝 {appt.notes}</p>}
                  </div>

                  {/* Related Tasks Action */}
                  <div className="appt-task-link-row">
                    <span className="task-count-text">
                      {appt.follow_up_tasks_count} Linked Follow-Up Task(s)
                    </span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm"
                      onClick={() => openTaskModal(undefined, appt.id)}
                      data-testid={`add-linked-task-${appt.id}`}
                    >
                      + Add Task for this Visit
                    </button>
                  </div>

                  {/* Actions & Status Changer */}
                  <div className="card-actions-bar">
                    <div className="status-changer">
                      <label htmlFor={`change-status-${appt.id}`} className="sr-only">Status</label>
                      <select
                        id={`change-status-${appt.id}`}
                        value={appt.status}
                        onChange={(e) =>
                          handleApptStatusQuickChange(
                            appt.id,
                            e.target.value as "scheduled" | "completed" | "cancelled" | "rescheduled"
                          )
                        }
                        className="form-select form-select-sm"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="rescheduled">Rescheduled</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="action-btn-group">
                      <button
                        type="button"
                        className="btn btn-outline-sm"
                        onClick={() => openApptModal(appt)}
                        data-testid={`edit-appt-${appt.id}`}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-sm btn-danger-text"
                        onClick={() => setDeleteTarget({ type: "appointment", id: appt.id, title: appt.title })}
                        data-testid={`delete-appt-${appt.id}`}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 4. FOLLOW-UP TASKS VIEW */}
      {/* --------------------------------------------------------------------- */}
      {!loading && activeSubTab === "follow_ups" && (
        <div className="care-follow-ups-view" data-testid="care-follow-ups-view">
          <div className="care-controls-bar">
            <div className="search-filter-group">
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="form-select form-select-sm"
                aria-label="Filter tasks by status"
                id="filter-tasks-status"
              >
                <option value="all">All Tasks</option>
                <option value="pending">Pending Only</option>
                <option value="completed">Completed Only</option>
                <option value="dismissed">Dismissed Only</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => openTaskModal()}
              data-testid="add-task-button"
            >
              + Create Follow-Up Task
            </button>
          </div>

          {followUps.length === 0 ? (
            <div className="empty-state-box" data-testid="no-tasks-state">
              <p>No follow-up tasks found.</p>
              <p className="helper-text">
                Record preparation tasks such as fasting blood draws, imaging appointments, or pharmacy pickups.
              </p>
            </div>
          ) : (
            <div className="tasks-list" data-testid="tasks-list">
              {followUps.map((task) => (
                <div
                  key={task.id}
                  className={`card task-row-card ${task.status === "completed" ? "task-completed" : ""}`}
                  data-testid={`task-card-${task.id}`}
                >
                  <div className="task-checkbox-col">
                    <input
                      type="checkbox"
                      checked={task.status === "completed"}
                      onChange={() => handleToggleTaskStatus(task.id, task.status)}
                      aria-label={`Toggle completion for ${task.title}`}
                      id={`task-check-${task.id}`}
                    />
                  </div>

                  <div className="task-info-col">
                    <div className="task-title-row">
                      <h4 className={`task-title ${task.status === "completed" ? "strikethrough" : ""}`}>
                        {task.title}
                      </h4>
                      <span className={`badge priority-badge-${task.priority}`}>
                        {task.priority.toUpperCase()} PRIORITY
                      </span>
                      <span className={`badge task-status-badge-${task.status}`}>{task.status.toUpperCase()}</span>
                    </div>

                    {task.description && <p className="task-desc">{task.description}</p>}

                    <div className="task-meta-row">
                      {task.due_at && (
                        <span className={`meta-due ${task.is_overdue ? "meta-overdue" : ""}`}>
                          ⏰ Due: {new Date(task.due_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {task.is_overdue && " (Overdue)"}
                        </span>
                      )}
                      {task.appointment_title && (
                        <span className="meta-linked-appt">📅 Linked Visit: {task.appointment_title}</span>
                      )}
                      {task.source_document_title && (
                        <span className="meta-linked-doc">📄 Doc: {task.source_document_title}</span>
                      )}
                    </div>
                  </div>

                  <div className="task-actions-col">
                    <button
                      type="button"
                      className="btn btn-outline-sm"
                      onClick={() => openTaskModal(task)}
                      data-testid={`edit-task-${task.id}`}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-sm btn-danger-text"
                      onClick={() => setDeleteTarget({ type: "task", id: task.id, title: task.title })}
                      data-testid={`delete-task-${task.id}`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 5. CARE CALENDAR VIEW */}
      {/* --------------------------------------------------------------------- */}
      {!loading && activeSubTab === "calendar" && (
        <div className="care-calendar-view" data-testid="care-calendar-view">
          <div className="care-controls-bar">
            <div className="search-filter-group">
              <label htmlFor="cal-start">From:</label>
              <input
                type="date"
                id="cal-start"
                value={calStartDate}
                onChange={(e) => setCalStartDate(e.target.value)}
                className="form-control form-control-sm"
              />
              <label htmlFor="cal-end">To:</label>
              <input
                type="date"
                id="cal-end"
                value={calEndDate}
                onChange={(e) => setCalEndDate(e.target.value)}
                className="form-control form-control-sm"
              />
            </div>
            <div className="cal-stats">
              <span>Showing {calendarItems.length} scheduled item(s)</span>
            </div>
          </div>

          {calendarItems.length === 0 ? (
            <div className="empty-state-box" data-testid="no-calendar-items">
              <p>No calendar events found for the selected date range.</p>
            </div>
          ) : (
            <div className="calendar-agenda-list" data-testid="calendar-agenda-list">
              {calendarItems.map((item) => (
                <div
                  key={`${item.item_type}-${item.id}`}
                  className={`card cal-item-card cal-${item.item_type}`}
                  data-testid={`cal-item-${item.id}`}
                >
                  <div className="cal-item-type-badge">
                    {item.item_type === "appointment" ? "📅 APPOINTMENT" : "✅ TASK"}
                  </div>

                  <div className="cal-item-body">
                    <h4 className="cal-item-title">{item.title}</h4>
                    <span className="cal-item-date">
                      🕐 {new Date(item.scheduled_or_due_at).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {item.provider_or_location && (
                      <span className="cal-item-loc">📍 {item.provider_or_location}</span>
                    )}
                    {item.description_or_notes && (
                      <p className="cal-item-notes">{item.description_or_notes}</p>
                    )}
                  </div>

                  <div className="cal-item-status-col">
                    <span className="badge badge-secondary">{item.status.toUpperCase()}</span>
                    {item.priority && (
                      <span className={`badge priority-badge-${item.priority}`}>
                        {item.priority.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 6. SMART HEALTH REMINDERS VIEW */}
      {/* --------------------------------------------------------------------- */}
      {!loading && activeSubTab === "reminders" && (
        <div className="care-reminders-integrated-view" data-testid="care-reminders-view">
          <SmartReminders token={token} />
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODALS */}
      {/* --------------------------------------------------------------------- */}

      {/* A. Medication Modal */}
      {medModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="medication-modal">
          <div className="modal-content card">
            <div className="modal-header">
              <h3>{editingMed ? "Edit Medication Record" : "Record New Medication"}</h3>
              <button type="button" className="modal-close" onClick={() => setMedModalOpen(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveMedication}>
              <div className="form-group">
                <label htmlFor="med-name">Medication Name *</label>
                <input
                  type="text"
                  id="med-name"
                  required
                  value={medForm.name}
                  onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                  placeholder="e.g. Metformin Hydrochloride"
                  className="form-control"
                  data-testid="med-name-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="med-strength">Strength</label>
                  <input
                    type="text"
                    id="med-strength"
                    value={medForm.strength || ""}
                    onChange={(e) => setMedForm({ ...medForm, strength: e.target.value })}
                    placeholder="e.g. 500 mg, 10 mg/mL"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="med-type">Type</label>
                  <select
                    id="med-type"
                    value={medForm.medication_type || "Prescription"}
                    onChange={(e) => setMedForm({ ...medForm, medication_type: e.target.value })}
                    className="form-select"
                  >
                    <option value="Prescription">Prescription</option>
                    <option value="OTC">Over-The-Counter (OTC)</option>
                    <option value="Supplement">Vitamin / Supplement</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="med-instructions">Dosage Instructions (Exact Text)</label>
                <textarea
                  id="med-instructions"
                  rows={2}
                  value={medForm.dosage_instructions || ""}
                  onChange={(e) => setMedForm({ ...medForm, dosage_instructions: e.target.value })}
                  placeholder="e.g. Take 1 tablet by mouth twice daily with breakfast and dinner"
                  className="form-control"
                  data-testid="med-instructions-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="med-route">Route</label>
                  <input
                    type="text"
                    id="med-route"
                    value={medForm.route || ""}
                    onChange={(e) => setMedForm({ ...medForm, route: e.target.value })}
                    placeholder="Oral, Inhalation, Topical, etc."
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="med-frequency">Frequency</label>
                  <input
                    type="text"
                    id="med-frequency"
                    value={medForm.frequency || ""}
                    onChange={(e) => setMedForm({ ...medForm, frequency: e.target.value })}
                    placeholder="Twice daily, At bedtime, As needed"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="med-prescriber">Prescriber</label>
                  <input
                    type="text"
                    id="med-prescriber"
                    value={medForm.prescriber || ""}
                    onChange={(e) => setMedForm({ ...medForm, prescriber: e.target.value })}
                    placeholder="Dr. Sarah Jenkins"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="med-status">Status</label>
                  <select
                    id="med-status"
                    value={medForm.status || "active"}
                    onChange={(e) =>
                      setMedForm({ ...medForm, status: e.target.value as "active" | "paused" | "completed" | "archived" })
                    }
                    className="form-select"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Document Linking */}
              {documents.length > 0 && (
                <div className="form-group">
                  <label htmlFor="med-doc-link">Link Sourced Medical Document (Optional)</label>
                  <select
                    id="med-doc-link"
                    value={medForm.source_document_id || ""}
                    onChange={(e) => setMedForm({ ...medForm, source_document_id: e.target.value || null })}
                    className="form-select"
                  >
                    <option value="">No linked document</option>
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.filename} ({d.document_date || "Date unstated"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="med-notes">Personal Notes</label>
                <textarea
                  id="med-notes"
                  rows={2}
                  value={medForm.notes || ""}
                  onChange={(e) => setMedForm({ ...medForm, notes: e.target.value })}
                  placeholder="Personal observations or questions for pharmacist"
                  className="form-control"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setMedModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" data-testid="save-medication-btn">
                  {editingMed ? "Save Changes" : "Record Medication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. Appointment Modal */}
      {apptModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="appointment-modal">
          <div className="modal-content card">
            <div className="modal-header">
              <h3>{editingAppt ? "Edit Medical Appointment" : "Schedule Medical Appointment"}</h3>
              <button type="button" className="modal-close" onClick={() => setApptModalOpen(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveAppointment}>
              <div className="form-group">
                <label htmlFor="appt-title">Appointment Title *</label>
                <input
                  type="text"
                  id="appt-title"
                  required
                  value={apptForm.title}
                  onChange={(e) => setApptForm({ ...apptForm, title: e.target.value })}
                  placeholder="e.g. Annual Cardiology Checkup"
                  className="form-control"
                  data-testid="appt-title-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="appt-type">Appointment Type</label>
                  <select
                    id="appt-type"
                    value={apptForm.appointment_type || "Follow-up"}
                    onChange={(e) => setApptForm({ ...apptForm, appointment_type: e.target.value })}
                    className="form-select"
                  >
                    <option value="Follow-up">Follow-up</option>
                    <option value="Consultation">Consultation</option>
                    <option value="Lab Work">Lab Work</option>
                    <option value="Imaging">Imaging / Radiology</option>
                    <option value="Annual Exam">Annual Exam</option>
                    <option value="Procedure">Procedure</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="appt-status">Status</label>
                  <select
                    id="appt-status"
                    value={apptForm.status || "scheduled"}
                    onChange={(e) =>
                      setApptForm({
                        ...apptForm,
                        status: e.target.value as "scheduled" | "completed" | "cancelled" | "rescheduled",
                      })
                    }
                    className="form-select"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="rescheduled">Rescheduled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="appt-datetime">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    id="appt-datetime"
                    required
                    value={apptForm.scheduled_at}
                    onChange={(e) => setApptForm({ ...apptForm, scheduled_at: e.target.value })}
                    className="form-control"
                    data-testid="appt-datetime-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="appt-provider">Physician / Facility</label>
                  <input
                    type="text"
                    id="appt-provider"
                    value={apptForm.provider_name || ""}
                    onChange={(e) => setApptForm({ ...apptForm, provider_name: e.target.value })}
                    placeholder="Dr. Emily Wong"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="appt-location">Location / Clinic</label>
                <input
                  type="text"
                  id="appt-location"
                  value={apptForm.location || ""}
                  onChange={(e) => setApptForm({ ...apptForm, location: e.target.value })}
                  placeholder="Suite 300, Medical Plaza or Telehealth"
                  className="form-control"
                />
              </div>

              {/* Document Linking */}
              {documents.length > 0 && (
                <div className="form-group">
                  <label htmlFor="appt-doc-link">Link Referral or Lab Document (Optional)</label>
                  <select
                    id="appt-doc-link"
                    value={apptForm.source_document_id || ""}
                    onChange={(e) => setApptForm({ ...apptForm, source_document_id: e.target.value || null })}
                    className="form-select"
                  >
                    <option value="">No linked document</option>
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.filename}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="appt-notes">Visit Questions or Clinical Notes</label>
                <textarea
                  id="appt-notes"
                  rows={2}
                  value={apptForm.notes || ""}
                  onChange={(e) => setApptForm({ ...apptForm, notes: e.target.value })}
                  placeholder="Questions to ask doctor, symptoms to mention"
                  className="form-control"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setApptModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" data-testid="save-appointment-btn">
                  {editingAppt ? "Save Changes" : "Schedule Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. Follow-Up Task Modal */}
      {taskModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="task-modal">
          <div className="modal-content card">
            <div className="modal-header">
              <h3>{editingTask ? "Edit Follow-Up Task" : "Create Care Follow-Up Task"}</h3>
              <button type="button" className="modal-close" onClick={() => setTaskModalOpen(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label htmlFor="task-title">Task Title *</label>
                <input
                  type="text"
                  id="task-title"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Fast 12 hours before morning blood draw"
                  className="form-control"
                  data-testid="task-title-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="task-desc">Description / Instructions</label>
                <textarea
                  id="task-desc"
                  rows={2}
                  value={taskForm.description || ""}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Specific preparation steps or questions"
                  className="form-control"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="task-due">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    id="task-due"
                    value={taskForm.due_at || ""}
                    onChange={(e) => setTaskForm({ ...taskForm, due_at: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="task-priority">Priority (User-Selected)</label>
                  <select
                    id="task-priority"
                    value={taskForm.priority || "medium"}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, priority: e.target.value as "low" | "medium" | "high" })
                    }
                    className="form-select"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              {/* Link to appointment */}
              {appointments.length > 0 && (
                <div className="form-group">
                  <label htmlFor="task-appt-link">Link to Appointment (Optional)</label>
                  <select
                    id="task-appt-link"
                    value={taskForm.appointment_id || ""}
                    onChange={(e) => setTaskForm({ ...taskForm, appointment_id: e.target.value || null })}
                    className="form-select"
                  >
                    <option value="">No linked appointment</option>
                    {appointments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({new Date(a.scheduled_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Document Linking */}
              {documents.length > 0 && (
                <div className="form-group">
                  <label htmlFor="task-doc-link">Link Medical Document (Optional)</label>
                  <select
                    id="task-doc-link"
                    value={taskForm.source_document_id || ""}
                    onChange={(e) => setTaskForm({ ...taskForm, source_document_id: e.target.value || null })}
                    className="form-select"
                  >
                    <option value="">No linked document</option>
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.filename}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setTaskModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" data-testid="save-task-btn">
                  {editingTask ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* D. Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="delete-confirmation-modal">
          <div className="modal-content card" style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button type="button" className="modal-close" onClick={() => setDeleteTarget(null)}>
                ×
              </button>
            </div>
            <p style={{ margin: "16px 0", fontSize: "14px", color: "var(--text)" }}>
              Are you sure you want to delete the {deleteTarget.type} record:
              <br />
              <strong>&ldquo;{deleteTarget.title}&rdquo;</strong>?
              <br />
              <span className="helper-text" style={{ color: "#b91c1c" }}>
                This action cannot be undone.
              </span>
            </p>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
                data-testid="confirm-delete-btn"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
