import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, FileSearch, Pill, Send, Sparkles, Table as TableIcon } from "lucide-react";
import { Bubble } from "./primitives";

/* ------------------------------------------------------------------ 1. Scan -> extract */

const SCAN_ROWS = [
  { n: "Hemoglobin", v: "13.2", u: "g/dL", r: "13.5 – 17.5", low: true },
  { n: "WBC", v: "6.8", u: "10³/µL", r: "4.0 – 11.0", low: false },
  { n: "Platelets", v: "245", u: "10³/µL", r: "150 – 450", low: false },
  { n: "Hematocrit", v: "40.1", u: "%", r: "41 – 53", low: true },
];

export function ScanDemo() {
  return (
    <div className="grid items-center gap-5 sm:grid-cols-[1.05fr_1fr]" data-testid="scan-demo">
      {/* the paper report */}
      <div className="relative mx-auto w-full max-w-[320px] -rotate-2">
        <div aria-hidden className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-[#43b58f]/25 to-[#4c8dff]/20 blur-xl" />
        <div className="relative overflow-hidden rounded-2xl border border-[#0b2b30]/10 bg-white p-4 shadow-[0_30px_60px_-28px_rgba(5,63,68,0.55)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#4c8dff] to-[#7c6cff]" />
              <div>
                <span className="block h-2 w-20 rounded bg-[#0b2b30]/70" />
                <span className="mt-1 block h-1.5 w-14 rounded bg-[#0b2b30]/20" />
              </div>
            </div>
            <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-wider text-[#8aa0a6]">Blood count</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[8px] text-[#8aa0a6]">
            <span className="h-1.5 rounded bg-[#0b2b30]/10" />
            <span className="h-1.5 rounded bg-[#0b2b30]/10" />
          </div>
          <div className="mt-3 divide-y divide-[#0b2b30]/8 rounded-lg border border-[#0b2b30]/8">
            {SCAN_ROWS.map((r) => (
              <div key={r.n} className="grid grid-cols-[1.3fr_1fr_1fr] items-center px-2.5 py-2 text-[10px]">
                <span className="font-semibold text-[#0b2b30]">{r.n}</span>
                <span className={`tabular-nums font-bold ${r.low ? "text-[#c46a00]" : "text-[#0b2b30]"}`}>
                  {r.v} <span className="font-normal text-[#8aa0a6]">{r.u}</span>
                </span>
                <span className="tabular-nums text-[#8aa0a6]">{r.r}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1.5">
            <span className="block h-1.5 w-full rounded bg-[#0b2b30]/8" />
            <span className="block h-1.5 w-5/6 rounded bg-[#0b2b30]/8" />
            <span className="block h-1.5 w-2/3 rounded bg-[#0b2b30]/8" />
          </div>
          {/* scan beam */}
          <span aria-hidden className="lp-scan absolute inset-x-0 h-12 -translate-y-1/2 bg-gradient-to-b from-transparent via-[#43b58f]/35 to-transparent">
            <span className="absolute inset-x-0 top-1/2 h-0.5 bg-[#2e9b79] shadow-[0_0_14px_3px_rgba(46,155,121,0.7)]" />
          </span>
        </div>
      </div>

      {/* extracted values */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#087a83]">
          <FileSearch size={13} /> Read from the report
        </p>
        {SCAN_ROWS.map((r, i) => (
          <div
            key={r.n}
            className="lp-chip flex items-center justify-between rounded-xl border border-[#0b2b30]/8 bg-white px-3 py-2 shadow-[0_8px_18px_-12px_rgba(5,63,68,0.5)]"
            style={{ animationDelay: `${1 + i * 0.8}s` }}
          >
            <div>
              <p className="text-xs font-bold text-[#0b2b30]">{r.n}</p>
              <p className="text-[10px] text-[#8aa0a6]">Printed range {r.r}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-extrabold tabular-nums text-[#0b2b30]">
                {r.v} <span className="text-[10px] font-medium text-[#8aa0a6]">{r.u}</span>
              </p>
              <span className={`inline-block rounded-full px-1.5 py-px text-[9px] font-bold ${r.low ? "bg-[#fff1cf] text-[#9a6a00]" : "bg-[#e6f6f0] text-[#087a83]"}`}>
                {r.low ? "Below range" : "In range"}
              </span>
            </div>
          </div>
        ))}
        <div className="lp-chip flex items-center gap-2 rounded-xl bg-[#053f44] px-3 py-2 text-xs font-semibold text-white" style={{ animationDelay: "4.4s" }}>
          <Check size={14} className="text-[#9ff0d2]" /> You review and verify before anything is trusted
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 2. Trend chart */

type Pt = { l: string; v: number };
const TRENDS: Record<"3M" | "6M" | "1Y", Pt[]> = {
  "3M": [
    { l: "Aug 12", v: 131 }, { l: "Aug 26", v: 128 }, { l: "Sep 9", v: 127 }, { l: "Sep 23", v: 124 },
    { l: "Oct 7", v: 122 }, { l: "Oct 21", v: 120 }, { l: "Nov 4", v: 118 },
  ],
  "6M": [
    { l: "Jun", v: 142 }, { l: "Jul", v: 136 }, { l: "Aug", v: 131 }, { l: "Sep", v: 125 }, { l: "Oct", v: 121 }, { l: "Nov", v: 118 },
  ],
  "1Y": [
    { l: "Dec", v: 148 }, { l: "Feb", v: 146 }, { l: "Apr", v: 144 }, { l: "Jun", v: 142 }, { l: "Aug", v: 131 }, { l: "Sep", v: 125 }, { l: "Oct", v: 121 }, { l: "Nov", v: 118 },
  ],
};

const W = 560;
const H = 250;
const PAD = { l: 38, r: 16, t: 18, b: 30 };
const Y_MIN = 100;
const Y_MAX = 150;

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function TrendDemo() {
  const [range, setRange] = useState<"3M" | "6M" | "1Y">("6M");
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const data = TRENDS[range];

  const pts = useMemo(
    () =>
      data.map((p, i) => ({
        x: PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r),
        y: PAD.t + (1 - (p.v - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD.t - PAD.b),
      })),
    [data]
  );
  const line = smoothPath(pts);
  const area = `${line} L${pts[pts.length - 1].x},${H - PAD.b} L${pts[0].x},${H - PAD.b} Z`;
  const yOf = (v: number) => PAD.t + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD.t - PAD.b);
  const active = hover ?? data.length - 1;
  const first = data[0].v;
  const last = data[data.length - 1].v;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(p.x - px) < Math.abs(pts[best].x - px)) best = i;
    });
    setHover(best);
  };

  return (
    <div className="rounded-3xl border border-[#0b2b30]/8 bg-white p-4 shadow-[0_30px_60px_-34px_rgba(5,63,68,0.5)] sm:p-6" data-testid="trend-demo">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#4c6168]">Systolic blood pressure · sample data</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-4xl font-extrabold tabular-nums text-[#0b2b30]">{data[active].v}</span>
            <span className="text-sm font-medium text-[#8aa0a6]">mmHg · {data[active].l}</span>
          </p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#e6f6f0] px-2 py-0.5 text-xs font-bold text-[#087a83]">
            ↓ {first - last} mmHg over this period
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Chart range" className="inline-flex rounded-xl bg-[#eef8f4] p-1">
            {(["3M", "6M", "1Y"] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => {
                  setRange(r);
                  setHover(null);
                }}
                className={`min-h-[32px] rounded-lg px-3 text-xs font-bold transition-colors ${range === r ? "bg-white text-[#053f44] shadow" : "text-[#4c6168] hover:text-[#053f44]"}`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
            aria-label="Show chart data as a table"
            className="inline-flex min-h-[32px] items-center gap-1 rounded-xl border border-[#0b2b30]/10 px-2.5 text-xs font-semibold text-[#4c6168] hover:bg-[#eef8f4]"
          >
            <TableIcon size={13} /> Table
          </button>
        </div>
      </div>

      {asTable ? (
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-[#8aa0a6]">
              <th className="py-1 font-semibold">Date</th>
              <th className="py-1 font-semibold">Systolic (mmHg)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.l} className="border-t border-[#0b2b30]/8">
                <td className="py-1.5">{p.l}</td>
                <td className="py-1.5 font-bold tabular-nums">{p.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative mt-3">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={`Line chart of systolic blood pressure falling from ${first} to ${last} mmHg`}
          >
            <defs>
              <linearGradient id="tr-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2e9b79" stopOpacity="0.34" />
                <stop offset="1" stopColor="#2e9b79" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="tr-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#4c8dff" />
                <stop offset="1" stopColor="#2e9b79" />
              </linearGradient>
            </defs>
            {[100, 110, 120, 130, 140, 150].map((g) => (
              <g key={g}>
                <line x1={PAD.l} x2={W - PAD.r} y1={yOf(g)} y2={yOf(g)} stroke="#0b2b30" strokeOpacity="0.07" />
                <text x={PAD.l - 8} y={yOf(g) + 3} textAnchor="end" fontSize="10" fill="#8aa0a6">{g}</text>
              </g>
            ))}
            {/* printed reference band 100-120 */}
            <rect x={PAD.l} y={yOf(120)} width={W - PAD.l - PAD.r} height={yOf(100) - yOf(120)} fill="#43b58f" opacity="0.12" />
            <text x={PAD.l + 8} y={yOf(100) - 7} fontSize="9.5" fontWeight="700" fill="#087a83">Printed reference 100–120</text>

            <motion.path key={`a-${range}`} d={area} fill="url(#tr-area)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} />
            <motion.path
              key={`l-${range}`}
              d={line}
              fill="none"
              stroke="url(#tr-line)"
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
            {hover !== null && <line x1={pts[hover].x} x2={pts[hover].x} y1={PAD.t} y2={H - PAD.b} stroke="#087a83" strokeOpacity="0.35" strokeDasharray="3 4" />}
            {pts.map((p, i) => (
              <g key={i}>
                {i === active && <circle cx={p.x} cy={p.y} r="11" fill="#2e9b79" opacity="0.18" />}
                <circle cx={p.x} cy={p.y} r={i === active ? 5.5 : 3.5} fill="#fff" stroke="#087a83" strokeWidth="2.5" />
              </g>
            ))}
            {pts.map((p, i) =>
              i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
                <text key={`x${i}`} x={p.x} y={H - 9} textAnchor="middle" fontSize="10" fill="#8aa0a6">{data[i].l}</text>
              ) : null
            )}
          </svg>
        </div>
      )}
      <p className="mt-2 text-[11px] text-[#8aa0a6]">Every point links back to the page of the report it came from. Sample data for illustration.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ 3. Doses */

type Dose = { t: string; n: string; note: string; taken: boolean };
const INITIAL_DOSES: Dose[] = [
  { t: "8:00 AM", n: "Metformin 500 mg", note: "With breakfast", taken: true },
  { t: "1:30 PM", n: "Vitamin D3", note: "After lunch", taken: false },
  { t: "9:00 PM", n: "Metformin 500 mg", note: "After dinner", taken: false },
  { t: "10:00 PM", n: "Amlodipine 5 mg", note: "Bedtime", taken: false },
];

export function DoseDemo() {
  const [doses, setDoses] = useState(INITIAL_DOSES);
  const taken = doses.filter((d) => d.taken).length;
  const pct = taken / doses.length;
  const r = 52;
  const c = 2 * Math.PI * r;
  const week = ["M", "T", "W", "T", "F", "S", "S"];
  const weekState = ["done", "done", "done", "done", "part", "now", "next"];

  return (
    <div className="grid gap-5 rounded-3xl border border-[#0b2b30]/8 bg-white p-4 shadow-[0_30px_60px_-34px_rgba(5,63,68,0.5)] sm:grid-cols-[auto_1fr] sm:p-6" data-testid="dose-demo">
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
            <defs>
              <linearGradient id="dose-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#43b58f" />
                <stop offset="1" stopColor="#4c8dff" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r={r} fill="none" stroke="#0b2b30" strokeOpacity="0.07" strokeWidth="12" />
            <motion.circle
              cx="64"
              cy="64"
              r={r}
              fill="none"
              stroke="url(#dose-g)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={c}
              animate={{ strokeDashoffset: c * (1 - pct) }}
              initial={{ strokeDashoffset: c }}
              transition={{ type: "spring", stiffness: 60, damping: 14 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-extrabold tabular-nums text-[#0b2b30]">{taken}/{doses.length}</span>
            <span className="text-[11px] font-semibold text-[#4c6168]">doses today</span>
          </div>
        </div>
        <div className="flex gap-1.5" aria-label="This week">
          {week.map((d, i) => (
            <span key={i} className="flex flex-col items-center gap-1 text-[9px] font-bold text-[#8aa0a6]">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  weekState[i] === "done" ? "bg-[#2e9b79] text-white" : weekState[i] === "part" ? "bg-[#f6b64a] text-white" : weekState[i] === "now" ? "bg-[#0b2b30] text-white" : "bg-[#0b2b30]/8"
                }`}
              >
                {weekState[i] === "done" ? <Check size={12} strokeWidth={3} /> : weekState[i] === "part" ? "–" : ""}
              </span>
              {d}
            </span>
          ))}
        </div>
      </div>

      <ul className="space-y-2" aria-label="Today's doses">
        {doses.map((d, i) => (
          <li key={i}>
            <button
              type="button"
              aria-pressed={d.taken}
              onClick={() => setDoses((all) => all.map((x, j) => (j === i ? { ...x, taken: !x.taken } : x)))}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                d.taken ? "border-[#2e9b79]/30 bg-[#eef8f4]" : "border-[#0b2b30]/10 bg-white hover:border-[#2e9b79]/50 hover:shadow-md"
              }`}
            >
              <Bubble tone={d.taken ? "emerald" : "amber"} size={38}>
                <Pill size={17} />
              </Bubble>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-bold ${d.taken ? "text-[#4c6168] line-through decoration-[#2e9b79]/60" : "text-[#0b2b30]"}`}>{d.n}</span>
                <span className="block text-xs text-[#4c6168]">{d.t} · {d.note}</span>
              </span>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${d.taken ? "border-[#2e9b79] bg-[#2e9b79] text-white" : "border-[#0b2b30]/20 text-transparent"}`}>
                <Check size={14} strokeWidth={3} />
              </span>
            </button>
          </li>
        ))}
        <li className="px-1 text-[11px] text-[#8aa0a6]">Tap a dose to try it. Sample schedule for illustration.</li>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ 4. Assistant */

const CONVOS = [
  {
    q: "What was my latest HbA1c?",
    a: "Your latest HbA1c was 6.8 % on 12 Sep [S1], down from 7.4 % in June [S2]. The printed range on your report is 4.0–5.6 %. Please talk to your doctor about what this means for you.",
    src: [["S1", "lab_sep.pdf", "page 1 · 12 Sep"], ["S2", "lab_jun.pdf", "page 2 · 14 Jun"]],
  },
  {
    q: "Which reports mention cholesterol?",
    a: "Two reports include a lipid panel: lipid_mar.pdf [S1] and annual_check.pdf [S2]. LDL was 131 mg/dL in March and 118 mg/dL in your annual check.",
    src: [["S1", "lipid_mar.pdf", "page 1 · 10 Mar"], ["S2", "annual_check.pdf", "page 3 · 2 Oct"]],
  },
  {
    q: "What should I ask my doctor?",
    a: "From your records: ask whether the lower hemoglobin (13.2 g/dL, below the printed 13.5) [S1] needs a repeat test, and if the HbA1c trend changes your follow-up plan.",
    src: [["S1", "cbc_jan.pdf", "page 1 · 15 Jan"]],
  },
];

export function AssistantDemo() {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [n, setN] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const convo = CONVOS[idx];
  const done = reduce || n >= convo.a.length;

  useEffect(() => {
    if (reduce) return;
    setN(0);
    timer.current = setInterval(() => setN((v) => v + 2), 22);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [idx, reduce]);

  useEffect(() => {
    if (reduce || paused || n < convo.a.length) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % CONVOS.length), 5200);
    return () => clearTimeout(t);
  }, [n, paused, reduce, convo.a.length]);

  const shown = done ? convo.a : convo.a.slice(0, n);
  const parts = shown.split(/(\[S\d\])/g);

  return (
    <div className="rounded-3xl border border-[#0b2b30]/8 bg-white shadow-[0_30px_60px_-34px_rgba(5,63,68,0.5)]" data-testid="assistant-demo">
      <div className="flex items-center gap-2 border-b border-[#0b2b30]/8 px-5 py-3">
        <Bubble tone="violet" size={30}>
          <Sparkles size={15} />
        </Bubble>
        <div>
          <p className="text-sm font-bold text-[#0b2b30]">Ask your records</p>
          <p className="text-[11px] text-[#4c6168]">Answers only from your uploaded reports</p>
        </div>
      </div>

      <div className="min-h-[260px] space-y-3 px-5 py-4">
        <div className="flex justify-end">
          <AnimatePresence mode="wait">
            <motion.p
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#087a83] to-[#053f44] px-4 py-2.5 text-sm font-medium text-white"
            >
              {convo.q}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex items-start gap-2">
          <Bubble tone="violet" size={26} className="mt-0.5 shrink-0">
            <Sparkles size={12} />
          </Bubble>
          <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-[#f3f1ff] px-4 py-3 text-sm leading-relaxed text-[#0b2b30]" aria-live="polite">
            {n === 0 && !reduce ? (
              <span className="inline-flex gap-1" aria-label="Typing">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="lp-blink h-1.5 w-1.5 rounded-full bg-[#7c6cff]" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </span>
            ) : (
              parts.map((p, i) =>
                /^\[S\d\]$/.test(p) ? (
                  <span key={i} className="mx-0.5 rounded bg-[#e2ddff] px-1 py-px align-baseline text-[10px] font-extrabold text-[#5b4de0]">
                    {p.slice(1, -1)}
                  </span>
                ) : (
                  <React.Fragment key={i}>{p}</React.Fragment>
                )
              )
            )}
          </div>
        </div>
        <AnimatePresence>
          {done && (
            <motion.ul
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="ml-9 flex flex-wrap gap-2"
              aria-label="Sources"
            >
              {convo.src.map(([id, file, where]) => (
                <li key={id} className="flex items-center gap-1.5 rounded-lg border border-[#0b2b30]/10 bg-white px-2 py-1 text-[10px] text-[#4c6168]">
                  <span className="rounded bg-[#e2ddff] px-1 font-extrabold text-[#5b4de0]">{id}</span>
                  <b className="text-[#0b2b30]">{file}</b> · {where}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-[#0b2b30]/8 px-5 py-3">
        <div className="flex flex-wrap gap-2">
          {CONVOS.map((c, i) => (
            <button
              key={c.q}
              type="button"
              onClick={() => {
                setPaused(true);
                setIdx(i);
              }}
              aria-pressed={i === idx}
              className={`min-h-[32px] rounded-full border px-3 text-xs font-semibold transition-colors ${i === idx ? "border-[#7c6cff] bg-[#f3f1ff] text-[#5b4de0]" : "border-[#0b2b30]/12 text-[#4c6168] hover:border-[#7c6cff]/50"}`}
            >
              {c.q}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f5f8f8] px-3 py-2 text-xs text-[#8aa0a6]">
          <span className="flex-1">Ask about your reports…</span>
          <Send size={14} />
        </div>
        <p className="mt-2 text-[11px] text-[#8aa0a6]">Explains your records. It never diagnoses or prescribes. Sample conversation.</p>
      </div>
    </div>
  );
}

