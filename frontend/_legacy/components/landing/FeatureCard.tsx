import React from "react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
  accentColor?: "teal" | "blue" | "emerald" | "indigo" | "amber";
}

export function FeatureCard({
  icon,
  title,
  description,
  tag,
  accentColor = "teal",
}: FeatureCardProps) {
  return (
    <div className={`landing-feature-card accent-${accentColor}`}>
      <div className="landing-feature-header">
        <div className={`landing-feature-icon-box bg-accent-${accentColor}`}>
          {icon}
        </div>
        <span className="landing-feature-tag">{tag}</span>
      </div>
      <h3 className="landing-feature-title">{title}</h3>
      <p className="landing-feature-desc">{description}</p>
    </div>
  );
}

