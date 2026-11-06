import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Trash2, ScanSearch, Eye, ShieldCheck } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../../components/feedback/States";
import { useAuth } from "../../context/AuthContext";
import {
  deleteAccount,
  dismissDuplicateCandidate,
  downloadAccountExport,
  getDataQualitySummary,
  getDoctorShareAudit,
  listDoctorShares,
  listDuplicateCandidates,
  revokeDoctorShare,
  scanDuplicates,
  type DoctorSharingItem,
  type DuplicateCandidateItem,
  type FamilyProfile,
} from "../../api/client";
import { errorMessage, formatDate, formatDateTime } from "../../lib/dates";

export function PrivacyView({ token, activeProfile }: { token: string; activeProfile: FamilyProfile | null }) {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const profileId = activeProfile?.id;

  // ---- Who can see my records (all profiles)
  const shares = useQuery({ queryKey: ["doctor-shares", "all"], queryFn: () => listDoctorShares(token) });
  const [auditFor, setAuditFor] = useState<DoctorSharingItem | null>(null);
  const audit = useQuery({
    queryKey: ["share-audit", auditFor?.id],
    queryFn: () => getDoctorShareAudit(token, auditFor!.id),
    enabled: !!auditFor,
  });
  const revoke = useMutation({
    mutationFn: (s: DoctorSharingItem) => revokeDoctorShare(token, s.id),
    onSuccess: () => {
      toast.success("Link revoked.");
      queryClient.invalidateQueries({ queryKey: ["doctor-shares"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  // ---- Data quality
  const summary = useQuery({
    queryKey: ["dq-summary", profileId],
    queryFn: () => getDataQualitySummary(token, profileId),
    enabled: !!profileId,
  });
  const candidates = useQuery({
    queryKey: ["dq-candidates", profileId],
    queryFn: () => listDuplicateCandidates(token, { profileId, status: "pending", pageSize: 10 }),
    enabled: !!profileId,
  });
  const refreshDq = () => {
    queryClient.invalidateQueries({ queryKey: ["dq-summary", profileId] });
    queryClient.invalidateQueries({ queryKey: ["dq-candidates", profileId] });
  };
  const scan = useMutation({
    mutationFn: () => scanDuplicates(token, profileId),
    onSuccess: (s) => {
      toast.success(s.pending_candidates ? `${s.pending_candidates} possible duplicate(s) to review.` : "No duplicates found.");
      refreshDq();
    },
    onError: (e) => toast.error(errorMessage(e, "Scan failed.")),
  });
  const dismiss = useMutation({
    mutationFn: (c: DuplicateCandidateItem) => dismissDuplicateCandidate(token, c.id, "Reviewed: not a duplicate"),
    onSuccess: refreshDq,
    onError: (e) => toast.error(errorMessage(e)),
  });

  // ---- Export / delete
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAccountExport(token);
      toast.success("Your data export has been downloaded.");
    } catch (e) {
      toast.error(errorMessage(e, "Export failed."));
    } finally {
      setExporting(false);
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const del = useMutation({
    mutationFn: () => deleteAccount(token, password),
    onSuccess: () => {
      logout();
      queryClient.clear();
      // Hard redirect: guarantees no health data lingers in memory and avoids the route
      // guard racing the router (it would bounce an in-app navigation to /login).
      window.location.replace("/");
    },
    onError: (e) => setDeleteError(errorMessage(e, "Couldn't delete the account.")),
  });

  const activeShares = (shares.data ?? []).filter((s) => s.status === "active" && !s.is_expired);

  return (
    <div className="space-y-8" data-testid="privacy-view">
      <PageHeader title="Privacy & Data" subtitle="See who can view your records, check for duplicate entries, and download or delete your data." />

      <section className="space-y-3" aria-label="Active share links">
        <h2 className="font-display font-semibold text-base flex items-center gap-2">
          <Eye size={17} aria-hidden="true" /> Who can see your records right now
        </h2>
        {shares.isLoading ? (
          <Skeleton height={80} rounded="lg" />
        ) : shares.isError ? (
          <ErrorState title="Couldn't load share links" message={errorMessage(shares.error)} onRetry={() => shares.refetch()} />
        ) : activeShares.length === 0 ? (
          <Card className="p-4 text-sm flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--green-600)]" aria-hidden="true" /> No active doctor links. Only you can see your records.
          </Card>
        ) : (
          <Card className="divide-y divide-[var(--border)]">
            {activeShares.map((s) => (
              <div key={s.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold">{s.doctor_name} <span className="font-normal text-[var(--muted)]">for {s.profile_name}</span></p>
                  <p className="text-xs text-[var(--muted)]">Expires {formatDateTime(s.expires_at)} · opened {s.access_count} time{s.access_count === 1 ? "" : "s"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAuditFor(s)}>Access log</Button>
                  <Button variant="danger" size="sm" loading={revoke.isPending && revoke.variables?.id === s.id} onClick={() => revoke.mutate(s)}>Revoke</Button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="space-y-3" aria-label="Duplicate check">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display font-semibold text-base flex items-center gap-2">
            <ScanSearch size={17} aria-hidden="true" /> Duplicate check for {activeProfile?.name}
          </h2>
          <Button variant="outline" size="sm" loading={scan.isPending} onClick={() => scan.mutate()}>
            Scan now
          </Button>
        </div>
        {summary.data && (
          <p className="text-xs text-[var(--muted)]">
            {summary.data.pending_candidates} to review · {summary.data.dismissed_candidates} dismissed · {summary.data.resolved_duplicates} resolved
            {summary.data.last_scan_at ? ` · last scan ${formatDateTime(summary.data.last_scan_at)}` : " · never scanned"}
          </p>
        )}
        {candidates.isLoading ? (
          <Skeleton height={60} rounded="lg" />
        ) : (candidates.data?.items ?? []).length === 0 ? (
          <EmptyState title="Nothing to review" description="Run a scan to look for repeated uploads or repeated results. Nothing is ever merged or deleted automatically." />
        ) : (
          <Card className="divide-y divide-[var(--border)]">
            {(candidates.data?.items ?? []).map((c) => (
              <div key={c.id} className="p-4 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">
                    {c.primary_summary?.title ?? "Record"} <span className="text-[var(--muted)]">and</span> {c.secondary_summary?.title ?? "Record"}
                  </p>
                  <Badge variant="review" size="sm">{Math.round(c.confidence * 100)}% similar</Badge>
                </div>
                <ul className="text-[var(--muted)] list-disc pl-4">
                  {c.match_reasons.map((r) => (
                    <li key={r.code}>{r.description}</li>
                  ))}
                </ul>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" loading={dismiss.isPending && dismiss.variables?.id === c.id} onClick={() => dismiss.mutate(c)}>
                    Not a duplicate
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        )}
        <p className="text-[11px] text-[var(--muted)]">Possible duplicates are only suggestions. You decide what to keep.</p>
      </section>

      <section className="space-y-3" aria-label="Your data">
        <h2 className="font-display font-semibold text-base">Your data</h2>
        <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Download everything</p>
            <p className="text-xs text-[var(--muted)]">A JSON file with your profiles, results, medications, appointments, symptoms and share history. Original files aren't included.</p>
          </div>
          <Button variant="outline" iconLeft={<Download size={15} />} loading={exporting} onClick={handleExport}>
            Export my data
          </Button>
        </Card>
        <Card className="p-5 flex flex-wrap items-center justify-between gap-4 border-[var(--danger)]/40">
          <div>
            <p className="font-semibold text-sm text-[var(--danger)]">Delete my account</p>
            <p className="text-xs text-[var(--muted)]">Permanently removes your account, every profile, all records and uploaded files. This can't be undone.</p>
          </div>
          <Button variant="danger" iconLeft={<Trash2 size={15} />} onClick={() => { setDeleteError(null); setPassword(""); setPhrase(""); setDeleteOpen(true); }}>
            Delete account
          </Button>
        </Card>
      </section>

      <Dialog open={!!auditFor} onClose={() => setAuditFor(null)} maxWidth="lg" title={`Access log: ${auditFor?.doctor_name ?? ""}`}>
        {audit.isLoading ? (
          <Skeleton height={60} rounded="lg" />
        ) : (audit.data ?? []).length === 0 ? (
          <p className="text-xs text-[var(--muted)]">Not opened yet.</p>
        ) : (
          <ul className="text-xs divide-y divide-[var(--border)]">
            {(audit.data ?? []).map((a) => (
              <li key={a.id} className="py-2 flex justify-between gap-3">
                <span className="font-medium">{a.event_type.replace(/_/g, " ")}</span>
                <span className="text-[var(--muted)]">{formatDateTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="md" title="Delete your account?" description="Everything will be permanently deleted. Consider exporting your data first.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (phrase !== "DELETE") return setDeleteError('Type DELETE to confirm.');
            if (!password) return setDeleteError("Enter your password.");
            setDeleteError(null);
            del.mutate();
          }}
        >
          <Input label="Type DELETE to confirm" value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" />
          <Input label="Your password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {deleteError && <p role="alert" className="text-xs text-[var(--danger)]">{deleteError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" loading={del.isPending}>Delete everything</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
