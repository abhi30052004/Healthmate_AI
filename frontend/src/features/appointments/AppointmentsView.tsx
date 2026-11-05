import React, { useState } from "react";
import { Calendar, Plus, Clock, MapPin, User, CheckSquare, Square, AlertCircle, FileText } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Dialog } from "../../components/ui/Dialog";
import { Badge } from "../../components/ui/Badge";
import type { FamilyProfile } from "../../api/client";

export interface Appointment {
  id: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  clinic: string;
  checklist: { id: string; text: string; done: boolean }[];
}

export function AppointmentsView({
  token,
  activeProfile,
  onPrepareVisitPack,
}: {
  token: string;
  activeProfile: FamilyProfile | null;
  onPrepareVisitPack?: () => void;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: "app-1",
      doctor: "Dr. Sourav Mukherjee",
      specialty: "Consultant Cardiologist",
      date: "Friday, 14 Nov 2026",
      time: "11:30 AM",
      clinic: "Apex Heart Center, Suite 402",
      checklist: [
        { id: "c1", text: "Carry latest lipid & chemistry panel reports", done: true },
        { id: "c2", text: "8-hour fasting prior to appointment", done: true },
        { id: "c3", text: "Prepare symptom and medication questions", done: false },
      ],
    },
    {
      id: "app-2",
      doctor: "Dr. Nilanjana Roy",
      specialty: "Consultant Endocrinologist",
      date: "Tuesday, 01 Dec 2026",
      time: "4:00 PM",
      clinic: "Apollo Clinic, Care Wing B",
      checklist: [
        { id: "c4", text: "Log 14-day morning blood glucose readings", done: true },
        { id: "c5", text: "Bring current Metformin medication list", done: false },
      ],
    },
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDoctor, setNewDoctor] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newClinic, setNewClinic] = useState("");

  const handleToggleCheck = (appId: string, checkId: string) => {
    setAppointments((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              checklist: app.checklist.map((c) =>
                c.id === checkId ? { ...c, done: !c.done } : c
              ),
            }
          : app
      )
    );
  };

  const handleAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.trim() || !newDate.trim()) return;

    const newApp: Appointment = {
      id: `app-${Date.now()}`,
      doctor: newDoctor.trim(),
      specialty: newSpecialty.trim() || "General Medicine",
      date: newDate,
      time: newTime || "Morning",
      clinic: newClinic.trim() || "Main Clinic",
      checklist: [
        { id: `c-${Date.now()}-1`, text: "Carry recent lab reports", done: false },
        { id: `c-${Date.now()}-2`, text: "Bring active medication list", done: false },
      ],
    };

    setAppointments((prev) => [newApp, ...prev]);
    setNewDoctor("");
    setNewSpecialty("");
    setNewDate("");
    setNewTime("");
    setNewClinic("");
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-8" data-testid="appointments-view">
      <PageHeader
        title="Doctor Appointments & Clinical Visits"
        subtitle="Schedule upcoming medical consultations, prepare checklist items, and generate visit summaries."
        actions={
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Plus size={14} />}
            onClick={() => setIsAddOpen(true)}
          >
            Add Appointment
          </Button>
        }
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-display font-semibold text-[var(--text)]">
            Upcoming Clinical Consultations ({appointments.length})
          </h2>
          <span className="text-xs text-[var(--muted)]">Active Patient Profile</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {appointments.map((app) => {
            const completedCount = app.checklist.filter((c) => c.done).length;
            const totalCount = app.checklist.length;

            return (
              <Card key={app.id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-lg bg-[var(--green-50)] text-[var(--green-800)] border border-[var(--green-100)]">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="font-display font-semibold text-sm text-[var(--text)]">
                          {app.doctor}
                        </p>
                        <p className="text-xs text-[var(--muted)]">{app.specialty}</p>
                      </div>
                    </div>
                    <Badge variant="verified" size="sm">
                      Confirmed
                    </Badge>
                  </div>

                  <div className="text-xs text-[var(--muted)] space-y-1.5 pt-1">
                    <p className="flex items-center gap-1.5 font-medium text-[var(--text)]">
                      <Clock size={13} className="text-[var(--green-700)]" />
                      <span>{app.date} at {app.time}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-[var(--muted)]" />
                      <span>{app.clinic}</span>
                    </p>
                  </div>

                  {/* Preparation Checklist */}
                  <div className="pt-3 border-t border-[var(--border)] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text)]">Visit Preparation Checklist</span>
                      <span className="text-[var(--muted)]">
                        {completedCount} of {totalCount} done
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {app.checklist.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleToggleCheck(app.id, c.id)}
                          className="w-full flex items-center gap-2 text-left text-xs p-1.5 rounded hover:bg-[var(--bg)] transition-colors"
                        >
                          {c.done ? (
                            <CheckSquare size={15} className="text-[var(--green-600)] shrink-0" />
                          ) : (
                            <Square size={15} className="text-[var(--muted)] shrink-0" />
                          )}
                          <span className={c.done ? "line-through text-[var(--muted)]" : "text-[var(--text)]"}>
                            {c.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {onPrepareVisitPack && (
                  <div className="pt-3 border-t border-[var(--border)]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onPrepareVisitPack}
                      iconLeft={<FileText size={14} />}
                      className="w-full text-xs"
                    >
                      Assemble Doctor Visit Pack
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Add Appointment Dialog */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Schedule Clinical Appointment"
        description="Record your upcoming doctor visit details and preparation instructions."
      >
        <form onSubmit={handleAddAppointment} className="space-y-4 pt-2">
          <Input
            label="Doctor / Clinician Name"
            required
            autoFocus
            value={newDoctor}
            onChange={(e) => setNewDoctor(e.target.value)}
            placeholder="e.g. Dr. Sourav Mukherjee"
          />
          <Input
            label="Specialty / Department"
            value={newSpecialty}
            onChange={(e) => setNewSpecialty(e.target.value)}
            placeholder="e.g. Cardiology, Endocrinology"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <Input
              label="Time"
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
          </div>
          <Input
            label="Clinic / Hospital Location"
            value={newClinic}
            onChange={(e) => setNewClinic(e.target.value)}
            placeholder="e.g. Apex Hospital, Suite 402"
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Appointment
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
