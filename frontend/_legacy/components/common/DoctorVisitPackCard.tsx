import React from "react";
import { Stethoscope, Calendar, FileText, Download, CheckSquare, ArrowRight, User } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export interface DoctorVisitPackCardProps {
  doctorName?: string;
  specialty?: string;
  appointmentDate?: string;
  reasonForVisit?: string;
  keyObservationsCount?: number;
  questionsCount?: number;
  medicationsCount?: number;
  status?: "draft" | "reviewed" | "ready";
  onOpen?: () => void;
  onExportPdf?: () => void;
  className?: string;
}

export function DoctorVisitPackCard({
  doctorName = "Primary Care Physician",
  specialty = "Internal Medicine",
  appointmentDate,
  reasonForVisit = "Comprehensive Health Review & Lab Follow-up",
  keyObservationsCount = 0,
  questionsCount = 0,
  medicationsCount = 0,
  status = "ready",
  onOpen,
  onExportPdf,
  className = "",
}: DoctorVisitPackCardProps) {
  const formattedDate = appointmentDate
    ? new Date(appointmentDate).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Upcoming Visit";

  return (
    <div className={`hm-visit-pack-card ${className}`}>
      <div className="hm-vpc-header">
        <div className="hm-vpc-badge-group">
          <div className="hm-vpc-icon-pill">
            <Stethoscope size={15} className="text-teal" />
            <span>Visit Preparation Pack</span>
          </div>
          <StatusBadge
            variant={status === "ready" ? "success" : status === "reviewed" ? "info" : "warning"}
            text={status === "ready" ? "Ready for Clinician" : status === "reviewed" ? "Reviewed" : "Draft"}
            size="sm"
          />
        </div>

        {appointmentDate && (
          <div className="hm-vpc-date">
            <Calendar size={13} />
            <span>{formattedDate}</span>
          </div>
        )}
      </div>

      <div className="hm-vpc-body">
        <div className="hm-vpc-doctor-info">
          <h4 className="hm-vpc-doctor-name">{doctorName}</h4>
          <span className="hm-vpc-specialty">{specialty}</span>
        </div>

        <p className="hm-vpc-reason">{reasonForVisit}</p>

        <div className="hm-vpc-stats-strip">
          <div className="hm-vpc-stat-pill">
            <FileText size={13} />
            <span><strong>{keyObservationsCount}</strong> Critical Observations</span>
          </div>
          <div className="hm-vpc-stat-pill">
            <CheckSquare size={13} />
            <span><strong>{questionsCount}</strong> Prepared Questions</span>
          </div>
          <div className="hm-vpc-stat-pill">
            <span><strong>{medicationsCount}</strong> Active Medications</span>
          </div>
        </div>
      </div>

      <div className="hm-vpc-footer">
        {onExportPdf && (
          <button
            type="button"
            className="hm-btn hm-btn-sm hm-btn-secondary"
            onClick={onExportPdf}
            title="Download formatted Clinical Visit PDF"
          >
            <Download size={14} />
            <span>Export Clinical PDF</span>
          </button>
        )}

        {onOpen && (
          <button
            type="button"
            className="hm-btn hm-btn-sm hm-btn-primary ml-auto"
            onClick={onOpen}
          >
            <span>Review & Edit Pack</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

