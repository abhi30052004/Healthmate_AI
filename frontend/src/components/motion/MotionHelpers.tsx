import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp, stagger as staggerVariants, scaleIn, ease } from "./variants";

export function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedNumber({
  value,
  duration = 1.2,
  decimals = 0,
  unit = "",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  unit?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(easedProgress * value);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  const formatted = displayValue.toFixed(decimals);

  return (
    <span
      role="text"
      aria-label={`${value}${unit ? ` ${unit}` : ""}`}
      className="tabular-nums"
    >
      {formatted}
      {unit && <span className="ml-1 text-xs text-[var(--muted)] font-normal">{unit}</span>}
    </span>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCheck() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="inline-block">
      <motion.circle
        cx="24"
        cy="24"
        r="22"
        stroke="var(--green-600)"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      <motion.path
        d="M14 24 L21 31 L34 17"
        stroke="var(--green-600)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.25, ease: "easeOut" }}
      />
    </svg>
  );
}
