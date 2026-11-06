import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import {
  acknowledgeReminder,
  getInAppNotifications,
  processDueReminders,
  type FamilyProfile,
} from "../../api/client";
import { useOptionalAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/dates";

/**
 * Bell menu showing reminders that have come due. The server has no background
 * scheduler of its own, so while the app is open we ask it to process due
 * reminders once a minute.
 */
export function NotificationsMenu({ activeProfile }: { activeProfile: FamilyProfile | null }) {
  const auth = useOptionalAuth();
  const token = auth?.token ?? null;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const profileId = activeProfile?.id;

  const query = useQuery({
    queryKey: ["notifications", profileId],
    queryFn: async () => {
      try {
        await processDueReminders(token as string);
      } catch {
        /* listing still works if processing fails */
      }
      return getInAppNotifications(token as string, false, 30);
    },
    enabled: !!token,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const ack = useMutation({
    mutationFn: (id: string) => acknowledgeReminder(token as string, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Only this profile's reminders (or account-level ones) are shown.
  const items = (query.data ?? []).filter(
    (n) => n.delivery_status === "delivered" && (!n.profile_id || !profileId || n.profile_id === profileId)
  );
  const unread = items.filter((n) => !n.is_acknowledged).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus)]"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--green-700)] text-white text-[10px] font-bold flex items-center justify-center" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-[var(--border)] rounded-xl shadow-2 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] text-sm font-display font-semibold">Reminders</div>
          {!token ? (
            <p className="p-4 text-xs text-[var(--muted)]">Sign in to see reminders.</p>
          ) : query.isLoading ? (
            <p className="p-4 text-xs text-[var(--muted)]">Loading…</p>
          ) : query.isError ? (
            <p role="alert" className="p-4 text-xs text-[var(--danger)]">Couldn't load reminders.</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-xs text-[var(--muted)]">You're all caught up.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
              {items.map((n) => (
                <li key={n.reminder_id} className={`p-3 text-xs flex items-start justify-between gap-2 ${n.is_acknowledged ? "opacity-60" : ""}`}>
                  <div className="min-w-0">
                    <p className="font-semibold">{n.title}</p>
                    <p className="text-[var(--muted)]">{formatDateTime(n.due_at)}{n.profile_name ? ` · ${n.profile_name}` : ""}</p>
                  </div>
                  {!n.is_acknowledged && (
                    <button type="button" onClick={() => ack.mutate(n.reminder_id)} className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--border)] font-semibold hover:bg-[var(--green-50)]">
                      <Check size={12} aria-hidden="true" /> Seen
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="px-4 py-2 text-[10px] text-[var(--muted)] border-t border-[var(--border)]">Reminders can arrive late. Marking one "seen" only dismisses the notice; it doesn't record a dose.</p>
        </div>
      )}
    </div>
  );
}
