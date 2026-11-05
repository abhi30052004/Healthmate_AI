import React from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  FileText,
  Clock,
  Pill,
  Calendar,
  ActivitySquare,
  Stethoscope,
  Sparkles,
  Users,
  Share2,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

export type NavTabId =
  | "overview"
  | "records"
  | "timeline"
  | "medicines"
  | "appointments"
  | "symptoms"
  | "visit-pack"
  | "assistant"
  | "family"
  | "sharing"
  | "privacy"
  | "settings";

export interface NavItemConfig {
  id: NavTabId;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

export interface SidebarProps {
  activeTab: NavTabId;
  onTabChange: (id: NavTabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  simpleMode?: boolean;
}

export function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  simpleMode = false,
}: SidebarProps) {
  const fullNavItems: NavItemConfig[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={19} /> },
    { id: "records", label: "Health Records", icon: <FileText size={19} /> },
    { id: "timeline", label: "Timeline & Trends", icon: <Clock size={19} /> },
    { id: "medicines", label: "Medicines", icon: <Pill size={19} /> },
    { id: "appointments", label: "Appointments", icon: <Calendar size={19} /> },
    { id: "symptoms", label: "Symptoms", icon: <ActivitySquare size={19} /> },
    { id: "visit-pack", label: "Doctor Visit Pack", icon: <Stethoscope size={19} /> },
    { id: "assistant", label: "AI Assistant", icon: <Sparkles size={19} /> },
    { id: "family", label: "Family", icon: <Users size={19} /> },
    { id: "sharing", label: "Sharing & Emergency", icon: <Share2 size={19} /> },
    { id: "privacy", label: "Privacy", icon: <ShieldCheck size={19} /> },
    { id: "settings", label: "Settings", icon: <Settings size={19} /> },
  ];

  const simpleNavItems: NavItemConfig[] = [
    { id: "medicines", label: "Medicines", icon: <Pill size={22} /> },
    { id: "records", label: "Records", icon: <FileText size={22} /> },
    { id: "visit-pack", label: "Doctor", icon: <Stethoscope size={22} /> },
  ];

  const items = simpleMode ? simpleNavItems : fullNavItems;

  return (
    <aside
      aria-label="Main Navigation"
      className={`relative hidden lg:flex flex-col h-screen bg-white border-r border-[var(--border)] transition-all duration-200 select-none z-30 ${
        isCollapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-[var(--green-50)] text-[var(--green-800)] border border-[var(--green-100)] flex items-center justify-center shrink-0">
            <HeartPulse size={20} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-display font-bold text-sm text-[var(--green-900)] leading-tight">
                HealthMate AI
              </span>
              <span className="text-[10px] text-[var(--muted)] font-medium">Family Clinical Suite</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus)]"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const buttonContent = (
            <button
              type="button"
              role="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onTabChange(item.id)}
              className={`relative w-full flex items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus)] ${
                isCollapsed
                  ? "justify-center p-2.5"
                  : "px-3 py-2.5 gap-3"
              } ${
                isActive
                  ? "text-[var(--green-900)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!isCollapsed && <span className="text-xs truncate">{item.label}</span>}

              {/* Animated active pill with layoutId */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-[var(--green-50)] rounded-lg -z-10 border border-[var(--green-100)]"
                  transition={{ type: "spring", stiffness: 350, damping: 32 }}
                >
                  {/* Left indicator accent line */}
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[var(--green-700)]" />
                </motion.div>
              )}
            </button>
          );

          return (
            <div key={item.id}>
              {isCollapsed ? (
                <Tooltip content={item.label} position="right">
                  {buttonContent}
                </Tooltip>
              ) : (
                buttonContent
              )}
            </div>
          );
        })}
      </nav>

      {/* Safety Notice Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[var(--border)] bg-[var(--bg)] m-2 rounded-lg text-[10px] text-[var(--muted)] leading-tight">
          Explains records and supports doctor conversations. Does not diagnose.
        </div>
      )}
    </aside>
  );
}
