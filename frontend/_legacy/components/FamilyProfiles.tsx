import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  listFamilyProfiles,
  createFamilyProfile,
  updateFamilyProfile,
  deactivateFamilyProfile,
  ApiError,
  type FamilyProfile,
  type FamilyProfileCreatePayload,
  type FamilyProfileUpdatePayload,
  type RelationshipType,
  type ConsentStatusType,
  type GenderType,
} from "../api/client";

interface FamilyProfilesProps {
  token: string;
  activeProfile: FamilyProfile | null;
  onSelectProfile: (profile: FamilyProfile) => void;
  onProfileUpdated?: () => void;
}

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  self: "Account Holder (Self)",
  spouse: "Spouse / Partner",
  child: "Child / Minor",
  parent: "Parent / Elder",
  sibling: "Sibling",
  dependent: "Legal Dependent",
  other: "Other Family Member",
};

const AVATAR_COLORS = [
  "#0d9488", // Teal
  "#2563eb", // Blue
  "#7c3aed", // Purple
  "#db2777", // Pink
  "#ea580c", // Orange
  "#059669", // Green
  "#4f46e5", // Indigo
];

export function FamilyProfiles({
  token,
  activeProfile,
  onSelectProfile,
  onProfileUpdated,
}: FamilyProfilesProps) {
  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<FamilyProfile | null>(null);
  const [deactivateProfileTarget, setDeactivateProfileTarget] = useState<FamilyProfile | null>(null);
  const [viewDetailsProfile, setViewDetailsProfile] = useState<FamilyProfile | null>(null);

  // Add/Edit Form State
  const [formName, setFormName] = useState("");
  const [formRelationship, setFormRelationship] = useState<RelationshipType>("child");
  const [formDob, setFormDob] = useState("");
  const [formGender, setFormGender] = useState<GenderType | "">("");
  const [formBloodType, setFormBloodType] = useState("");
  const [formEmergencyName, setFormEmergencyName] = useState("");
  const [formEmergencyPhone, setFormEmergencyPhone] = useState("");
  const [formAllergies, setFormAllergies] = useState("");
  const [formAvatarColor, setFormAvatarColor] = useState(AVATAR_COLORS[0]);
  const [formIsDependent, setFormIsDependent] = useState(false);
  const [formConsentStatus, setFormConsentStatus] = useState<ConsentStatusType>("authorized");
  const [formConsentNotes, setFormConsentNotes] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load profiles
  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await listFamilyProfiles(token, showArchived);
      setProfiles(data);

      // Auto-select primary profile if activeProfile is null or not in list
      if (data.length > 0 && !activeProfile) {
        const primary = data.find((p) => p.is_primary) || data[0];
        onSelectProfile(primary);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to load family health profiles. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [token, showArchived, activeProfile, onSelectProfile]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const resetForm = () => {
    setFormName("");
    setFormRelationship("child");
    setFormDob("");
    setFormGender("");
    setFormBloodType("");
    setFormEmergencyName("");
    setFormEmergencyPhone("");
    setFormAllergies("");
    setFormAvatarColor(AVATAR_COLORS[0]);
    setFormIsDependent(false);
    setFormConsentStatus("authorized");
    setFormConsentNotes("");
    setFormErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setEditProfile(null);
    setAddModalOpen(true);
  };

  const openEditModal = (profile: FamilyProfile) => {
    setEditProfile(profile);
    setFormName(profile.name);
    setFormRelationship(profile.relationship);
    setFormDob(profile.date_of_birth || "");
    setFormGender(profile.gender || "");
    setFormBloodType(profile.blood_type || "");
    setFormEmergencyName(profile.emergency_contact_name || "");
    setFormEmergencyPhone(profile.emergency_contact_phone || "");
    setFormAllergies(profile.allergies_summary || "");
    setFormAvatarColor(profile.avatar_color || AVATAR_COLORS[0]);
    setFormIsDependent(profile.is_dependent);
    setFormConsentStatus(profile.consent_status);
    setFormConsentNotes(profile.consent_notes || "");
    setFormErrors({});
    setAddModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formName.trim()) {
      errs.name = "Full name is required.";
    }

    if (formDob) {
      const selected = new Date(formDob);
      const today = new Date();
      if (selected > today) {
        errs.dob = "Date of birth cannot be in the future.";
      }
    }

    if (editProfile?.is_primary && formRelationship !== "self") {
      errs.relationship = "Account owner relationship cannot be altered from 'self'.";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (editProfile) {
        const payload: FamilyProfileUpdatePayload = {
          name: formName.trim(),
          date_of_birth: formDob || null,
          gender: (formGender as GenderType) || null,
          blood_type: formBloodType.trim() || null,
          emergency_contact_name: formEmergencyName.trim() || null,
          emergency_contact_phone: formEmergencyPhone.trim() || null,
          allergies_summary: formAllergies.trim() || null,
          avatar_color: formAvatarColor,
          is_dependent: formIsDependent,
          consent_status: formConsentStatus,
          consent_notes: formConsentNotes.trim() || null,
        };

        if (!editProfile.is_primary) {
          payload.relationship = formRelationship;
        }

        const updated = await updateFamilyProfile(token, editProfile.id, payload);
        setSuccessMsg(`Profile for "${updated.name}" updated successfully.`);
        if (activeProfile?.id === updated.id) {
          onSelectProfile(updated);
        }
      } else {
        const payload: FamilyProfileCreatePayload = {
          name: formName.trim(),
          relationship: formRelationship,
          date_of_birth: formDob || null,
          gender: (formGender as GenderType) || null,
          blood_type: formBloodType.trim() || null,
          emergency_contact_name: formEmergencyName.trim() || null,
          emergency_contact_phone: formEmergencyPhone.trim() || null,
          allergies_summary: formAllergies.trim() || null,
          avatar_color: formAvatarColor,
          is_dependent: formIsDependent || formRelationship === "child",
          consent_status: formConsentStatus,
          consent_notes: formConsentNotes.trim() || null,
        };

        const created = await createFamilyProfile(token, payload);
        setSuccessMsg(`Family health profile for "${created.name}" created successfully.`);
        // Auto-switch to newly created member
        onSelectProfile(created);
      }

      setAddModalOpen(false);
      resetForm();
      await loadProfiles();
      onProfileUpdated?.();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to save family profile. Please verify your entries.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateProfileTarget) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const res = await deactivateFamilyProfile(token, deactivateProfileTarget.id);
      setSuccessMsg(
        `Profile "${res.name}" archived. Notice: Historical medical records and documents remain preserved for healthcare compliance.`
      );

      // If active profile was deactivated, switch to primary
      if (activeProfile?.id === deactivateProfileTarget.id) {
        const primary = profiles.find((p) => p.is_primary && p.id !== deactivateProfileTarget.id);
        if (primary) onSelectProfile(primary);
      }

      setDeactivateProfileTarget(null);
      await loadProfiles();
      onProfileUpdated?.();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to deactivate profile.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async (profile: FamilyProfile) => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const updated = await updateFamilyProfile(token, profile.id, { is_active: true });
      setSuccessMsg(`Profile "${updated.name}" has been reactivated.`);
      await loadProfiles();
      onProfileUpdated?.();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to reactivate profile.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name[0] || "P").toUpperCase();
  };

  const calculateAge = (dobString?: string | null) => {
    if (!dobString) return null;
    try {
      const birthDate = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 ? `${age} yrs` : null;
    } catch {
      return null;
    }
  };

  return (
    <div className="family-profiles-container" id="family-profiles-section">
      {/* Header Bar */}
      <div className="section-header">
        <div>
          <h2>👨‍👩‍👧 Family Health Profiles</h2>
          <p>
            Securely manage independent health profiles for your dependents, children, and authorized family members.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <label style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              id="toggle-show-archived"
            />
            Show Archived
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openAddModal}
            id="btn-add-family-member"
          >
            + Add Family Member
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: "16px" }}>
          <span>⚠️ {errorMsg}</span>
          <button type="button" className="alert-close" onClick={() => setErrorMsg(null)}>×</button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" role="status" style={{ marginBottom: "16px" }}>
          <span>✅ {successMsg}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessMsg(null)}>×</button>
        </div>
      )}

      {/* Currently Active Banner */}
      {activeProfile && (
        <div
          style={{
            background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)",
            border: "1px solid #99f6e4",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 4px rgba(13, 148, 136, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: activeProfile.avatar_color || "#0d9488",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "16px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            >
              {getInitials(activeProfile.name)}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#115e59" }}>
                  {activeProfile.name}
                </span>
                <span className="pill ok" style={{ fontSize: "11px", padding: "2px 8px" }}>
                  {RELATIONSHIP_LABELS[activeProfile.relationship] || activeProfile.relationship}
                </span>
                {activeProfile.is_primary && (
                  <span className="pill wait" style={{ fontSize: "11px", padding: "2px 8px" }}>
                    Primary Account
                  </span>
                )}
                {activeProfile.is_dependent && (
                  <span className="pill wait" style={{ fontSize: "11px", padding: "2px 8px" }}>
                    Dependent
                  </span>
                )}
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#0f766e" }}>
                Currently Active Clinical View: All documents, visit packs, reminders, and timeline entries reflect this individual.
              </p>
            </div>
          </div>
          <div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#0f766e",
                background: "#ffffff",
                padding: "6px 12px",
                borderRadius: "20px",
                border: "1px solid #5eead4",
              }}
            >
              Active Profile
            </span>
          </div>
        </div>
      )}

      {/* Profiles Grid */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          <p>Loading family health profiles…</p>
        </div>
      ) : profiles.length === 0 ? (
        <div
          style={{
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>👨‍👩‍👧</div>
          <h3 style={{ margin: "0 0 8px" }}>No family profiles found</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "460px", margin: "0 auto 20px" }}>
            Add your children, dependents, or authorized family members to manage their medical documents, appointments, and care plans safely.
          </p>
          <button type="button" className="btn btn-primary" onClick={openAddModal}>
            + Add First Family Member
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          {profiles.map((profile) => {
            const isSelected = activeProfile?.id === profile.id;
            const ageText = calculateAge(profile.date_of_birth);

            return (
              <div
                key={profile.id}
                className="family-card"
                style={{
                  background: "var(--surface)",
                  borderRadius: "var(--radius-lg)",
                  border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
                  position: "relative",
                  opacity: profile.is_active ? 1 : 0.65,
                  transition: "all 0.2s ease",
                }}
              >
                <div>
                  {/* Top Bar: Avatar & Badges */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          backgroundColor: profile.avatar_color || "#0d9488",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "15px",
                        }}
                      >
                        {getInitials(profile.name)}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                          {profile.name}
                        </h4>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {RELATIONSHIP_LABELS[profile.relationship] || profile.relationship}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      {profile.is_primary && (
                        <span className="pill ok" style={{ fontSize: "11px", padding: "2px 8px" }}>
                          Primary
                        </span>
                      )}
                      {!profile.is_active && (
                        <span className="pill bad" style={{ fontSize: "11px", padding: "2px 8px" }}>
                          Archived
                        </span>
                      )}
                      {profile.consent_status === "authorized" && (
                        <span className="pill ok" style={{ fontSize: "10px", padding: "1px 6px" }}>
                          Authorized
                        </span>
                      )}
                      {profile.consent_status === "pending_consent" && (
                        <span className="pill wait" style={{ fontSize: "10px", padding: "1px 6px" }}>
                          Pending Consent
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Demographics Summary */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      paddingBottom: "12px",
                      borderBottom: "1px solid var(--border)",
                      marginBottom: "12px",
                    }}
                  >
                    {profile.date_of_birth && (
                      <span style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px" }}>
                        🎂 {profile.date_of_birth} {ageText ? `(${ageText})` : ""}
                      </span>
                    )}
                    {profile.gender && (
                      <span style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", textTransform: "capitalize" }}>
                        👤 {profile.gender.replace("_", " ")}
                      </span>
                    )}
                    {profile.blood_type && (
                      <span style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px" }}>
                        🩸 {profile.blood_type}
                      </span>
                    )}
                    {profile.is_dependent && (
                      <span style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px" }}>
                        🛡️ Legal Dependent
                      </span>
                    )}
                  </div>

                  {/* Allergies Notice */}
                  {profile.allergies_summary && (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                      <strong style={{ color: "#b91c1c" }}>Allergies: </strong>
                      {profile.allergies_summary}
                    </div>
                  )}

                  {/* Clinical Records Counts */}
                  {profile.health_summary && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "6px",
                        textAlign: "center",
                        background: "var(--surface-alt)",
                        padding: "8px",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: "16px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>
                          {profile.health_summary.document_count}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Reports</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>
                          {profile.health_summary.medication_count}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Meds</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>
                          {profile.health_summary.appointment_count}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Appts</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>
                          {profile.health_summary.reminder_count}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Reminders</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}>
                  {profile.is_active ? (
                    isSelected ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled
                        style={{ flex: 1, backgroundColor: "#f0fdfa", color: "#0d9488", borderColor: "#99f6e4" }}
                      >
                        ✓ Active Profile
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onSelectProfile(profile)}
                        style={{ flex: 1 }}
                        id={`btn-select-profile-${profile.id}`}
                      >
                        Switch to Profile
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleReactivate(profile)}
                      style={{ flex: 1 }}
                    >
                      Reactivate Profile
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setViewDetailsProfile(profile)}
                    title="View Clinical Details"
                  >
                    Details
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEditModal(profile)}
                    title="Edit Profile"
                  >
                    Edit
                  </button>

                  {!profile.is_primary && profile.is_active && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ color: "#dc2626" }}
                      onClick={() => setDeactivateProfileTarget(profile)}
                      title="Archive profile safely"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Profile Modal */}
      {addModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: "560px", width: "90%" }}>
            <div className="modal-header">
              <h3>{editProfile ? `Edit Profile: ${editProfile.name}` : "Add Family Member"}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setAddModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="field-name" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Full Name *
                  </label>
                  <input
                    id="field-name"
                    type="text"
                    className="form-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Leo Bhunia"
                    required
                  />
                  {formErrors.name && (
                    <span style={{ color: "#dc2626", fontSize: "12px" }}>{formErrors.name}</span>
                  )}
                </div>

                <div>
                  <label htmlFor="field-relationship" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Relationship *
                  </label>
                  <select
                    id="field-relationship"
                    className="form-input"
                    value={formRelationship}
                    onChange={(e) => setFormRelationship(e.target.value as RelationshipType)}
                    disabled={editProfile?.is_primary}
                  >
                    {editProfile?.is_primary ? (
                      <option value="self">Account Holder (Self)</option>
                    ) : (
                      <>
                        <option value="child">Child / Minor</option>
                        <option value="spouse">Spouse / Partner</option>
                        <option value="parent">Parent / Elder</option>
                        <option value="sibling">Sibling</option>
                        <option value="dependent">Legal Dependent</option>
                        <option value="other">Other</option>
                      </>
                    )}
                  </select>
                  {formErrors.relationship && (
                    <span style={{ color: "#dc2626", fontSize: "12px" }}>{formErrors.relationship}</span>
                  )}
                </div>

                <div>
                  <label htmlFor="field-dob" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Date of Birth
                  </label>
                  <input
                    id="field-dob"
                    type="date"
                    className="form-input"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                  {formErrors.dob && (
                    <span style={{ color: "#dc2626", fontSize: "12px" }}>{formErrors.dob}</span>
                  )}
                </div>

                <div>
                  <label htmlFor="field-gender" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Gender Identity
                  </label>
                  <select
                    id="field-gender"
                    className="form-input"
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as GenderType)}
                  >
                    <option value="">Unspecified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="field-blood" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Blood Type
                  </label>
                  <input
                    id="field-blood"
                    type="text"
                    className="form-input"
                    value={formBloodType}
                    onChange={(e) => setFormBloodType(e.target.value)}
                    placeholder="e.g. O+, A-, B+"
                  />
                </div>

                <div>
                  <label htmlFor="field-emerg-name" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Emergency Contact Name
                  </label>
                  <input
                    id="field-emerg-name"
                    type="text"
                    className="form-input"
                    value={formEmergencyName}
                    onChange={(e) => setFormEmergencyName(e.target.value)}
                    placeholder="Contact name"
                  />
                </div>

                <div>
                  <label htmlFor="field-emerg-phone" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Emergency Contact Phone
                  </label>
                  <input
                    id="field-emerg-phone"
                    type="tel"
                    className="form-input"
                    value={formEmergencyPhone}
                    onChange={(e) => setFormEmergencyPhone(e.target.value)}
                    placeholder="+1-555-0100"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="field-allergies" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Allergies & Sensitivities Summary
                  </label>
                  <textarea
                    id="field-allergies"
                    className="form-input"
                    rows={2}
                    value={formAllergies}
                    onChange={(e) => setFormAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, Peanuts, Latex"
                  />
                </div>

                <div>
                  <label htmlFor="field-avatar" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Theme Color
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormAvatarColor(color)}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          backgroundColor: color,
                          border: formAvatarColor === color ? "2px solid #0f172a" : "none",
                          cursor: "pointer",
                          transform: formAvatarColor === color ? "scale(1.2)" : "scale(1)",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "24px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={formIsDependent}
                      onChange={(e) => setFormIsDependent(e.target.checked)}
                      id="field-is-dependent"
                    />
                    Is Legal Dependent / Ward
                  </label>
                </div>

                {/* Consent & Authorization */}
                <div style={{ gridColumn: "1 / -1", background: "var(--surface-alt)", padding: "12px", borderRadius: "var(--radius-sm)" }}>
                  <label htmlFor="field-consent-status" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Authorization / Consent Status
                  </label>
                  <select
                    id="field-consent-status"
                    className="form-input"
                    value={formConsentStatus}
                    onChange={(e) => setFormConsentStatus(e.target.value as ConsentStatusType)}
                    style={{ marginBottom: "8px" }}
                  >
                    <option value="authorized">Authorized (Guardian / Written Consent Confirmed)</option>
                    <option value="pending_consent">Pending Consent</option>
                    <option value="revoked">Consent Revoked</option>
                  </select>

                  <input
                    type="text"
                    className="form-input"
                    value={formConsentNotes}
                    onChange={(e) => setFormConsentNotes(e.target.value)}
                    placeholder="Optional consent reference or legal guardianship note"
                    style={{ fontSize: "12px" }}
                  />
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--text-muted)" }}>
                    In accordance with healthcare privacy requirements, accessing clinical information for family members requires appropriate legal guardianship or explicit authorization.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAddModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  id="btn-submit-family-profile"
                >
                  {isSubmitting ? "Saving…" : editProfile ? "Save Changes" : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Archive / Deactivation Modal */}
      {deactivateProfileTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: "480px", width: "90%" }}>
            <div className="modal-header">
              <h3 style={{ color: "#991b1b" }}>Archive Family Profile</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDeactivateProfileTarget(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={{ padding: "8px 0" }}>
              <p style={{ margin: "0 0 12px", fontSize: "14px" }}>
                Are you sure you want to archive the health profile for <strong>{deactivateProfileTarget.name}</strong>?
              </p>

              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px",
                  fontSize: "13px",
                  color: "#991b1b",
                  marginBottom: "16px",
                }}
              >
                <strong>Healthcare Compliance Notice:</strong>
                <p style={{ margin: "4px 0 0", lineHeight: "1.4" }}>
                  Archiving removes this individual from active clinical views. In accordance with medical record retention regulations,
                  all previously uploaded lab reports, medical documents, observations, care schedules, and reminders
                  remain securely preserved and can be reactivated at any time.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeactivateProfileTarget(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: "#dc2626", borderColor: "#dc2626" }}
                onClick={handleDeactivate}
                disabled={isSubmitting}
                id="btn-confirm-archive-profile"
              >
                {isSubmitting ? "Archiving…" : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Details Drawer / Modal */}
      {viewDetailsProfile && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: "520px", width: "90%" }}>
            <div className="modal-header">
              <h3>Profile Summary: {viewDetailsProfile.name}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setViewDetailsProfile(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={{ padding: "8px 0", fontSize: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: viewDetailsProfile.avatar_color || "#0d9488",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "18px",
                  }}
                >
                  {getInitials(viewDetailsProfile.name)}
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>{viewDetailsProfile.name}</h4>
                  <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    {RELATIONSHIP_LABELS[viewDetailsProfile.relationship]}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <div>
                  <strong style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Date of Birth</strong>
                  <span>{viewDetailsProfile.date_of_birth || "Not specified"}</span>
                </div>
                <div>
                  <strong style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Blood Type</strong>
                  <span>{viewDetailsProfile.blood_type || "Not specified"}</span>
                </div>
                <div>
                  <strong style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Gender</strong>
                  <span style={{ textTransform: "capitalize" }}>{viewDetailsProfile.gender || "Not specified"}</span>
                </div>
                <div>
                  <strong style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Dependent Status</strong>
                  <span>{viewDetailsProfile.is_dependent ? "Legal Dependent" : "Independent"}</span>
                </div>
              </div>

              <div style={{ marginBottom: "16px", padding: "10px", background: "var(--surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <strong style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Emergency Contact</strong>
                <div>{viewDetailsProfile.emergency_contact_name || "—"}</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{viewDetailsProfile.emergency_contact_phone || "—"}</div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <strong style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Consent & Authorization</strong>
                <span className="pill ok" style={{ fontSize: "12px", textTransform: "capitalize" }}>
                  {viewDetailsProfile.consent_status}
                </span>
                {viewDetailsProfile.consent_notes && (
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                    Notes: {viewDetailsProfile.consent_notes}
                  </p>
                )}
              </div>

              {viewDetailsProfile.health_summary && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <strong style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                    Associated Medical Data Scoping
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "var(--text-main)" }}>
                    <li>{viewDetailsProfile.health_summary.document_count} Clinical Documents & Lab Reports</li>
                    <li>{viewDetailsProfile.health_summary.medication_count} Active Medication Prescriptions</li>
                    <li>{viewDetailsProfile.health_summary.appointment_count} Scheduled Doctor Appointments</li>
                    <li>{viewDetailsProfile.health_summary.reminder_count} Smart Health Reminders</li>
                  </ul>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewDetailsProfile(null)}
              >
                Close
              </button>
              {viewDetailsProfile.is_active && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onSelectProfile(viewDetailsProfile);
                    setViewDetailsProfile(null);
                  }}
                >
                  Switch to This Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
