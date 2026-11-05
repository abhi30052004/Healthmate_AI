import React from "react";

export function BackgroundEffects() {
  return (
    <div className="ds-bg-effects" aria-hidden="true">
      {/* Subtle Dot Grid */}
      <div className="ds-bg-dot-grid" />

      {/* Low-opacity Teal Blurred Orb */}
      <div className="ds-bg-orb ds-bg-orb-teal" />

      {/* Low-opacity Blue Blurred Orb */}
      <div className="ds-bg-orb ds-bg-orb-blue" />
    </div>
  );
}

