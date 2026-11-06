import re
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

_HHMM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _clean_times(value: list[str] | None) -> list[str]:
    if not value:
        return []
    out = sorted({v.strip() for v in value})
    for v in out:
        if not _HHMM.match(v):
            raise ValueError(f"Invalid dose time '{v}'. Use 24-hour HH:MM.")
    if len(out) > 12:
        raise ValueError("At most 12 dose times per day.")
    return out


def _clean_days(value: list[int] | None) -> list[int]:
    if not value:
        return []
    out = sorted(set(value))
    if any(d < 0 or d > 6 for d in out):
        raise ValueError("Days must be 0 (Monday) to 6 (Sunday).")
    return out


# ---------------------------------------------------------------------------
# Medication Schemas
# ---------------------------------------------------------------------------

class MedicationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Medication or supplement name")
    medication_type: str | None = Field(None, max_length=100, description="Prescription, OTC, Supplement, etc.")
    strength: str | None = Field(None, max_length=100, description="Exact recorded strength, e.g. '500 mg'")
    dosage_instructions: str | None = Field(None, description="Exact user-entered instructions, e.g. 'Take 1 tablet by mouth daily'")
    route: str | None = Field(None, max_length=100, description="Route of administration, e.g. 'Oral'")
    frequency: str | None = Field(None, max_length=150, description="Frequency, e.g. 'Once daily in the morning'")
    schedule_times: list[str] = Field(default_factory=list, description="24h HH:MM dose times, as prescribed")
    schedule_days: list[int] = Field(default_factory=list, description="Weekdays 0=Mon..6=Sun; empty = every day")
    start_date: date | None = None
    end_date: date | None = None
    prescriber: str | None = Field(None, max_length=255, description="Prescribing clinician or facility")
    pharmacy: str | None = Field(None, max_length=255, description="Dispensing pharmacy")
    notes: str | None = Field(None, description="User-entered clinical notes")
    source_document_id: uuid.UUID | None = None
    profile_id: uuid.UUID | None = None
    status: Literal["active", "paused", "completed", "archived"] = "active"

    @field_validator("schedule_times", mode="before")
    @classmethod
    def _times(cls, v):
        return _clean_times(v)

    @field_validator("schedule_days", mode="before")
    @classmethod
    def _days(cls, v):
        return _clean_days(v)


class MedicationCreate(MedicationBase):
    pass


class MedicationUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    medication_type: str | None = None
    strength: str | None = None
    dosage_instructions: str | None = None
    route: str | None = None
    frequency: str | None = None
    schedule_times: list[str] | None = None
    schedule_days: list[int] | None = None
    start_date: date | None = None
    end_date: date | None = None
    prescriber: str | None = None
    pharmacy: str | None = None
    notes: str | None = None
    source_document_id: uuid.UUID | None = None
    profile_id: uuid.UUID | None = None
    status: Literal["active", "paused", "completed", "archived"] | None = None

    @field_validator("schedule_times", mode="before")
    @classmethod
    def _times(cls, v):
        return None if v is None else _clean_times(v)

    @field_validator("schedule_days", mode="before")
    @classmethod
    def _days(cls, v):
        return None if v is None else _clean_days(v)


class MedicationResponse(MedicationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    source_document_title: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Appointment Schemas
# ---------------------------------------------------------------------------

class AppointmentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Appointment title or purpose")
    appointment_type: str | None = Field(None, max_length=100, description="Consultation, Follow-up, Lab Work, etc.")
    provider_name: str | None = Field(None, max_length=255, description="Physician, specialist, or facility")
    location: str | None = Field(None, max_length=255, description="Clinic address, room, or 'Telehealth'")
    scheduled_at: datetime = Field(..., description="Scheduled appointment datetime (timezone-aware)")
    timezone: str | None = Field("UTC", max_length=100, description="Intended timezone name")
    source_document_id: uuid.UUID | None = None
    profile_id: uuid.UUID | None = None
    notes: str | None = Field(None, description="Personal pre-visit questions or notes")
    status: Literal["scheduled", "completed", "cancelled", "rescheduled"] = "scheduled"


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    appointment_type: str | None = None
    provider_name: str | None = None
    location: str | None = None
    scheduled_at: datetime | None = None
    timezone: str | None = None
    status: Literal["scheduled", "completed", "cancelled", "rescheduled"] | None = None
    notes: str | None = None
    source_document_id: uuid.UUID | None = None
    profile_id: uuid.UUID | None = None


class AppointmentResponse(AppointmentBase):
    id: uuid.UUID
    user_id: uuid.UUID
    source_document_title: str | None = None
    follow_up_tasks_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Follow-Up Task Schemas
# ---------------------------------------------------------------------------

class FollowUpTaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Task title, e.g. 'Fast 12 hours before blood draw'")
    description: str | None = Field(None, description="Detailed instructions or clinical context")
    due_at: datetime | None = Field(None, description="Target completion deadline")
    status: Literal["pending", "completed", "dismissed"] = "pending"
    priority: Literal["low", "medium", "high"] = "medium"
    source_document_id: uuid.UUID | None = None
    appointment_id: uuid.UUID | None = None
    profile_id: uuid.UUID | None = None


class FollowUpTaskCreate(FollowUpTaskBase):
    pass


class FollowUpTaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    due_at: datetime | None = None
    status: Literal["pending", "completed", "dismissed"] | None = None
    priority: Literal["low", "medium", "high"] | None = None
    source_document_id: uuid.UUID | None = None
    appointment_id: uuid.UUID | None = None
    profile_id: uuid.UUID | None = None


class FollowUpTaskResponse(FollowUpTaskBase):
    id: uuid.UUID
    user_id: uuid.UUID
    source_document_title: str | None = None
    appointment_title: str | None = None
    is_overdue: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Unified Care Calendar Schemas
# ---------------------------------------------------------------------------

class CareCalendarItem(BaseModel):
    id: str
    item_type: Literal["appointment", "follow_up"]
    title: str
    scheduled_or_due_at: datetime
    timezone: str | None = None
    status: str
    priority: str | None = None
    provider_or_location: str | None = None
    description_or_notes: str | None = None
    appointment_id: str | None = None
    source_document_id: str | None = None
    source_document_title: str | None = None


class CareCalendarResponse(BaseModel):
    start_date: datetime | None = None
    end_date: datetime | None = None
    items: list[CareCalendarItem]
    total: int


# ---------------------------------------------------------------------------
# Care Overview Response
# ---------------------------------------------------------------------------

class CareOverviewResponse(BaseModel):
    active_medications_count: int
    upcoming_appointments_count: int
    pending_follow_ups_count: int
    overdue_follow_ups_count: int
    upcoming_appointments: list[AppointmentResponse]
    pending_tasks: list[FollowUpTaskResponse]
    active_medications: list[MedicationResponse]
    disclaimer: str = (
        "HealthMate AI Care Organizer is a personal organization and recordkeeping tool. "
        "It does not prescribe medication, calculate or alter dosages, diagnose conditions, or provide medical advice. "
        "Always follow the instructions of your qualified healthcare provider."
    )
