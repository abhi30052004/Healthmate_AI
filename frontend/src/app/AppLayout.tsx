import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import type { NavTabId } from "../components/layout/Sidebar";
import { PageTransition } from "../components/motion/MotionHelpers";
import type { User, FamilyProfile, DocumentItem } from "../api/client";

const INITIAL_USER: User = {
  id: "user-abhijit",
  name: "Dr. Abhijit Bhunia",
  email: "abhijit.bhunia@healthmate.ai",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

const INITIAL_PROFILES: FamilyProfile[] = [
  {
    id: "prof-1",
    owner_id: "user-abhijit",
    name: "Dr. Abhijit Bhunia",
    relationship: "self",
    is_primary: true,
    is_active: true,
    is_dependent: false,
    consent_status: "authorized",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "prof-2",
    owner_id: "user-abhijit",
    name: "Anima Bhunia",
    relationship: "parent",
    is_primary: false,
    is_active: true,
    is_dependent: true,
    consent_status: "authorized",
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
  },
  {
    id: "prof-3",
    owner_id: "user-abhijit",
    name: "Aarav Bhunia",
    relationship: "child",
    is_primary: false,
    is_active: true,
    is_dependent: true,
    consent_status: "authorized",
    created_at: "2026-03-10T00:00:00Z",
    updated_at: "2026-03-10T00:00:00Z",
  },
];

const PATH_TO_TAB: Record<string, NavTabId> = {
  "dashboard": "overview",
  "records": "records",
  "trends": "timeline",
  "medicines": "medicines",
  "appointments": "appointments",
  "symptoms": "symptoms",
  "visit-pack": "visit-pack",
  "assistant": "assistant",
  "family": "family",
  "sharing": "sharing",
  "privacy": "privacy",
  "settings": "settings",
};

const TAB_TO_PATH: Record<NavTabId, string> = {
  "overview": "dashboard",
  "records": "records",
  "timeline": "trends",
  "medicines": "medicines",
  "appointments": "appointments",
  "symptoms": "symptoms",
  "visit-pack": "visit-pack",
  "assistant": "assistant",
  "family": "family",
  "sharing": "sharing",
  "privacy": "privacy",
  "settings": "settings",
};

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(INITIAL_USER);
  const [profiles, setProfiles] = useState<FamilyProfile[]>(INITIAL_PROFILES);
  const [activeProfile, setActiveProfile] = useState<FamilyProfile>(INITIAL_PROFILES[0]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);

  // Derive activeTab from route path
  const subPath = location.pathname.split("/")[2] || "dashboard";
  const activeTab: NavTabId = PATH_TO_TAB[subPath] || "overview";

  const handleTabChange = (tab: NavTabId) => {
    setIsNavigating(true);
    const targetPath = TAB_TO_PATH[tab] || "dashboard";
    navigate(`/app/${targetPath}`);
    setTimeout(() => setIsNavigating(false), 150);
  };

  const handleProfileSelect = (profile: FamilyProfile) => {
    setIsNavigating(true);
    setActiveProfile(profile);
    setTimeout(() => setIsNavigating(false), 200);
  };

  const handleLogout = () => {
    setUser(null);
    navigate("/");
  };

  return (
    <AppShell
      user={user}
      activeProfile={activeProfile}
      profiles={profiles}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onSelectProfile={handleProfileSelect}
      onLogout={handleLogout}
      isNavigating={isNavigating}
      simpleMode={simpleMode}
    >
      <PageTransition routeKey={`${location.pathname}-${activeProfile?.id}`}>
        <Outlet
          context={{
            user,
            activeProfile,
            profiles,
            simpleMode,
            setSimpleMode,
            token: "hm_demo_token_authenticated",
          }}
        />
      </PageTransition>
    </AppShell>
  );
}

export default AppLayout;
