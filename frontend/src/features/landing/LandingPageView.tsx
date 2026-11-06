import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  FileSearch,
  FileText,
  HeartPulse,
  Lock,
  Menu,
  QrCode,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
} from "lucide-react";
import "./landing.css";
import { Bubble, LogoMark, Reveal, SectionHeading } from "./art/primitives";
import { HeroScene } from "./art/HeroScene";
import { AssistantDemo, DoseDemo, ScanDemo, TrendDemo } from "./art/FeatureDemos";
import {
  ApptMini,
  EmergencyMini,
  FamilyDemo,
  LanguageMini,
  QrShareDemo,
  ShieldArt,
  SymptomMini,
  VisitPackMini,
} from "./art/ShareAndFamily";

export interface LandingPageProps {
  onGetStarted?: () => void;
  onLogin?: () => void;
}

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#share", label: "Doctor sharing" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#privacy", label: "Privacy & safety" },
  { href: "#faq", label: "FAQ" },
];

const FAQS = [
  {
    q: "Is HealthMate AI free to use?",
    a: "Yes, at the moment. Records, text extraction, trend charts, reminders and doctor links are free to use. The optional AI assistant has a daily question limit.",
  },
  {
    q: "Does HealthMate AI diagnose diseases or prescribe medicine?",
    a: "Never. HealthMate AI strictly explains what is already in your records and helps you prepare questions for appointments. Treatment decisions are always between you and your qualified doctor.",
  },
  {
    q: "Who can see my records and test results?",
    a: "Only you. A doctor sees just the reports and sections you choose, through a link you create. It is read-only, it expires, you can revoke it in one tap, and every time it is opened is logged. The emergency QR is off until you turn it on.",
  },
  {
    q: "How accurate is the reading of my reports?",
    a: "Text extraction can misread a number, especially from a photo. That is why you review every value against the original file, and only values you verify feed your charts and summaries.",
  },
  {
    q: "Does it work without the AI assistant?",
    a: "Yes. Upload, extraction, trends, doses and sharing do not need AI. If the AI service is unavailable or your daily limit is reached, the assistant falls back to a built-in engine that only quotes your own records.",
  },
  {
    q: "What happens if a medicine reminder is late?",
    a: "HealthMate is a memory aid, not a safety system. Reminders appear in the app, and by email if you choose that, whenever the services are reachable. Always follow the label on your prescription.",
  },
];

const MARQUEE = [
  "Blood tests", "Lipid panels", "HbA1c", "Thyroid", "Prescriptions", "Scans & X-rays", "Discharge summaries",
  "Vaccination cards", "Blood pressure", "Vitamin D", "Liver function", "Kidney function",
];

/* ---------------------------------------------------------------- small shared bits */

