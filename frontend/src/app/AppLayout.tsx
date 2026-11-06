import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout/AppShell";
import type { NavTabId } from "../components/layout/Sidebar";
import { PageTransition } from "../components/motion/MotionHelpers";
import { PageLoader } from "../components/feedback/PageLoader";
import { listFamilyProfiles, type FamilyProfile, type User } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { profileQueryKeys } from "./queryClient";

const PATH_TO_TAB: Record<string, NavTabId> = {
  dashboard: "overview",
  records: "records",
  trends: "timeline",
  medicines: "medicines",
  appointments: "appointments",
  symptoms: "symptoms",
  "visit-pack": "visit-pack",
  assistant: "assistant",
  family: "family",
  sharing: "sharing",
  privacy: "privacy",
  settings: "settings",
};

const TAB_TO_PATH: Record<NavTabId, string> = {
  overview: "dashboard",
  records: "records",
  timeline: "trends",
  medicines: "medicines",
  appointments: "appointments",
  symptoms: "symptoms",
  "visit-pack": "visit-pack",
  assistant: "assistant",
  family: "family",
  sharing: "sharing",
  privacy: "privacy",
  settings: "settings",
};

const ACTIVE_PROFILE_KEY = "healthmate.activeProfileId";
const SIMPLE_MODE_KEY = "healthmate.simpleMode";

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode); preference just won't persist */
  }
}

export interface WorkspaceContext {
  user: User | null;
  activeProfile: FamilyProfile;
  profiles: FamilyProfile[];
  simpleMode: boolean;
  setSimpleMode: (v: boolean) => void;
  token: string;
  refreshProfiles: () => Promise<unknown>;
  selectProfile: (profile: FamilyProfile) => void;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, token, logout } = useAuth();

  const [activeProfileId, setActiveProfileId] = useState<string | null>(() =>
    readStored(ACTIVE_PROFILE_KEY)
  );
  const [isNavigating, setIsNavigating] = useState(false);
  const [simpleMode, setSimpleModeState] = useState<boolean>(
    () => readStored(SIMPLE_MODE_KEY) === "1"
  );

  const profilesQuery = useQuery({
    queryKey: [...profileQueryKeys.all, user?.id],
    queryFn: () => listFamilyProfiles(token as string),
    enabled: !!token,
  });

  const profiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);

  // Active profile is always one the server just returned for this account.
  const activeProfile: FamilyProfile | null = useMemo(() => {
    if (profiles.length === 0) return null;
    return (
      profiles.find((p) => p.id === activeProfileId) ??
      profiles.find((p) => p.is_primary) ??
      profiles[0]
    );
  }, [profiles, activeProfileId]);

  useEffect(() => {
    document.body.classList.toggle("mode-simple", simpleMode);
    return () => document.body.classList.remove("mode-simple");
  }, [simpleMode]);

  const setSimpleMode = useCallback((v: boolean) => {
    setSimpleModeState(v);
    writeStored(SIMPLE_MODE_KEY, v ? "1" : "0");
  }, []);

  const subPath = location.pathname.split("/")[2] || "dashboard";
  const activeTab: NavTabId = PATH_TO_TAB[subPath] || "overview";

  const handleTabChange = (tab: NavTabId) => {
    setIsNavigating(true);
    navigate(`/app/${TAB_TO_PATH[tab] || "dashboard"}`);
    setTimeout(() => setIsNavigating(false), 150);
  };

  const selectProfile = useCallback(
    (profile: FamilyProfile) => {
      setIsNavigating(true);
      // Stop in-flight requests for the previous patient before switching.
      void queryClient.cancelQueries();
      setActiveProfileId(profile.id);
      writeStored(ACTIVE_PROFILE_KEY, profile.id);
      setTimeout(() => setIsNavigating(false), 200);
    },
    [queryClient]
  );

  const handleLogout = () => {
    logout();
    queryClient.clear();
    writeStored(ACTIVE_PROFILE_KEY, null);
    navigate("/login", { replace: true });
  };

  if (profilesQuery.isLoading || (!activeProfile && !profilesQuery.isError)) {
    return <PageLoader />;
  }

  if (profilesQuery.isError || !activeProfile) {
    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-display font-bold">We couldn't load your profiles</h1>
        <p className="text-sm text-[var(--muted)] max-w-md">
          Check that the HealthMate server is running and try again.
        </p>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-[var(--green-700)] text-white font-semibold"
          onClick={() => profilesQuery.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const context: WorkspaceContext = {
    user,
    activeProfile,
    profiles,
    simpleMode,
    setSimpleMode,
    token: token as string,
    refreshProfiles: () => profilesQuery.refetch(),
    selectProfile,
  };

  return (
    <AppShell
      user={user}
      activeProfile={activeProfile}
      profiles={profiles}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onSelectProfile={selectProfile}
      onLogout={handleLogout}
      isNavigating={isNavigating}
      simpleMode={simpleMode}
    >
      <PageTransition routeKey={`${location.pathname}-${activeProfile.id}`}>
        <Outlet context={context} />
      </PageTransition>
    </AppShell>
  );
}

export default AppLayout;
