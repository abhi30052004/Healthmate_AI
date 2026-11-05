import React, { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import type { User, FamilyProfile, DocumentItem } from "../api/client";

// In-App Views
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

interface OutletContextType {
  user: User | null;
  activeProfile: FamilyProfile;
  profiles: FamilyProfile[];
  simpleMode: boolean;
  setSimpleMode: (v: boolean) => void;
  token: string;
}

const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: "doc-1",
    owner_id: "user-abhijit",
    profile_id: "prof-1",
    filename: "SampleLab_Comprehensive_Metabolic_Oct2026.pdf",
    mime_type: "application/pdf",
    file_size: 428000,
    checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    processing_status: "completed",
    ocr_applied: true,
    patient_name: "Dr. Abhijit Bhunia",
    document_date: "2026-10-14",
    lab_name: "Sample Diagnostics Lab",
    is_verified: true,
    verified_at: "2026-10-14T10:30:00Z",
    created_at: "2026-10-14T10:00:00Z",
    observations: [
      {
        id: "obs-1",
        document_id: "doc-1",
        owner_id: "user-abhijit",
        test_name: "HbA1c (Glycosylated Hemoglobin)",
        value: "6.8 %",
        numeric_value: 6.8,
        unit: "%",
        reference_range: "4.0 - 5.6 %",
        flag: "HIGH",
        source_page: 2,
        source_text: "HbA1c (Glycosylated Hemoglobin): 6.8 % [Reference: 4.0 - 5.6 %]",
        is_low_confidence: false,
        is_reviewed: true,
        created_at: "2026-10-14T10:05:00Z",
      },
      {
        id: "obs-2",
        document_id: "doc-1",
        owner_id: "user-abhijit",
        test_name: "Fasting Blood Glucose",
        value: "118 mg/dL",
        numeric_value: 118,
        unit: "mg/dL",
        reference_range: "70 - 99 mg/dL",
        flag: "HIGH",
        source_page: 1,
        source_text: "Fasting Blood Sugar: 118 mg/dL (Normal: 70 - 99 mg/dL)",
        is_low_confidence: false,
        is_reviewed: true,
        created_at: "2026-10-14T10:05:00Z",
      },
    ],
  },
];

export function DashboardRoute() {
  const ctx = useOutletContext<OutletContextType>();
  const navigate = useNavigate();

  return (
    <DashboardView
      user={ctx.user}
      activeProfile={ctx.activeProfile}
      onNavigateTab={(tab) => {
        const pathMap: Record<string, string> = {
          overview: "dashboard",
          records: "records",
          timeline: "trends",
          medicines: "medicines",
          sharing: "sharing",
        };
        navigate(`/app/${pathMap[tab] || tab}`);
      }}
    />
  );
}

export function RecordsRoute() {
  const ctx = useOutletContext<OutletContextType>();
  const [docs, setDocs] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);

  return (
    <HealthRecordsView
      token={ctx.token}
      activeProfile={ctx.activeProfile}
      documents={docs}
      onRefresh={() => {
        setDocs([...docs]);
      }}
    />
  );
}

export function TrendsRoute() {
  const ctx = useOutletContext<OutletContextType>();
  return <TimelineTrendsView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function MedicinesRoute() {
  const ctx = useOutletContext<OutletContextType>();
  return <MedicinesView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function AppointmentsRoute() {
  const ctx = useOutletContext<OutletContextType>();
  return <AppointmentsView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function SymptomsRoute() {
  const ctx = useOutletContext<OutletContextType>();
  return <SymptomsJournalView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function VisitPackRoute() {
  const ctx = useOutletContext<OutletContextType>();
  return <DoctorVisitPackView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function AssistantRoute() {
  const ctx = useOutletContext<OutletContextType>();
  return <AssistantView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function FamilyRoute() {
  const ctx = useOutletContext<OutletContextType>();
  return <FamilyView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function SharingRoute() {
  const ctx = useOutletContext<OutletContextType>();
  return <SharingEmergencyView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function PrivacyRoute() {
  const ctx = useOutletContext<OutletContextType>();
  return <PrivacyView token={ctx.token} activeProfile={ctx.activeProfile} />;
}

export function SettingsRoute() {
  const ctx = useOutletContext<OutletContextType>();
  return (
    <SettingsView
      token={ctx.token}
      activeProfile={ctx.activeProfile}
      isSimpleMode={ctx.simpleMode}
      onToggleSimpleMode={(v) => ctx.setSimpleMode(v)}
    />
  );
}

export function StyleGuideRoute() {
  return <StyleGuidePage />;
}
