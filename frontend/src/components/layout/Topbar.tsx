import React from "react";
import { LogOut, Menu } from "lucide-react";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsMenu } from "./NotificationsMenu";
import type { FamilyProfile, User as UserType } from "../../api/client";

export interface TopbarProps {
  user: UserType | null;
  activeProfile: FamilyProfile | null;
  profiles: FamilyProfile[];
  onSelectProfile: (profile: FamilyProfile) => void;
  onLogout?: () => void;
  onOpenMobileMenu?: () => void;
  simpleMode?: boolean;
  onToggleSimpleMode?: () => void;
}

export function Topbar({
  user,
  activeProfile,
  profiles,
  onSelectProfile,
  onLogout,
  onOpenMobileMenu,
  simpleMode = false,
  onToggleSimpleMode,
}: TopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-[var(--border)] px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-40">
      {/* Left: Mobile Menu Trigger + Profile Switcher */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus)]"
        >
          <Menu size={20} />
        </button>

        <ProfileSwitcher
          activeProfile={activeProfile}
          profiles={profiles}
          onSelectProfile={onSelectProfile}
        />
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <GlobalSearch activeProfile={activeProfile} />
      </div>

      {/* Right: Actions, Simple Mode, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleSimpleMode && (
          <button
            type="button"
            onClick={onToggleSimpleMode}
            aria-label={simpleMode ? "Disable elder Simple Mode" : "Enable elder Simple Mode"}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              simpleMode
                ? "bg-[var(--green-800)] text-white border-[var(--green-800)]"
                : "bg-white text-[var(--muted)] border-[var(--border)] hover:text-[var(--text)]"
            }`}
          >
            {simpleMode ? "Simple: ON" : "Simple Mode"}
          </button>
        )}

        {/* Notifications */}
        <NotificationsMenu activeProfile={activeProfile} />

        {/* User Account / Logout */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out of HealthMate"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] border border-[var(--border)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus)]"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
}

