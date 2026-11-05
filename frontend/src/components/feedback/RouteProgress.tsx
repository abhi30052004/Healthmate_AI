import React from "react";
import { motion } from "motion/react";

export function RouteProgress({ isNavigating }: { isNavigating: boolean }) {
  if (!isNavigating) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      className="fixed top-0 left-0 right-0 z-[90] h-[3px] bg-transparent overflow-hidden"
    >
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "0%" }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="h-full w-full bg-[var(--green-600)] shadow-[0_0_8px_var(--green-600)]"
      />
    </div>
  );
}
