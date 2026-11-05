import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  TrendingUp,
  Clock,
  QrCode,
  Users,
  ArrowRight,
  ChevronDown,
  Lock,
  AlertCircle,
  FileCheck,
  Menu,
  X,
  Stethoscope,
  HeartPulse,
  ExternalLink,
  ChevronRight,
  Eye,
  Table as TableIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

export interface LandingPageProps {
  onGetStarted?: () => void;
  onLogin?: () => void;
}

// Synthetic Blood Pressure Points for the 3M, 6M, 1Y demo
const TREND_DATA_3M = [
  { date: "Aug 10", systolic: 132, diastolic: 84 },
  { date: "Aug 28", systolic: 128, diastolic: 82 },
  { date: "Sep 15", systolic: 125, diastolic: 80 },
  { date: "Oct 14", systolic: 122, diastolic: 80 },
];

const TREND_DATA_6M = [
  { date: "May 12", systolic: 136, diastolic: 88 },
  { date: "Jun 04", systolic: 134, diastolic: 86 },
  { date: "Jul 18", systolic: 130, diastolic: 84 },
  { date: "Aug 10", systolic: 132, diastolic: 84 },
  { date: "Aug 28", systolic: 128, diastolic: 82 },
  { date: "Sep 15", systolic: 125, diastolic: 80 },
  { date: "Oct 14", systolic: 122, diastolic: 80 },
];

const TREND_DATA_1Y = [
  { date: "Nov '25", systolic: 140, diastolic: 90 },
  { date: "Jan '26", systolic: 138, diastolic: 88 },
  { date: "Mar '26", systolic: 135, diastolic: 86 },
  { date: "May '26", systolic: 136, diastolic: 88 },
  { date: "Jul '26", systolic: 130, diastolic: 84 },
  { date: "Aug '26", systolic: 128, diastolic: 82 },
  { date: "Sep '26", systolic: 125, diastolic: 80 },
  { date: "Oct '26", systolic: 122, diastolic: 80 },
];