function CtaButton({
  children,
  onClick,
  variant = "solid",
  icon = true,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "solid" | "light" | "outline" | "outline-dark";
  icon?: boolean;
}) {
  const styles: Record<string, string> = {
    solid: "lp-shine bg-[#087a83] bg-gradient-to-r from-[#087a83] to-[#053f44] text-white shadow-[0_14px_30px_-10px_rgba(5,63,68,0.75)] hover:shadow-[0_18px_36px_-10px_rgba(5,63,68,0.9)]",
    light: "bg-white text-[#053f44] shadow-[0_14px_30px_-10px_rgba(0,0,0,0.5)] hover:bg-[#eef8f4]",
    outline: "border border-[#053f44]/20 bg-white/60 text-[#053f44] backdrop-blur hover:bg-white",
    "outline-dark": "border border-white/30 text-white hover:bg-white/10",
  };
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 text-[15px] font-bold transition-shadow focus-visible:outline-none focus-visible:shadow-[var(--focus)] ${styles[variant]}`}
    >
      <span>{children}</span>
      {icon && <ArrowRight size={17} aria-hidden="true" />}
    </motion.button>
  );
}

function FeatureRow({
  id,
  eyebrow,
  title,
  body,
  bullets,
  art,
  flip = false,
  tone,
}: {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  bullets: string[];
  art: React.ReactNode;
  flip?: boolean;
  tone: "teal" | "sky" | "amber" | "violet";
}) {
  const glow: Record<string, string> = {
    teal: "from-[#43b58f]/30 to-[#087a83]/10",
    sky: "from-[#4c8dff]/25 to-[#43b58f]/10",
    amber: "from-[#f6b64a]/30 to-[#43b58f]/10",
    violet: "from-[#7c6cff]/25 to-[#4c8dff]/10",
  };
  return (
    <div id={id} className="grid scroll-mt-28 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Reveal className={flip ? "lg:order-2" : ""}>
        <SectionHeading align="left" eyebrow={eyebrow} title={title} body={body} />
        <ul className="mt-6 space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-[15px] text-[#27434a]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2e9b79] text-white">
                <Check size={12} strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={0.1} className={`relative ${flip ? "lg:order-1" : ""}`}>
        <div aria-hidden className={`absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br ${glow[tone]} blur-2xl`} />
        {art}
      </Reveal>
    </div>
  );
}

function Tile({ title, text, children, className = "", center = true }: { title: string; text: string; children: React.ReactNode; className?: string; center?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-[#0b2b30]/8 bg-white p-5 shadow-[0_20px_44px_-30px_rgba(5,63,68,0.55)] ${className}`}
    >
      <div className={`flex-1 ${center ? "flex items-center justify-center" : ""}`}><div className="w-full">{children}</div></div>
      <h3 className="mt-4 font-display text-lg font-extrabold text-[#0b2b30]">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-[#4c6168]">{text}</p>
    </motion.div>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto mt-10 max-w-3xl divide-y divide-[#0b2b30]/10 rounded-3xl border border-[#0b2b30]/8 bg-white shadow-[0_20px_44px_-30px_rgba(5,63,68,0.5)]">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
            >
              <span className="font-display text-base font-bold text-[#0b2b30]">{f.q}</span>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${isOpen ? "bg-[#087a83] text-white" : "bg-[#eef8f4] text-[#087a83]"}`}>
                <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`faq-${i}`}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-[15px] leading-relaxed text-[#4c6168] sm:px-6">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function Steps() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const grow = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });
  const scale = useTransform(grow, (v) => (reduce ? 1 : v));
  const steps = [
    { icon: <Upload size={20} />, t: "Upload or snap", d: "Add a PDF or photo of any report, prescription or scan.", tone: "teal" as const },
    { icon: <FileSearch size={20} />, t: "Review & verify", d: "Check each extracted value against the original, then verify it.", tone: "sky" as const },
    { icon: <TrendingUp size={20} />, t: "Track trends & doses", d: "Charts, schedules and reminders build themselves from your data.", tone: "amber" as const },
    { icon: <QrCode size={20} />, t: "Share or ask", d: "Send a doctor a time-limited QR link, or ask the assistant.", tone: "violet" as const },
  ];
  return (
    <div ref={ref} className="relative mt-14">
      <div aria-hidden className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-0.5 rounded bg-[#0b2b30]/10 lg:block">
        <motion.span className="block h-full origin-left rounded bg-gradient-to-r from-[#43b58f] via-[#4c8dff] to-[#7c6cff]" style={{ scaleX: scale }} />
      </div>
      <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Reveal as="li" key={s.t} delay={i * 0.1} className="relative text-center">
            <div className="relative mx-auto w-fit">
              <Bubble tone={s.tone} size={56} className="relative z-10">
                {s.icon}
              </Bubble>
              <span className="absolute -right-2 -top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-[#053f44] shadow ring-1 ring-[#0b2b30]/10">
                {i + 1}
              </span>
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold text-[#0b2b30]">{s.t}</h3>
            <p className="mx-auto mt-1 max-w-[250px] text-sm leading-relaxed text-[#4c6168]">{s.d}</p>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

/* ---------------------------------------------------------------- page */

export function LandingPageView({ onGetStarted, onLogin }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="lp relative min-h-screen overflow-x-clip bg-[#f7fbf9] font-sans selection:bg-[#43b58f]/30">
      {/* ---------------------------------------------------------- navigation */}
      <header
        data-scrolled={scrolled}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "border-b border-[#0b2b30]/8 bg-white/85 py-2 shadow-[0_8px_30px_-18px_rgba(5,63,68,0.5)] backdrop-blur-xl" : "bg-transparent py-4"
        }`}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-2.5" aria-label="HealthMate AI home">
            <LogoMark size={38} />
            <span className="font-display text-xl font-extrabold tracking-tight text-[#053f44]">
              HealthMate<span className="text-[#2e9b79]"> AI</span>
            </span>
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-sm font-semibold text-[#3d575e] lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="relative py-1 transition-colors hover:text-[#087a83] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded after:bg-[#2e9b79] after:transition-transform hover:after:scale-x-100">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <button type="button" onClick={onLogin} className="min-h-[44px] rounded-xl px-4 text-sm font-bold text-[#053f44] transition-colors hover:bg-[#053f44]/6">
              Log in
            </button>
            <CtaButton onClick={onGetStarted}>Get started free</CtaButton>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#053f44] lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            {menu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <AnimatePresence>
          {menu && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-[#0b2b30]/8 bg-white/95 backdrop-blur-xl lg:hidden"
            >
              <div className="space-y-1 px-4 py-4">
                {NAV.map((n) => (
                  <a key={n.href} href={n.href} onClick={() => setMenu(false)} className="block rounded-xl px-3 py-3 text-base font-semibold text-[#0b2b30] hover:bg-[#eef8f4]">
                    {n.label}
                  </a>
                ))}
                <div className="flex flex-col gap-2 pt-3">
                  <button type="button" onClick={onLogin} className="min-h-[48px] rounded-2xl border border-[#053f44]/20 font-bold text-[#053f44]">
                    Log in
                  </button>
                  <button type="button" onClick={onGetStarted} className="min-h-[48px] rounded-2xl bg-gradient-to-r from-[#087a83] to-[#053f44] font-bold text-white">
                    Get started free
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="top">
        {/* ---------------------------------------------------------- hero */}
        <section className="relative isolate overflow-hidden pb-16 pt-28 sm:pt-32 lg:pb-24 lg:pt-36">
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-[#e7f6ef] via-[#f3faf7] to-[#f7fbf9]" />
          <div aria-hidden className="lp-dots absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_72%)]" />
          <div aria-hidden className="lp-aurora absolute -right-32 -top-24 -z-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(67,181,143,0.55),transparent_65%)] blur-2xl" />
          <div aria-hidden className="lp-aurora-b absolute -left-40 top-40 -z-10 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(76,141,255,0.28),transparent_65%)] blur-2xl" />

          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.02fr_1fr] lg:gap-6 lg:px-8">
            <div>
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 rounded-full border border-[#2e9b79]/25 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-[#087a83] shadow-sm backdrop-blur"
              >
                <Sparkles size={14} className="text-[#7c6cff]" />
                Records · Reminders · Doctor sharing in one calm app
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="mt-5 font-display text-[2.55rem] font-extrabold leading-[1.06] tracking-[-0.02em] text-[#0b2b30] sm:text-6xl lg:text-[4.1rem] [text-wrap:balance]"
                style={{ color: "#0b2b30" }}
              >
                Your family’s health, <span className="lp-text-gradient">finally in one place.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mt-5 max-w-xl text-lg leading-relaxed text-[#3d575e]"
              >
                Upload any report and HealthMate reads it for you. See trends, never miss a dose, and share with your doctor by QR, with you in control the whole time.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.32 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <CtaButton onClick={onGetStarted}>Get started free</CtaButton>
                <a
                  href="#features"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#053f44]/20 bg-white/60 px-6 text-[15px] font-bold text-[#053f44] backdrop-blur transition-colors hover:bg-white"
                >
                  See how it works <ChevronDown size={17} aria-hidden="true" />
                </a>
              </motion.div>
              <motion.ul
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="mt-8 grid gap-3 sm:grid-cols-3"
                aria-label="What makes HealthMate trustworthy"
              >
                {[
                  { i: <Lock size={16} />, t: "Private by default" },
                  { i: <ShieldCheck size={16} />, t: "You verify every value" },
                  { i: <QrCode size={16} />, t: "Time-limited QR links" },
                ].map((x) => (
                  <li key={x.t} className="flex items-center gap-2 text-sm font-semibold text-[#27434a]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e3f4ec] text-[#087a83]">{x.i}</span>
                    {x.t}
                  </li>
                ))}
              </motion.ul>
              <p className="mt-5 text-xs text-[#6f858c]">Free to use. Every screen shown on this page uses synthetic sample data.</p>
            </div>

            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
              <HeroScene />
            </motion.div>
          </div>
        </section>

        {/* ---------------------------------------------------------- marquee */}
        <section aria-label="Documents HealthMate understands" className="border-y border-[#0b2b30]/8 bg-white py-5">
          <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#8aa0a6]">Reads the paperwork you already have</p>
          <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
            <div className="lp-marquee flex gap-3">
              {[...MARQUEE, ...MARQUEE].map((m, i) => (
                <span key={i} aria-hidden={i >= MARQUEE.length} className="flex shrink-0 items-center gap-2 rounded-full border border-[#0b2b30]/8 bg-[#f4faf7] px-4 py-2 text-sm font-semibold text-[#27434a]">
                  <FileText size={14} className="text-[#2e9b79]" />
                  {m}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- feature stories */}
        <section id="features" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-[1200px] space-y-24 px-4 sm:space-y-32 sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                eyebrow="Features"
                title={<>Stop carrying a <span className="lp-text-gradient">folder of paper</span> to every appointment</>}
                body="Everything from a blood test to a prescription lands in one timeline that you and your family can actually use."
              />
            </Reveal>

            <FeatureRow
              tone="teal"
              eyebrow="Records"
              title={<>Upload once. HealthMate <span className="lp-text-gradient">reads it for you.</span></>}
              body="Drop in a PDF or a photo of a report. The text is extracted automatically, and you check each value against the original before it is trusted."
              bullets={["PDFs, photos and scans (JPG, PNG)", "The original file sits beside every value", "Add vitals and results by hand, too"]}
              art={<ScanDemo />}
            />
            <FeatureRow
              tone="sky"
              flip
              eyebrow="Trends"
              title={<>See what is <span className="lp-text-gradient">changing,</span> not just today’s number</>}
              body="Verified results become trend charts with the reference range printed on your report, so a rising or falling value is easy to spot."
              bullets={["Reference ranges exactly as printed", "Every point links back to its source report", "Export a PDF or CSV whenever you need"]}
              art={<TrendDemo />}
            />
            <FeatureRow
              tone="amber"
              eyebrow="Medicines"
              title={<>Never miss a dose, <span className="lp-text-gradient">never guess.</span></>}
              body="Set the times and days for each medicine, log doses as taken, skipped or snoozed, and see your week at a glance."
              bullets={["Daily dose schedule with one-tap logging", "7-day adherence summary", "In-app reminders, plus optional email"]}
              art={<DoseDemo />}
            />
            <FeatureRow
              tone="violet"
              flip
              eyebrow="Assistant"
              title={<>Ask your records, <span className="lp-text-gradient">not the internet.</span></>}
              body="Questions are answered from your own uploaded reports, with citations you can open. If the records do not say, it tells you so."
              bullets={["Every statement cites its source", "Never diagnoses or prescribes", "Keeps working if the AI service is unavailable"]}
              art={<AssistantDemo />}
            />
          </div>
        </section>

        {/* ---------------------------------------------------------- bento */}
        <section className="relative bg-gradient-to-b from-[#f7fbf9] via-[#eaf6f0] to-[#f7fbf9] py-20 sm:py-24">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                eyebrow="Built for the whole family"
                title="Everything around the records, too"
                body="Profiles for each person, an emergency card, symptom notes, appointments and a visit pack for the doctor."
              />
            </Reveal>
            <div className="mt-12 grid gap-5 lg:grid-cols-6">
              <Reveal className="lg:col-span-4">
                <Tile center={false} title="Family profiles" text="Care for parents and children from one login. Each profile keeps its own records, doses and sharing." className="h-full">
                  <FamilyDemo />
                </Tile>
              </Reveal>
              <Reveal delay={0.08} className="lg:col-span-2">
                <Tile title="Emergency card" text="A printable card with a QR first responders can scan without logging in. It stays off until you switch it on." className="h-full">
                  <EmergencyMini />
                </Tile>
              </Reveal>
              <Reveal className="lg:col-span-2">
                <Tile title="Doctor visit pack" text="One summary PDF of results, trends, medicines and your questions." className="h-full">
                  <VisitPackMini />
                </Tile>
              </Reveal>
              <Reveal delay={0.08} className="lg:col-span-2">
                <Tile title="Symptom diary" text="Note how you felt and choose what goes into the visit pack." className="h-full">
                  <SymptomMini />
                </Tile>
              </Reveal>
              <Reveal delay={0.16} className="lg:col-span-2">
                <Tile title="Appointments & checklists" text="A calendar with a preparation checklist for every visit." className="h-full">
                  <ApptMini />
                </Tile>
              </Reveal>
              <Reveal className="lg:col-span-3">
                <Tile title="English, বাংলা and हिन्दी" text="Switch language any time, and turn on Simple mode for larger, easier text." className="h-full">
                  <LanguageMini />
                </Tile>
              </Reveal>
              <Reveal delay={0.08} className="lg:col-span-3">
                <Tile title="Yours to export or delete" text="Download everything as a file, or delete your account and data whenever you decide." className="h-full">
                  <div className="flex h-full items-center gap-3" aria-hidden="true">
                    <span className="flex flex-1 items-center gap-3 rounded-2xl bg-[#eef8f4] p-4">
                      <Bubble tone="teal" size={42}><Download size={20} /></Bubble>
                      <span><b className="block text-sm text-[#0b2b30]">Export</b><span className="text-xs text-[#4c6168]">All your data</span></span>
                    </span>
                    <span className="flex flex-1 items-center gap-3 rounded-2xl bg-[#fff1ee] p-4">
                      <Bubble tone="coral" size={42}><Trash2 size={20} /></Bubble>
                      <span><b className="block text-sm text-[#0b2b30]">Delete</b><span className="text-xs text-[#4c6168]">Gone for good</span></span>
                    </span>
                  </div>
                </Tile>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- doctor sharing (dark) */}
        <section id="share" className="relative isolate scroll-mt-20 overflow-hidden bg-[#04282c] py-20 text-white sm:py-28">
          <div aria-hidden className="lp-grid-dark absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <div aria-hidden className="lp-aurora absolute -left-24 top-10 -z-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(67,181,143,0.45),transparent_65%)] blur-2xl" />
          <div aria-hidden className="lp-aurora-b absolute -right-24 bottom-0 -z-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(76,141,255,0.35),transparent_65%)] blur-2xl" />
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                dark
                eyebrow="Doctor sharing"
                title={<>Share with your doctor in <span className="lp-text-gradient-light">30 seconds</span> by QR</>}
                body="Pick what to share and for how long. Your doctor scans the code and sees a read-only page. When you are done, revoke it."
              />
            </Reveal>
            <Reveal delay={0.1} className="mt-12">
              <QrShareDemo />
            </Reveal>
            <Reveal delay={0.15}>
              <ul className="mt-10 grid gap-3 text-sm text-white/80 sm:grid-cols-3">
                {["Doctors need no account or app", "Every time the link is opened is logged for you", "Expired or revoked links show a plain “not available” page"].map((t) => (
                  <li key={t} className="flex items-start gap-2 rounded-2xl bg-white/6 p-4">
                    <Check size={16} className="mt-0.5 shrink-0 text-[#9ff0d2]" /> {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------------- how it works */}
        <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading eyebrow="How it works" title="Four steps from paper to peace of mind" body="Most people are set up in a few minutes." />
            </Reveal>
            <Steps />
          </div>
        </section>

        {/* ---------------------------------------------------------- privacy & safety */}
        <section id="privacy" className="scroll-mt-20 pb-20 sm:pb-28">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-8 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#053f44] via-[#065961] to-[#087a83] p-6 text-white shadow-[0_50px_90px_-40px_rgba(5,63,68,0.9)] sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:p-14">
              <Reveal>
                <ShieldArt />
              </Reveal>
              <Reveal delay={0.1}>
                <SectionHeading
                  dark
                  align="left"
                  eyebrow="Privacy & safety"
                  title="Built around your trust, not around your data"
                  body="HealthMate AI is a memory and organisation tool. It is careful about what it shows, to whom, and what it claims."
                />
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {[
                    { i: <Lock size={18} />, t: "You own your data", d: "Export it or delete it whenever you like." },
                    { i: <Stethoscope size={18} />, t: "Never diagnoses", d: "Explains your records and never prescribes." },
                    { i: <QrCode size={18} />, t: "Sharing you control", d: "Read-only, time-limited and revocable." },
                    { i: <Users size={18} />, t: "Profiles stay separate", d: "Each family member’s records are kept apart." },
                  ].map((c) => (
                    <div key={c.t} className="lp-glass-dark rounded-2xl p-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/12 text-[#9ff0d2]">{c.i}</span>
                      <p className="mt-3 font-display text-base font-bold">{c.t}</p>
                      <p className="mt-0.5 text-sm text-white/70">{c.d}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- FAQ */}
        <section id="faq" className="scroll-mt-20 bg-white pb-20 pt-20 sm:pb-28 sm:pt-24">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading eyebrow="FAQ" title="Questions people ask first" />
            </Reveal>
            <Faq />
          </div>
        </section>

        {/* ---------------------------------------------------------- final CTA */}
        <section className="relative isolate overflow-hidden bg-[#04282c] py-20 text-center text-white sm:py-28">
          <div aria-hidden className="lp-grid-dark absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
          <div aria-hidden className="lp-aurora absolute left-1/2 top-1/2 -z-10 h-[520px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(67,181,143,0.5),rgba(76,141,255,0.22)_50%,transparent_70%)] blur-3xl" />
          <div className="mx-auto max-w-3xl px-4">
            <Reveal>
              <Bubble tone="emerald" size={60} className="lp-float mx-auto">
                <HeartPulse size={28} />
              </Bubble>
              <h2 className="mt-6 font-display text-4xl font-extrabold leading-tight sm:text-5xl" style={{ color: "#fff" }}>
                Start organising your family’s health today.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">Create a free account, add your first report, and have everything ready for the next appointment.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <CtaButton variant="light" onClick={onGetStarted}>Get started free</CtaButton>
                <CtaButton variant="outline-dark" icon={false} onClick={onLogin}>I already have an account</CtaButton>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------- footer */}
      <footer className="bg-[#031d20] py-12 text-white/70">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <LogoMark size={34} />
                <span className="font-display text-lg font-extrabold text-white">HealthMate AI</span>
              </div>
              <p className="mt-3 max-w-sm text-sm">Personal and family health records, reminders and doctor sharing in one place.</p>
            </div>
            <nav aria-label="Product">
              <p className="text-xs font-bold uppercase tracking-wider text-white">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                {NAV.map((n) => (
                  <li key={n.href}><a href={n.href} className="hover:text-white">{n.label}</a></li>
                ))}
              </ul>
            </nav>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white">Account</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><button type="button" onClick={onLogin} className="min-h-0 hover:text-white">Log in</button></li>
                <li><button type="button" onClick={onGetStarted} className="min-h-0 hover:text-white">Create free account</button></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-6 text-xs leading-relaxed">
            <p>HealthMate AI explains records and supports doctor conversations. It never diagnoses or prescribes.</p>
            <p className="mt-1 text-white/50">Screens on this page show synthetic sample data. In an emergency, contact your local emergency number.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPageView;
