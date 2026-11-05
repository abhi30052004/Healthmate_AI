import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  LogOut,
  Settings,
  Shield,
  Sparkles,
  Command,
} from "lucide-react";
import { NotificationCenter } from "../common/NotificationCenter";
import type { FamilyProfile } from "../../api/client";

export interface AppHeaderProps {
  activeTab: string;
  activeTabTitle: string;
  onOpenMobileSidebar: () => void;
  user: any;
  activeProfile: FamilyProfile | null;
  familyProfiles: FamilyProfile[];
  onSelectProfile: (profile: FamilyProfile) => void;
  onLogout: () => void;
  onNavigateTab?: (tab: string) => void;
  onSearch?: (query: string) => void;
}

export function AppHeader({
  activeTab,
  activeTabTitle,
  onOpenMobileSidebar,
  user,
  activeProfile,
  familyProfiles,
  onSelectProfile,
  onLogout,
  onNavigateTab,
  onSearch,
}: AppHeaderProps) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="hm-top-navbar" role="banner">
      <div className="hm-top-left">
        {/* Mobile Hamburger */}
        <button
          type="button"
          className="hm-hamburger-btn"
          onClick={onOpenMobileSidebar}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb Trail */}
        <div className="hm-breadcrumbs">
          <span className="hm-crumb-root">HealthMate AI</span>
          <span className="hm-crumb-sep">/</span>
          <span className="hm-crumb-active">{activeTabTitle}</span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="hm-top-center">
        <form onSubmit={handleSearchSubmit} className="hm-global-search-form">
          <Search size={15} className="hm-global-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (onSearch) onSearch(e.target.value);
            }}
            placeholder="Global search documents, labs, meds (Ctrl+K)..."
            className="hm-global-search-input"
            aria-label="Global search"
          />
          <kbd className="hm-search-shortcut">⌘K</kbd>
        </form>
      </div>

      {/* Right Controls */}
      <div className="hm-top-right">
        {/* Active Patient Switcher */}
        {activeProfile && familyProfiles.length > 0 && (
          <div className="hm-patient-switcher-box">
            <span className="hm-patient-switcher-label">Patient:</span>
            <div className="hm-patient-select-wrapper">
              <div
                className="hm-patient-mini-avatar"
                style={{ backgroundColor: activeProfile.avatar_color || "#0d9488" }}
              >
                {activeProfile.name[0]?.toUpperCase() || "P"}
              </div>
              <select
                id="global-profile-selector"
                value={activeProfile.id}
                onChange={(e) => {
                  const selected = familyProfiles.find((p) => p.id === e.target.value);
                  if (selected) onSelectProfile(selected);
                }}
                className="hm-patient-native-select"
                aria-label="Active Health Profile"
              >
                {familyProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.is_primary ? "Self" : p.relationship})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Notifications */}
        <NotificationCenter onNavigateTab={onNavigateTab} />

        {/* User Profile Menu */}
        <div className="hm-user-profile-menu-container" ref={dropdownRef}>
          <button
            type="button"
            className="hm-user-avatar-btn"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            aria-expanded={profileDropdownOpen}
            aria-label="User Account Menu"
          >
            <div className="hm-user-avatar-circle">
              {(user?.name || user?.email || "U")[0].toUpperCase()}
            </div>
            <div className="hm-user-header-details">
              <span className="hm-user-name-text">{user?.name || "Clinician"}</span>
              <span className="hm-user-email-text">{user?.email}</span>
            </div>
            <ChevronDown size={14} className="hm-user-menu-chevron" />
          </button>

          {profileDropdownOpen && (
            <div className="hm-profile-dropdown-panel" role="menu">
              <div className="hm-profile-dropdown-header">
                <p className="hm-dropdown-fullname">{user?.name || "Clinician User"}</p>
                <p className="hm-dropdown-email">{user?.email}</p>
              </div>

              <div className="hm-dropdown-menu-list">
                <button
                  type="button"
                  className="hm-dropdown-item"
                  onClick={() => {
                    if (onNavigateTab) onNavigateTab("settings");
                    setProfileDropdownOpen(false);
                  }}
                  role="menuitem"
                >
                  <Settings size={15} />
                  <span>Settings & System</span>
                </button>

                <button
                  type="button"
                  className="hm-dropdown-item"
                  onClick={() => {
                    if (onNavigateTab) onNavigateTab("settings");
                    setProfileDropdownOpen(false);
                  }}
                  role="menuitem"
                >
                  <Shield size={15} />
                  <span>Privacy & Doctor Sharing</span>
                </button>
              </div>

              <div className="hm-dropdown-divider" />

              <div className="hm-dropdown-footer">
                <button
                  type="button"
                  className="hm-dropdown-logout-btn"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onLogout();
                  }}
                  role="menuitem"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Sign Out Action */}
        <button
          type="button"
          className="hm-btn hm-btn-sm hm-btn-secondary hm-header-logout-btn"
          onClick={onLogout}
          title="Sign Out of Session"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
