import React, { useState } from "react";
import {
  Share2,
  QrCode,
  ShieldCheck,
  Clock,
  Lock,
  Copy,
  Trash2,
  Check,
  AlertTriangle,
  Plus,
  Heart,
  Phone,
  User,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Dialog } from "../../components/ui/Dialog";
import { Badge } from "../../components/ui/Badge";
import type { FamilyProfile } from "../../api/client";

export interface ActiveShare {
  id: string;
  scope: string;
  expiresAt: string;
  pinRequired: boolean;
  pin?: string;
  shareUrl: string;
  createdAt: string;
}

export function SharingEmergencyView({
  token,
  activeProfile,
}: {
  token: string;
  activeProfile: FamilyProfile | null;
}) {
  const [activeTab, setActiveTab] = useState<"qr" | "emergency">("qr");

  // Active Doctor Shares
  const [shares, setShares] = useState<ActiveShare[]>([
    {
      id: "share-1",
      scope: "Full Consultation Pack (Vitals, Labs, Medications)",
      expiresAt: "In 23 hours",
      pinRequired: true,
      pin: "4829",
      shareUrl: `${window.location.origin}/shared/doc-demo-token-123`,
      createdAt: "Today at 10:00 AM",
    },
  ]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [shareScope, setShareScope] = useState<"full" | "labs" | "meds">("full");
  const [shareDuration, setShareDuration] = useState<"1h" | "24h" | "7d">("24h");
  const [requirePin, setRequirePin] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Emergency Card State
  const [bloodType, setBloodType] = useState(activeProfile?.blood_type || "O+");
  const [allergies, setAllergies] = useState("Penicillin, Sulfonamides");
  const [emergencyContactName, setEmergencyContactName] = useState("Dr. Abhijit Bhunia");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("+91 98765 43210");
  const [conditions, setConditions] = useState("Type 2 Diabetes, Mild Hypertension");

  const handleCreateShare = (e: React.FormEvent) => {
    e.preventDefault();
    const newShare: ActiveShare = {
      id: `share-${Date.now()}`,
      scope:
        shareScope === "full"
          ? "Full Consultation Pack"
          : shareScope === "labs"
          ? "Laboratory Records Only"
          : "Active Medications Only",
      expiresAt: shareDuration === "1h" ? "In 1 hour" : shareDuration === "24h" ? "In 24 hours" : "In 7 days",
      pinRequired: requirePin,
      pin: requirePin ? Math.floor(1000 + Math.random() * 9000).toString() : undefined,
      shareUrl: `${window.location.origin}/shared/doc-tok-${Date.now()}`,
      createdAt: "Just now",
    };

    setShares((prev) => [newShare, ...prev]);
    setIsCreateOpen(false);
  };

  const handleRevoke = (id: string) => {
    setShares((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCopyLink = (share: ActiveShare) => {
    navigator.clipboard?.writeText(share.shareUrl);
    setCopiedId(share.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const patientName = activeProfile?.name || "Patient Profile";

  return (
    <div className="space-y-8" data-testid="sharing-emergency-view">
      <PageHeader
        title="Doctor Sharing & Emergency Medical Card"
        subtitle="Generate time-limited read-only QR codes for clinician consultations and maintain emergency medical identification."
        actions={
          activeTab === "qr" && (
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={() => setIsCreateOpen(true)}
            >
              Generate New Share Link
            </Button>
          )
        }
      />

      {/* Mode Switcher */}
      <div className="inline-flex items-center p-1 rounded-lg bg-white border border-[var(--border)]">
        <button
          type="button"
          onClick={() => setActiveTab("qr")}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "qr"
              ? "bg-[var(--green-50)] text-[var(--green-900)] border border-[var(--green-100)]"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <QrCode size={15} />
          <span>Doctor QR Code Sharing</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("emergency")}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "emergency"
              ? "bg-[var(--green-50)] text-[var(--green-900)] border border-[var(--green-100)]"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <Heart size={15} className="text-[var(--danger)]" />
          <span>Emergency Medical Card</span>
        </button>
      </div>

      {/* SECTION 1: Doctor QR Code Sharing */}
      {activeTab === "qr" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">
              Active Doctor Share Sessions ({shares.length})
            </h2>
            <span className="text-xs text-[var(--muted)]">Revocable at any time</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {shares.map((share) => (
              <Card key={share.id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-lg bg-[var(--green-50)] text-[var(--green-800)] border border-[var(--green-100)]">
                        <QrCode size={20} />
                      </div>
                      <div>
                        <p className="font-display font-semibold text-sm text-[var(--text)]">
                          Doctor Consultation Share
                        </p>
                        <p className="text-xs text-[var(--muted)]">{share.scope}</p>
                      </div>
                    </div>
                    <Badge variant="verified" size="sm">
                      Active
                    </Badge>
                  </div>

                  {/* QR Box & Link */}
                  <div className="p-3 bg-[var(--bg)] rounded-lg border border-[var(--border)] flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-[var(--muted)] truncate max-w-[200px]">
                      {share.shareUrl}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(share)}
                      iconLeft={copiedId === share.id ? <Check size={13} /> : <Copy size={13} />}
                      className="shrink-0"
                    >
                      {copiedId === share.id ? "Copied" : "Copy"}
                    </Button>
                  </div>

                  <div className="text-xs text-[var(--muted)] space-y-1">
                    <p className="flex items-center gap-1.5 font-medium text-[var(--text)]">
                      <Clock size={13} className="text-[var(--green-700)]" />
                      <span>Expires: {share.expiresAt}</span>
                    </p>
                    {share.pinRequired && (
                      <p className="flex items-center gap-1.5">
                        <Lock size={13} className="text-[var(--muted)]" />
                        <span>Clinician Access PIN: <strong className="font-mono text-[var(--text)]">{share.pin}</strong></span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                  <span className="text-[11px] text-[var(--muted)]">Created {share.createdAt}</span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRevoke(share.id)}
                    iconLeft={<Trash2 size={13} />}
                  >
                    Revoke Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: Emergency Medical Card */}
      {activeTab === "emergency" && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Form Editor */}
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-display font-semibold text-[var(--text)]">
              Emergency Card Information
            </h2>
            <div className="space-y-3">
              <Input
                label="Blood Group / Rh Factor"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                placeholder="e.g. O Positive, B Negative"
              />
              <Input
                label="Critical Drug Allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Aspirin"
              />
              <Input
                label="Primary Medical Conditions"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="e.g. Asthma, Diabetes"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Emergency Contact Name"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                />
                <Input
                  label="Emergency Phone"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Live Wallet-Size Card Preview */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--green-900)] to-[var(--green-700)] text-white shadow-2 flex flex-col justify-between max-w-md space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--green-100)] bg-white/10 px-2 py-0.5 rounded">
                  Emergency Medical Card
                </span>
                <h3 className="text-xl font-display font-bold text-white mt-1">{patientName}</h3>
              </div>
              <div className="p-2 rounded-lg bg-white/15 text-white">
                <Heart size={20} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                <span className="text-[10px] text-[var(--green-100)] block">Blood Group</span>
                <span className="text-base font-bold font-mono">{bloodType}</span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                <span className="text-[10px] text-[var(--green-100)] block">Emergency Contact</span>
                <span className="font-semibold truncate block">{emergencyContactName}</span>
                <span className="text-[10px] opacity-80">{emergencyContactPhone}</span>
              </div>
            </div>

            <div className="space-y-1 text-xs bg-white/10 p-3 rounded-lg border border-white/10">
              <span className="text-[10px] font-bold text-[var(--green-100)] uppercase tracking-wider">
                Allergies & Cautions:
              </span>
              <p className="font-medium text-white">{allergies}</p>
            </div>

            <p className="text-[10px] text-white/70 text-center">
              HealthMate AI Emergency Medical ID · Present to first responders
            </p>
          </div>
        </section>
      )}

      {/* Create Share Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Generate Secure Doctor Share"
        description="Create a temporary, revocable link for your clinician consultation."
      >
        <form onSubmit={handleCreateShare} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text)]">Information Scope</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "full", label: "Full Visit Pack" },
                  { id: "labs", label: "Labs Only" },
                  { id: "meds", label: "Medicines" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShareScope(s.id)}
                  className={`p-2.5 rounded-lg text-xs font-semibold border text-center transition-colors ${
                    shareScope === s.id
                      ? "bg-[var(--green-50)] border-[var(--green-700)] text-[var(--green-900)] shadow-1"
                      : "bg-white border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text)]">Expiry Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "1h", label: "1 Hour" },
                  { id: "24h", label: "24 Hours" },
                  { id: "7d", label: "7 Days" },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setShareDuration(d.id)}
                  className={`p-2 rounded-lg text-xs font-semibold border text-center transition-colors ${
                    shareDuration === d.id
                      ? "bg-[var(--green-50)] border-[var(--green-700)] text-[var(--green-900)] shadow-1"
                      : "bg-white border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="pin-required"
              type="checkbox"
              checked={requirePin}
              onChange={(e) => setRequirePin(e.target.checked)}
              className="rounded text-[var(--green-800)]"
            />
            <label htmlFor="pin-required" className="text-xs text-[var(--text)] cursor-pointer">
              Protect share with 4-digit clinician PIN
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Generate Link & QR
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