export function LandingPageView({ onGetStarted, onLogin }: LandingPageProps) {
  // Fixed Navbar scroll tracking
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Trends demo state
  const [selectedRange, setSelectedRange] = useState<"3M" | "6M" | "1Y">("6M");
  const [showTable, setShowTable] = useState(false);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Active language chip
  const [activeLang, setActiveLang] = useState<"en" | "bn" | "hi">("en");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const activeTrendData =
    selectedRange === "3M"
      ? TREND_DATA_3M
      : selectedRange === "6M"
      ? TREND_DATA_6M
      : TREND_DATA_1Y;

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
      {/* 1. Fixed Navbar with blur-on-scroll */}
      <header
        data-scrolled={isScrolled}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/90 backdrop-blur-md border-b border-[var(--border)] shadow-sm py-2.5"
            : "bg-white/70 backdrop-blur-xs border-b border-[var(--border)]/50 py-3.5"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--green-800)] flex items-center justify-center text-white shadow-sm">
              <HeartPulse className="w-5 h-5 text-emerald-300" />
            </div>
            <span className="font-display font-bold text-xl text-[var(--green-900)] tracking-tight">
              HealthMate<span className="text-[var(--green-600)]">.AI</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--muted)]">
            <a href="#features" className="hover:text-[var(--green-800)] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[var(--green-800)] transition-colors">How it works</a>
            <a href="#demo" className="hover:text-[var(--green-800)] transition-colors">Interactive Demo</a>
            <a href="#privacy" className="hover:text-[var(--green-800)] transition-colors">Privacy & Safety</a>
            <a href="#faq" className="hover:text-[var(--green-800)] transition-colors">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onLogin} className="text-sm font-semibold text-[var(--green-900)]">
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
              className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] focus-visible:ring-2 focus-visible:ring-[var(--green-600)]"
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
      </header>

      {/* 2. Hero Section with Depth, Blobs and HeroComposition */}
      <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28 lg:pt-40 lg:pb-32 bg-gradient-to-b from-green-50/80 via-white to-white">
        {/* Blurred ambient green blobs */}
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 h-[520px] w-[520px] rounded-full bg-emerald-500/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute top-40 -left-28 h-[400px] w-[400px] rounded-full bg-green-700/10 blur-3xl" />

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Copy column */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--green-50)] text-[var(--green-900)] border border-[var(--green-600)]/20 text-xs font-semibold shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-[var(--green-600)]" />
                <span>Private by design • Patient data isolation</span>
              </div>

              <h1 className="font-display font-bold tracking-tight text-[clamp(2.4rem,5.5vw,4.25rem)] leading-[1.08] text-[var(--green-900)]">
                One place for your family’s health records.
              </h1>

              <p className="text-base sm:text-lg text-[var(--muted)] leading-relaxed max-w-xl font-normal">
                Upload reports, track trends, never miss a dose, and share with your doctor by QR. No scattered papers, no lost prescriptions.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onGetStarted}
                  className="gap-2 justify-center shadow-raised text-base font-semibold px-6 py-3"
                >
                  <span>Get started free</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="justify-center text-base"
                >
                  See how it works
                </Button>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[var(--border)] shadow-xs flex items-center gap-2 text-xs text-[var(--muted)] max-w-md">
                <AlertCircle className="w-4 h-4 text-[var(--green-700)] shrink-0" />
                <span>
                  Demo uses synthetic data. Explains records without diagnosing.
                </span>
              </div>
            </div>

            {/* Visual column: Rich Hero Composition */}
            <div className="lg:col-span-6 relative flex justify-center">
              <div className="relative w-full max-w-[500px]">
                {/* Floating Fact Chip (top right) */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-3 -right-2 sm:-right-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full border border-emerald-200 shadow-md text-xs font-semibold text-emerald-800 flex items-center gap-1.5 z-30"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Fact [S1]</span>
                </motion.div>

                {/* Floating QR Chip (bottom left) */}
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute -bottom-3 -left-2 sm:-left-4 bg-[var(--green-900)] text-white px-3 py-1.5 rounded-full shadow-md text-xs font-semibold flex items-center gap-1.5 z-30"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-300" />
                  <span>PIN: 4892 • Expires in 45m</span>
                </motion.div>

                {/* Dashboard Browser Frame */}
                <div className="bg-white rounded-3xl border border-[var(--border)] shadow-raised overflow-hidden">
                  {/* Browser Window Header */}
                  <div className="px-4 py-3 bg-[var(--bg)] border-b border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[11px] font-mono text-[var(--muted)]">healthmate.app/dashboard</span>
                    <Badge variant="verified" size="sm">Active Session</Badge>
                  </div>

                  {/* Browser Content */}
                  <div className="p-5 space-y-4">
                    {/* Patient Banner */}
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                      <div>
                        <p className="text-xs text-[var(--muted)]">Active Profile</p>
                        <p className="text-sm font-semibold text-[var(--text)]">Dr. Abhijit Bhunia</p>
                      </div>
                      <Badge variant="info" size="sm">Primary</Badge>
                    </div>

                    {/* Vitals Summary Card */}
                    <div className="p-4 rounded-2xl bg-[var(--green-50)] border border-[var(--green-100)]">
                      <div className="flex items-center justify-between text-xs font-semibold text-[var(--green-900)] mb-1.5">
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

                      {/* Mini Sparkline Curve */}
                      <div className="mt-3 h-10 w-full">
                        <svg viewBox="0 0 200 40" className="w-full h-full">
                          <path
                            d="M 10 32 Q 50 28, 90 20 T 150 14 T 190 8"
                            fill="none"
                            stroke="var(--green-600)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <circle cx="190" cy="8" r="3.5" fill="var(--green-800)" />
                        </svg>
                      </div>
                    </div>

                    {/* Report provenance note */}
                    <div className="text-[11px] text-[var(--muted)] flex items-center justify-between pt-1">
                      <span>Source: Sample Diagnostics Lab</span>
                      <span className="text-[var(--green-700)] font-medium">Auto-extracted via OCR</span>
                    </div>
                  </div>
                </div>

                {/* Overlapping Phone Mockup (bottom-right) */}
                <div className="hidden sm:block absolute -bottom-8 -right-6 w-60 bg-white rounded-3xl border-2 border-[var(--border)] shadow-overlay p-4 space-y-2.5 z-20">
                  <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Morning Dose</span>
                    <Badge variant="verified" size="sm">08:30 AM</Badge>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text)]">Telmisartan 40mg</p>
                      <p className="text-[10px] text-[var(--muted)]">With breakfast</p>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Taken
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">Streak: 14 days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Trust Strip */}
      <section className="border-y border-[var(--border)] bg-white py-7">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3.5 rounded-xl bg-[var(--bg)] flex items-center justify-center gap-2.5 text-xs font-semibold text-[var(--green-900)]">
              <div className="p-1.5 rounded-lg bg-white border border-[var(--border)]">
                <Lock className="w-4 h-4 text-[var(--green-700)] shrink-0" />
              </div>
              <span>Private by Default</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--bg)] flex items-center justify-center gap-2.5 text-xs font-semibold text-[var(--green-900)]">
              <div className="p-1.5 rounded-lg bg-white border border-[var(--border)]">
                <FileCheck className="w-4 h-4 text-[var(--green-700)] shrink-0" />
              </div>
              <span>You Verify Extracted Data</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--bg)] flex items-center justify-center gap-2.5 text-xs font-semibold text-[var(--green-900)]">
              <div className="p-1.5 rounded-lg bg-white border border-[var(--border)]">
                <Clock className="w-4 h-4 text-[var(--green-700)] shrink-0" />
              </div>
              <span>Time-Limited QR Sharing</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--bg)] flex items-center justify-center gap-2.5 text-xs font-semibold text-[var(--green-900)]">
              <div className="p-1.5 rounded-lg bg-white border border-[var(--border)]">
                <ShieldCheck className="w-4 h-4 text-[var(--green-700)] shrink-0" />
              </div>
              <span>Fully Usable Without AI</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Problem -> Solution */}
      <section className="py-20 md:py-28 bg-green-50/50">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-[var(--green-900)] tracking-tight">
              Stop carrying disorganized medical paperwork
            </h2>
            <p className="text-base text-[var(--muted)]">
              Compare scattered physical binders and lost WhatsApp photos with one unified, clinical timeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* The Old Way */}
            <div className="p-8 rounded-3xl bg-white border border-red-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 text-base font-semibold text-red-700">
                <span className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-sm">✕</span>
                <span>The Painful Medical Paper Trail</span>
              </div>
              <ul className="space-y-4 text-sm text-[var(--muted)] leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Heavy plastic folders taken to every doctor appointment with loose receipts.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Lab results scattered across multiple lab portals, portals, and WhatsApp chats.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">•</span>
                  <span>No way to know if your blood sugar or cholesterol improved over the year.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Missed doses and forgotten instructions during busy mornings.</span>
                </li>
              </ul>
            </div>

            {/* The HealthMate Way */}
            <div className="p-8 rounded-3xl bg-white border-2 border-[var(--green-600)] shadow-md space-y-5">
              <div className="flex items-center gap-2.5 text-base font-semibold text-[var(--green-800)]">
                <span className="w-7 h-7 rounded-full bg-[var(--green-100)] flex items-center justify-center text-sm">✓</span>
                <span>The HealthMate Unified Timeline</span>
              </div>
              <ul className="space-y-4 text-sm text-[var(--text)] leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[var(--green-600)] shrink-0" />
                  <span>Snap a photo: OCR automatically structures every observation point.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[var(--green-600)] shrink-0" />
                  <span>Longitudinal trend graphs with clinical reference bands at a glance.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[var(--green-600)] shrink-0" />
                  <span>Interactive dose cards with discreet mode and Telegram care reminders.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[var(--green-600)] shrink-0" />
                  <span>30-second doctor sharing by QR without giving up permanent access.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works (With Connector Line) */}
      <section id="how-it-works" className="py-20 md:py-28 bg-white border-y border-[var(--border)] relative">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-[var(--green-900)] tracking-tight">
              How HealthMate works in 4 simple steps
            </h2>
            <p className="text-base text-[var(--muted)]">
              From raw paper prescription to informed doctor consultation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Desktop Connector Line */}
            <div
              aria-hidden
              className="hidden md:block absolute top-12 left-12 right-12 h-0.5 bg-gradient-to-r from-emerald-200 via-green-300 to-emerald-200 -z-0"
            />

            <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3 relative z-10 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-[var(--green-800)] text-white font-bold flex items-center justify-center text-base shadow-sm">
                1
              </div>
              <h3 className="font-semibold text-lg text-[var(--text)]">Upload or Scan</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                Drop your PDF or take a camera photo of your lab test or prescription report.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3 relative z-10 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-[var(--green-800)] text-white font-bold flex items-center justify-center text-base shadow-sm">
                2
              </div>
              <h3 className="font-semibold text-lg text-[var(--text)]">Review Extracted Data</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                Check OCR-extracted numbers side-by-side with original document pages before confirming.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3 relative z-10 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-[var(--green-800)] text-white font-bold flex items-center justify-center text-base shadow-sm">
                3
              </div>
              <h3 className="font-semibold text-lg text-[var(--text)]">Track Trends & Doses</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                Watch vitals over 3M, 6M, or 1Y intervals. Log taken medicines with one tap.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3 relative z-10 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-[var(--green-800)] text-white font-bold flex items-center justify-center text-base shadow-sm">
                4
              </div>
              <h3 className="font-semibold text-lg text-[var(--text)]">Share with Your Doctor</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                Generate a temporary QR pack. Your clinician views records in seconds, expiring on departure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. True Bento Grid with Live Previews */}
      <section id="features" className="py-20 md:py-28 bg-[var(--bg)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-[var(--green-900)] tracking-tight">
              Complete care toolkit built for real families
            </h2>
            <p className="text-base text-[var(--muted)]">
              Engineered with medical privacy, elder simplicity, and multi-profile flexibility.
            </p>
          </div>

          {/* Real Bento Grid: differing column/row spans with live mini-UIs */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            {/* 1. Records + OCR (3 cols, 2 rows) */}
            <div className="md:col-span-3 md:row-span-2 p-6 rounded-3xl bg-white border border-[var(--border)] hover:border-[var(--green-600)] hover:shadow-raised transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[var(--green-100)] flex items-center justify-center text-[var(--green-800)] mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-xl text-[var(--text)] mb-2">Records & OCR</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">
                  Verified text extraction for lab reports and discharge summaries with side-by-side page provenance.
                </p>
              </div>

              {/* Mini Split-Review Mockup */}
              <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span className="font-mono">SampleLab_Metabolic.pdf</span>
                  <Badge variant="verified" size="sm">Provenance Verified</Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-[var(--border)] flex items-center justify-between">
                    <span>Fasting Glucose</span>
                    <span className="font-mono font-bold text-[var(--green-900)]">94 mg/dL</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">[70 - 99] ✓</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[var(--border)] flex items-center justify-between">
                    <span>HbA1c</span>
                    <span className="font-mono font-bold text-[var(--green-900)]">6.8 %</span>
                    <span className="text-[10px] text-amber-600 font-semibold">[Pre-diabetic] ✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Trends (3 cols, 1 row) */}
            <div className="md:col-span-3 md:row-span-1 p-6 rounded-3xl bg-white border border-[var(--border)] hover:border-[var(--green-600)] hover:shadow-raised transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--green-100)] flex items-center justify-center text-[var(--green-800)]">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <Badge variant="verified" size="sm">-8 mmHg past 3 months</Badge>
                </div>
                <h3 className="font-display font-bold text-lg text-[var(--text)] mb-1">Trend Graphs</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Longitudinal charts with healthy reference corridors, delta chips, and tabular alternatives for accessibility.
                </p>
              </div>

              {/* Mini area chart */}
              <div className="h-14 w-full mt-3 bg-[var(--green-50)] rounded-xl p-2 flex items-center">
                <svg viewBox="0 0 300 40" className="w-full h-full">
                  <path d="M 0 30 Q 75 25, 150 18 T 300 10" fill="none" stroke="var(--green-600)" strokeWidth="3" />
                  <circle cx="300" cy="10" r="4" fill="var(--green-800)" />
                </svg>
              </div>
            </div>

            {/* 3. Medicine Schedules (2 cols, 1 row) */}
            <div className="md:col-span-2 md:row-span-1 p-6 rounded-3xl bg-white border border-[var(--border)] hover:border-[var(--green-600)] hover:shadow-raised transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[var(--green-100)] flex items-center justify-center text-[var(--green-800)] mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-[var(--text)] mb-1">Medicine Schedules</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Taken / Skip / Snooze logging, refill trackers, and discrete notification masking for privacy.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between mt-3 text-xs">
                <div>
                  <p className="font-semibold text-[var(--text)]">Metformin 500mg</p>
                  <p className="text-[10px] text-[var(--muted)]">After lunch</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Taken ✓</span>
              </div>
            </div>

            {/* 4. Emergency Card (1 col, 1 row) */}
            <div className="md:col-span-1 md:row-span-1 p-5 rounded-3xl bg-white border border-[var(--border)] hover:border-[var(--green-600)] hover:shadow-raised transition-all flex flex-col justify-between text-center">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[var(--green-100)] flex items-center justify-center text-[var(--green-800)] mb-2 mx-auto">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-sm text-[var(--text)] mb-1">Emergency Card</h3>
                <p className="text-[11px] text-[var(--muted)]">First responders</p>
              </div>
              <div className="p-2 rounded-xl bg-red-50 border border-red-100 text-[11px] font-bold text-red-800">
                Blood O+
              </div>
            </div>

            {/* 5. Doctor Visit Pack (2 cols, 1 row) */}
            <div className="md:col-span-2 md:row-span-1 p-6 rounded-3xl bg-white border border-[var(--border)] hover:border-[var(--green-600)] hover:shadow-raised transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[var(--green-100)] flex items-center justify-center text-[var(--green-800)] mb-3">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-[var(--text)] mb-1">Doctor Visit Pack</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Export 2-page print summaries and discussion questions tailored to your upcoming medical appointment.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between mt-3 text-xs">
                <span className="font-semibold text-[var(--text)]">Consultation Brief</span>
                <span className="text-[var(--green-700)] font-mono text-[11px]">2 Pages • PDF</span>
              </div>
            </div>

            {/* 6. Family & Caregivers (4 cols, 1 row) */}
            <div className="md:col-span-4 md:row-span-1 p-6 rounded-3xl bg-white border border-[var(--border)] hover:border-[var(--green-600)] hover:shadow-raised transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--green-100)] flex items-center justify-center text-[var(--green-800)]">
                    <Users className="w-5 h-5" />
                  </div>
                  <Badge variant="info" size="sm">Multi-Profile Care</Badge>
                </div>
                <h3 className="font-display font-bold text-lg text-[var(--text)] mb-1">Family & Caregivers</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Manage elders and children under one account with strictly separated health records and consent tracking.
                </p>
              </div>

              {/* Multi-avatar preview */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--green-700)] text-white text-xs font-bold flex items-center justify-center">A</div>
                  <span className="text-xs font-semibold truncate">Dr. Abhijit</span>
                </div>
                <div className="p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--green-800)] text-white text-xs font-bold flex items-center justify-center">M</div>
                  <span className="text-xs font-semibold truncate">Anima (Mother)</span>
                </div>
                <div className="p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--green-600)] text-white text-xs font-bold flex items-center justify-center">C</div>
                  <span className="text-xs font-semibold truncate">Aarav (Child)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Interactive Trend Visualization with Recharts */}
      <section id="demo" className="py-20 md:py-28 bg-white border-y border-[var(--border)]">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-[var(--green-900)] tracking-tight">
              Interactive Trend Visualization
            </h2>
            <p className="text-base text-[var(--muted)]">
              Experience how your physiological parameters are mapped over time.
            </p>
          </div>

          <Card className="p-6 md:p-8 bg-[var(--surface)] border-[var(--green-600)]/30 shadow-md rounded-3xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-[var(--text)] flex items-center gap-2">
                  <span>Systolic Blood Pressure (Synthetic Demo)</span>
                  <Badge variant="verified" size="sm">Verified Fact</Badge>
                </h3>
                <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">Reference normal: 90 - 120 mmHg</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowTable(!showTable)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1.5 transition-colors"
                  aria-label="Toggle Accessible Table"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>{showTable ? "Hide Table" : "Table View"}</span>
                </button>

                <div className="flex items-center gap-1 bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)]">
                  {(["3M", "6M", "1Y"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRange(r)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedRange === r
                          ? "bg-white text-[var(--green-900)] shadow-2xs font-bold"
                          : "text-[var(--muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="py-6 space-y-4">
              {!showTable ? (
                <div className="w-full h-[280px]">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={activeTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rechartsTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#15803d" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#15803d" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <ReferenceArea y1={90} y2={120} fill="#dcfce7" fillOpacity={0.6} />
                      <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: "#e5e7eb" }} tick={{ fontSize: 12, fill: "#6b7280" }} />
                      <YAxis domain={[80, 160]} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} tick={{ fontSize: 12, fill: "#6b7280" }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="p-3 bg-white rounded-xl shadow-lg border border-[var(--border)] text-xs space-y-1">
                                <p className="font-bold text-[var(--text)]">{data.date}</p>
                                <p className="text-[var(--green-900)] font-semibold">
                                  Systolic: {data.systolic} mmHg
                                </p>
                                <p className="text-emerald-700 font-medium">Normal corridor: 90 - 120 mmHg</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="systolic"
                        stroke="#15803d"
                        strokeWidth={3}
                        fill="url(#rechartsTrendGrad)"
                        isAnimationActive={true}
                        animationDuration={600}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="overflow-x-auto py-2">
                  <table className="w-full text-left text-xs border-collapse" aria-label="Blood Pressure Trend Data">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                        <th className="py-2 px-3 font-semibold">Date</th>
                        <th className="py-2 px-3 font-semibold">Systolic (mmHg)</th>
                        <th className="py-2 px-3 font-semibold">Normal Range</th>
                        <th className="py-2 px-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTrendData.map((row, i) => (
                        <tr key={i} className="border-b border-[var(--border)]/60 hover:bg-[var(--bg)]">
                          <td className="py-2 px-3 font-medium text-[var(--text)]">{row.date}</td>
                          <td className="py-2 px-3 font-mono font-bold text-[var(--green-900)]">{row.systolic}</td>
                          <td className="py-2 px-3 text-[var(--muted)]">90 - 120</td>
                          <td className="py-2 px-3">
                            <Badge variant={row.systolic <= 120 ? "verified" : "review"} size="sm">
                              {row.systolic <= 120 ? "Normal" : "Elevated"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--muted)] pt-3 border-t border-[var(--border)]">
                <span>Earliest: {activeTrendData[0]?.systolic} mmHg</span>
                <span className="font-semibold text-[var(--green-700)] bg-[var(--green-50)] px-3 py-1 rounded-full border border-[var(--green-100)]">
                  -8 mmHg since March (Consistent Improvement)
                </span>
                <span className="font-semibold text-[var(--text)]">
                  Latest: {activeTrendData[activeTrendData.length - 1]?.systolic} mmHg
                </span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 8. Doctor QR Section */}
      <section className="py-20 md:py-28 bg-green-50/50">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <Badge variant="verified" size="md">Clinician Portal</Badge>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-[var(--green-900)] tracking-tight">
                Share with your doctor in 30 seconds by QR
              </h2>
              <p className="text-base text-[var(--muted)] leading-relaxed">
                During your consultation, show the dynamic QR code on your phone screen. The doctor scans using any camera or browser to view a structured, read-only summary.
              </p>

              <div className="space-y-3.5 text-sm text-[var(--text)]">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[var(--green-600)]" />
                  <span>No apps or logins required for the doctor.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[var(--green-600)]" />
                  <span>Configurable expiry (1 hour, 24 hours, or 7 days).</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[var(--green-600)]" />
                  <span>Revoke in one tap whenever you walk out of the clinic.</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 flex justify-center">
              <div className="p-8 bg-white rounded-3xl border border-[var(--border)] shadow-raised max-w-sm text-center space-y-5 w-full">
                <div className="w-48 h-48 mx-auto bg-[var(--bg)] rounded-2xl border-2 border-dashed border-[var(--green-600)] flex items-center justify-center p-3">
                  <QrCode className="w-36 h-36 text-[var(--green-900)]" />
                </div>
                <div>
                  <p className="font-semibold text-base text-[var(--text)]">Dr. Consultation Share Session</p>
                  <p className="text-xs text-[var(--muted)] mt-1">PIN Protected: <strong className="font-mono text-sm text-[var(--text)]">4892</strong></p>
                </div>
                <Badge variant="neutral" size="sm">Expires in 58 minutes</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Family & Caregivers */}
      <section className="py-20 md:py-28 bg-white border-y border-[var(--border)]">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10">
          <div className="space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-[var(--green-900)] tracking-tight">
              Caring for aging parents and children
            </h2>
            <p className="text-base text-[var(--muted)] max-w-xl mx-auto">
              Switch seamlessly between parent, spouse, and child profiles without data cross-contamination.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <div className="p-6 rounded-3xl bg-[var(--bg)] border border-[var(--border)] text-center w-48 space-y-3 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-full bg-[var(--green-700)] text-white font-bold flex items-center justify-center mx-auto text-lg shadow-sm">
                A
              </div>
              <div>
                <p className="text-base font-semibold text-[var(--text)]">Dr. Abhijit</p>
                <p className="text-xs text-[var(--muted)]">Self</p>
              </div>
              <Badge variant="info" size="sm">Primary</Badge>
            </div>

            <div className="p-6 rounded-3xl bg-[var(--bg)] border border-[var(--border)] text-center w-48 space-y-3 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-full bg-[var(--green-800)] text-white font-bold flex items-center justify-center mx-auto text-lg shadow-sm">
                M
              </div>
              <div>
                <p className="text-base font-semibold text-[var(--text)]">Anima (Mother)</p>
                <p className="text-xs text-[var(--muted)]">Dependent</p>
              </div>
              <Badge variant="verified" size="sm">Authorized</Badge>
            </div>

            <div className="p-6 rounded-3xl bg-[var(--bg)] border border-[var(--border)] text-center w-48 space-y-3 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-full bg-[var(--green-600)] text-white font-bold flex items-center justify-center mx-auto text-lg shadow-sm">
                A
              </div>
              <div>
                <p className="text-base font-semibold text-[var(--text)]">Aarav (Child)</p>
                <p className="text-xs text-[var(--muted)]">Dependent</p>
              </div>
              <Badge variant="verified" size="sm">Authorized</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* 10. AI Assistant Grounding Preview */}
      <section className="py-20 md:py-28 bg-[var(--bg)]">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="verified" size="md">Strict Evidence Grounding</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-[var(--green-900)] tracking-tight">
              Ask questions about your records safely
            </h2>
            <p className="text-base text-[var(--muted)]">
              Every answer points directly to verified laboratory excerpts with source citations.
            </p>
          </div>

          {/* Assistant Chat Mockup */}
          <div className="p-6 md:p-8 bg-white rounded-3xl border border-[var(--border)] shadow-raised space-y-4">
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-[var(--green-800)] text-white p-4 text-xs sm:text-sm font-medium max-w-[85%] shadow-sm">
                What was my latest HbA1c result?
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--green-50)] border border-[var(--green-100)] text-xs sm:text-sm text-[var(--text)] space-y-3">
              <p className="leading-relaxed">
                According to your verified Sample Diagnostics Lab Glycemic Panel from 14 October 2026, your HbA1c was <strong>6.8%</strong> <span className="px-2 py-0.5 rounded bg-[var(--green-100)] text-[var(--green-900)] font-bold">[S1]</span>.
              </p>
              <div className="pt-3 border-t border-[var(--border)] text-xs text-[var(--muted)] flex items-center justify-between">
                <span>[S1] Page 2, Routine Checkup PDF</span>
                <span className="text-[var(--green-700)] font-semibold">Answers come only from your verified records</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Privacy & Safety Pillars */}
      <section id="privacy" className="py-20 md:py-28 bg-white border-y border-[var(--border)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-[var(--green-900)] tracking-tight">
              Medical safety and privacy commitments
            </h2>
            <p className="text-base text-[var(--muted)]">
              Zero monetization of health data. Complete user control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-8 rounded-3xl bg-[var(--bg)] border border-[var(--border)] space-y-3.5 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[var(--border)] flex items-center justify-center text-[var(--green-800)]">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[var(--text)]">You Own Your Data</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                Export all records in standard PDF and JSON anytime. Request permanent deletion in one click.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[var(--bg)] border border-[var(--border)] space-y-3.5 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[var(--border)] flex items-center justify-center text-[var(--green-800)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[var(--text)]">No Diagnosis or Prescribing</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                HealthMate AI explains records and supports doctor conversations. It never diagnoses or prescribes.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[var(--bg)] border border-[var(--border)] space-y-3.5 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[var(--border)] flex items-center justify-center text-[var(--green-800)]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[var(--text)]">AI is 100% Optional</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                All document vaults, medication schedules, trend lines, and QR sharing operate normally even without AI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 12. Languages & Accessibility */}
      <section className="py-14 bg-emerald-50/60 border-b border-[var(--border)]">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display font-bold text-xl text-[var(--green-900)]">
              Regional Languages & Simple Mode for Elders
            </h3>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
              Switch into 20px high-contrast typography and regional languages with one tap.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveLang("en")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeLang === "en" ? "bg-[var(--green-800)] text-white shadow-sm" : "bg-white text-[var(--muted)] border border-[var(--border)] hover:text-[var(--text)]"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setActiveLang("bn")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeLang === "bn" ? "bg-[var(--green-800)] text-white shadow-sm" : "bg-white text-[var(--muted)] border border-[var(--border)] hover:text-[var(--text)]"
              }`}
            >
              বাংলা (Bengali)
            </button>
            <button
              onClick={() => setActiveLang("hi")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeLang === "hi" ? "bg-[var(--green-800)] text-white shadow-sm" : "bg-white text-[var(--muted)] border border-[var(--border)] hover:text-[var(--text)]"
              }`}
            >
              हिन्दी (Hindi)
            </button>
          </div>
        </div>
      </section>

      {/* 13. FAQ Accordion */}
      <section id="faq" className="py-20 md:py-28 bg-white">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-[var(--green-900)] tracking-tight">
              Frequently asked questions
            </h2>
            <p className="text-base text-[var(--muted)]">
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
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-[var(--text)] hover:text-[var(--green-800)]"
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
                        className="px-5 pb-5 text-xs sm:text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--border)]/60 pt-3"
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

      {/* 14. Final CTA: High Contrast White Text on Green Gradient */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 text-white text-center relative overflow-hidden">
        {/* Ambient radial blur glow */}
        <div aria-hidden className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight text-white leading-tight">
            Start organising your family’s health today.
          </h2>
          <p className="text-base sm:text-lg text-emerald-100/90 max-w-xl mx-auto leading-relaxed">
            Create your free account, upload your first report, and experience calm clarity for all medical records.
          </p>
          <div className="pt-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={onGetStarted}
              className="bg-white text-[var(--green-900)] hover:bg-emerald-50 px-8 py-3.5 text-base font-bold shadow-xl border-0 hover:scale-[1.02] transition-transform"
            >
              Create free account
            </Button>
          </div>
        </div>
      </section>

      {/* 15. Footer */}
      <footer className="bg-white border-t border-[var(--border)] py-14 text-xs text-[var(--muted)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[var(--border)]">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--green-800)] flex items-center justify-center text-white">
                  <HeartPulse className="w-4 h-4 text-emerald-300" />
                </div>
                <span className="font-display font-bold text-base text-[var(--green-900)]">
                  HealthMate AI
                </span>
              </div>
              <p className="leading-relaxed text-xs">
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
                <li><a href="#privacy" className="hover:text-[var(--text)]">Private by Design</a></li>
                <li><a href="#privacy" className="hover:text-[var(--text)]">Zero Training on Records</a></li>
                <li><a href="#privacy" className="hover:text-[var(--text)]">Immutable Audit Trail</a></li>
                <li><a href="#privacy" className="hover:text-[var(--text)]">Export & Erasure</a></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-[var(--text)] uppercase tracking-wider mb-3">Medical Disclaimer</p>
              <p className="leading-relaxed text-[11px] text-[var(--text)]/80">
                HealthMate AI explains records and supports doctor conversations. It never diagnoses or prescribes. All demo data is synthetic. Always consult your qualified healthcare clinician for medical diagnosis and treatment plans.
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
