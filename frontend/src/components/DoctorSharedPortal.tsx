import React, { useState, useEffect } from "react";
import {
  getSharedHealthPortalView,
  getSharedDocumentDownloadUrl,
  getSharedVisitPackDownloadUrl,
  ApiError,
  type DoctorSharedHealthView,
} from "../api/client";

interface DoctorSharedPortalProps {
  token: string;
  onExit?: () => void;
}

export function DoctorSharedPortal({ token, onExit }: DoctorSharedPortalProps) {
  const [data, setData] = useState<DoctorSharedHealthView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{
    type: "revoked" | "expired" | "invalid" | "network";
    message: string;
  } | null>(null);

  useEffect(() => {
    async function loadPortal() {
      try {
        setLoading(true);
        setErrorState(null);
        const res = await getSharedHealthPortalView(token);
        setData(res);
      } catch (err: unknown) {
        const msg = (err instanceof Error ? err.message : String(err || "")).toLowerCase();
        const status =
          err instanceof ApiError
            ? err.status
            : err && typeof err === "object" && "status" in err
            ? (err as any).status
            : undefined;

        if (msg.includes("revoked")) {
          setErrorState({
            type: "revoked",
            message: "This health sharing session has been revoked by the patient.",
          });
        } else if (status === 410 || msg.includes("expired")) {
          setErrorState({
            type: "expired",
            message: "This health sharing session has expired. Please contact the patient to request a new link.",
          });
        } else if (status === 404 || msg.includes("invalid") || msg.includes("not found")) {
          setErrorState({
            type: "invalid",
            message: "This link is invalid or unrecognized. Please verify the URL provided by the patient.",
          });
        } else {
          setErrorState({
            type: "network",
            message: "Unable to load patient records. Please check your network connection.",
          });
        }
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadPortal();
    }
  }, [token]);

  return (
    <div
      className="doctor-shared-portal"
      id="doctor-shared-portal-root"
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        padding: "32px 16px",
        fontFamily: "var(--font-family)",
      }}
    >
      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Clinician Portal Header */}
        <header
          style={{
            background: "var(--surface)",
            padding: "20px 24px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
                color: "white",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              🩺
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "18px", color: "var(--text-main)" }}>
                HealthMate AI — Clinician Review Portal
              </h1>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
                Secure, read-only medical summary authorized by patient
              </p>
            </div>
          </div>
          {onExit && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onExit}
              id="btn-exit-portal"
            >
              Exit Portal
            </button>
          )}
        </header>

        {/* Loading State */}
        {loading && (
          <div
            className="card"
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div className="auth-loading-spinner" />
            <p style={{ marginTop: "16px", color: "var(--text-muted)" }}>
              Verifying clinical access token and loading authorized records…
            </p>
          </div>
        )}

        {/* Error States */}
        {!loading && errorState && (
          <div
            className="card"
            style={{
              padding: "40px 24px",
              textAlign: "center",
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
            }}
            id="portal-error-card"
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>
              {errorState.type === "revoked" ? "🚫" : errorState.type === "expired" ? "⏰" : "⚠️"}
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: "20px", color: "var(--text-main)" }}>
              {errorState.type === "revoked"
                ? "Access Revoked"
                : errorState.type === "expired"
                ? "Sharing Link Expired"
                : "Unable to Access Records"}
            </h2>
            <p style={{ color: "var(--text-muted)", maxWidth: "480px", margin: "0 auto 20px" }}>
              {errorState.message}
            </p>
            {onExit && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onExit}
              >
                Return to HealthMate AI
              </button>
            )}
          </div>
        )}

        {/* Authorized Clinical Content */}
        {!loading && data && (
          <>
            {/* Patient Overview Card */}
            <section
              className="card"
              style={{
                background: "var(--surface)",
                padding: "24px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "16px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 700,
                      color: "var(--primary)",
                    }}
                  >
                    Patient Profile
                  </span>
                  <h2 style={{ margin: "2px 0 0", fontSize: "22px", color: "var(--text-main)" }}>
                    {data.patient_name}
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
                    Prepared for: <strong>{data.doctor_name}</strong>
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="pill ok" style={{ fontSize: "12px" }}>
                    Active Share Session
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--text-muted)" }}>
                    Valid until {new Date(data.expires_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Demographics Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "14px",
                  fontSize: "13px",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>
                    Relationship / Role
                  </span>
                  <strong style={{ textTransform: "capitalize" }}>{data.patient_relationship}</strong>
                </div>
                {data.patient_age !== null && data.patient_age !== undefined && (
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>
                      Age
                    </span>
                    <strong>{data.patient_age} years</strong>
                  </div>
                )}
                {data.patient_gender && (
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>
                      Gender
                    </span>
                    <strong style={{ textTransform: "capitalize" }}>{data.patient_gender}</strong>
                  </div>
                )}
                {data.allergies_summary && (
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>
                      Known Allergies
                    </span>
                    <strong style={{ color: "#b91c1c" }}>{data.allergies_summary}</strong>
                  </div>
                )}
                {data.emergency_contact && (
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>
                      Emergency Contact
                    </span>
                    <strong>{data.emergency_contact}</strong>
                  </div>
                )}
              </div>

              {data.notes && (
                <div
                  style={{
                    marginTop: "16px",
                    background: "var(--surface-alt)",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    borderLeft: "3px solid var(--primary)",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary-text)", textTransform: "uppercase" }}>
                    Patient Notes for Consultation
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-main)" }}>
                    {data.notes}
                  </p>
                </div>
              )}
            </section>

            {/* Doctor Visit Pack Download Section */}
            {data.has_visit_pack && (
              <section
                className="card"
                style={{
                  background: "var(--surface)",
                  padding: "20px 24px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid #ccfbf1",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "20px" }}>📋</span>
                    <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-main)" }}>
                      Doctor Visit Preparation Pack
                    </h3>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
                    Source-grounded clinical preparation pack including recent laboratory observations, reference intervals, and care trends.
                  </p>
                </div>
                <a
                  href={getSharedVisitPackDownloadUrl(token)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  id="btn-download-shared-visit-pack"
                >
                  📥 Download Visit Pack PDF
                </a>
              </section>
            )}

            {/* Authorized Medical Documents */}
            {data.documents && data.documents.length > 0 && (
              <section
                className="card"
                style={{
                  background: "var(--surface)",
                  padding: "24px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <h3 style={{ margin: "0 0 14px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📄</span> Authorized Medical Documents ({data.documents.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {data.documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 14px",
                        background: "var(--surface-alt)",
                        borderRadius: "var(--radius-sm)",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "14px", color: "var(--text-main)" }}>
                          {doc.title}
                        </strong>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                          {doc.summary || "Medical Report"}
                          {doc.document_date && ` • ${doc.document_date}`}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <a
                          href={getSharedDocumentDownloadUrl(token, doc.id, true)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ textDecoration: "none" }}
                          id={`btn-view-doc-${doc.id}`}
                        >
                          Preview
                        </a>
                        <a
                          href={getSharedDocumentDownloadUrl(token, doc.id, false)}
                          download
                          className="btn btn-primary btn-sm"
                          style={{ textDecoration: "none" }}
                          id={`btn-download-doc-${doc.id}`}
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Active Medications List */}
            {data.medications && data.medications.length > 0 && (
              <section
                className="card"
                style={{
                  background: "var(--surface)",
                  padding: "24px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <h3 style={{ margin: "0 0 14px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>💊</span> Patient-Reported Medications ({data.medications.length})
                </h3>
                <div style={{ display: "grid", gap: "8px" }}>
                  {data.medications.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: "10px 14px",
                        background: "var(--surface-alt)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "13px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong>{m.name}</strong>
                        {m.dosage && <span className="pill ok" style={{ fontSize: "11px" }}>{m.dosage}</span>}
                      </div>
                      {m.frequency && (
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                          Frequency: {m.frequency}
                        </p>
                      )}
                      {m.notes && (
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                          Instructions: {m.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Appointments */}
            {data.appointments && data.appointments.length > 0 && (
              <section
                className="card"
                style={{
                  background: "var(--surface)",
                  padding: "24px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <h3 style={{ margin: "0 0 14px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📅</span> Care Appointments ({data.appointments.length})
                </h3>
                <div style={{ display: "grid", gap: "8px" }}>
                  {data.appointments.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        padding: "10px 14px",
                        background: "var(--surface-alt)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "13px",
                      }}
                    >
                      <strong>{a.doctor_name}</strong>
                      {a.specialty && <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>({a.specialty})</span>}
                      {a.appointment_date && (
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                          Date: {new Date(a.appointment_date).toLocaleString()}
                        </p>
                      )}
                      {a.location && (
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                          Location: {a.location}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Disclaimer */}
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                textAlign: "center",
                padding: "8px 16px",
              }}
            >
              <strong>Notice:</strong> This medical record summary was authorized by the patient for clinician consultation.
              HealthMate AI summarizes clinical reports and care logs; it does not provide an automated diagnosis.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
