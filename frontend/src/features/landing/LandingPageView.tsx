import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  TrendingUp,
  Clock,
  QrCode,
  Users,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Lock,
  Globe,
  Sliders,
  AlertCircle,
  Eye,
  FileCheck,
  Menu,
  X,
  Stethoscope,
  HeartPulse,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { FadeIn, Reveal, Stagger } from "../../components/motion/MotionHelpers";

export interface LandingPageProps {
  onGetStarted?: () => void;
  onLogin?: () => void;
}

export function LandingPageView({ onGetStarted, onLogin }: LandingPageProps) {
  // Mobile nav state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Trends demo state
  const [selectedRange, setSelectedRange] = useState<"3M" | "6M" | "1Y">("6M");

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Active language chip
  const [activeLang, setActiveLang] = useState<"en" | "bn" | "hi">("en");

  const faqs = [
    {
      q: "Is HealthMate AI free to use?",
      a: "Yes. Core health tracking, document storage, OCR text extraction, timeline graphs, and QR sharing with your clinician are 100% free with synthetic privacy isolation.",
    },
    {
      q: "Does HealthMate AI diagnose diseases or prescribe medicine?",
      a: "Never. HealthMate AI strictly explains patient records and helps organize questions for your appointments. It never diagnoses or prescribes. Medical treatment decisions are always made between you and your qualified doctor.",
    },
    {
      q: "Who can see my records and test results?",
      a: "Only you and family caregivers you explicitly authorize. When you share with a clinician via QR, access is temporary, PIN-protected, read-only, and can be revoked in one tap at any second.",
    },
    {
      q: "What happens if a medicine reminder is delayed?",
      a: "HealthMate is a self-management memory aid and not a life-support system. Delivery across push, Telegram, or email may depend on network connectivity. Always adhere to your primary prescription container instructions.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans selection:bg-[var(--green-100)] selection:text-[var(--green-900)]">
      {/* 1. Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[var(--border)] transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--green-800)] flex items-center justify-center text-white shadow-sm">
              <HeartPulse className="w-5 h-5 text-emerald-300" />
            </div>
            <span className="font-display font-bold text-xl text-[var(--green-900)] tracking-tight">
              HealthMate<span className="text-[var(--green-600)]">.AI</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--muted)]">
            <a href="#features" className="hover:text-[var(--green-800)] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[var(--green-800)] transition-colors">How it works</a>
            <a href="#demo" className="hover:text-[var(--green-800)] transition-colors">Interactive Demo</a>
            <a href="#privacy" className="hover:text-[var(--green-800)] transition-colors">Privacy & Safety</a>
            <a href="#faq" className="hover:text-[var(--green-800)] transition-colors">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onLogin}>
              Log in
            </Button>
            <Button variant="primary" size="sm" onClick={onGetStarted} className="gap-1.5 shadow-sm">
              <span>Get started free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-b border-[var(--border)] bg-white px-4 py-4 space-y-3"
            >
              <div className="flex flex-col space-y-2 text-sm font-medium">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 text-[var(--text)]">Features</a>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-2 text-[var(--text)]">How it works</a>
                <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="py-2 text-[var(--text)]">Interactive Demo</a>
                <a href="#privacy" onClick={() => setMobileMenuOpen(false)} className="py-2 text-[var(--text)]">Privacy & Safety</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-2 text-[var(--text)]">FAQ</a>
              </div>
              <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
                <Button variant="secondary" className="w-full justify-center" onClick={onLogin}>
                  Log in
                </Button>
                <Button variant="primary" className="w-full justify-center" onClick={onGetStarted}>
                  Get started free
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Copy column */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--green-50)] text-[var(--green-900)] border border-[var(--green-600)]/20 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-[var(--green-600)]" />
                <span>Private & Strict Patient Data Sovereignty</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-[var(--green-900)] tracking-tight leading-[1.12]">
                One place for your family’s health records.
              </h1>

              <p className="text-lg sm:text-xl text-[var(--muted)] leading-relaxed max-w-2xl font-normal">
                Upload reports, track trends, never miss a dose, and share with your doctor by QR. No scattered papers, no lost prescriptions.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Button variant="primary" size="lg" onClick={onGetStarted} className="gap-2 justify-center shadow-md">
                  <span>Get started free</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="justify-center"
                >
                  See how it works
                </Button>
              </div>

              <p className="text-xs text-[var(--muted)] flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 text-[var(--green-600)] shrink-0" />
                <span>Demo uses synthetic data. Explains records without diagnosing.</span>
              </p>
            </div>

            {/* Visual column: product mockup with floating cards */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md p-6 bg-white rounded-3xl border border-[var(--border)] shadow-2 space-y-5">
                {/* Floating BP Trend Card */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="p-4 rounded-2xl bg-[var(--green-50)] border border-[var(--green-100)] shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--green-900)] mb-2">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-[var(--green-600)]" />
                      Blood Pressure Trend
                    </span>
                    <Badge variant="verified" size="sm">Verified Fact</Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-[var(--green-900)]">122 / 80</span>
                    <span className="text-xs text-[var(--muted)]">mmHg</span>
                    <span className="text-xs font-semibold text-[var(--green-600)] ml-auto">-6 mmHg since May</span>
                  </div>
                </motion.div>

                {/* Floating Dose Reminder Card */}
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="p-4 rounded-2xl bg-white border border-[var(--border)] shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text)]">Telmisartan 40mg</p>
                      <p className="text-[11px] text-[var(--muted)]">Morning with breakfast (08:30 AM)</p>
                    </div>
                  </div>
                  <Badge variant="verified" size="sm">Taken</Badge>
                </motion.div>

                {/* Floating Doctor QR Share */}
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="p-4 rounded-2xl bg-[var(--green-900)] text-white shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-[var(--green-900)]">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Doctor Visit QR Pack</p>
                      <p className="text-[10px] text-emerald-200">PIN: 4892 • Expires in 45m</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-300">Read-Only</span>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Trust Strip */}
      <section className="border-y border-[var(--border)] bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-xl bg-[var(--bg)] flex items-center justify-center gap-2 text-xs font-semibold text-[var(--green-900)]">
              <Lock className="w-4 h-4 text-[var(--green-700)] shrink-0" />
              <span>Private by Default</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg)] flex items-center justify-center gap-2 text-xs font-semibold text-[var(--green-900)]">
              <FileCheck className="w-4 h-4 text-[var(--green-700)] shrink-0" />
              <span>You Verify Extracted Data</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg)] flex items-center justify-center gap-2 text-xs font-semibold text-[var(--green-900)]">
              <Clock className="w-4 h-4 text-[var(--green-700)] shrink-0" />
              <span>Time-Limited QR Sharing</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg)] flex items-center justify-center gap-2 text-xs font-semibold text-[var(--green-900)]">
              <ShieldCheck className="w-4 h-4 text-[var(--green-700)] shrink-0" />
              <span>Fully Usable Without AI</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Problem -> Solution */}
      <section className="py-20 bg-[var(--bg)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <h2 className="text-3xl font-display font-bold text-[var(--green-900)]">
              Stop carrying disorganized medical paperwork
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Compare scattered physical binders and lost WhatsApp photos with one unified, clinical timeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* The Old Way */}
            <div className="p-8 rounded-3xl bg-white border border-red-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-red-700">
                <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs">✕</span>
                <span>The Painful Medical Paper Trail</span>
              </div>
              <ul className="space-y-3.5 text-xs text-[var(--muted)] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Heavy plastic folders taken to every doctor appointment.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Lab results scattered across multiple lab portals and WhatsApp chats.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>No way to know if your blood sugar or cholesterol improved over the year.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Missed doses and forgotten instructions during busy mornings.</span>
                </li>
              </ul>
            </div>

            {/* The HealthMate Way */}
            <div className="p-8 rounded-3xl bg-white border border-[var(--green-600)] shadow-md space-y-5">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-[var(--green-800)]">
                <span className="w-6 h-6 rounded-full bg-[var(--green-100)] flex items-center justify-center text-xs">✓</span>
                <span>The HealthMate Unified Timeline</span>
              </div>
              <ul className="space-y-3.5 text-xs text-[var(--text)] leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--green-600)] shrink-0" />
                  <span>Snap a photo: OCR automatically structures every observation point.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--green-600)] shrink-0" />
                  <span>Longitudinal trend graphs with clinical reference bands at a glance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--green-600)] shrink-0" />
                  <span>Interactive dose cards with discreet mode and Telegram care reminders.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--green-600)] shrink-0" />
                  <span>30-second doctor sharing by QR without giving up permanent access.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section id="how-it-works" className="py-20 bg-white border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-3xl font-display font-bold text-[var(--green-900)]">
              How HealthMate works in 4 simple steps
            </h2>
            <p className="text-sm text-[var(--muted)]">
              From raw paper prescription to informed doctor consultation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--green-800)] text-white font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h3 className="font-semibold text-base text-[var(--text)]">Upload or Scan</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Drop your PDF or take a camera photo of your lab test or prescription report.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--green-800)] text-white font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h3 className="font-semibold text-base text-[var(--text)]">Review Extracted Data</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Check OCR-extracted numbers side-by-side with original document pages before confirming.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--green-800)] text-white font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h3 className="font-semibold text-base text-[var(--text)]">Track Trends & Doses</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Watch vitals over 3M, 6M, or 1Y intervals. Log taken medicines with one tap.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--green-800)] text-white font-bold flex items-center justify-center text-sm">
                4
              </div>
              <h3 className="font-semibold text-base text-[var(--text)]">Share with Your Doctor</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Generate a temporary QR pack. Your clinician views records in seconds, expiring on departure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Feature Bento Grid */}
      <section id="features" className="py-20 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <h2 className="text-3xl font-display font-bold text-[var(--green-900)]">
              Complete care toolkit built for real families
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Engineered with medical privacy, elder simplicity, and multi-profile flexibility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white hover:shadow-md transition-shadow">
              <FileText className="w-8 h-8 text-[var(--green-700)] mb-3" />
              <h3 className="font-display font-semibold text-lg text-[var(--text)] mb-1">Records & OCR</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                High accuracy text extraction for lab reports and discharge summaries with side-by-side page provenance.
              </p>
            </Card>

            <Card className="p-6 bg-white hover:shadow-md transition-shadow">
              <TrendingUp className="w-8 h-8 text-[var(--green-700)] mb-3" />
              <h3 className="font-display font-semibold text-lg text-[var(--text)] mb-1">Trend Graphs</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Longitudinal charts with healthy reference corridors, delta chips, and tabular alternatives for accessibility.
              </p>
            </Card>

            <Card className="p-6 bg-white hover:shadow-md transition-shadow">
              <Clock className="w-8 h-8 text-[var(--green-700)] mb-3" />
              <h3 className="font-display font-semibold text-lg text-[var(--text)] mb-1">Medicine Schedules</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Taken / Skip / Snooze logging, refill trackers, and discrete notification masking for privacy.
              </p>
            </Card>

            <Card className="p-6 bg-white hover:shadow-md transition-shadow">
              <Stethoscope className="w-8 h-8 text-[var(--green-700)] mb-3" />
              <h3 className="font-display font-semibold text-lg text-[var(--text)] mb-1">Doctor Visit Pack</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Export 2-page print summaries and discussion questions tailored to your upcoming medical appointment.
              </p>
            </Card>

            <Card className="p-6 bg-white hover:shadow-md transition-shadow">
              <Users className="w-8 h-8 text-[var(--green-700)] mb-3" />
              <h3 className="font-display font-semibold text-lg text-[var(--text)] mb-1">Family & Caregivers</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Manage elders and children under one account with strictly separated health records and consent tracking.
              </p>
            </Card>

            <Card className="p-6 bg-white hover:shadow-md transition-shadow">
              <ShieldCheck className="w-8 h-8 text-[var(--green-700)] mb-3" />
              <h3 className="font-display font-semibold text-lg text-[var(--text)] mb-1">Emergency Card</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Instant access to blood type, severe allergies, and primary emergency contacts for first responders.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. Trends Demo (Interactive) */}
      <section id="demo" className="py-20 bg-white border-y border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <h2 className="text-3xl font-display font-bold text-[var(--green-900)]">
              Interactive Trend Visualization
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Experience how your physiological parameters are mapped over time.
            </p>
          </div>

          <Card className="p-6 bg-[var(--surface)] border-[var(--green-600)]/30 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h3 className="font-semibold text-base text-[var(--text)] flex items-center gap-2">
                  <span>Systolic Blood Pressure (Synthetic Demo)</span>
                  <Badge variant="verified" size="sm">Verified Fact</Badge>
                </h3>
                <p className="text-xs text-[var(--muted)]">Reference normal: 90 - 120 mmHg</p>
              </div>

              <div className="flex items-center gap-1.5 bg-[var(--bg)] p-1 rounded-lg border border-[var(--border)]">
                {(["3M", "6M", "1Y"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRange(r)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      selectedRange === r
                        ? "bg-white text-[var(--green-900)] shadow-2xs"
                        : "text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive SVG Demo Line */}
            <div className="py-6 space-y-4">
              <div className="h-44 w-full bg-[var(--bg)] rounded-xl border border-[var(--border)] relative overflow-hidden flex items-center justify-center p-4">
                <svg viewBox="0 0 400 120" className="w-full h-full text-[var(--green-600)]">
                  {/* Reference band */}
                  <rect x="0" y="40" width="400" height="40" fill="var(--green-50)" opacity="0.8" />
                  <line x1="0" y1="40" x2="400" y2="40" stroke="var(--green-600)" strokeDasharray="3 3" opacity="0.4" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="var(--green-600)" strokeDasharray="3 3" opacity="0.4" />

                  {/* Trend line */}
                  <polyline
                    fill="none"
                    stroke="var(--green-700)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    points={
                      selectedRange === "3M"
                        ? "20,70 120,62 240,55 360,50"
                        : selectedRange === "6M"
                        ? "20,85 100,75 200,68 300,58 380,50"
                        : "10,95 80,90 160,80 240,70 320,60 390,50"
                    }
                  />

                  {/* Highlight point */}
                  <circle cx="360" cy="50" r="5" fill="var(--green-800)" />
                </svg>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span>Earliest: 136 mmHg</span>
                <span className="font-semibold text-[var(--green-600)] bg-[var(--green-50)] px-2.5 py-1 rounded-full border border-[var(--green-100)]">
                  -8 mmHg since March (Consistent Improvement)
                </span>
                <span className="font-semibold text-[var(--text)]">Latest: 122 mmHg</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 8. Doctor QR Section */}
      <section className="py-20 bg-[var(--bg)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <Badge variant="verified" size="md">Clinician Portal</Badge>
              <h2 className="text-3xl font-display font-bold text-[var(--green-900)]">
                Share with your doctor in 30 seconds by QR
              </h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                During your consultation, show the dynamic QR code on your phone screen. The doctor scans using any camera or browser to view a structured, read-only summary.
              </p>

              <div className="space-y-3 text-xs text-[var(--text)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--green-600)]" />
                  <span>No apps or logins required for the doctor.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--green-600)]" />
                  <span>Configurable expiry (1 hour, 24 hours, or 7 days).</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--green-600)]" />
                  <span>Revoke in one tap whenever you walk out of the clinic.</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 flex justify-center">
              <div className="p-6 bg-white rounded-3xl border border-[var(--border)] shadow-lg max-w-sm text-center space-y-4">
                <div className="w-48 h-48 mx-auto bg-[var(--bg)] rounded-2xl border-2 border-dashed border-[var(--green-600)] flex items-center justify-center p-3">
                  <QrCode className="w-36 h-36 text-[var(--green-900)]" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--text)]">Dr. Consultation Share Session</p>
                  <p className="text-xs text-[var(--muted)]">PIN Protected: <strong>4892</strong></p>
                </div>
                <Badge variant="neutral" size="sm">Expires in 58 minutes</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Family & Caregivers */}
      <section className="py-20 bg-white border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-bold text-[var(--green-900)]">
              Caring for aging parents and children
            </h2>
            <p className="text-sm text-[var(--muted)] max-w-xl mx-auto">
              Switch seamlessly between parent, spouse, and child profiles without data cross-contamination.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] text-center w-40 space-y-2">
              <div className="w-12 h-12 rounded-full bg-[var(--green-700)] text-white font-bold flex items-center justify-center mx-auto text-base">
                A
              </div>
              <p className="text-sm font-semibold text-[var(--text)]">Dr. Abhijit</p>
              <Badge variant="info" size="sm">Primary</Badge>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] text-center w-40 space-y-2">
              <div className="w-12 h-12 rounded-full bg-[var(--green-800)] text-white font-bold flex items-center justify-center mx-auto text-base">
                M
              </div>
              <p className="text-sm font-semibold text-[var(--text)]">Anima (Mother)</p>
              <Badge variant="verified" size="sm">Dependent</Badge>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] text-center w-40 space-y-2">
              <div className="w-12 h-12 rounded-full bg-[var(--green-600)] text-white font-bold flex items-center justify-center mx-auto text-base">
                A
              </div>
              <p className="text-sm font-semibold text-[var(--text)]">Aarav (Child)</p>
              <Badge variant="verified" size="sm">Dependent</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* 10. AI Assistant Grounding Preview */}
      <section className="py-20 bg-[var(--bg)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-2">
            <Badge variant="verified" size="md">Strict Evidence Grounding</Badge>
            <h2 className="text-3xl font-display font-bold text-[var(--green-900)]">
              Ask questions about your records safely
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Every answer points directly to verified laboratory excerpts with source citations.
            </p>
          </div>

          {/* Assistant Chat Mockup */}
          <div className="p-6 bg-white rounded-3xl border border-[var(--border)] shadow-md space-y-4">
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-[var(--green-800)] text-white p-3.5 text-xs font-medium max-w-[80%]">
                What was my latest HbA1c result?
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--green-50)] border border-[var(--green-100)] text-xs text-[var(--text)] space-y-3">
              <p className="leading-relaxed">
                According to your verified Apollo Clinic Glycemic Panel from 14 October 2026, your HbA1c was <strong>6.8%</strong> <span className="px-1.5 py-0.5 rounded bg-[var(--green-100)] text-[var(--green-900)] font-bold">[S1]</span>.
              </p>
              <div className="pt-2 border-t border-[var(--border)] text-[11px] text-[var(--muted)] flex items-center justify-between">
                <span>[S1] Page 2, Routine Checkup PDF</span>
                <span className="text-[var(--green-700)] font-semibold">Strict Evidence Match</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Privacy & Safety Pillars */}
      <section id="privacy" className="py-20 bg-white border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
            <h2 className="text-3xl font-display font-bold text-[var(--green-900)]">
              Medical safety and privacy commitments
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Zero monetization of health data. Complete user control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-2.5">
              <Lock className="w-6 h-6 text-[var(--green-800)]" />
              <h3 className="font-semibold text-base text-[var(--text)]">You Own Your Data</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Export all records in standard PDF and JSON anytime. Request permanent deletion in one click.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-2.5">
              <ShieldCheck className="w-6 h-6 text-[var(--green-800)]" />
              <h3 className="font-semibold text-base text-[var(--text)]">No Diagnosis or Prescribing</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                HealthMate AI explains records and supports doctor conversations. It never diagnoses or prescribes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-2.5">
              <Sliders className="w-6 h-6 text-[var(--green-800)]" />
              <h3 className="font-semibold text-base text-[var(--text)]">AI is 100% Optional</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                All document vaults, medication schedules, trend lines, and QR sharing operate normally even without AI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 12. Languages & Accessibility */}
      <section className="py-12 bg-[var(--green-50)]/60 border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display font-semibold text-lg text-[var(--green-900)]">
              Regional Languages & Simple Mode for Elders
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Switch into 20px high-contrast typography and regional languages with one tap.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveLang("en")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeLang === "en" ? "bg-[var(--green-800)] text-white" : "bg-white text-[var(--muted)] border border-[var(--border)]"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setActiveLang("bn")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeLang === "bn" ? "bg-[var(--green-800)] text-white" : "bg-white text-[var(--muted)] border border-[var(--border)]"
              }`}
            >
              বাংলা (Bengali)
            </button>
            <button
              onClick={() => setActiveLang("hi")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeLang === "hi" ? "bg-[var(--green-800)] text-white" : "bg-white text-[var(--muted)] border border-[var(--border)]"
              }`}
            >
              हिन्दी (Hindi)
            </button>
          </div>
        </div>
      </section>

      {/* 13. FAQ Accordion */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl font-display font-bold text-[var(--green-900)]">
              Frequently asked questions
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Transparent answers regarding privacy, medical boundaries, and caregiver access.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;

              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-[var(--text)] hover:text-[var(--green-800)]"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-5 text-xs text-[var(--muted)] leading-relaxed border-t border-[var(--border)]/60 pt-3"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 14. Final CTA */}
      <section className="py-20 bg-[var(--green-900)] text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            Start organising your family’s health today.
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 max-w-xl mx-auto leading-relaxed">
            Create your free account, upload your first report, and experience calm clarity for all medical records.
          </p>
          <div className="pt-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={onGetStarted}
              className="bg-white text-[var(--green-900)] hover:bg-emerald-50 px-8 font-semibold shadow-lg"
            >
              Create free account
            </Button>
          </div>
        </div>
      </section>

      {/* 15. Footer */}
      <footer className="bg-white border-t border-[var(--border)] py-12 text-xs text-[var(--muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[var(--border)]">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[var(--green-800)] flex items-center justify-center text-white">
                  <HeartPulse className="w-4 h-4 text-emerald-300" />
                </div>
                <span className="font-display font-bold text-base text-[var(--green-900)]">
                  HealthMate AI
                </span>
              </div>
              <p className="leading-relaxed">
                Calm, trustworthy family health organizer with strict patient data isolation.
              </p>
            </div>

            <div>
              <p className="font-semibold text-[var(--text)] uppercase tracking-wider mb-3">Product</p>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-[var(--text)]">Health Records OCR</a></li>
                <li><a href="#features" className="hover:text-[var(--text)]">Longitudinal Trends</a></li>
                <li><a href="#features" className="hover:text-[var(--text)]">Medicine Reminders</a></li>
                <li><a href="#features" className="hover:text-[var(--text)]">Doctor QR Share</a></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-[var(--text)] uppercase tracking-wider mb-3">Privacy & Ethics</p>
              <ul className="space-y-2">
                <li><a href="#privacy" className="hover:text-[var(--text)]">Patient Data Sovereignty</a></li>
                <li><a href="#privacy" className="hover:text-[var(--text)]">Zero Training on Records</a></li>
                <li><a href="#privacy" className="hover:text-[var(--text)]">Immutable Audit Trail</a></li>
                <li><a href="#privacy" className="hover:text-[var(--text)]">Export & Erasure</a></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-[var(--text)] uppercase tracking-wider mb-3">Medical Disclaimer</p>
              <p className="leading-relaxed text-[11px] text-[var(--text)]/80">
                HealthMate AI explains records and supports doctor conversations. It never diagnoses or prescribes. Always consult your qualified healthcare clinician for medical diagnosis and treatment plans.
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>© {new Date().getFullYear()} HealthMate AI. All rights reserved.</p>
            <p className="text-[var(--muted)]">Synthetic medical demonstration.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
