import React, { useState } from "react";
import {
  Bell,
  Smartphone,
  EyeOff,
  Moon,
  Globe,
  Sliders,
  DownloadCloud,
  CheckCircle2,
  Copy,
  ExternalLink,
  Shield,
  Save,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import type { FamilyProfile } from "../../api/client";

export function SettingsView({
  token,
  activeProfile,
  isSimpleMode = false,
  onToggleSimpleMode,
  currentLanguage = "en",
  onLanguageChange,
}: {
  token: string;
  activeProfile?: FamilyProfile;
  isSimpleMode?: boolean;
  onToggleSimpleMode?: (simple: boolean) => void;
  currentLanguage?: "en" | "bn" | "hi";
  onLanguageChange?: (lang: "en" | "bn" | "hi") => void;
}) {
  // Notification states
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramCode, setTelegramCode] = useState("HM-8921-X");
  const [copiedCode, setCopiedCode] = useState(false);

  // Preference states
  const [discreetMode, setDiscreetMode] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");

  // Account details state
  const [displayName, setDisplayName] = useState(activeProfile?.name || "Dr. Abhijit Bhunia");
  const [email, setEmail] = useState("abhijit.bhunia@healthmate.ai");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST +05:30)");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(telegramCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Settings & Preferences"
        subtitle="Manage communication channels, accessibility modes, privacy displays, and account configurations."
      />

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-[var(--green-50)] border border-[var(--green-600)]/30 text-xs text-[var(--green-900)] flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-[var(--green-600)] shrink-0" />
          <span>Your settings and communication preferences have been saved successfully.</span>
        </div>
      )}

      {/* Account Settings */}
      <Card className="border-[var(--border)] bg-white shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <h3 className="font-display font-semibold text-base text-[var(--text)]">
                Account Profile
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Primary credentials for authentication and clinician communications.
              </p>
            </div>
            <Badge variant="verified" size="sm">
              Verified Account
            </Badge>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase mb-1">
                  Full Name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] uppercase mb-1">
                Preferred Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green-600)]/30"
              >
                <option value="Asia/Kolkata (IST +05:30)">Asia/Kolkata (IST +05:30)</option>
                <option value="UTC (UTC +00:00)">UTC (UTC +00:00)</option>
                <option value="America/New_York (EST -05:00)">America/New_York (EST -05:00)</option>
                <option value="Europe/London (GMT +00:00)">Europe/London (GMT +00:00)</option>
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="sm" className="gap-2">
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card className="border-[var(--border)] bg-white shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="border-b border-[var(--border)] pb-3">
            <h3 className="font-display font-semibold text-base text-[var(--text)] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[var(--green-700)]" />
              <span>Notification & Reminder Channels</span>
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Choose how and where dosage reminders and upcoming visit alerts are delivered.
            </p>
          </div>

          <div className="space-y-4">
            {/* Web Push */}
            <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Browser Push Notifications</p>
                <p className="text-xs text-[var(--muted)]">
                  Receive instant dose alerts directly in your browser or desktop window.
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Browser Push Notifications"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
                className="w-5 h-5 text-[var(--green-600)] rounded border-[var(--border)] focus:ring-[var(--green-600)]"
              />
            </div>

            {/* Telegram Channel */}
            <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                    <span>Telegram Care Bot Reminders</span>
                    {telegramConnected ? (
                      <Badge variant="verified" size="sm">Connected</Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">Not Linked</Badge>
                    )}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Receive one-tap dose confirmations via encrypted Telegram messages.
                  </p>
                </div>
                <Button
                  variant={telegramConnected ? "ghost" : "secondary"}
                  size="sm"
                  onClick={() => setTelegramConnected(!telegramConnected)}
                >
                  {telegramConnected ? "Disconnect" : "Connect Telegram"}
                </Button>
              </div>

              {!telegramConnected && (
                <div className="p-3 bg-white rounded-lg border border-[var(--border)] text-xs space-y-2">
                  <p className="text-[var(--text)]">
                    1. Open <strong>@HealthMateCareBot</strong> on Telegram.
                  </p>
                  <p className="text-[var(--text)]">
                    2. Send this one-time linking command:
                  </p>
                  <div className="flex items-center gap-2 font-mono bg-[var(--bg)] p-2 rounded border border-[var(--border)]">
                    <span className="flex-1 font-semibold text-[var(--green-900)]">
                      /start {telegramCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-1 hover:text-[var(--green-700)] text-[var(--muted)] flex items-center gap-1 text-[11px]"
                      title="Copy linking code"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedCode ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Email Alerts */}
            <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Weekly Clinical Digest via Email</p>
                <p className="text-xs text-[var(--muted)]">
                  Receive weekly adherence reports and visit preparation checklists.
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-5 h-5 text-[var(--green-600)] rounded border-[var(--border)] focus:ring-[var(--green-600)]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Experience, Language & Accessibility */}
      <Card className="border-[var(--border)] bg-white shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="border-b border-[var(--border)] pb-3">
            <h3 className="font-display font-semibold text-base text-[var(--text)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--green-700)]" />
              <span>Accessibility & Display Modes</span>
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Tailor font scaling, privacy labels, and regional language preferences.
            </p>
          </div>

          <div className="space-y-4">
            {/* Simple Mode Toggle */}
            <div className="p-4 rounded-xl bg-[var(--green-50)]/60 border border-[var(--green-100)] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--green-900)]">Simple Mode for Elders & Caregivers</p>
                <p className="text-xs text-[var(--muted)]">
                  Increases base font to 20px, simplifies navigation to 3 core tabs (Medicines, Records, Doctor Pack), and magnifies buttons.
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Simple Mode for Elders & Caregivers"
                checked={isSimpleMode}
                onChange={(e) => onToggleSimpleMode?.(e.target.checked)}
                className="w-5 h-5 text-[var(--green-600)] rounded border-[var(--border)] focus:ring-[var(--green-600)]"
              />
            </div>

            {/* Discreet Mode */}
            <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
                  <EyeOff className="w-4 h-4 text-[var(--muted)]" />
                  <span>Discreet Medication Mode</span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Masks specific pharmaceutical names in dashboard cards and notifications (e.g. shows "Scheduled Dose" instead of "Metformin").
                </p>
              </div>
              <input
                type="checkbox"
                checked={discreetMode}
                onChange={(e) => setDiscreetMode(e.target.checked)}
                className="w-5 h-5 text-[var(--green-600)] rounded border-[var(--border)] focus:ring-[var(--green-600)]"
              />
            </div>

            {/* Quiet Hours */}
            <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
                    <Moon className="w-4 h-4 text-[var(--muted)]" />
                    <span>Quiet Hours</span>
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Suppress non-emergency notification sounds during sleep hours.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                  className="w-5 h-5 text-[var(--green-600)] rounded border-[var(--border)] focus:ring-[var(--green-600)]"
                />
              </div>

              {quietHoursEnabled && (
                <div className="flex items-center gap-3 pt-1 text-xs">
                  <div>
                    <label className="text-[var(--muted)] block mb-1">Start Time</label>
                    <input
                      type="time"
                      value={quietStart}
                      onChange={(e) => setQuietStart(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--muted)] block mb-1">End Time</label>
                    <input
                      type="time"
                      value={quietEnd}
                      onChange={(e) => setQuietEnd(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Regional Language */}
            <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[var(--muted)]" />
                  <span>Language / ভাষা / भाषा</span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Regional language translations for instructions and notifications.
                </p>
              </div>

              <div className="flex gap-1.5">
                <Button
                  variant={currentLanguage === "en" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => onLanguageChange?.("en")}
                >
                  English
                </Button>
                <Button
                  variant={currentLanguage === "bn" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => onLanguageChange?.("bn")}
                >
                  বাংলা (BN)
                </Button>
                <Button
                  variant={currentLanguage === "hi" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => onLanguageChange?.("hi")}
                >
                  हिन्दी (HI)
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PWA / Offline Status */}
      <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--green-50)] text-[var(--green-700)]">
            <DownloadCloud className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-[var(--text)]">Offline PWA Installation</h4>
            <p className="text-xs text-[var(--muted)]">
              HealthMate AI operates offline with encrypted client storage for reviewing past records without internet.
            </p>
          </div>
        </div>

        <Button variant="secondary" size="sm" className="shrink-0 gap-1.5">
          <DownloadCloud className="w-4 h-4" />
          <span>Install Web App</span>
        </Button>
      </div>
    </div>
  );
}
