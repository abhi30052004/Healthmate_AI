import React, { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, useReducedMotion, useTransform } from "motion/react";
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  FileText,
  Heart,
  Home,
  MessageCircle,
  Pill,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { Bubble, EcgLine, ParallaxLayer, usePointerParallax } from "./primitives";

/** Mini progress ring used on the phone and floating cards. */
function Ring({ value, size = 44, stroke = 5, color = "#2e9b79", children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(11,43,48,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value) }}
          transition={{ duration: 1.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}

function PhoneScreen() {
  return (
    <div className="absolute inset-[7px] overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#f3fbf8] to-white">
      {/* status bar */}
      <div className="flex items-center justify-between px-5 pt-3 text-[9px] font-semibold text-[#0b2b30]/70">
        <span>9:41</span>
        <span className="absolute left-1/2 top-2 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-[#0b2b30]" />
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2e9b79]" />
          <span>5G</span>
        </span>
      </div>

      {/* greeting */}
      <div className="mt-5 flex items-center justify-between px-4">
        <div>
          <p className="text-[9px] font-medium text-[#4c6168]">Good morning</p>
          <p className="font-display text-[15px] font-extrabold leading-tight text-[#0b2b30]">Eva Sharma</p>
        </div>
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
          <Bell size={14} className="text-[#087a83]" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#ff6a45]" />
        </span>
      </div>

      {/* vitals card */}
      <div className="mx-3 mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#053f44] to-[#087a83] p-3 text-white shadow-[0_14px_28px_-12px_rgba(5,63,68,0.7)]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[#9ff0d2]">
            <Activity size={10} /> Heart rate
          </span>
          <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[8px] font-semibold">Sample data</span>
        </div>
        <div className="mt-1 flex items-end gap-1">
          <span className="font-display text-[26px] font-extrabold leading-none tabular-nums">72</span>
          <span className="pb-0.5 text-[9px] text-white/70">bpm · resting</span>
        </div>
        <EcgLine className="mt-1 h-9 w-full" color="#9ff0d2" />
      </div>

      {/* stat tiles */}
      <div className="mx-3 mt-2.5 grid grid-cols-3 gap-2">
        {[
          { l: "BP", v: "118/76", c: "#2e9b79" },
          { l: "HbA1c", v: "6.8%", c: "#4c8dff" },
          { l: "SpO₂", v: "98%", c: "#ff7a59" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-white p-2 shadow-[0_6px_14px_-8px_rgba(5,63,68,0.35)]">
            <p className="text-[8px] font-semibold text-[#4c6168]">{s.l}</p>
            <p className="font-display text-[11px] font-extrabold tabular-nums text-[#0b2b30]">{s.v}</p>
            <span className="mt-1 block h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${s.c}, ${s.c}22)` }} />
          </div>
        ))}
      </div>

      {/* next dose */}
      <div className="mx-3 mt-2.5 flex items-center gap-2 rounded-xl bg-white p-2.5 shadow-[0_6px_14px_-8px_rgba(5,63,68,0.35)]">
        <Bubble tone="amber" size={30}>
          <Pill size={14} />
        </Bubble>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold text-[#0b2b30]">Metformin 500 mg</p>
          <p className="text-[8px] text-[#4c6168]">With breakfast · 8:00 AM</p>
        </div>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2e9b79] text-white">
          <Check size={11} strokeWidth={3} />
        </span>
      </div>

      {/* next appointment */}
      <div className="mx-3 mt-2.5 flex items-center gap-2 rounded-xl bg-white p-2.5 shadow-[0_6px_14px_-8px_rgba(5,63,68,0.35)]">
        <Bubble tone="sky" size={30}>
          <CalendarDays size={14} />
        </Bubble>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold text-[#0b2b30]">Cardiology review</p>
          <p className="text-[8px] text-[#4c6168]">Tomorrow · 10:30 AM · 2 to prepare</p>
        </div>
        <span className="rounded-full bg-[#e6f6f0] px-1.5 py-0.5 text-[8px] font-bold text-[#087a83]">Pack ready</span>
      </div>

      {/* tab bar */}
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-around rounded-2xl bg-white/90 py-2 shadow-[0_8px_20px_-10px_rgba(5,63,68,0.5)] backdrop-blur">
        {[Home, FileText, CalendarDays, MessageCircle].map((Icon, i) => (
          <span key={i} className={`flex h-7 w-7 items-center justify-center rounded-xl ${i === 0 ? "bg-[#e6f6f0] text-[#087a83]" : "text-[#8aa0a6]"}`}>
            <Icon size={14} />
          </span>
        ))}
      </div>
    </div>
  );
}

const STAGE_W = 560;
const STAGE_H = 580;

export function HeroScene() {
  const { x, y, onPointerMove, onPointerLeave } = usePointerParallax();
  const reduce = useReducedMotion();
  const rotY = useTransform(x, (v) => (reduce ? 0 : v * 7));
  const rotX = useTransform(y, (v) => (reduce ? 0 : v * -5));

  // The artwork is drawn on a fixed 560x580 stage and scaled to the available width,
  // so it looks identical on a phone and on a desktop.
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / STAGE_W));
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={outer}
      className="relative mx-auto w-full max-w-[560px] select-none"
      style={{ height: STAGE_H * scale }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      data-testid="hero-scene"
      role="img"
      aria-label="Illustration of the HealthMate app on a phone with floating cards for a read lab report, a medicine reminder, a doctor QR link and an AI answer with a citation."
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
        {/* glow + orbit rings */}
        <div aria-hidden className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(67,181,143,0.45),rgba(8,122,131,0.12)_55%,transparent_70%)] blur-2xl" />
        <svg aria-hidden viewBox="0 0 600 600" className="lp-spin-slow absolute left-[-20px] top-[-10px] h-[600px] w-[600px]">
          <circle cx="300" cy="300" r="250" fill="none" stroke="#087a83" strokeOpacity="0.3" strokeDasharray="2 9" strokeWidth="2" strokeLinecap="round" />
          <circle cx="550" cy="300" r="7" fill="#2e9b79" />
          <circle cx="86" cy="190" r="5" fill="#4c8dff" />
        </svg>
        <svg aria-hidden viewBox="0 0 600 600" className="lp-spin-rev absolute left-[-20px] top-[-10px] h-[600px] w-[600px]">
          <circle cx="300" cy="300" r="205" fill="none" stroke="#2e9b79" strokeOpacity="0.32" strokeDasharray="1 14" strokeWidth="3" strokeLinecap="round" />
          <circle cx="300" cy="95" r="6" fill="#ff7a59" />
          <circle cx="478" cy="402" r="5" fill="#f6b64a" />
        </svg>

        {/* phone (outer div centres it; the parallax layer inside only drifts) */}
        <div className="absolute top-[22px] w-[262px]" style={{ left: (STAGE_W - 262) / 2 }}>
          <ParallaxLayer px={x} py={y} depth={6}>
            <motion.div style={{ rotateY: rotY, rotateX: rotX, transformPerspective: 900 }} className="lp-float-slow">
              <div className="relative aspect-[9/18.4] w-full rounded-[2.4rem] bg-gradient-to-b from-[#16393e] to-[#061c1f] p-[3px] shadow-[0_40px_80px_-24px_rgba(5,63,68,0.75),0_0_0_1px_rgba(255,255,255,0.1)_inset]">
                <PhoneScreen />
                <span aria-hidden className="absolute -right-[3px] top-[22%] h-12 w-[3px] rounded-r bg-[#16393e]" />
              </div>
            </motion.div>
          </ParallaxLayer>
        </div>

        {/* floating card: report read */}
        <ParallaxLayer px={x} py={y} depth={-16} className="absolute left-[-22px] top-[92px] w-[186px]">
          <div className="lp-float lp-glass rounded-2xl p-3">
            <div className="flex items-center gap-2">
              <Bubble tone="teal" size={30}>
                <FileText size={15} />
              </Bubble>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-[#0b2b30]">cbc_jan.pdf read</p>
                <p className="text-[9px] text-[#4c6168]">4 values found · review</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0b2b30]/10">
              <motion.span
                className="block h-full rounded-full bg-gradient-to-r from-[#43b58f] to-[#087a83]"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.8, delay: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="mt-2 flex gap-1">
              {["Hb 13.2", "WBC 6.8", "Plt 245"].map((c) => (
                <span key={c} className="rounded-md bg-[#e6f6f0] px-1.5 py-0.5 text-[8px] font-bold text-[#087a83]">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </ParallaxLayer>

        {/* floating card: QR */}
        <ParallaxLayer px={x} py={y} depth={-22} className="absolute right-[-26px] top-[150px] w-[158px]">
          <div className="lp-float-alt lp-glass rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-[#0b2b30]">Doctor link</p>
              <span className="rounded-full bg-[#fff1cf] px-1.5 py-0.5 text-[8px] font-bold text-[#9a6a00]">23h left</span>
            </div>
            <div className="relative mt-2 flex justify-center rounded-xl bg-white p-2">
              <QRCodeSVG value="https://healthmate.example/s/sample-preview" size={84} fgColor="#053f44" bgColor="#ffffff" level="M" />
              <span aria-hidden className="lp-scan absolute inset-x-2 h-0.5 rounded bg-[#2e9b79] shadow-[0_0_10px_#2e9b79]" />
            </div>
            <p className="mt-1.5 text-center text-[8px] font-medium text-[#4c6168]">Read-only · revoke anytime</p>
          </div>
        </ParallaxLayer>

        {/* floating card: dose ring */}
        <ParallaxLayer px={x} py={y} depth={-12} className="absolute left-[-18px] top-[392px] w-[186px]">
          <div className="lp-float-slow lp-glass flex items-center gap-2.5 rounded-2xl p-3">
            <Ring value={0.86} size={46}>
              <Pill size={15} className="text-[#2e9b79]" />
            </Ring>
            <div>
              <p className="text-[11px] font-bold text-[#0b2b30]">86% on track</p>
              <p className="text-[9px] text-[#4c6168]">This week's doses</p>
            </div>
          </div>
        </ParallaxLayer>

        {/* floating card: AI */}
        <ParallaxLayer px={x} py={y} depth={-20} className="absolute right-[-24px] top-[408px] w-[206px]">
          <div className="lp-float lp-glass rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-[#6a5cf0]">
              <Sparkles size={11} /> Assistant
            </div>
            <p className="mt-1 text-[10px] leading-snug text-[#0b2b30]">
              Your HbA1c moved from <b>7.4</b> to <b className="inline-flex items-center gap-0.5 text-[#2e9b79]">6.8 <TrendingDown size={10} /></b>{" "}
              <span className="rounded bg-[#ece9ff] px-1 py-px text-[8px] font-bold text-[#6a5cf0]">S1</span>
            </p>
            <p className="mt-1 text-[8px] text-[#4c6168]">From your report, not a diagnosis.</p>
          </div>
        </ParallaxLayer>

        {/* decorative bubbles */}
        <ParallaxLayer px={x} py={y} depth={-30} className="absolute left-[128px] top-[2px]">
          <Bubble tone="coral" size={38} className="lp-float-alt"><Heart size={18} fill="currentColor" /></Bubble>
        </ParallaxLayer>
        <ParallaxLayer px={x} py={y} depth={-26} className="absolute left-[388px] top-[26px]">
          <Bubble tone="violet" size={34} className="lp-float"><Sparkles size={16} /></Bubble>
        </ParallaxLayer>
        <ParallaxLayer px={x} py={y} depth={-18} className="absolute left-[262px] top-[536px]">
          <Bubble tone="emerald" size={36} className="lp-float-alt"><ShieldCheck size={17} /></Bubble>
        </ParallaxLayer>
      </div>
    </div>
  );
}
