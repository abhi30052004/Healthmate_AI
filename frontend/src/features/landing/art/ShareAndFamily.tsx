import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Check, Eye, FileText, KeyRound, Lock, Pill, Plus, RotateCcw, ShieldCheck, Stethoscope, Timer } from "lucide-react";
import { Bubble } from "./primitives";

/* ------------------------------------------------------------------ People (flat illustrated avatars) */

type Look = { bg: [string, string]; skin: string; hair: string; style: "short" | "long" | "bun" | "grey" | "kid" };

export function Person({ look, size = 64 }: { look: Look; size?: number }) {
  const id = `pg-${look.hair.slice(1)}-${look.bg[0].slice(1)}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="rounded-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={look.bg[0]} />
          <stop offset="1" stopColor={look.bg[1]} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${id})`} />
      {look.style === "long" && <path d="M18 30c0-12 7-18 14-18s14 6 14 18v22H18Z" fill={look.hair} />}
      {look.style === "bun" && <circle cx="32" cy="12" r="7" fill={look.hair} />}
      <path d="M8 64c2-14 12-20 24-20s22 6 24 20Z" fill="#fff" opacity="0.92" />
      <path d="M24 46c2 4 5 6 8 6s6-2 8-6l-3-4H27Z" fill={look.skin} />
      <circle cx="32" cy="29" r="12" fill={look.skin} />
      {look.style === "short" && <path d="M20 28c0-9 5-14 12-14s12 5 12 14c-3-5-7-7-12-7s-9 2-12 7Z" fill={look.hair} />}
      {look.style === "bun" && <path d="M20 29c0-9 5-14 12-14s12 5 12 14c-4-4-8-6-12-6s-8 2-12 6Z" fill={look.hair} />}
      {look.style === "long" && <path d="M20 30c0-10 5-15 12-15s12 5 12 15c-3-5-7-8-12-8s-9 3-12 8Z" fill={look.hair} />}
      {look.style === "grey" && <path d="M21 26c1-8 5-12 11-12s10 4 11 12c-3-4-7-5-11-5s-8 1-11 5Z" fill={look.hair} />}
      {look.style === "kid" && <path d="M20 27c0-9 5-13 12-13s12 4 12 13c-4-2-6-5-12-5s-8 3-12 5Z" fill={look.hair} />}
      <circle cx="27.5" cy="30" r="1.3" fill="#0b2b30" />
      <circle cx="36.5" cy="30" r="1.3" fill="#0b2b30" />
      <path d="M28.5 35c1.2 1.4 5.8 1.4 7 0" stroke="#0b2b30" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const FAMILY = [
  { name: "Eva", rel: "You · 34", look: { bg: ["#7db0ff", "#4c8dff"], skin: "#f2c6a0", hair: "#2b1d16", style: "long" } as Look,
    chip: "Healthy routine", next: "Eye test · 18 Nov", mk: "HbA1c", mv: "6.8 %", meds: 1, records: 12 },
  { name: "Ravi", rel: "Father · 68", look: { bg: ["#ffd27a", "#f2a72a"], skin: "#d9a273", hair: "#cfd5d8", style: "grey" } as Look,
    chip: "Hypertension", next: "Cardiology · 21 Nov", mk: "BP", mv: "132/84", meds: 3, records: 31 },
  { name: "Meera", rel: "Mother · 64", look: { bg: ["#ff9b7e", "#ff6a45"], skin: "#d9a273", hair: "#3a2a22", style: "bun" } as Look,
    chip: "Type 2 diabetes", next: "Lab review · 25 Nov", mk: "Fasting", mv: "118", meds: 2, records: 24 },
  { name: "Anika", rel: "Daughter · 7", look: { bg: ["#a79bff", "#7c6cff"], skin: "#f2c6a0", hair: "#3a2a22", style: "kid" } as Look,
    chip: "Vaccine due", next: "Paediatric check · 3 Dec", mk: "Weight", mv: "21.4 kg", meds: 0, records: 8 },
];

