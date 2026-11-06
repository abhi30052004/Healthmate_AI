import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Globe, Sliders, Trash2, Plus } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/feedback/States";
import { useI18n, type SupportedLanguage } from "../../i18n/i18nContext";
import {
  createReminder,
  deleteReminder,
  listReminders,
  renameAccount,
  type FamilyProfile,
  type ReminderFrequency,
  type User,
} from "../../api/client";
import { errorMessage, formatDateTime, localDateTimeToIso, nextSlot, todayISO } from "../../lib/dates";

const LANGUAGES: { id: SupportedLanguage; label: string }[] = [
  { id: "en", label: "English" },
  { id: "bn", label: "বাংলা (Bengali)" },
  { id: "hi", label: "हिन्दी (Hindi)" },
];

export function SettingsView({
  token,
  activeProfile,
  user,
  isSimpleMode = false,
  onToggleSimpleMode,
}: {
  token: string;
  activeProfile?: FamilyProfile | null;
  user?: User | null;
  isSimpleMode?: boolean;
  onToggleSimpleMode?: (simple: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { language, setLanguage } = useI18n();
  const profileId = activeProfile?.id;

  // ---- Account
  const [name, setName] = useState(user?.name ?? "");
  useEffect(() => setName(user?.name ?? ""), [user?.name]);
  const rename = useMutation({
    mutationFn: () => renameAccount(token, name.trim()),
    onSuccess: () => toast.success("Name updated. It will show everywhere after you next sign in."),
    onError: (e) => toast.error(errorMessage(e, "Couldn't update your name.")),
  });

  // ---- Reminders
  const remindersKey = ["reminders", profileId];
  const reminders = useQuery({
    queryKey: remindersKey,
    queryFn: () => listReminders(token, { profile_id: profileId, is_enabled: true }),
    enabled: !!profileId,
  });
  const [title, setTitle] = useState("");
  const [slot0] = useState(() => nextSlot(60));
  const [date, setDate] = useState(slot0.date);
  const [time, setTime] = useState(slot0.time);
  const [frequency, setFrequency] = useState<ReminderFrequency>("once");
  const [sendEmail, setSendEmail] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const addReminder = useMutation({
    mutationFn: () =>
      createReminder(token, {
        title: title.trim(),
        category: "general",
        due_at: localDateTimeToIso(date, time),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        frequency,
        send_email: sendEmail,
        profile_id: profileId,
      }),
    onSuccess: () => {
      toast.success("Reminder added.");
      setTitle("");
      const next = nextSlot(60);
      setDate(next.date);
      setTime(next.time);
      queryClient.invalidateQueries({ queryKey: remindersKey });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => setFormError(errorMessage(e, "Couldn't add the reminder.")),
  });
  const removeReminder = useMutation({
    mutationFn: (id: string) => deleteReminder(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: remindersKey });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submitReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setFormError("Describe what to be reminded about.");
    if (new Date(localDateTimeToIso(date, time)).getTime() < Date.now() - 60_000) return setFormError("Pick a time in the future.");
    setFormError(null);
    addReminder.mutate();
  };

  const upcoming = (reminders.data ?? []).filter((r) => !r.is_dismissed && r.category === "general" && !(r.delivery_status === "delivered" && r.frequency === "once"));

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12" data-testid="settings-view">
      <PageHeader title="Settings" subtitle="Your account, how the app looks, and reminders." />

      <Card className="p-6 space-y-4">
        <h3 className="font-display font-semibold text-base">Account</h3>
        <form
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) rename.mutate();
          }}
        >
          <Input label="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={user?.email ?? ""} readOnly disabled hint="Used to sign in. Can't be changed here." />
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" loading={rename.isPending} disabled={!name.trim() || name.trim() === (user?.name ?? "")}>
              Save name
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 space-y-5">
        <h3 className="font-display font-semibold text-base flex items-center gap-2">
          <Sliders size={17} aria-hidden="true" /> Display
        </h3>
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <span>
            <span className="block text-sm font-semibold">Simple mode</span>
            <span className="block text-xs text-[var(--muted)]">Larger text and bigger buttons, easier for older family members.</span>
          </span>
          <input type="checkbox" role="switch" aria-label="Simple mode" className="w-5 h-5" checked={isSimpleMode} onChange={(e) => onToggleSimpleMode?.(e.target.checked)} />
        </label>
        <div className="space-y-1.5">
          <label htmlFor="settings-language" className="text-sm font-semibold flex items-center gap-2">
            <Globe size={15} aria-hidden="true" /> Language
          </label>
          <select id="settings-language" value={language} onChange={(e) => setLanguage(e.target.value as SupportedLanguage)} className="w-full sm:w-64 min-h-[44px] px-3 rounded-md border border-[var(--border)] bg-white text-sm">
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          <p className="text-xs text-[var(--muted)]">Applies to translated parts of the app. Your records stay in their original language.</p>
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <h3 className="font-display font-semibold text-base flex items-center gap-2">
          <Bell size={17} aria-hidden="true" /> Reminders for {activeProfile?.name ?? "this profile"}
        </h3>
        <p className="text-xs text-[var(--muted)]">
          Reminders appear under the bell icon while HealthMate is open. They are best-effort and can arrive late, so don't rely on them for anything urgent. Email delivery only works if your administrator has set up an email server.
        </p>

        <form onSubmit={submitReminder} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end" noValidate>
          <div className="sm:col-span-12">
            <Input label="Remind me to…" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Book the annual blood test" />
          </div>
          <div className="sm:col-span-4"><Input label="Date" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="sm:col-span-3"><Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          <div className="sm:col-span-3 space-y-1.5">
            <label htmlFor="rem-freq" className="block text-sm font-medium">Repeat</label>
            <select id="rem-freq" value={frequency} onChange={(e) => setFrequency(e.target.value as ReminderFrequency)} className="w-full min-h-[44px] px-3 rounded-md border border-[var(--border)] bg-white text-sm">
              <option value="once">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full" iconLeft={<Plus size={14} />} loading={addReminder.isPending}>Add</Button>
          </div>
          <label className="sm:col-span-12 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Also email me (if email is set up)
          </label>
          {formError && <p role="alert" className="sm:col-span-12 text-xs text-[var(--danger)]">{formError}</p>}
        </form>

        {reminders.isLoading ? (
          <Skeleton height={60} rounded="lg" />
        ) : upcoming.length === 0 ? (
          <EmptyState title="No reminders" description="Add one above. Appointment reminders you create from the Appointments page show up here too." />
        ) : (
          <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg" aria-label="Your reminders">
            {upcoming.map((r) => (
              <li key={r.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatDateTime(r.due_at)}
                    {r.frequency !== "once" ? ` · repeats ${r.frequency}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.send_email && <Badge variant="info" size="sm">Email</Badge>}
                  <button type="button" aria-label={`Delete reminder ${r.title}`} onClick={() => removeReminder.mutate(r.id)} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--danger)]">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
