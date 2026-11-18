import React from "react";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Calendar, Clock, MapPin, Stethoscope, User, CheckSquare, Printer, FileText } from "lucide-react";
import type { AppointmentRecord, FollowUpTask } from "../../api/client";
import { formatDate, formatTime, todayISO } from "../../lib/dates";

export interface AppointmentSlipDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentRecord | null;
  tasks?: FollowUpTask[];
  patientName: string;
}

export function AppointmentSlipDialog({
  open,
  onClose,
  appointment,
  tasks = [],
  patientName,
}: AppointmentSlipDialogProps) {
  if (!appointment) return null;

  const scheduledDate = new Date(appointment.scheduled_at);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title="Doctor Appointment Slip"
      description="Print or save this structured preparation slip for your doctor visit."
      maxWidth="lg"
    >
      <div className="space-y-6 pt-2">
        {/* Printable Slip Container */}
        <div
          id="appointment-printable-slip"
          className="p-6 rounded-xl bg-white border border-[var(--border)] space-y-5 print:border-none print:p-0 print:m-0 print:shadow-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[var(--border)] pb-4 print:pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--green-800)] bg-[var(--green-50)] px-2.5 py-0.5 rounded border border-[var(--green-100)] print:border-gray-300 print:text-black">
                  Doctor Appointment Slip
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {appointment.status}
                </span>
              </div>
              <h2 className="text-xl font-display font-bold mt-2 print:text-2xl print:text-black">
                {appointment.title}
              </h2>
              <p className="text-xs text-[var(--muted)] print:text-gray-600 mt-0.5">
                {appointment.appointment_type || "Clinical Consultation"}
              </p>
            </div>
            <div className="text-right text-xs text-[var(--muted)] print:text-gray-600">
              <p className="font-semibold text-[var(--text)] print:text-black text-sm">HealthMate AI</p>
              <p>Slip generated: {formatDate(todayISO())}</p>
            </div>
          </div>

          {/* Key Appointment Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] space-y-1.5 print:bg-white print:border-gray-300">
              <span className="font-semibold text-[var(--green-900)] print:text-black flex items-center gap-1.5">
                <User size={13} aria-hidden="true" /> Patient Information
              </span>
              <p className="font-bold text-sm text-[var(--text)] print:text-black">{patientName}</p>
            </div>

            <div className="p-3.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] space-y-1.5 print:bg-white print:border-gray-300">
              <span className="font-semibold text-[var(--green-900)] print:text-black flex items-center gap-1.5">
                <Stethoscope size={13} aria-hidden="true" /> Healthcare Provider / Clinic
              </span>
              <p className="font-bold text-sm text-[var(--text)] print:text-black">
                {appointment.provider_name || "Assigned Physician"}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] space-y-1.5 print:bg-white print:border-gray-300">
              <span className="font-semibold text-[var(--green-900)] print:text-black flex items-center gap-1.5">
                <Calendar size={13} aria-hidden="true" /> Scheduled Date & Time
              </span>
              <p className="font-semibold text-[var(--text)] print:text-black flex items-center gap-1">
                <Clock size={12} className="text-[var(--green-700)] print:hidden" aria-hidden="true" />
                {formatDate(appointment.scheduled_at)} at {formatTime(appointment.scheduled_at)}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] space-y-1.5 print:bg-white print:border-gray-300">
              <span className="font-semibold text-[var(--green-900)] print:text-black flex items-center gap-1.5">
                <MapPin size={13} aria-hidden="true" /> Clinic Location / Room
              </span>
              <p className="font-medium text-[var(--text)] print:text-black">
                {appointment.location || "Clinic / Hospital address not specified"}
              </p>
            </div>
          </div>

          {/* Doctor Notes / Reason */}
          {appointment.notes && (
            <div className="p-3.5 rounded-lg border border-[var(--border)] bg-white space-y-1 text-xs print:border-gray-300">
              <span className="font-semibold text-[var(--green-900)] print:text-black flex items-center gap-1.5">
                <FileText size={13} aria-hidden="true" /> Visit Notes & Instructions
              </span>
              <p className="text-[var(--muted)] print:text-black whitespace-pre-wrap leading-relaxed">
                {appointment.notes}
              </p>
            </div>
          )}

          {/* Preparation Checklist & Questions */}
          <div className="space-y-2 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--green-900)] print:text-black flex items-center gap-1.5">
              <CheckSquare size={13} aria-hidden="true" /> Preparation Checklist & Questions to Ask
            </h3>
            {tasks.length === 0 ? (
              <p className="text-xs text-[var(--muted)] p-3 rounded-lg border border-dashed border-[var(--border)]">
                No specific preparation checklist items added yet.
              </p>
            ) : (
              <ul className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] text-xs print:border-gray-300">
                {tasks.map((t, idx) => (
                  <li key={t.id || idx} className="p-2.5 flex items-start gap-2.5">
                    <span className="inline-block w-4 h-4 border border-gray-400 rounded mt-0.5 shrink-0 text-center text-[10px] leading-3">
                      {t.status === "completed" ? "✓" : ""}
                    </span>
                    <span className="flex-1 font-medium text-[var(--text)] print:text-black leading-snug">
                      {t.title}
                    </span>
                    {t.priority && t.priority !== "medium" && (
                      <span className="text-[10px] uppercase font-semibold text-[var(--muted)] print:text-gray-500">
                        {t.priority}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Clinical Sign-off & Disclaimer */}
          <div className="pt-3 border-t border-[var(--border)] text-[10px] text-[var(--muted)] print:text-gray-600 leading-tight">
            <p>
              Please arrive 15 minutes before your scheduled appointment time. Bring your government-issued ID, insurance card, and relevant medical records or medication containers.
            </p>
          </div>
        </div>

        {/* Action Buttons (Hidden when printing) */}
        <div className="flex items-center justify-end gap-2 pt-2 print:hidden">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Printer size={14} />}
            onClick={handlePrint}
          >
            Print / Save PDF
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
