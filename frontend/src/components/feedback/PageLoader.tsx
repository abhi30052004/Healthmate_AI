import React from "react";
import { motion } from "motion/react";

export function PageLoader() {
  return (
    <motion.div
      role="status"
      aria-label="Loading HealthMate"
      className="fixed inset-0 z-[100] grid place-items-center bg-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      <div className="flex flex-col items-center gap-6">
        <svg width="160" height="48" viewBox="0 0 160 48" fill="none">
          <motion.path
            d="M0 24 H44 L54 8 L68 40 L80 18 L88 24 H160"
            stroke="var(--green-600)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 1.1,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 0.3,
            }}
          />
        </svg>
        <motion.span
          className="font-display text-xl font-semibold text-[var(--green-800)]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          HealthMate AI
        </motion.span>
      </div>
    </motion.div>
  );
}

