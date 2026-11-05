import React from "react";
import { LayoutDashboard, FileText, Pill, Sparkles, MoreHorizontal } from "lucide-react";
import type { NavTabId } from "./Sidebar";

export interface MobileNavProps {
  activeTab: NavTabId;
  onTabChange: (id: NavTabId) => void;
  onOpenMore: () => void;
  simpleMode?: boolean;
}

export function MobileNav({
  activeTab,
  onTabChange,
  onOpenMore,
  simpleMode = false,
}: MobileNavProps) {
  if (simpleMode) {
    return (
      <nav
        aria-label="Mobile Navigation (Simple Mode)"
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] z-40 px-3 py-2 flex items-center justify-around pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
      >
        <button
          type="button"
          onClick={() => onTabChange("medicines")}
          className={`flex-1 flex flex-col items-center py-2 rounded-lg text-sm font-bold ${
            activeTab === "medicines"
              ? "text-[var(--green-800)] bg-[var(--green-50)]"
              : "text-[var(--muted)]"
          }`}
        >
          <Pill size={24} />
          <span>Medicines</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("records")}
          className={`flex-1 flex flex-col items-center py-2 rounded-lg text-sm font-bold ${
            activeTab === "records"
              ? "text-[var(--green-800)] bg-[var(--green-50)]"
              : "text-[var(--muted)]"
          }`}
        >
          <FileText size={24} />
          <span>Records</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("visit-pack")}
          className={`flex-1 flex flex-col items-center py-2 rounded-lg text-sm font-bold ${
            activeTab === "visit-pack"
              ? "text-[var(--green-800)] bg-[var(--green-50)]"
              : "text-[var(--muted)]"
          }`}
        >
          <Sparkles size={24} />
          <span>Doctor Pack</span>
        </button>
      </nav>
    );
  }

  const items: { id: NavTabId; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Home", icon: <LayoutDashboard size={20} /> },
    { id: "records", label: "Records", icon: <FileText size={20} /> },
    { id: "medicines", label: "Medicines", icon: <Pill size={20} /> },
    { id: "assistant", label: "Assistant", icon: <Sparkles size={20} /> },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] z-40 px-2 py-1.5 flex items-center justify-around pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`flex-1 flex flex-col items-center py-1 rounded-md text-[11px] font-medium transition-colors ${
              isActive
                ? "text-[var(--green-800)] font-semibold"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            <span className="mb-0.5">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}

      {/* More / Menu Drawer */}
      <button
        type="button"
        onClick={onOpenMore}
        className="flex-1 flex flex-col items-center py-1 rounded-md text-[11px] font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
      >
        <span className="mb-0.5">
          <MoreHorizontal size={20} />
        </span>
        <span>More</span>
      </button>
    </nav>
  );
}

