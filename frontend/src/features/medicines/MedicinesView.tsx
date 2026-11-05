import React, { useState } from "react";
import { Pill, Plus, Calendar, Clock, Check, AlertCircle, RefreshCw, X, ShieldAlert } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Dialog } from "../../components/ui/Dialog";
import { Badge } from "../../components/ui/Badge";
import { DoseCard, type DoseItem } from "../../components/health/DoseCard";
import type { FamilyProfile } from "../../api/client";

export interface MedicinesViewProps {
  token: string;
  activeProfile: FamilyProfile | null;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  instructions: string;
  refillCount: number;
  totalRefills: number;
  startDate: string;
  status: "active" | "completed" | "paused";
}

export function MedicinesView({ token, activeProfile }: MedicinesViewProps) {
  const [activeSubtab, setActiveSubtab] = useState<"today" | "all">("today");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Today's Doses
  const [doses, setDoses] = useState<DoseItem[]>([
    {
      id: "dose-1",
      name: "Metformin Hydrochloride",
      dosage: "500 mg",
      time: "8:00 AM",
      instructions: "Take with breakfast",
      status: "pending",
    },
    {
      id: "dose-2",
      name: "Atorvastatin Calcium",
      dosage: "20 mg",
      time: "9:00 PM",
      instructions: "Take after dinner",
      status: "pending",
    },
    {
      id: "dose-3",
      name: "Vitamin D3",
      dosage: "60,000 IU",
      time: "10:00 AM",
      instructions: "Weekly dose",
      status: "pending",
    },
  ]);

  // All Prescribed Medications
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: "med-1",
      name: "Metformin Hydrochloride",
      dosage: "500 mg",
      frequency: "Twice daily",
      timing: "8:00 AM, 8:00 PM",
      instructions: "Take with meals",
      refillCount: 18,
      totalRefills: 30,
      startDate: "15 Jan 2026",
      status: "active",
    },
    {
      id: "med-2",
      name: "Atorvastatin Calcium",
      dosage: "20 mg",
      frequency: "Once daily",
      timing: "9:00 PM",
      instructions: "Take before bed",
      refillCount: 24,
      totalRefills: 30,
      startDate: "15 Aug 2026",
      status: "active",
    },
    {
      id: "med-3",
      name: "Vitamin D3 Cholecalciferol",
      dosage: "60,000 IU",
      frequency: "Once weekly",
      timing: "Sunday mornings",
      instructions: "Take with milk or meal",
      refillCount: 4,
      totalRefills: 8,
      startDate: "01 Oct 2026",
      status: "active",
    },
  ]);

  // Form state for adding medication
  const [newMedName, setNewMedName] = useState("");
  const [newMedDosage, setNewMedDosage] = useState("");
  const [newMedTime, setNewMedTime] = useState("");
  const [newMedInstructions, setNewMedInstructions] = useState("");

  const handleTakeDose = (id: string) => {
    setDoses((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "taken" } : d))
    );
  };

  const handleSkipDose = (id: string) => {
    setDoses((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "skipped" } : d))
    );
  };

  const handleSnoozeDose = (id: string) => {
    setDoses((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "snoozed" } : d))
    );
  };

  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim() || !newMedDosage.trim()) return;

    const newMed: Medication = {
      id: `med-${Date.now()}`,
      name: newMedName.trim(),
      dosage: newMedDosage.trim(),
      frequency: "Daily",
      timing: newMedTime || "Morning",
      instructions: newMedInstructions || "As prescribed",
      refillCount: 30,
      totalRefills: 30,
      startDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      status: "active",
    };

    setMedications((prev) => [newMed, ...prev]);
    setDoses((prev) => [
      {
        id: `dose-${Date.now()}`,
        name: newMed.name,
        dosage: newMed.dosage,
        time: newMed.timing,
        instructions: newMed.instructions,
        status: "pending",
      },
      ...prev,
    ]);

    setNewMedName("");
    setNewMedDosage("");
    setNewMedTime("");
    setNewMedInstructions("");
    setIsAddModalOpen(false);
  };

  const completedTodayCount = doses.filter((d) => d.status === "taken").length;
  const adherencePercent = Math.round((completedTodayCount / doses.length) * 100);

  return (
    <div className="space-y-8" data-testid="medicines-view">
      <PageHeader
        title="Medications & Smart Schedule"
        subtitle="Manage daily prescribed doses, record confirmations, and monitor refill supplies."
        actions={
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Plus size={14} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Medication
          </Button>
        }
      />

      {/* Adherence Summary Bar */}
      <section className="p-5 rounded-xl bg-white border border-[var(--border)] shadow-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-[var(--muted)]">Today's Adherence Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold tabular-nums text-[var(--green-900)]">
              {adherencePercent}%
            </span>
            <span className="text-xs text-[var(--muted)]">
              ({completedTodayCount} of {doses.length} doses confirmed)
            </span>
          </div>
        </div>

        {/* Subtab Toggle (Today vs All Prescriptions) */}
        <div className="inline-flex items-center p-1 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setActiveSubtab("today")}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeSubtab === "today"
                ? "bg-white text-[var(--green-900)] shadow-1"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            Today's Schedule ({doses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubtab("all")}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeSubtab === "all"
                ? "bg-white text-[var(--green-900)] shadow-1"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            All Medications ({medications.length})
          </button>
        </div>
      </section>

      {/* SUBTAB 1: Today's Schedule */}
      {activeSubtab === "today" && (
        <section className="space-y-4">
          <h2 className="text-sm font-display font-semibold text-[var(--text)]">
            Scheduled Doses for Today
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doses.map((dose) => (
              <DoseCard
                key={dose.id}
                dose={dose}
                onTake={handleTakeDose}
                onSkip={handleSkipDose}
                onSnooze={handleSnoozeDose}
              />
            ))}
          </div>
        </section>
      )}

      {/* SUBTAB 2: All Prescribed Medications */}
      {activeSubtab === "all" && (
        <section className="space-y-4">
          <h2 className="text-sm font-display font-semibold text-[var(--text)]">
            Active Medication Regimen
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {medications.map((med) => {
              const refillPercent = Math.round((med.refillCount / med.totalRefills) * 100);
              const isLowStock = med.refillCount <= 5;

              return (
                <Card key={med.id} className="p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-[var(--green-50)] text-[var(--green-800)] border border-[var(--green-100)]">
                          <Pill size={18} />
                        </div>
                        <div>
                          <p className="font-display font-semibold text-sm text-[var(--text)]">
                            {med.name}
                          </p>
                          <p className="text-xs text-[var(--muted)] font-mono">{med.dosage}</p>
                        </div>
                      </div>
                      <Badge variant={isLowStock ? "review" : "verified"} size="sm">
                        {isLowStock ? "Low Supply" : "Active"}
                      </Badge>
                    </div>

                    <div className="text-xs text-[var(--muted)] space-y-1 pt-1">
                      <p>
                        <span className="font-semibold text-[var(--text)]">Frequency:</span> {med.frequency}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--text)]">Schedule:</span> {med.timing}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--text)]">Instructions:</span> {med.instructions}
                      </p>
                    </div>
                  </div>

                  {/* Refill Meter */}
                  <div className="pt-3 border-t border-[var(--border)] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                      <span>Remaining Supply</span>
                      <span className="font-semibold text-[var(--text)]">
                        {med.refillCount} of {med.totalRefills} days left
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isLowStock ? "bg-[var(--warning)]" : "bg-[var(--green-600)]"
                        }`}
                        style={{ width: `${refillPercent}%` }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Add Medication Dialog */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Prescribed Medication"
        description="Enter medication name and dosing directions as stated on your doctor prescription."
      >
        <form onSubmit={handleAddMedication} className="space-y-4 pt-2">
          <Input
            label="Medication Name"
            required
            autoFocus
            value={newMedName}
            onChange={(e) => setNewMedName(e.target.value)}
            placeholder="e.g. Amlodipine Besylate"
          />
          <Input
            label="Strength & Form"
            required
            value={newMedDosage}
            onChange={(e) => setNewMedDosage(e.target.value)}
            placeholder="e.g. 5 mg Tablet"
          />
          <Input
            label="Schedule Time"
            value={newMedTime}
            onChange={(e) => setNewMedTime(e.target.value)}
            placeholder="e.g. 8:00 AM once daily"
          />
          <Input
            label="Instructions"
            value={newMedInstructions}
            onChange={(e) => setNewMedInstructions(e.target.value)}
            placeholder="e.g. Take with water in morning"
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Medication
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

