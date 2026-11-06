import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAdherence,
  listDoseSlots,
  logDose,
  undoDoseLog,
  type DoseOutcome,
  type DoseSlot,
} from "../../api/client";
import type { DoseItem } from "../../components/health/DoseCard";
import { errorMessage, toDateInput } from "../../lib/dates";

export const slotKey = (s: Pick<DoseSlot, "medication_id" | "scheduled_date" | "scheduled_time">) =>
  `${s.medication_id}|${s.scheduled_date}|${s.scheduled_time}`;

/** "08:00" -> "8:00 AM" (respects the user's locale). */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Re-renders once a minute so "overdue" and the current date stay correct. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useDoses(token: string, profileId: string) {
  const queryClient = useQueryClient();
  const now = useNow();
  const today = toDateInput(now);

  const slotsQuery = useQuery({
    queryKey: ["doses", profileId, today],
    queryFn: () => listDoseSlots(token, today, profileId),
    enabled: !!profileId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["doses", profileId] });
    queryClient.invalidateQueries({ queryKey: ["adherence", profileId] });
  };

  const logMutation = useMutation({
    mutationFn: ({ slot, outcome }: { slot: DoseSlot; outcome: DoseOutcome }) =>
      logDose(token, {
        medication_id: slot.medication_id,
        scheduled_date: slot.scheduled_date,
        scheduled_time: slot.scheduled_time,
        outcome,
      }),
    onSuccess: invalidate,
    onError: (err) => toast.error(errorMessage(err, "Couldn't save that. Please try again.")),
  });

  const undoMutation = useMutation({
    mutationFn: (slot: DoseSlot) => undoDoseLog(token, slot.log_id as string),
    onSuccess: invalidate,
    onError: (err) => toast.error(errorMessage(err, "Couldn't undo that.")),
  });

  const slots = slotsQuery.data ?? [];
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const items: DoseItem[] = useMemo(
    () =>
      slots.map((s) => {
        const snoozeActive = s.outcome === "snoozed" && s.snoozed_until && new Date(s.snoozed_until) > now;
        return {
          id: slotKey(s),
          name: s.medication_name,
          dosage: s.strength ?? "",
          time: formatClock(s.scheduled_time),
          instructions: s.instructions ?? undefined,
          // A snooze that has run out is shown as pending again.
          status: s.outcome === "snoozed" && !snoozeActive ? "pending" : s.outcome ?? "pending",
          overdue: (s.outcome === null || s.outcome === "snoozed") && s.scheduled_time < nowHHMM && !snoozeActive,
          snoozeLabel: snoozeActive
            ? `until ${new Date(s.snoozed_until as string).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
            : undefined,
        } satisfies DoseItem;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots, nowHHMM]
  );

  const byId = (id: string) => slots.find((s) => slotKey(s) === id);

  return {
    isLoading: slotsQuery.isLoading,
    isError: slotsQuery.isError,
    error: slotsQuery.error,
    refetch: slotsQuery.refetch,
    items,
    slots,
    busyId: logMutation.isPending
      ? slotKey(logMutation.variables!.slot)
      : undoMutation.isPending
      ? slotKey(undoMutation.variables!)
      : null,
    take: (id: string) => {
      const slot = byId(id);
      if (slot) logMutation.mutate({ slot, outcome: "taken" });
    },
    skip: (id: string) => {
      const slot = byId(id);
      if (slot) logMutation.mutate({ slot, outcome: "skipped" });
    },
    snooze: (id: string) => {
      const slot = byId(id);
      if (slot) {
        logMutation.mutate({ slot, outcome: "snoozed" });
        toast.info("Snoozed for 15 minutes.");
      }
    },
    undo: (id: string) => {
      const slot = byId(id);
      if (slot?.log_id) undoMutation.mutate(slot);
    },
  };
}

export function useAdherence(token: string, profileId: string, days = 7) {
  const now = useNow(5 * 60_000);
  const today = toDateInput(now);
  return useQuery({
    queryKey: ["adherence", profileId, today, days],
    queryFn: () => getAdherence(token, profileId, today, days),
    enabled: !!profileId,
  });
}
