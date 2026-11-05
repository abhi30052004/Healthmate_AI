import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Download,
  Trash2,
  Eye,
  FileSpreadsheet,
  AlertOctagon,
  Clock,
  Laptop,
  MessageSquare,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import type { FamilyProfile } from "../../api/client";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  status: "success" | "revoked" | "flagged";
  ipAddress: string;
}

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-1",
    timestamp: "Today, 10:45 AM",
    actor: "You (Web Client)",
    action: "Generated Doctor Visit Pack",
    resource: "Cardiology & Routine Labs (2026)",
    status: "success",
    ipAddress: "152.58.112.44",
  },
  {
    id: "log-2",
    timestamp: "Yesterday, 04:12 PM",
    actor: "Dr. P. Sen (Cardiologist)",
    action: "Doctor Portal QR Scan & Session Access",
    resource: "Vitals, Labs, Active Prescriptions",
    status: "success",
    ipAddress: "103.21.244.18",
  },
  {
    id: "log-3",
    timestamp: "03 Nov 2026, 09:30 AM",
    actor: "You (Web Client)",
    action: "Verified Extracted Lab Fact",
    resource: "HbA1c 6.8% (Apollo Clinic Report)",
    status: "success",
    ipAddress: "152.58.112.44",
  },
  {
    id: "log-4",
    timestamp: "28 Oct 2026, 07:15 PM",
    actor: "Security Engine",
    action: "Expired Doctor Consultation Share",
    resource: "Temporary PIN Share Session #SH-9281",
    status: "revoked",
    ipAddress: "System Automated",
  },
];

export function PrivacyView({
  token,
  activeProfile,
}: {
  token: string;
  activeProfile?: FamilyProfile;
}) {
  const [logs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");

  const handleExportData = () => {
    setIsExporting(true);
    setExportComplete(false);
    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(true);
    }, 1200);
  };

  const handleDeleteAccount = () => {
    alert("Account deletion request logged. In accordance with data privacy regulations, your profile and records will be permanently purged.");
    setIsDeleteModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Privacy & Security Centre"
        subtitle="Full transparency over who accessed your records, audit history, and complete data ownership controls."
      />

      {/* Trust & Sovereignty Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-[var(--green-600)]/30 bg-white">
          <CardContent className="p-5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--green-50)] text-[var(--green-800)] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-[var(--text)]">You Own 100% of Your Data</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              HealthMate never sells, monetizes, or uses your medical records for public AI model training.
            </p>
          </CardContent>
        </Card>

        <Card className="border-[var(--green-600)]/30 bg-white">
          <CardContent className="p-5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--green-50)] text-[var(--green-800)] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-[var(--text)]">Zero-Retention Sharing</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Clinician QR shares are strictly time-limited and PIN-protected. You can revoke access in one click anytime.
            </p>
          </CardContent>
        </Card>

        <Card className="border-[var(--green-600)]/30 bg-white">
          <CardContent className="p-5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--green-50)] text-[var(--green-800)] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-[var(--text)]">Immutable Audit Trail</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Every document view, fact verification, export, and clinician portal scan is permanently logged.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Linked Channels & Devices */}
      <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-sm space-y-4">
        <h3 className="font-display font-semibold text-base text-[var(--text)]">
          Connected Access Channels
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Laptop className="w-4 h-4 text-[var(--green-700)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--text)]">Current Web Session</p>
                <p className="text-[11px] text-[var(--muted)]">Active now (Chrome, Windows)</p>
              </div>
            </div>
            <Badge variant="verified" size="sm">Active</Badge>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-[var(--green-700)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--text)]">Telegram Reminders</p>
                <p className="text-[11px] text-[var(--muted)]">Bot @HealthMateCareBot</p>
              </div>
            </div>
            <Badge variant="verified" size="sm">Connected</Badge>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-[var(--green-700)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--text)]">Email Alerts</p>
                <p className="text-[11px] text-[var(--muted)]">Security & reports</p>
              </div>
            </div>
            <Badge variant="verified" size="sm">Active</Badge>
          </div>
        </div>
      </div>

      {/* Access Audit Log Table */}
      <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-base text-[var(--text)]">
              Security & Access Log
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Real-time audit history of data reads, exports, and clinician sharing sessions.
            </p>
          </div>
          <Badge variant="neutral" size="sm">
            {logs.length} Events Logged
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase font-semibold">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Resource / Scope</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.map((entry) => (
                <tr key={entry.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                  <td className="py-3 px-3 font-medium text-[var(--text)] whitespace-nowrap">
                    {entry.timestamp}
                  </td>
                  <td className="py-3 px-3 text-[var(--text)] font-semibold">
                    {entry.actor}
                  </td>
                  <td className="py-3 px-3 text-[var(--text)]">
                    {entry.action}
                  </td>
                  <td className="py-3 px-3 text-[var(--muted)]">
                    {entry.resource}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {entry.status === "success" && (
                      <Badge variant="verified" size="sm">Success</Badge>
                    )}
                    {entry.status === "revoked" && (
                      <Badge variant="neutral" size="sm">Expired / Revoked</Badge>
                    )}
                    {entry.status === "flagged" && (
                      <Badge variant="failed" size="sm">Flagged</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Export & Account Erasure Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export Data */}
        <Card className="border-[var(--border)] bg-white shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[var(--green-50)] text-[var(--green-800)]">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-sm text-[var(--text)]">
                  Export Complete Health Archive
                </h4>
                <p className="text-xs text-[var(--muted)]">
                  Download all uploaded documents, verified lab tests, medication histories, and timeline data in a portable JSON + PDF archive.
                </p>
              </div>
            </div>

            {exportComplete && (
              <div className="p-3 rounded-lg bg-[var(--green-50)] border border-[var(--green-100)] text-xs text-[var(--green-900)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--green-600)]" />
                <span>Health records export package generated successfully.</span>
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportData}
              disabled={isExporting}
              className="gap-2 w-full justify-center"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "Compiling Archive..." : "Export All Records (JSON & PDF)"}</span>
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-[var(--danger)]/30 bg-[var(--danger-bg)]/30 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[var(--danger-bg)] text-[var(--danger)]">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-sm text-[var(--text)]">
                  Permanent Account & Record Deletion
                </h4>
                <p className="text-xs text-[var(--muted)]">
                  Request immediate erasure of all your health records, uploaded scans, profile identities, and audit trails.
                </p>
              </div>
            </div>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="gap-2 w-full justify-center"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Delete Account & Purge Records</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--danger)] flex items-center gap-2">
              <AlertOctagon className="w-5 h-5" />
              <span>Confirm Permanent Account Deletion</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-sm text-[var(--text)] leading-relaxed">
              This action is permanent and irreversible. All your medical documents, lab trend histories, doctor visit packs, and family profiles will be permanently erased.
            </p>

            <div className="p-3 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger)]/20 text-xs text-[var(--danger)]">
              Please type <strong>DELETE MY HEALTHMATE DATA</strong> to authorize data destruction.
            </div>

            <Input
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="DELETE MY HEALTHMATE DATA"
              className="font-mono text-sm"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setConfirmPhrase("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={confirmPhrase !== "DELETE MY HEALTHMATE DATA"}
                onClick={handleDeleteAccount}
              >
                Permanently Delete Everything
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
