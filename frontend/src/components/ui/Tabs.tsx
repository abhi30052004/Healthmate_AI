import React, { useRef } from "react";
import { motion } from "motion/react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function Tabs({ tabs, activeTab, onChange, className = "", size = "md" }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      onChange(tabs[nextIndex].id);
      focusTab(nextIndex);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      onChange(tabs[prevIndex].id);
      focusTab(prevIndex);
    }
  };

  const focusTab = (index: number) => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("button[role='tab']");
    buttons?.[index]?.focus();
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation="horizontal"
      className={`inline-flex items-center p-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] ${className}`}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`relative z-10 flex items-center font-medium rounded-md transition-colors select-none focus-visible:outline-none focus-visible:shadow-[var(--focus)] ${
              sizeClasses[size]
            } ${isActive ? "text-[var(--green-900)] font-semibold" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-[var(--green-100)] text-[var(--green-800)]"
                    : "bg-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {tab.badge}
              </span>
            )}

            {isActive && (
              <motion.div
                layoutId="tab-active-indicator"
                className="absolute inset-0 bg-white rounded-md shadow-1 -z-10 border border-[var(--border)]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  activeTab,
  children,
  className = "",
}: {
  id: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (id !== activeTab) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={`focus-visible:outline-none ${className}`}
    >
      {children}
    </div>
  );
}

