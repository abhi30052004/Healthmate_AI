"""Pydantic schemas for the Doctor Visit Preparation Pack feature."""

import uuid
from typing import Literal
from pydantic import BaseModel, Field


class VisitPackDraftRequest(BaseModel):
    """Parameters for generating an initial visit pack draft from the user's records."""
    start_date: str | None = Field(None, description="Filter records on or after YYYY-MM-DD")
    end_date: str | None = Field(None, description="Filter records on or before YYYY-MM-DD")
    include_unverified: bool = Field(False, description="Whether to include unverified extracted observations")
    categories: list[str] = Field(
        default_factory=lambda: [
            "documents",
            "observations",
            "trends",
            "medications",
            "care_schedule",
            "clinician_questions",
            "patient_notes",
        ],
        description="Selected sections to include in the draft"
    )
    chief_complaint: str | None = Field(None, max_length=500, description="Primary visit purpose or symptoms")
    clinician_name: str | None = Field(None, max_length=200, description="Name of physician or clinic")
    profile_id: str | None = Field(None, description="Optional family profile ID to scope the visit pack to")


class VisitPackDocumentMeta(BaseModel):
    document_id: str
    filename: str
    clinical_date: str | None = None
    is_verified: bool = False
    page_count: int = 1


class VisitPackObservationItem(BaseModel):
    observation_id: str
    document_id: str
    document_title: str
    test_name: str
    category: str
    value: str
    unit: str | None = None
    reference_range: str | None = None
    flag: str | None = None
    clinical_date: str | None = None
    is_verified: bool = True
    page: int | None = 1
    included: bool = True


class VisitPackTrendItem(BaseModel):
    test_name: str
    category: str
    baseline_date: str | None = None
    baseline_value: str | None = None
    latest_date: str | None = None
    latest_value: str | None = None
    change_description: str
    included: bool = True


class VisitPackMedicationItem(BaseModel):
    id: str
    name: str
    strength: str | None = None
    dosage_instructions: str | None = None
    frequency: str | None = None
    prescriber: str | None = None
    status: str = "active"
    notes: str | None = None
    included: bool = True


class VisitPackAppointmentItem(BaseModel):
    id: str
    title: str
    provider_name: str | None = None
    location: str | None = None
    scheduled_at: str
    status: str
    included: bool = True


class VisitPackTaskItem(BaseModel):
    id: str
    title: str
    due_at: str | None = None
    priority: str = "medium"
    status: str = "pending"
    appointment_id: str | None = None
    included: bool = True


class VisitPackQuestionItem(BaseModel):
    question: str
    rationale: str | None = None
    source_reference: str | None = None
    included: bool = True


class DoctorVisitPackData(BaseModel):
    """Complete, user-reviewable visit pack structure."""
    patient_name: str
    patient_email: str
    profile_id: str | None = None
    profile_relationship: str | None = None
    clinician_name: str | None = None
    chief_complaint: str | None = None
    patient_notes: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    generated_at: str
    include_unverified: bool = False
    categories: list[str] = Field(default_factory=list)
    documents: list[VisitPackDocumentMeta] = Field(default_factory=list)
    observations: list[VisitPackObservationItem] = Field(default_factory=list)
    trends: list[VisitPackTrendItem] = Field(default_factory=list)
    medications: list[VisitPackMedicationItem] = Field(default_factory=list)
    appointments: list[VisitPackAppointmentItem] = Field(default_factory=list)
    follow_up_tasks: list[VisitPackTaskItem] = Field(default_factory=list)
    clinician_questions: list[VisitPackQuestionItem] = Field(default_factory=list)
    disclaimer: str


class VisitPackExportRequest(BaseModel):
    """Payload submitted when requesting the final formatted PDF export."""
    pack: DoctorVisitPackData
