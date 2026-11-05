import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Plus, Upload, Filter, Share2, Calendar, Pill, Sparkles } from "lucide-react";

export function OverviewStub({ onNavigate }: { onNavigate: (tab: any) => void }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Today's Health Overview"
        subtitle="Review upcoming medicines, verified vitals, and reports needing attention."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" iconLeft={<Upload size={14} />} onClick={() => onNavigate("records")}>
              Upload Report
            </Button>
            <Button variant="outline" size="sm" iconLeft={<Plus size={14} />} onClick={() => onNavigate("medicines")}>
              Log Dose
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="space-y-2">
            <span className="text-xs font-semibold text-[var(--green-700)]">Today's Medicines</span>
            <p className="text-2xl font-bold">2 Due Today</p>
            <p className="text-xs text-[var(--muted)]">Next: Metformin 500mg at 1:00 PM</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <span className="text-xs font-semibold text-[var(--green-700)]">Next Appointment</span>
            <p className="text-2xl font-bold">In 3 Days</p>
            <p className="text-xs text-[var(--muted)]">Dr. S. Mukherjee (Cardiology)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <span className="text-xs font-semibold text-[var(--warning)]">Verification Queue</span>
            <p className="text-2xl font-bold">1 Document</p>
            <p className="text-xs text-[var(--muted)]">Blood panel extracted; awaiting review</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function RecordsStub() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Health Records & Documents"
        subtitle="Manage laboratory reports, prescriptions, and human-verified observations."
        actions={
          <Button variant="primary" size="sm" iconLeft={<Upload size={14} />}>
            Upload Document
          </Button>
        }
      />
      <Card>
        <CardContent className="text-center py-12 text-[var(--muted)]">
          Health Records Stub View Ready
        </CardContent>
      </Card>
    </div>
  );
}

export function TimelineStub() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Timeline & Trends"
        subtitle="Track historical vital signs and laboratory findings over time."
      />
      <Card>
        <CardContent className="text-center py-12 text-[var(--muted)]">
          Timeline & Trends Stub View Ready
        </CardContent>
      </Card>
    </div>
  );
}

export function MedicinesStub() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicines & Adherence"
        subtitle="Track daily prescriptions, schedules, and confirm doses."
      />
      <Card>
        <CardContent className="text-center py-12 text-[var(--muted)]">
          Medicines & Reminders Stub View Ready
        </CardContent>
      </Card>
    </div>
  );
}

export function AppointmentsStub() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Appointments"
        subtitle="Upcoming clinical visits, preparation checklists, and post-visit notes."
      />
      <Card>
        <CardContent className="text-center py-12 text-[var(--muted)]">
          Appointments Stub View Ready
        </CardContent>
      </Card>
    </div>
  );
}

export function SymptomsStub() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Symptom Journal"
        subtitle="Record daily physical observations, severity ratings, and patterns."
      />
      <Card>
        <CardContent className="text-center py-12 text-[var(--muted)]">
          Symptom Journal Stub View Ready
        </CardContent>
      </Card>
    </div>
  );
}

export function VisitPackStub() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Visit Preparation Pack"
        subtitle="Generate printable PDF summaries and clinician discussion guides."
      />
      <Card>
        <CardContent className="text-center py-12 text-[var(--muted)]">
          Doctor Visit Pack Stub View Ready
        </CardContent>
      </Card>
    </div>
  );
}

export function AssistantStub() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Health Assistant"
        subtitle="Evidence-grounded navigation and plain-language explanation of verified records."
      />
      <Card>
        <CardContent className="text-center py-12 text-[var(--muted)]">
          AI Assistant Stub View Ready
        </CardContent>
      </Card>
    </div>
  );
}

export function FamilyStub() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Family Health Profiles"
        subtitle="Coordinate records for parents, children, and authorized caregivers."
      />
      <Card>
        <CardContent className="text-center py-12 text-[var(--muted)]">
          Family Profiles Stub View Ready
        </CardContent>
      </Card>
    </div>
  );
}

export function SharingStub() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Sharing & Emergency QR"
        subtitle="Create expiring, read-only guest links and emergency medical cards."
      />
      <Card>
        <CardContent className="text-center py-12 text-[var(--muted)]">
          Doctor Sharing & Emergency QR Stub View Ready
        </CardContent>
      </Card>
    </div>
  );
}

export function PrivacyStub() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Privacy & Data Control Center"
        subtitle="Review access logs, export structured archives, and exercise account rights."
      />
      <Card>
        <CardContent className="text-center py-12 text-[var(--muted)]">
          Privacy Center Stub View Ready
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsStub() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace Settings"
        subtitle="Account credentials, notification channels, and display preferences."
      />
      <Card>
        <CardContent className="text-center py-12 text-[var(--muted)]">
          Workspace Settings Stub View Ready
        </CardContent>
      </Card>
    </div>
  );
}

