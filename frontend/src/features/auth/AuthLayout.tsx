import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, FileText, Heart, Lock, Pill, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import "../landing/landing.css";
import { Bubble, EcgLine, LogoMark } from "../landing/art/primitives";

const POINTS = [
  { icon: <FileText size={16} />, tone: "teal" as const, title: "Upload once, we read it", text: "PDFs and photos become values you verify." },
  { icon: <Pill size={16} />, tone: "amber" as const, title: "Never miss a dose", text: "Schedules, reminders and a weekly view." },
  { icon: <QrCode size={16} />, tone: "violet" as const, title: "Share by QR, stay in control", text: "Read-only, time-limited, revocable." },
];

/** Animated artwork for the brand panel: a "today" card with a live heartbeat and three status rows. */
function AuthArt() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((v) => (v + 1) % POINTS.length), 3600);
    return () => clearInterval(t);
  }, [reduce]);

  const rows = [
    { icon: <FileText size={14} />, tone: "teal" as const, t: "cbc_jan.pdf read", s: "4 values · ready to verify", done: true },
    { icon: <Pill size={14} />, tone: "amber" as const, t: "Metformin 500 mg", s: "8:00 AM · taken", done: true },
    { icon: <QrCode size={14} />, tone: "violet" as const, t: "Doctor link", s: "Read-only · 23h left", done: false },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[430px]" aria-hidden="true">
      {/* orbit decoration */}
      <svg viewBox="0 0 400 400" className="lp-spin-slow absolute -left-6 -top-10 h-[470px] w-[470px] opacity-60">
        <circle cx="200" cy="200" r="180" fill="none" stroke="#9ff0d2" strokeOpacity="0.35" strokeDasharray="2 9" strokeWidth="2" strokeLinecap="round" />
        <circle cx="380" cy="200" r="6" fill="#43b58f" />
        <circle cx="70" cy="70" r="4" fill="#7db0ff" />
      </svg>

      <div className="lp-float-slow lp-glass-dark relative rounded-3xl p-5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ff0d2]">Today</p>
            <p className="font-display text-lg font-extrabold">Sharma family</p>
          </div>
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold text-white/80">Sample data</span>
        </div>
        <EcgLine className="mt-2 h-14 w-full" color="#9ff0d2" />
        <div className="mt-3 space-y-2">
          {rows.map((r, k) => (
            <motion.div
              key={r.t}
              initial={reduce ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + k * 0.18, duration: 0.5 }}
              className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5"
            >
              <Bubble tone={r.tone} size={34}>
                {r.icon}
              </Bubble>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{r.t}</p>
                <p className="text-[11px] text-white/65">{r.s}</p>
              </div>
              {r.done ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2e9b79] text-white">
                  <Check size={13} strokeWidth={3} />
                </span>
              ) : (
                <span className="lp-blink h-2.5 w-2.5 rounded-full bg-[#f6b64a]" />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <Bubble tone="coral" size={44} className="lp-float-alt absolute -right-4 -top-6">
        <Heart size={20} fill="currentColor" />
      </Bubble>
      <Bubble tone="violet" size={38} className="lp-float absolute -bottom-5 -left-4">
        <Sparkles size={18} />
      </Bubble>

      {/* rotating value proposition */}
      <div className="lp-glass-dark mt-6 rounded-2xl p-4 text-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <Bubble tone={POINTS[i].tone} size={38}>
              {POINTS[i].icon}
            </Bubble>
            <div>
              <p className="text-sm font-bold">{POINTS[i].title}</p>
              <p className="text-xs text-white/65">{POINTS[i].text}</p>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mt-3 flex gap-1.5">
          {POINTS.map((_, k) => (
            <span key={k} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${k === i ? "bg-[#9ff0d2]" : "bg-white/20"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="lp flex min-h-screen flex-col bg-[#f4faf7] text-[var(--text)] lg:flex-row">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-[#04282c] p-12 text-white lg:flex lg:w-[52%] lg:flex-col lg:justify-between" aria-label="About HealthMate AI">
        <div aria-hidden className="lp-grid-dark absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
        <div aria-hidden className="lp-aurora absolute -left-24 -top-24 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(67,181,143,0.5),transparent_65%)] blur-2xl" />
        <div aria-hidden className="lp-aurora-b absolute -bottom-32 -right-24 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(76,141,255,0.35),transparent_65%)] blur-2xl" />

        <a href="/" className="relative z-10 flex w-fit items-center gap-3" aria-label="HealthMate AI home">
          <LogoMark size={42} />
          <div>
            <span className="block font-display text-xl font-extrabold leading-none">HealthMate AI</span>
            <span className="text-xs text-white/60">Family clinical workspace</span>
          </div>
        </a>

        <div className="relative z-10 my-8 space-y-9">
          <div className="max-w-lg space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-semibold text-[#9ff0d2]">
              <ShieldCheck size={14} /> Private and verified by you
            </span>
            <h1 className="font-display text-4xl font-extrabold leading-[1.1] xl:text-[2.9rem]" style={{ color: "#fff" }}>
              Carry your health, not your paperwork.
            </h1>
          </div>
          <AuthArt />
        </div>

        <p className="relative z-10 max-w-md text-xs leading-relaxed text-white/60">
          HealthMate AI provides patient record navigation and doctor preparation. It does not provide medical diagnosis or prescribing. Demo data is synthetic.
        </p>
      </aside>

      {/* Form side */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
        <div aria-hidden className="lp-dots absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div aria-hidden className="lp-aurora absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(67,181,143,0.35),transparent_65%)] blur-2xl lg:hidden" />

        <a href="/" className="relative mb-6 flex items-center gap-2 text-[#053f44] lg:hidden" aria-label="HealthMate AI home">
          <LogoMark size={36} />
          <span className="font-display text-xl font-extrabold">HealthMate AI</span>
        </a>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[440px] space-y-6 rounded-3xl border border-white bg-white/90 p-7 shadow-[0_40px_80px_-40px_rgba(5,63,68,0.55),0_2px_6px_rgba(5,63,68,0.06)] backdrop-blur sm:p-9"
        >
          <div className="space-y-1.5 text-left">
            <h2 className="font-display text-2xl font-extrabold text-[#053f44]">{title}</h2>
            {subtitle && <p className="text-sm text-[var(--muted)]">{subtitle}</p>}
          </div>

          {children}

          {footer && <div className="border-t border-[var(--border)] pt-4 text-center text-xs text-[var(--muted)]">{footer}</div>}
        </motion.div>

        <div className="relative mt-6 flex items-center gap-4 text-xs text-[#6f858c]">
          <a href="/" className="inline-flex items-center gap-1.5 font-semibold hover:text-[#053f44]">
            <ArrowLeft size={13} /> Back to home
          </a>
          <span className="inline-flex items-center gap-1.5">
            <Lock size={12} /> Your records stay private
          </span>
        </div>
      </main>
    </div>
  );
}
