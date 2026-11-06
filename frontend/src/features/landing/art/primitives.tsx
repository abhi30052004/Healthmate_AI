import React, { useId } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

/** Fade/slide a block in once when it scrolls into view. Renders instantly for reduced motion. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className = "",
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  );
}

/** Pointer position normalised to -1..1 across an element, smoothed with a spring. */
export function usePointerParallax() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 70, damping: 16, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 70, damping: 16, mass: 0.6 });
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    y.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const onPointerLeave = () => {
    x.set(0);
    y.set(0);
  };
  return { x: sx, y: sy, onPointerMove, onPointerLeave };
}

/** A layer that drifts opposite the pointer; larger `depth` = closer to the viewer. */
export function ParallaxLayer({
  px,
  py,
  depth,
  className = "",
  style,
  children,
}: {
  px: MotionValue<number>;
  py: MotionValue<number>;
  depth: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const tx = useTransform(px, (v) => (reduce ? 0 : v * depth));
  const ty = useTransform(py, (v) => (reduce ? 0 : v * depth));
  return (
    <motion.div className={className} style={{ ...style, x: tx, y: ty }}>
      {children}
    </motion.div>
  );
}

/** HealthMate logo mark: a rounded tile with a heart whose centre is a pulse line. */
export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  // Unique per instance: a gradient defined inside a display:none SVG cannot be referenced by others.
  const gid = `lm-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0aa39a" />
          <stop offset="1" stopColor="#053f44" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${gid})`} />
      <path
        d="M20 31.2 9.6 20.9a6.1 6.1 0 0 1 8.6-8.6l1.8 1.8 1.8-1.8a6.1 6.1 0 0 1 8.6 8.6L20 31.2Z"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 21h5.2l2-4.6 3.2 8.2 2.2-5.2 1.1 1.6h5.3"
        fill="none"
        stroke="#9ff0d2"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Heartbeat line that continuously "draws" a bright pulse across a faint baseline. */
export function EcgLine({
  className = "",
  color = "#2e9b79",
  width = 240,
  height = 60,
}: {
  className?: string;
  color?: string;
  width?: number;
  height?: number;
}) {
  const d = "M0 30 H38 l6 -5 l6 5 H66 l5 4 l8 -28 l8 38 l6 -14 H124 l9 -7 l9 7 H178 l5 -3 l5 3 H240";
  return (
    <svg viewBox="0 0 240 60" width={width} height={height} className={className} aria-hidden="true" fill="none" preserveAspectRatio="none">
      <path d={d} stroke={color} strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={d}
        pathLength={1}
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lp-ecg"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

/** Small round icon bubble used for floating decoration. */
export function Bubble({
  children,
  tone = "emerald",
  size = 44,
  className = "",
}: {
  children: React.ReactNode;
  tone?: "emerald" | "coral" | "amber" | "sky" | "violet" | "teal";
  size?: number;
  className?: string;
}) {
  const bg: Record<string, string> = {
    emerald: "linear-gradient(135deg,#43b58f,#2e9b79)",
    coral: "linear-gradient(135deg,#ff9b7e,#ff6a45)",
    amber: "linear-gradient(135deg,#ffd27a,#f2a72a)",
    sky: "linear-gradient(135deg,#7db0ff,#4c8dff)",
    violet: "linear-gradient(135deg,#a79bff,#7c6cff)",
    teal: "linear-gradient(135deg,#19b0a8,#087a83)",
  };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-8px_rgba(5,63,68,0.5)] ${className}`}
      style={{ width: size, height: size, background: bg[tone] }}
    >
      {children}
    </span>
  );
}

/** Section heading block shared by every landing section. */
export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
  dark = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
  align?: "center" | "left";
  dark?: boolean;
}) {
  return (
    <div className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <span
        className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] ${
          dark ? "text-[#9ff0d2]" : "text-[var(--lp-teal)]"
        }`}
      >
        <span className={`h-0.5 w-6 rounded ${dark ? "bg-[#9ff0d2]/70" : "bg-[#087a83]/70"}`} />
        {eyebrow}
      </span>
      <h2
        className={`mt-3 font-display text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold leading-[1.14] tracking-[-0.01em] [text-wrap:balance] ${
          dark ? "text-white" : "text-[var(--lp-ink)]"
        }`}
        style={{ color: dark ? "#fff" : undefined }}
      >
        {title}
      </h2>
      {body && <p className={`mt-4 text-base sm:text-lg leading-relaxed ${dark ? "text-white/70" : "text-[#4c6168]"}`}>{body}</p>}
    </div>
  );
}
