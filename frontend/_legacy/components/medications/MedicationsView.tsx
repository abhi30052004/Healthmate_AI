import React, { useState } from "react";
import { Pill, Clock, Users, Calendar, CheckSquare, Plus } from "lucide-react";
import { CareOrganizer } from "../CareOrganizer";
import { SmartReminders } from "../SmartReminders";
import type { FamilyProfile } from "../../api/client";

export interface MedicationsViewProps {
  token: string;
  activeProfile: FamilyProfile | null;
  initialSubtab?: "medications" | "reminders";
}

export function MedicationsView({
  token,
  activeProfile,
  initialSubtab = "medications",
}: MedicationsViewProps) {
  const [activeSubtab, setActiveSubtab] = useState<"medications" | "reminders">(initialSubtab);

  return (
    <div className="hm-medications-page">
      {/* Page Header */}
      <div className="hm-page-header">
        <div className="hm-page-header-text">
          <div className="hm-pill-header">
            <Pill size={14} className="text-teal" />
            <span>Medication & Care Management</span>
          </div>
          <h2>Medications & Smart Health Reminders</h2>
          <p>
            Track active medication regimens, exact dosage instructions, care teams, appointments, and smart recurring health reminders.
          </p>
        </div>

        {/* Subtab Segmented Switcher */}
        <div className="hm-segmented-control" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeSubtab === "medications"}
            className={`hm-segment-btn ${activeSubtab === "medications" ? "is-active" : ""}`}
            onClick={() => setActiveSubtab("medications")}
          >
            <Pill size={14} />
            <span>Care & Medications</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubtab === "reminders"}
            className={`hm-segment-btn ${activeSubtab === "reminders" ? "is-active" : ""}`}
            onClick={() => setActiveSubtab("reminders")}
          >
            <Clock size={14} />
            <span>Smart Reminders</span>
          </button>
        </div>
      </div>

      {/* Subtab Content */}
      <div className="hm-medications-content">
        {activeSubtab === "medications" ? (
          <CareOrganizer token={token} />
        ) : (
          <SmartReminders token={token} activeProfile={activeProfile} />
        )}
      </div>
    </div>
  );
}

