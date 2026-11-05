import React from "react";
import { HeartPulse, ShieldCheck, Pill, QrCode, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg)] text-[var(--text)]">
      {/* Brand Panel (Green on Desktop >=1024px) */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-mesh p-12 text-white flex-col justify-between relative overflow-hidden select-none">
        {/* Top Brand Mark */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <HeartPulse size={24} className="text-[var(--green-500)]" />
          </div>
          <div>
            <span className="font-display font-bold text-xl tracking-tight block">HealthMate AI</span>
            <span className="text-xs text-[var(--green-100)] opacity-80">Family Clinical Workspace</span>
          </div>
        </div>

        {/* Center Tagline & Floating Visual Health Cards */}
        <div className="my-auto py-12 z-10 space-y-8 max-w-lg">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-[var(--green-100)] border border-white/15">
              <ShieldCheck size={14} className="text-[var(--green-500)]" />
              <span>Private & Patient-Verified by Default</span>
            </span>
            <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight text-white">
              Carry your health, not your paperwork.
            </h1>
            <p className="text-sm text-white/80 leading-relaxed">
              Consolidate paper reports, laboratory results, prescriptions, and prepare structured appointment summaries for your clinician.
            </p>
          </div>

          {/* Three Floating Visual Cards (Trend, Dose, QR) with subtle hover float */}
          <div className="space-y-3 pt-2">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between shadow-2"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--green-800)] text-[var(--green-500)]">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Blood Pressure Longitudinal</p>
                  <p className="text-[11px] text-[var(--green-100)] opacity-80">120/80 mmHg · Verified normal</p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--green-800)] text-[var(--green-500)]">
                +4 mmHg (Stable)
              </span>
            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between shadow-2 ml-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--green-800)] text-[var(--green-500)]">
                  <Pill size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Today's Schedule: Metformin</p>
                  <p className="text-[11px] text-[var(--green-100)] opacity-80">500mg with breakfast · Confirmed</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--green-600)] text-white">
                Taken
              </span>
            </motion.div>

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between shadow-2"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--green-800)] text-[var(--green-500)]">
                  <QrCode size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Doctor Visit QR Code</p>
                  <p className="text-[11px] text-[var(--green-100)] opacity-80">Expiring in 24h · Read-only</p>
                </div>
              </div>
              <span className="text-[11px] text-white/70">PIN Protected</span>
            </motion.div>
          </div>
        </div>

        {/* Safety Note Footer */}
        <div className="z-10 text-xs text-white/70 border-t border-white/10 pt-4">
          HealthMate AI provides patient record navigation and doctor preparation. It does not provide medical diagnosis or prescribing. Demo data is synthetic.
        </div>
      </div>

      {/* Form Card Side (White, max-width 420px, Centered) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-16">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-2 mb-8 text-[var(--green-900)]">
          <HeartPulse size={24} className="text-[var(--green-700)]" />
          <span className="font-display font-bold text-xl">HealthMate AI</span>
        </div>

        <div className="w-full max-w-[420px] bg-white rounded-xl border border-[var(--border)] p-8 shadow-1 space-y-6">
          <div className="space-y-1.5 text-left">
            <h2 className="text-2xl font-display font-bold text-[var(--green-900)]">{title}</h2>
            {subtitle && <p className="text-xs text-[var(--muted)]">{subtitle}</p>}
          </div>

          {children}

          {footer && <div className="pt-4 border-t border-[var(--border)] text-center text-xs text-[var(--muted)]">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

