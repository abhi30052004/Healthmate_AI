import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  acknowledgeReminder,
  dismissReminder,
  getInAppNotifications,
  processDueReminders,
  listMedications,
  listAppointments,
  listFollowUps,
  listDocuments,
  type ReminderItem,
  type InAppNotification,
  type CreateReminderPayload,
  type UpdateReminderPayload,
  type ReminderCategory,
  type ReminderFrequency,
  type MedicationRecord,
  type AppointmentRecord,
  type FollowUpTask,
  type DocumentItem,
  type FamilyProfile,
} from "../api/client";

interface SmartRemindersProps {
  token: string;
  activeProfile?: FamilyProfile | null;
}

export function SmartReminders({ token, activeProfile }: SmartRemindersProps) {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingDue, setProcessingDue] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter views
  const [activeTab, setActiveTab] = useState<"upcoming" | "overdue" | "all" | "notifications">("upcoming");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Linked options
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: ReminderCategory;
    due_at: string;
    timezone: string;
    frequency: ReminderFrequency;
    send_email: boolean;
    is_enabled: boolean;
    medication_id: string;
    appointment_id: string;
    task_id: string;
    document_id: string;
  }>({
    title: "",
    description: "",
    category: "general",
    due_at: "",
    timezone: userTimezone,
    frequency: "once",
    send_email: false,
    is_enabled: true,
    medication_id: "",
    appointment_id: "",
    task_id: "",
    document_id: "",
  });

  const loadAllData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const [rems, notifs] = await Promise.all([
        listReminders(token, activeProfile ? { profile_id: activeProfile.id } : undefined),
        getInAppNotifications(token),
      ]);
      setReminders(rems);
      setNotifications(notifs);

      // Lazily load linked options in background
      listMedications(token, activeProfile ? { profile_id: activeProfile.id } : undefined).then(setMedications).catch(() => {});
      listAppointments(token, activeProfile ? { profile_id: activeProfile.id } : undefined).then(setAppointments).catch(() => {});
      listFollowUps(token, activeProfile ? { profile_id: activeProfile.id } : undefined).then(setFollowUpTasks).catch(() => {});
      listDocuments(token, activeProfile?.id).then(setDocuments).catch(() => {});
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load reminders");
    } finally {
      setLoading(false);
    }
  }, [token, activeProfile?.id]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleOpenCreateModal = (presetCategory: ReminderCategory = "general") => {
    setEditingId(null);
    // Default due_at to tomorrow at 09:00 local time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setFormData({
      title: "",
      description: "",
      category: presetCategory,
      due_at: localIso,
      timezone: userTimezone,
      frequency: "once",
      send_email: false,
      is_enabled: true,
      medication_id: "",
      appointment_id: "",
      task_id: "",
      document_id: "",
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (reminder: ReminderItem) => {
    setEditingId(reminder.id);
    // Convert UTC due_at to local ISO format for the datetime-local input
    const d = new Date(reminder.due_at);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setFormData({
      title: reminder.title,
      description: reminder.description || "",
      category: reminder.category,
      due_at: localIso,
      timezone: reminder.timezone || userTimezone,
      frequency: reminder.frequency,
      send_email: reminder.send_email,
      is_enabled: reminder.is_enabled,
      medication_id: reminder.medication_id || "",
      appointment_id: reminder.appointment_id || "",
      task_id: reminder.task_id || "",
      document_id: reminder.document_id || "",
    });
    setModalOpen(true);
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg("Please enter a reminder title.");
      return;
    }
    if (!formData.due_at) {
      setErrorMsg("Please select a scheduled date and time.");
      return;
    }

    try {
      setErrorMsg(null);
      // Parse local ISO into standard UTC ISO
      const dueUtc = new Date(formData.due_at).toISOString();

      if (editingId) {
        const updatePayload: UpdateReminderPayload = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          category: formData.category,
          due_at: dueUtc,
          timezone: formData.timezone,
          frequency: formData.frequency,
          send_email: formData.send_email,
          is_enabled: formData.is_enabled,
          medication_id: formData.medication_id || undefined,
          appointment_id: formData.appointment_id || undefined,
          task_id: formData.task_id || undefined,
          document_id: formData.document_id || undefined,
        };
        await updateReminder(token, editingId, updatePayload);
        setSuccessMsg("Reminder updated successfully.");
      } else {
        const createPayload: CreateReminderPayload = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          category: formData.category,
          due_at: dueUtc,
          timezone: formData.timezone,
          frequency: formData.frequency,
          send_email: formData.send_email,
          is_enabled: formData.is_enabled,
          medication_id: formData.medication_id || undefined,
          appointment_id: formData.appointment_id || undefined,
          task_id: formData.task_id || undefined,
          document_id: formData.document_id || undefined,
          profile_id: activeProfile?.id || undefined,
        };
        await createReminder(token, createPayload);
        setSuccessMsg("New reminder created successfully.");
      }

      setModalOpen(false);
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save reminder.");
    }
  };

  const handleToggleEnabled = async (reminder: ReminderItem) => {
    try {
      await updateReminder(token, reminder.id, { is_enabled: !reminder.is_enabled });
      setSuccessMsg(`Reminder ${reminder.is_enabled ? "disabled" : "enabled"} successfully.`);
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to toggle reminder.");
    }
  };

  const handleDeleteReminder = async (id: string, title: string) => {
    if (!window.confirm(`Cancel and remove reminder "${title}"? Associated health records will not be deleted.`)) {
      return;
    }
    try {
      const res = await deleteReminder(token, id);
      setSuccessMsg(res.message);
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete reminder.");
    }
  };

  const handleAcknowledge = async (reminderId: string) => {
    try {
      const res = await acknowledgeReminder(token, reminderId);
      setSuccessMsg(res.message);
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to acknowledge notification.");
    }
  };

  const handleDismiss = async (reminderId: string) => {
    try {
      await dismissReminder(token, reminderId);
      setSuccessMsg("Notification dismissed from active view.");
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to dismiss notification.");
    }
  };

  const handleCheckDueNow = async () => {
    try {
      setProcessingDue(true);
      setErrorMsg(null);
      const summary = await processDueReminders(token);
      let note = `Processed ${summary.processed_count} due reminder(s).`;
      if (summary.emails_skipped > 0) {
        note += " In-app notifications delivered; email dispatch skipped (SMTP unconfigured or unverified).";
      }
      setSuccessMsg(note);
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to process due reminders.");
    } finally {
      setProcessingDue(false);
    }
  };

  // Derived filtered reminders
  const now = new Date();
  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) {
        return false;
      }
      const dueDate = new Date(r.due_at);
      if (activeTab === "upcoming") {
        return r.is_enabled && dueDate >= now && !r.is_acknowledged;
      }
      if (activeTab === "overdue") {
        return r.is_enabled && dueDate < now && !r.is_acknowledged;
      }
      if (activeTab === "notifications") {
        return r.delivery_status === "delivered" || r.is_acknowledged;
      }
      return true; // "all"
    });
  }, [reminders, activeTab, categoryFilter, now]);

  const overdueCount = useMemo(() => {
    return reminders.filter((r) => r.is_enabled && new Date(r.due_at) < now && !r.is_acknowledged).length;
  }, [reminders, now]);

  const activeNotifsCount = notifications.length;

  return (
    <div className="smart-reminders-container" id="smart-health-reminders-section">
      {/* Safety Header Banner */}
      <div className="reminders-safety-banner" role="alert">
        <div className="safety-icon">⚠️</div>
        <div className="safety-content">
          <strong>Smart Reminder & Scheduling Aid (Non-Prescriptive):</strong>
          <p>
            HealthMate AI reminders are personal organizational aids based exclusively on schedules entered or confirmed by you.
            HealthMate AI never infers medication doses, modifies treatments, or diagnoses health conditions.
            Acknowledging a reminder records notification receipt only — it is <strong>never proof or verification that medication was taken</strong>.
          </p>
        </div>
      </div>

      {/* Top Header Actions */}
      <div className="reminders-header-bar">
        <div>
          <h2>⏰ Smart Health Reminders & Notifications</h2>
          <p className="section-sub">
            Configure custom reminders for medication routines, specialist appointments, follow-up care tasks, and lab report checkups.
          </p>
        </div>
        <div className="header-action-buttons">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCheckDueNow}
            disabled={processingDue}
            id="btn-process-due-reminders"
            title="Check for due reminders and process in-app deliveries immediately"
          >
            {processingDue ? "Checking…" : "🔄 Check Due Now"}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleOpenCreateModal("general")}
            id="btn-create-reminder"
          >
            + New Reminder
          </button>
        </div>
      </div>

      {/* Active Notifications Alert Drawer (if any due/unacknowledged) */}
      {notifications.length > 0 && (
        <section className="in-app-notifications-box" aria-label="Active In-App Notifications">
          <div className="notif-box-header">
            <h3>🔔 In-App Notifications ({notifications.length})</h3>
            <span className="notif-badge-pill">Requires Attention</span>
          </div>
          <div className="notif-cards-list">
            {notifications.slice(0, 5).map((n) => (
              <div
                key={n.reminder_id}
                className={`notif-card ${n.is_overdue ? "overdue-card" : ""}`}
                id={`notif-${n.reminder_id}`}
              >
                <div className="notif-card-main">
                  <div className="notif-card-title-row">
                    <span className={`category-tag tag-${n.category}`}>{n.category}</span>
                    <strong className="notif-title">{n.title}</strong>
                    {n.is_overdue && <span className="badge-overdue">Overdue</span>}
                  </div>
                  {n.description && <p className="notif-desc">{n.description}</p>}
                  <div className="notif-meta-row">
                    <span>📅 Due: {new Date(n.due_at).toLocaleString()} ({n.timezone})</span>
                    {n.email_delivery_status && (
                      <span className="email-status-pill" title={n.email_delivery_status}>
                        ✉️ Email: {n.email_delivery_status.includes("unavailable") || n.email_delivery_status.includes("not configured") ? "In-app only (SMTP unset)" : n.email_delivery_status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="notif-card-actions">
                  {!n.is_acknowledged && (
                    <button
                      type="button"
                      className="btn btn-primary btn-xs"
                      onClick={() => handleAcknowledge(n.reminder_id)}
                      id={`btn-ack-${n.reminder_id}`}
                      title="Acknowledge notification receipt (does not confirm medication administration)"
                    >
                      ✓ Acknowledge
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => handleDismiss(n.reminder_id)}
                    id={`btn-dismiss-${n.reminder_id}`}
                    title="Dismiss notification from banner"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feedback Messages */}
      {errorMsg && (
        <div className="feedback-banner error" role="alert">
          <span>{errorMsg}</span>
          <button type="button" className="btn-close-sm" onClick={() => setErrorMsg(null)}>×</button>
        </div>
      )}
      {successMsg && (
        <div className="feedback-banner success" role="status">
          <span>{successMsg}</span>
          <button type="button" className="btn-close-sm" onClick={() => setSuccessMsg(null)}>×</button>
        </div>
      )}

      {/* Navigation Sub-Tabs & Category Filter */}
      <div className="reminders-controls-row">
        <div className="reminders-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "upcoming"}
            className={`sub-tab ${activeTab === "upcoming" ? "active" : ""}`}
            onClick={() => setActiveTab("upcoming")}
            id="tab-upcoming-reminders"
          >
            Upcoming
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "overdue"}
            className={`sub-tab ${activeTab === "overdue" ? "active" : ""}`}
            onClick={() => setActiveTab("overdue")}
            id="tab-overdue-reminders"
          >
            Overdue {overdueCount > 0 && <span className="counter-pill pill-alert">{overdueCount}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "notifications"}
            className={`sub-tab ${activeTab === "notifications" ? "active" : ""}`}
            onClick={() => setActiveTab("notifications")}
            id="tab-notifications-history"
          >
            History & Delivered
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "all"}
            className={`sub-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
            id="tab-all-reminders"
          >
            All Reminders ({reminders.length})
          </button>
        </div>

        <div className="reminders-category-filter">
          <label htmlFor="filter-reminder-category" className="filter-label">Category:</label>
          <select
            id="filter-reminder-category"
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="medication">Medication</option>
            <option value="appointment">Appointment</option>
            <option value="follow_up">Follow-Up Task</option>
            <option value="report_review">Report Review</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {/* Main Reminders List */}
      <div className="reminders-list-container">
        {loading ? (
          <div className="reminders-loading" role="status">
            <div className="auth-loading-spinner" />
            <p>Loading your health reminders…</p>
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="reminders-empty-state">
            <p className="empty-title">No reminders found in this view.</p>
            <p className="empty-sub">
              {activeTab === "upcoming"
                ? "You have no upcoming reminders scheduled. Create one to stay organized."
                : activeTab === "overdue"
                ? "Great! No overdue reminders."
                : "No reminders match the current filter."}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenCreateModal("general")}
            >
              + Create a Reminder
            </button>
          </div>
        ) : (
          <div className="reminders-grid">
            {filteredReminders.map((r) => {
              const isOverdue = new Date(r.due_at) < now && !r.is_acknowledged && r.is_enabled;
              return (
                <div
                  key={r.id}
                  className={`reminder-card ${!r.is_enabled ? "disabled-card" : ""} ${isOverdue ? "overdue-card" : ""}`}
                  id={`reminder-card-${r.id}`}
                >
                  <div className="card-top-row">
                    <span className={`category-tag tag-${r.category}`}>
                      {r.category.replace("_", " ")}
                    </span>
                    <div className="card-status-badges">
                      {isOverdue && <span className="badge-overdue">Overdue</span>}
                      {r.frequency !== "once" && (
                        <span className="badge-recurring">🔁 {r.frequency}</span>
                      )}
                      {!r.is_enabled ? (
                        <span className="badge-disabled">Paused</span>
                      ) : (
                        <span className="badge-active">Active</span>
                      )}
                    </div>
                  </div>

                  <h3 className="card-title">{r.title}</h3>
                  {r.description && <p className="card-description">{r.description}</p>}

                  {r.linked_title && (
                    <div className="linked-info-chip" title="Linked Care Record">
                      🔗 {r.linked_title}
                    </div>
                  )}

                  {r.profile_name && (
                    <div
                      className="linked-info-chip"
                      style={{ background: "#f0fdfa", color: "#0d9488", borderColor: "#99f6e4" }}
                      title="Family Member Profile"
                    >
                      👤 {r.profile_name}
                    </div>
                  )}

                  <div className="card-schedule-details">
                    <div className="schedule-item">
                      <span className="detail-label">Scheduled:</span>
                      <span className="detail-value">
                        {new Date(r.due_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="schedule-item">
                      <span className="detail-label">Timezone:</span>
                      <span className="detail-value">{r.timezone}</span>
                    </div>
                    <div className="schedule-item">
                      <span className="detail-label">Delivery:</span>
                      <span className={`status-text status-${r.delivery_status}`}>
                        {r.delivery_status === "delivered" ? "Delivered" : r.delivery_status === "pending" ? "Pending" : "Failed"}
                      </span>
                    </div>
                    {r.is_acknowledged && (
                      <div className="schedule-item ack-item">
                        <span className="detail-label">Receipt Confirmed:</span>
                        <span className="detail-value text-success">
                          ✓ {r.acknowledged_at ? new Date(r.acknowledged_at).toLocaleTimeString() : "Yes"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="card-actions-bar">
                    <div className="actions-left">
                      {!r.is_acknowledged && r.delivery_status === "delivered" && (
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={() => handleAcknowledge(r.id)}
                          id={`btn-ack-${r.id}`}
                          title="Acknowledge receipt of this reminder notification"
                        >
                          ✓ Acknowledge
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleToggleEnabled(r)}
                        id={`btn-toggle-${r.id}`}
                      >
                        {r.is_enabled ? "Disable" : "Enable"}
                      </button>
                    </div>
                    <div className="actions-right">
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleOpenEditModal(r)}
                        id={`btn-edit-${r.id}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger-outline btn-xs"
                        onClick={() => handleDeleteReminder(r.id, r.title)}
                        id={`btn-delete-${r.id}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Reminder Modal */}
      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-reminder-title">
          <div className="modal-content modal-reminder-form">
            <div className="modal-header">
              <h3 id="modal-reminder-title">
                {editingId ? "Edit Smart Reminder" : "Create Smart Health Reminder"}
              </h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setModalOpen(false)}
                id="btn-close-reminder-modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReminder} className="reminder-form-body">
              {/* Form safety notice */}
              <div className="form-safety-notice">
                <small>
                  ⚠️ <strong>Medication Safety:</strong> Schedules are strictly based on instructions you confirm.
                  HealthMate AI does not prescribe, adjust dosage, or determine medical therapy.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="reminder-title-input" className="form-label">
                  Reminder Title <span className="req">*</span>
                </label>
                <input
                  type="text"
                  id="reminder-title-input"
                  className="form-input"
                  placeholder="e.g. Morning Metformin 500mg, Dr. Smith Followup"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="reminder-category-select" className="form-label">Category</label>
                  <select
                    id="reminder-category-select"
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ReminderCategory })}
                  >
                    <option value="medication">Medication Schedule</option>
                    <option value="appointment">Upcoming Appointment</option>
                    <option value="follow_up">Follow-Up Care Task</option>
                    <option value="report_review">Lab Report Review / Checkup</option>
                    <option value="general">General Health Reminder</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="reminder-frequency-select" className="form-label">Frequency</label>
                  <select
                    id="reminder-frequency-select"
                    className="form-select"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as ReminderFrequency })}
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="reminder-due-input" className="form-label">
                    Date & Time <span className="req">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="reminder-due-input"
                    className="form-input"
                    value={formData.due_at}
                    onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reminder-timezone-input" className="form-label">Timezone</label>
                  <input
                    type="text"
                    id="reminder-timezone-input"
                    className="form-input"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    placeholder="e.g. America/New_York, UTC"
                    required
                  />
                </div>
              </div>

              {/* Optional Record Association */}
              <div className="form-group">
                <label htmlFor="reminder-link-select" className="form-label">
                  Link to Existing Health Record (Optional)
                </label>
                {formData.category === "medication" && (
                  <select
                    id="reminder-link-select"
                    className="form-select"
                    value={formData.medication_id}
                    onChange={(e) => setFormData({ ...formData, medication_id: e.target.value })}
                  >
                    <option value="">— Select Confirmed Medication Record —</option>
                    {medications.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.strength || "Dose unstated"}) - {m.frequency || "Self-recorded"}
                      </option>
                    ))}
                  </select>
                )}

                {formData.category === "appointment" && (
                  <select
                    id="reminder-link-select"
                    className="form-select"
                    value={formData.appointment_id}
                    onChange={(e) => setFormData({ ...formData, appointment_id: e.target.value })}
                  >
                    <option value="">— Select Appointment —</option>
                    {appointments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({new Date(a.scheduled_at).toLocaleDateString()}) with {a.provider_name || "Doctor"}
                      </option>
                    ))}
                  </select>
                )}

                {formData.category === "follow_up" && (
                  <select
                    id="reminder-link-select"
                    className="form-select"
                    value={formData.task_id}
                    onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
                  >
                    <option value="">— Select Follow-Up Task —</option>
                    {followUpTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} (Due: {t.due_at ? new Date(t.due_at).toLocaleDateString() : "No date"})
                      </option>
                    ))}
                  </select>
                )}

                {formData.category === "report_review" && (
                  <select
                    id="reminder-link-select"
                    className="form-select"
                    value={formData.document_id}
                    onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                  >
                    <option value="">— Select Medical Report Document —</option>
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.filename} ({d.is_verified ? "Verified" : "Pending Review"})
                      </option>
                    ))}
                  </select>
                )}

                {formData.category === "general" && (
                  <p className="form-help-text">
                    General reminders operate independently. Select a specific category above to link to your medications, appointments, or reports.
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="reminder-desc-input" className="form-label">Notes / Instructions</label>
                <textarea
                  id="reminder-desc-input"
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Take with food, bring fasting lab slip, ask about headache"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Notification Channel Options */}
              <div className="form-checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.send_email}
                    onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                    id="checkbox-send-email"
                  />
                  <span>Also attempt email delivery (requires backend SMTP; safely skips if unconfigured)</span>
                </label>
              </div>

              <div className="form-checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_enabled}
                    onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                    id="checkbox-is-enabled"
                  />
                  <span>Reminder Enabled</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="btn-save-reminder-submit"
                >
                  {editingId ? "Save Changes" : "Create Reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