export function FamilyDemo() {
  const [i, setI] = useState(1);
  const p = FAMILY[i];
  return (
    <div data-testid="family-demo" className="h-full">
      <div className="flex items-center gap-3" role="tablist" aria-label="Family members">
        {FAMILY.map((f, k) => (
          <button
            key={f.name}
            role="tab"
            aria-selected={k === i}
            aria-label={`${f.name}, ${f.rel}`}
            onClick={() => setI(k)}
            className={`relative rounded-full p-0.5 transition-all ${k === i ? "scale-110 ring-[3px] ring-[#2e9b79] ring-offset-2" : "opacity-70 hover:opacity-100"}`}
          >
            <Person look={f.look} size={48} />
          </button>
        ))}
        <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-[#0b2b30]/20 text-[#8aa0a6]" aria-hidden="true">
          <Plus size={18} />
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={p.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mt-4 rounded-2xl bg-[#eef8f4] p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-xl font-extrabold text-[#0b2b30]">{p.name}</p>
              <p className="text-xs text-[#4c6168]">{p.rel}</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#087a83] shadow-sm">{p.chip}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              [p.records, "records"],
              [p.meds, "medicines"],
              [p.mv, p.mk],
            ].map(([v, l], k) => (
              <div key={k} className="rounded-xl bg-white p-2 shadow-[0_6px_14px_-10px_rgba(5,63,68,0.6)]">
                <p className="text-sm font-extrabold tabular-nums text-[#0b2b30]">{v}</p>
                <p className="text-[10px] font-semibold text-[#8aa0a6]">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#4c6168]">
            <CalendarDays size={13} className="text-[#087a83]" /> Next: {p.next}
          </p>
        </motion.div>
      </AnimatePresence>
      <p className="mt-2 text-[11px] text-[#8aa0a6]">Each profile keeps its own records, doses and visit pack. Sample family.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ QR share demo (dark section) */

export function QrShareDemo() {
  const [scope, setScope] = useState({ pack: true, meds: true, appts: false });
  const [days, setDays] = useState(7);
  const [revoked, setRevoked] = useState(false);
  const rows: { key: keyof typeof scope; icon: React.ReactNode; label: string }[] = [
    { key: "pack", icon: <FileText size={14} />, label: "Visit pack (summary PDF)" },
    { key: "meds", icon: <Pill size={14} />, label: "Current medicines" },
    { key: "appts", icon: <CalendarDays size={14} />, label: "Upcoming appointments" },
  ];

  return (
    <div className="grid items-stretch gap-5 md:grid-cols-2" data-testid="qr-demo">
      <div className="lp-glass-dark rounded-3xl p-5 text-white">
        <p className="flex items-center gap-2 text-sm font-bold"><Stethoscope size={16} className="text-[#9ff0d2]" /> Choose what the doctor can see</p>
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                role="switch"
                aria-checked={scope[r.key]}
                onClick={() => setScope((s) => ({ ...s, [r.key]: !s[r.key] }))}
                className="flex w-full items-center gap-3 rounded-xl bg-white/6 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/10"
              >
                <span className="text-[#9ff0d2]">{r.icon}</span>
                <span className="flex-1">{r.label}</span>
                <span className={`relative h-5 w-9 rounded-full transition-colors ${scope[r.key] ? "bg-[#2e9b79]" : "bg-white/20"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${scope[r.key] ? "left-[18px]" : "left-0.5"}`} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center gap-2 text-sm font-bold"><Timer size={16} className="text-[#9ff0d2]" /> Link works for</p>
        <div className="mt-2 flex gap-2" role="group" aria-label="Link duration">
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={`min-h-[36px] flex-1 rounded-xl text-sm font-bold transition-colors ${days === d ? "bg-white text-[#053f44]" : "bg-white/8 text-white/80 hover:bg-white/14"}`}
            >
              {d === 1 ? "1 day" : `${d} days`}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-black/20 p-3 text-xs text-white/75">
          <p className="mb-1 font-bold text-white">The doctor sees (read-only):</p>
          <ul className="space-y-0.5">
            <li className="flex items-center gap-1.5"><Check size={12} className="text-[#9ff0d2]" /> Selected reports and verified values</li>
            {scope.pack && <li className="flex items-center gap-1.5"><Check size={12} className="text-[#9ff0d2]" /> Visit pack PDF</li>}
            {scope.meds && <li className="flex items-center gap-1.5"><Check size={12} className="text-[#9ff0d2]" /> Current medicines</li>}
            {scope.appts && <li className="flex items-center gap-1.5"><Check size={12} className="text-[#9ff0d2]" /> Upcoming appointments</li>}
            <li className="flex items-center gap-1.5 text-white/50"><Lock size={12} /> Never your chat history, password or other profiles</li>
          </ul>
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center rounded-3xl bg-white p-6 text-[#0b2b30] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
        <div className="relative rounded-2xl border border-[#0b2b30]/10 bg-white p-4">
          {!revoked && <span aria-hidden className="lp-ring absolute inset-0 m-auto h-40 w-40 rounded-full border-2 border-[#2e9b79]/40" />}
          <div className={`transition-all duration-500 ${revoked ? "scale-95 opacity-30 blur-[3px]" : ""}`}>
            <QRCodeSVG value={`https://healthmate.example/s/sample-${days}d${scope.pack ? "p" : ""}${scope.meds ? "m" : ""}${scope.appts ? "a" : ""}`} size={168} fgColor="#053f44" bgColor="#ffffff" level="M" />
          </div>
          {!revoked && <span aria-hidden className="lp-scan absolute inset-x-3 h-0.5 rounded bg-[#2e9b79] shadow-[0_0_12px_3px_rgba(46,155,121,0.6)]" />}
          {revoked && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-sm font-bold text-[#b42332]">
              <Lock size={22} /> Link revoked
            </span>
          )}
        </div>
        <p className="mt-4 text-center font-display text-lg font-extrabold">
          {revoked ? "Nobody can open it now" : `Expires in ${days === 1 ? "24 hours" : `${days} days`}`}
        </p>
        <p className="mt-1 text-center text-xs text-[#4c6168]">
          {revoked ? "A scan shows a plain “not available” page." : "Doctor scans it. No app, no login. Every open is logged."}
        </p>
        <button
          type="button"
          onClick={() => setRevoked((v) => !v)}
          className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#0b2b30]/15 px-4 text-sm font-bold text-[#053f44] transition-colors hover:bg-[#eef8f4]"
        >
          {revoked ? <><RotateCcw size={15} /> Create a new link</> : <><Lock size={15} /> Revoke link</>}
        </button>
        <p className="mt-2 text-[11px] text-[#8aa0a6]">Interactive preview. Sample link only.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Privacy shield */

export function ShieldArt() {
  return (
    <div className="relative mx-auto h-[300px] w-[300px] max-w-full" role="img" aria-label="A shield with a lock surrounded by orbiting icons for files, keys and hidden data">
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden className="lp-ring absolute inset-0 m-auto h-1/2 w-1/2 rounded-full border border-[#9ff0d2]/50" style={{ animationDelay: `${i * 0.95}s` }} />
      ))}
      <div aria-hidden className="absolute inset-[8%] rounded-full border border-dashed border-white/20" style={{ animation: "lp-spin 40s linear infinite" }}>
        {[
          { a: 0, icon: <FileText size={16} />, tone: "sky" as const },
          { a: 120, icon: <KeyRound size={16} />, tone: "amber" as const },
          { a: 240, icon: <Eye size={16} />, tone: "violet" as const },
        ].map((o) => (
          <span key={o.a} className="absolute left-1/2 top-1/2" style={{ transform: `rotate(${o.a}deg)` }}>
            <span className="absolute" style={{ transform: "translate(-50%, -50%) translateY(-126px)" }}>
              <span style={{ display: "block", animation: "lp-spin-rev 40s linear infinite" }}>
                <Bubble tone={o.tone} size={40}>
                  {o.icon}
                </Bubble>
              </span>
            </span>
          </span>
        ))}
      </div>
      <svg viewBox="0 0 200 220" className="lp-float absolute inset-[22%] h-[56%] w-[56%] drop-shadow-[0_20px_30px_rgba(0,0,0,0.35)]" aria-hidden="true">
        <defs>
          <linearGradient id="sh-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5fe0b5" />
            <stop offset="1" stopColor="#087a83" />
          </linearGradient>
        </defs>
        <path d="M100 8 20 38v62c0 54 34 90 80 112 46-22 80-58 80-112V38Z" fill="url(#sh-g)" />
        <path d="M100 8 20 38v62c0 54 34 90 80 112V8Z" fill="#fff" opacity="0.14" />
        <rect x="68" y="92" width="64" height="54" rx="10" fill="#053f44" />
        <path d="M80 92V80a20 20 0 0 1 40 0v12" fill="none" stroke="#053f44" strokeWidth="9" strokeLinecap="round" />
        <circle cx="100" cy="115" r="7" fill="#9ff0d2" />
        <rect x="97" y="118" width="6" height="14" rx="3" fill="#9ff0d2" />
      </svg>
      <span className="absolute bottom-[10%] right-[10%] flex h-9 w-9 items-center justify-center rounded-full bg-[#2e9b79] text-white shadow-lg"><ShieldCheck size={18} /></span>
    </div>
  );
}

/* ------------------------------------------------------------------ Bento mini illustrations */

export function EmergencyMini() {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-[#053f44] to-[#087a83] p-4 text-white shadow-[0_20px_40px_-24px_rgba(5,63,68,0.8)]">
      <div className="flex items-center justify-between">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff6a45]">
          <span aria-hidden className="lp-ring absolute inset-0 rounded-xl bg-[#ff6a45]/60" />
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" fill="#fff" /></svg>
        </span>
        <span className="font-display text-3xl font-extrabold">B+</span>
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9ff0d2]">Allergies</p>
      <p className="text-sm font-semibold">Penicillin</p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#9ff0d2]">Emergency contact</p>
      <p className="text-sm font-semibold">Ravi · +91 90000 11111</p>
    </div>
  );
}

export function VisitPackMini() {
  return (
    <div className="relative mx-auto h-36 w-40" aria-hidden="true">
      {[
        { r: -10, x: -14, c: "#dff3ec" },
        { r: 6, x: 14, c: "#e6edff" },
        { r: 0, x: 0, c: "#ffffff" },
      ].map((s, i) => (
        <div key={i} className="absolute inset-x-3 top-0 h-32 rounded-xl border border-[#0b2b30]/10 p-3 shadow-md" style={{ background: s.c, transform: `translateX(${s.x}px) rotate(${s.r}deg)` }}>
          {i === 2 && (
            <>
              <span className="block h-2 w-16 rounded bg-[#087a83]" />
              <span className="mt-2 block h-1.5 w-full rounded bg-[#0b2b30]/10" />
              <span className="mt-1.5 block h-1.5 w-5/6 rounded bg-[#0b2b30]/10" />
              <span className="mt-3 flex items-end gap-1">
                {[14, 22, 18, 28, 24].map((h, k) => (
                  <span key={k} className="w-3 rounded-t bg-gradient-to-t from-[#43b58f] to-[#087a83]" style={{ height: h }} />
                ))}
              </span>
              <span className="absolute -right-2 -top-2 rounded-md bg-[#ff6a45] px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow">PDF</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function SymptomMini() {
  const days = [
    { d: "M", s: 0 }, { d: "T", s: 1 }, { d: "W", s: 2 }, { d: "T", s: 3 }, { d: "F", s: 1 }, { d: "S", s: 0 }, { d: "S", s: 1 },
  ];
  const col = ["#43b58f", "#f6b64a", "#ff9b4a", "#ff6a45"];
  return (
    <div aria-hidden="true">
      <div className="flex items-end justify-between gap-1.5 rounded-2xl bg-white p-3 shadow-[0_10px_24px_-16px_rgba(5,63,68,0.6)]">
        {days.map((x, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <motion.span
              className="w-full rounded-md"
              style={{ background: col[x.s], originY: 1 }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
            >
              <span className="block" style={{ height: 14 + x.s * 14 }} />
            </motion.span>
            <span className="text-[9px] font-bold text-[#8aa0a6]">{x.d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ApptMini() {
  const cells = Array.from({ length: 21 }, (_, i) => i + 10);
  return (
    <div aria-hidden="true" className="rounded-2xl bg-white p-3 shadow-[0_10px_24px_-16px_rgba(5,63,68,0.6)]">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#4c6168]">
        {cells.map((n) => (
          <span key={n} className={`rounded-md py-0.5 ${n === 21 ? "bg-[#087a83] font-extrabold text-white" : n === 25 ? "bg-[#fff1cf] text-[#9a6a00]" : ""}`}>
            {n}
          </span>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1 rounded-lg bg-[#eef8f4] px-2 py-1 text-[10px] font-bold text-[#087a83]">
        <Stethoscope size={11} /> Cardiology · 10:30
      </p>
    </div>
  );
}

export function LanguageMini() {
  const [lang, setLang] = useState(0);
  const [big, setBig] = useState(false);
  const L = [
    { k: "EN", hi: "Good morning", sub: "Take your 8:00 dose" },
    { k: "বাংলা", hi: "শুভ সকাল", sub: "সকাল ৮টার ওষুধ খান" },
    { k: "हिन्दी", hi: "सुप्रभात", sub: "सुबह 8 बजे की दवा लें" },
  ];
  return (
    <div className="rounded-2xl bg-white p-3 shadow-[0_10px_24px_-16px_rgba(5,63,68,0.6)]">
      <div className="flex items-center gap-1.5" role="group" aria-label="Language preview">
        {L.map((l, i) => (
          <button
            key={l.k}
            type="button"
            aria-pressed={i === lang}
            onClick={() => setLang(i)}
            className={`min-h-[30px] rounded-lg px-2.5 text-[11px] font-bold ${i === lang ? "bg-[#087a83] text-white" : "bg-[#eef8f4] text-[#087a83]"}`}
          >
            {l.k}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={big}
          aria-label="Simple mode (larger text)"
          onClick={() => setBig((b) => !b)}
          className={`ml-auto min-h-[30px] rounded-lg px-2 text-xs font-extrabold ${big ? "bg-[#f6b64a] text-white" : "bg-[#f5f8f8] text-[#4c6168]"}`}
        >
          Aa
        </button>
      </div>
      <p className={`mt-2 font-display font-extrabold text-[#0b2b30] transition-all ${big ? "text-2xl" : "text-lg"}`}>{L[lang].hi}</p>
      <p className={`text-[#4c6168] transition-all ${big ? "text-sm" : "text-xs"}`}>{L[lang].sub}</p>
    </div>
  );
}
