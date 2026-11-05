import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 1000,
  format = (n) => Math.round(n).toString(),
  className = "",
}: AnimatedNumberProps) {
  const shouldReduceMotion = useReducedMotion();
  const [currentValue, setCurrentValue] = useState(shouldReduceMotion ? value : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setCurrentValue(value);
      return;
    }

    let start = 0;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const nextVal = start + (value - start) * easeProgress;
      setCurrentValue(nextVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentValue(value);
      }
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [value, duration, shouldReduceMotion]);

  return (
    <span className={`tabular-nums ${className}`.trim()}>
      {format(currentValue)}
    </span>
  );
}

