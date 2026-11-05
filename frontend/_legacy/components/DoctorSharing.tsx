import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  listDoctorShares,
  createDoctorShare,
  revokeDoctorShare,
  getDoctorShareAudit,
  ApiError,
  type DoctorSharingItem,
  type DoctorSharingCreatePayload,
  type DoctorSharingCreateResponse,
  type DoctorSharingAuditLogItem,
  type FamilyProfile,
  type DocumentItem,
} from "../api/client";

interface DoctorSharingProps {
  token: string;
  activeProfile: FamilyProfile | null;
  profiles: FamilyProfile[];
  documents: DocumentItem[];
}

export function DoctorSharing({
  token,
  activeProfile,
  profiles,
  documents,
}: DoctorSharingProps) {
  const [shares, setShares] = useState<DoctorSharingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreatedModal, setShowCreatedModal] = useState<DoctorSharingCreateResponse | null>(null);
  const [shareToRevoke, setShareToRevoke] = useState<DoctorSharingItem | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [auditLogs, setAuditLogs] = useState<DoctorSharingAuditLogItem[] | null>(null);
  const [auditSession, setAuditSession] = useState<DoctorSharingItem | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    activeProfile?.id || (profiles[0]?.id || "")
  );
  const [doctorName, setDoctorName] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [includeVisitPack, setIncludeVisitPack] = useState(false);
  const [includeMedications, setIncludeMedications] = useState(false);
  const [includeAppointments, setIncludeAppointments] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Update selectedProfileId when activeProfile changes if modal is closed
  useEffect(() => {
    if (activeProfile && !showCreateModal) {
      setSelectedProfileId(activeProfile.id);
    }
  }, [activeProfile, showCreateModal]);

  const loadShares = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      // Fetch shares for active profile if set, or all user shares
      const data = await listDoctorShares(token, activeProfile?.id);
      setShares(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load sharing sessions. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [token, activeProfile?.id]);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  // Documents available for the currently selected profile in form
  const availableDocs = useMemo(() => {
    const prof = profiles.find((p) => p.id === selectedProfileId);
    if (!prof) return [];
    if (prof.is_primary) {
      // Primary profile can share unassigned docs or docs assigned to primary
      return documents.filter((d) => !d.profile_id || d.profile_id === prof.id);
    }
    return documents.filter((d) => d.profile_id === prof.id);
  }, [profiles, selectedProfileId, documents]);

  const resetForm = () => {
    setDoctorName("");
    setDoctorEmail("");
    setExpiresInDays(7);
    setIncludeVisitPack(false);
    setIncludeMedications(false);
    setIncludeAppointments(false);
    setSelectedDocIds([]);
    setNotes("");
    setFormError(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    if (activeProfile) {
      setSelectedProfileId(activeProfile.id);
    } else if (profiles[0]) {
      setSelectedProfileId(profiles[0].id);
    }
    setShowCreateModal(true);
  };

  const handleToggleDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim()) {
      setFormError("Doctor's name is required.");
      return;
    }
    if (!selectedProfileId) {
      setFormError("Please select a family profile.");
      return;
    }
    const hasAnyResource =
      includeVisitPack ||
      includeMedications ||
      includeAppointments ||
      selectedDocIds.length > 0;
    if (!hasAnyResource) {
      setFormError(
        "Please select at least one resource to share (documents, visit pack, medications, or appointments)."
      );
      return;
    }

    try {
      setCreating(true);
      setFormError(null);
      const payload: DoctorSharingCreatePayload = {
        profile_id: selectedProfileId,
        doctor_name: doctorName.trim(),
        doctor_email: doctorEmail.trim() || null,
        expires_in_days: expiresInDays,
        shared_resources: {
          document_ids: selectedDocIds,
          include_visit_pack: includeVisitPack,
          visit_pack_categories: ["documents", "observations", "medications", "appointments"],
          include_medications: includeMedications,
          include_appointments: includeAppointments,
        },
        notes: notes.trim() || null,
      };

      const res = await createDoctorShare(token, payload);
      setShowCreateModal(false);
      setShowCreatedModal(res);
      loadShares();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to create sharing session.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!shareToRevoke) return;
    try {
      setRevoking(true);
      await revokeDoctorShare(token, shareToRevoke.id);
      setShareToRevoke(null);
      loadShares();
    } catch (err: unknown) {
      alert(err instanceof ApiError ? err.message : "Failed to revoke share.");
    } finally {
      setRevoking(false);
    }
  };

  const handleOpenAudit = async (share: DoctorSharingItem) => {
    try {
      setAuditSession(share);
      setLoadingAudit(true);
      setAuditLogs(null);
      const logs = await getDoctorShareAudit(token, share.id);
      setAuditLogs(logs);
    } catch (err: unknown) {
      alert(err instanceof ApiError ? err.message : "Failed to load audit logs.");
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleCopyLink = (shareUrl: string) => {
    const fullUrl = `${window.location.origin}${shareUrl}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const getStatusBadge = (status: string, isExpired: boolean) => {
    if (status === "revoked") {
      return <span className="pill bad" id="status-revoked">Revoked</span>;
    }
    if (status === "expired" || isExpired) {
      return <span className="pill wait" id="status-expired">Expired</span>;
    }
    return <span className="pill ok" id="status-active">Active</span>;
  };

  return (
    <div className="doctor-sharing-container" id="doctor-sharing-root">
      {/* Section Header */}
      <div className="section-header">
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span>🔗 Secure Doctor Sharing</span>
            {activeProfile && (
              <span className="pill ok" style={{ fontSize: "12px" }}>
                {activeProfile.name} ({activeProfile.relationship})
              </span>
            )}
          </h2>
          <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>
            Generate time-limited, revocable access links to share selected medical records with your physician.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadShares}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateModal}
            id="btn-create-doctor-share"
          >
            ➕ New Secure Share
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-card" style={{ padding: "40px", textAlign: "center" }}>
          <div className="auth-loading-spinner" />
          <p style={{ marginTop: "12px", color: "var(--text-muted)" }}>
            Loading secure doctor sharing sessions…
          </p>
        </div>
      ) : shares.length === 0 ? (
        <div
          className="empty-state-card"
          style={{
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🩺</div>
          <h3 style={{ margin: "0 0 8px", color: "var(--text-main)" }}>
            No Active Doctor Shares
          </h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "480px", margin: "0 auto 20px" }}>
            You haven't generated any sharing links for this profile yet. Create a secure link to let
            your doctor review your visit prep pack, recent labs, and care records.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateModal}
            id="btn-empty-create-share"
          >
            Create Your First Share
          </button>
        </div>
      ) : (
        <div className="shares-grid" style={{ display: "grid", gap: "16px" }}>
          {shares.map((share) => {
            const isLive = share.status === "active" && !share.is_expired;
            const expDate = new Date(share.expires_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const createdDate = new Date(share.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={share.id}
                className="card share-card"
                style={{
                  background: "var(--surface)",
                  border: isLive ? "1px solid var(--border)" : "1px solid #e2e8f0",
                  opacity: isLive ? 1 : 0.85,
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-main)" }}>
                        {share.doctor_name}
                      </h3>
                      {getStatusBadge(share.status, share.is_expired)}
                    </div>
                    {share.doctor_email && (
                      <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
                        ✉️ {share.doctor_email}
                      </p>
                    )}
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                      Patient: <strong>{share.profile_name}</strong> • Created on {createdDate}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenAudit(share)}
                      id={`btn-audit-${share.id}`}
                    >
                      Audit Trail
                    </button>
                    {isLive && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{
                          background: "#fee2e2",
                          color: "#991b1b",
                          border: "1px solid #fecaca",
                          fontWeight: 500,
                        }}
                        onClick={() => setShareToRevoke(share)}
                        id={`btn-revoke-${share.id}`}
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                </div>

                {/* Expiration and telemetry */}
                <div
                  style={{
                    background: "var(--surface-alt)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "8px",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Expires: </span>
                    <strong style={{ color: isLive ? "var(--text-main)" : "#991b1b" }}>{expDate}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Access Count: </span>
                    <strong>{share.access_count} view{share.access_count === 1 ? "" : "s"}</strong>
                    {share.last_accessed_at && (
                      <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>
                        (Last: {new Date(share.last_accessed_at).toLocaleTimeString()})
                      </span>
                    )}
                  </div>
                </div>

                {/* Resource Summary Badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", marginRight: "4px" }}>
                    Shared Content:
                  </span>
                  {share.shared_resources.include_visit_pack && (
                    <span className="pill ok" style={{ fontSize: "11px" }}>
                      📋 Visit Pack
                    </span>
                  )}
                  {share.shared_resources.include_medications && (
                    <span className="pill ok" style={{ fontSize: "11px" }}>
                      💊 Medications
                    </span>
                  )}
                  {share.shared_resources.include_appointments && (
                    <span className="pill ok" style={{ fontSize: "11px" }}>
                      📅 Care Appointments
                    </span>
                  )}
                  {share.shared_resources.document_ids?.length > 0 && (
                    <span className="pill ok" style={{ fontSize: "11px" }}>
                      📄 {share.shared_resources.document_ids.length} Medical Document{share.shared_resources.document_ids.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {share.notes && (
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                    Note: "{share.notes}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE SHARE MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div
            className="modal-content"
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>Create Secure Doctor Share</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="alert alert-error" role="alert" style={{ marginBottom: "16px" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateShare}>
              {/* Profile selector */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  Patient Profile *
                </label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => {
                    setSelectedProfileId(e.target.value);
                    setSelectedDocIds([]); // Reset selected docs on profile change
                  }}
                  className="form-input"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                  id="select-share-profile"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.relationship}{p.is_primary ? " - Primary" : ""})
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Doctor or Recipient Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Sarah Jenkins"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="form-input"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                    id="input-doctor-name"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Doctor Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. dr.jenkins@clinic.org"
                    value={doctorEmail}
                    onChange={(e) => setDoctorEmail(e.target.value)}
                    className="form-input"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                    id="input-doctor-email"
                  />
                </div>
              </div>

              {/* Expiration days */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  Access Lifetime (Maximum 30 days) *
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {[1, 3, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExpiresInDays(days)}
                      style={{
                        flex: 1,
                        padding: "8px 4px",
                        borderRadius: "var(--radius-sm)",
                        border: expiresInDays === days ? "2px solid var(--primary)" : "1px solid var(--border)",
                        background: expiresInDays === days ? "var(--primary-light)" : "var(--surface)",
                        color: expiresInDays === days ? "var(--primary-text)" : "var(--text-main)",
                        fontWeight: expiresInDays === days ? 600 : 400,
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      {days} {days === 1 ? "Day" : "Days"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resource Selection */}
              <div style={{ marginBottom: "16px", padding: "14px", background: "var(--surface-alt)", borderRadius: "var(--radius-md)" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
                  Select Medical Records to Share (Least Privilege) *
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={includeVisitPack}
                      onChange={(e) => setIncludeVisitPack(e.target.checked)}
                      id="check-include-visit-pack"
                    />
                    <span><strong>Doctor Visit Preparation Pack</strong> (Comprehensive summary and PDF)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={includeMedications}
                      onChange={(e) => setIncludeMedications(e.target.checked)}
                      id="check-include-medications"
                    />
                    <span><strong>Active Medications List</strong></span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={includeAppointments}
                      onChange={(e) => setIncludeAppointments(e.target.checked)}
                      id="check-include-appointments"
                    />
                    <span><strong>Care Schedule & Appointments</strong></span>
                  </label>
                </div>

                {/* Specific documents */}
                <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                    Specific Medical Documents ({availableDocs.length} available for this profile):
                  </span>
                  {availableDocs.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                      No documents associated with this profile.
                    </p>
                  ) : (
                    <div style={{ maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {availableDocs.map((doc) => (
                        <label
                          key={doc.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "12px",
                            cursor: "pointer",
                            background: "var(--surface)",
                            padding: "6px 8px",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDocIds.includes(doc.id)}
                            onChange={() => handleToggleDoc(doc.id)}
                            id={`check-doc-${doc.id}`}
                          />
                          <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            📄 {doc.filename}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Clinical Notes */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  Clinical Note / Purpose of Sharing (Optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. Please review Charlie's latest CBC results ahead of Tuesday's follow-up consultation."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontFamily: "inherit" }}
                  id="textarea-share-notes"
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                  id="btn-submit-create-share"
                >
                  {creating ? "Generating Link…" : "Confirm & Generate Share Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE LINK CREATED ONE-TIME MODAL */}
      {showCreatedModal && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div
            className="modal-content"
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              maxWidth: "540px",
              width: "100%",
              padding: "24px",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>🔐</div>
              <h3 style={{ margin: 0, fontSize: "18px", color: "var(--text-main)" }}>
                Secure Doctor Share Link Created!
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
                Ready to share with <strong>{showCreatedModal.doctor_name}</strong>
              </p>
            </div>

            <div style={{ background: "var(--surface-alt)", padding: "12px", borderRadius: "var(--radius-sm)", marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px" }}>
                Copy Sharing Link:
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${showCreatedModal.share_url}`}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    fontSize: "12px",
                    background: "var(--surface)",
                    color: "var(--text-main)",
                  }}
                  id="input-created-share-url"
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleCopyLink(showCreatedModal.share_url)}
                  id="btn-copy-share-url"
                >
                  {copied ? "Copied! ✓" : "Copy Link"}
                </button>
              </div>
            </div>

            <div
              style={{
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                fontSize: "12px",
                color: "#92400e",
                marginBottom: "20px",
                lineHeight: 1.4,
              }}
            >
              ⚠️ <strong>Security Notice:</strong> This sharing link contains a high-entropy secret bearer token.
              It is displayed only once and will <em>never be displayed again</em> after you close this window.
              You can revoke access immediately at any time from your dashboard.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowCreatedModal(null)}
                id="btn-close-created-modal"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVOCATION CONFIRMATION MODAL */}
      {shareToRevoke && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div
            className="modal-content"
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              maxWidth: "480px",
              width: "100%",
              padding: "24px",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#991b1b" }}>
              Revoke Doctor Access?
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--text-main)", lineHeight: 1.5 }}>
              Are you sure you want to revoke access for <strong>{shareToRevoke.doctor_name}</strong>?
              Once revoked, the share link will immediately cease to function and all subsequent document and visit pack requests will be blocked.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShareToRevoke(null)}
                disabled={revoking}
              >
                Keep Active
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ background: "#dc2626", color: "white" }}
                onClick={handleRevokeConfirm}
                disabled={revoking}
                id="btn-confirm-revoke"
              >
                {revoking ? "Revoking…" : "Yes, Revoke Immediately"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      {auditSession && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div
            className="modal-content"
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              maxWidth: "640px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px" }}>
                  Security Audit Trail: {auditSession.doctor_name}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                  Patient: {auditSession.profile_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuditSession(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            {loadingAudit ? (
              <p style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                Loading audit trail…
              </p>
            ) : !auditLogs || auditLogs.length === 0 ? (
              <p style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                No recorded audit events for this session yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {auditLogs.map((log) => {
                  const logTime = new Date(log.created_at).toLocaleString();
                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: "10px 12px",
                        background: "var(--surface-alt)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <strong style={{ color: "var(--text-main)", textTransform: "capitalize" }}>
                          {log.event_type.replace(/_/g, " ")}
                        </strong>
                        {log.details && (
                          <p style={{ margin: "2px 0 0", color: "var(--text-muted)" }}>
                            {log.details}
                          </p>
                        )}
                        {log.ip_address && (
                          <span style={{ fontSize: "11px", color: "var(--text-light)" }}>
                            IP: {log.ip_address}
                          </span>
                        )}
                      </div>
                      <span style={{ color: "var(--text-muted)", fontSize: "11px", whiteSpace: "nowrap" }}>
                        {logTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setAuditSession(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
