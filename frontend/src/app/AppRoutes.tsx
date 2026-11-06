import React from "react";
import { useOutletContext, useNavigate } from "react-router-dom";

import type { WorkspaceContext } from "./AppLayout";
import { DashboardView } from "../features/dashboard/DashboardView";
import { HealthRecordsView } from "../features/records/HealthRecordsView";
import { TimelineTrendsView } from "../features/trends/TimelineTrendsView";
import { MedicinesView } from "../features/medicines/MedicinesView";
import { AppointmentsView } from "../features/appointments/AppointmentsView";
import { SymptomsJournalView } from "../features/symptoms/SymptomsJournalView";
import { DoctorVisitPackView } from "../features/visit-pack/DoctorVisitPackView";
import { AssistantView } from "../features/assistant/AssistantView";
import { FamilyView } from "../features/family/FamilyView";
import { SharingEmergencyView } from "../features/sharing/SharingEmergencyView";
import { PrivacyView } from "../features/privacy/PrivacyView";
import { SettingsView } from "../features/settings/SettingsView";
import { StyleGuidePage } from "../features/styleguide/StyleGuidePage";

/** Tab ids used by feature views -> router paths. */
const TAB_PATHS: Record<string, string> = {
  overview: "dashboard",
  timeline: "trends",
};

function useWorkspace() {
  return useOutletContext<WorkspaceContext>();
}

export function DashboardRoute() {
  const ctx = useWorkspace();
  const navigate = useNavigate();
  return (
    <DashboardView
      token={ctx.token}
      user={ctx.user}
      activeProfile={ctx.activeProfile}
      onNavigateTab={(tab: string) => navigate(`/app/${TAB_PATHS[tab] ?? tab}`)}
    />
  );
}

export function RecordsRoute() {
  const ctx = useWorkspace();
  return <HealthRecordsView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function TrendsRoute() {
  const ctx = useWorkspace();
  return <TimelineTrendsView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function MedicinesRoute() {
  const ctx = useWorkspace();
  return <MedicinesView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function AppointmentsRoute() {
  const ctx = useWorkspace();
  const navigate = useNavigate();
  return (
    <AppointmentsView
      token={ctx.token}
      activeProfile={ctx.activeProfile}
      onPrepareVisitPack={() => navigate("/app/visit-pack")}
    />
  );
}

export function SymptomsRoute() {
  const ctx = useWorkspace();
  return <SymptomsJournalView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function VisitPackRoute() {
  const ctx = useWorkspace();
  const navigate = useNavigate();
  return (
    <DoctorVisitPackView
      token={ctx.token}
      activeProfile={ctx.activeProfile}
      onNavigateSharing={() => navigate("/app/sharing")}
    />
  );
}

export function AssistantRoute() {
  const ctx = useWorkspace();
  return <AssistantView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function FamilyRoute() {
  const ctx = useWorkspace();
  return (
    <FamilyView
      token={ctx.token}
      activeProfile={ctx.activeProfile}
      profiles={ctx.profiles}
      onProfilesChanged={ctx.refreshProfiles}
      onSelectProfile={ctx.selectProfile}
    />
  );
}

export function SharingRoute() {
  const ctx = useWorkspace();
  return <SharingEmergencyView token={ctx.token} activeProfile={ctx.activeProfile} onProfilesChanged={ctx.refreshProfiles} />;
}

export function PrivacyRoute() {
  const ctx = useWorkspace();
  return <PrivacyView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function SettingsRoute() {
  const ctx = useWorkspace();
  return (
    <SettingsView
      token={ctx.token}
      activeProfile={ctx.activeProfile}
      user={ctx.user}
      isSimpleMode={ctx.simpleMode}
      onToggleSimpleMode={(v) => ctx.setSimpleMode(v)}
    />
  );
}

export function StyleGuideRoute() {
  return <StyleGuidePage />;
}
