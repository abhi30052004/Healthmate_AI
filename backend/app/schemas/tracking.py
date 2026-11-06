"""Schemas for dose tracking and the symptom diary."""

import re
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

_HHMM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

DoseOutcome = Literal["taken", "skipped", "snoozed"]
Severity = Literal["mild", "moderate", "severe"]


class DoseSlot(BaseModel):
    """One scheduled dose on one date, with the user's recorded outcome (if any)."""

    medication_id: uuid.UUID
    medication_name: str
    strength: str | None = None
    instructions: str | None = None
    profile_id: uuid.UUID | None = None
    scheduled_date: date
    scheduled_time: str
    outcome: DoseOutcome | None = None
    log_id: uuid.UUID | None = None
    logged_at: datetime | None = None
    snoozed_until: datetime | None = None


class DoseLogUpsert(BaseModel):
    medication_id: uuid.UUID
    scheduled_date: date
    scheduled_time: str
    outcome: DoseOutcome
    snooze_minutes: int = Field(default=15, ge=1, le=240)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("scheduled_time")
    @classmethod
    def _valid_time(cls, v: str) -> str:
        v = v.strip()
        if not _HHMM.match(v):
            raise ValueError("scheduled_time must be 24-hour HH:MM")
        return v


class DoseLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    medication_id: uuid.UUID
    profile_id: uuid.UUID | None = None
    scheduled_date: date
    scheduled_time: str
    outcome: DoseOutcome
    snoozed_until: datetime | None = None
    note: str | None = None
    logged_at: datetime


class AdherenceDay(BaseModel):
    date: date
    expected: int
    taken: int
    skipped: int
    missed: int  # past days only: expected - taken - skipped


class AdherenceSummary(BaseModel):
    days: int
    expected: int
    taken: int
    skipped: int
    missed: int
    taken_percent: int | None = None  # None when nothing was scheduled
    per_day: list[AdherenceDay]
    note: str = "Based on doses you recorded. This is a log of your own entries, not medical advice."


class SymptomBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    severity: Severity = "mild"
    notes: str | None = Field(default=None, max_length=2000)
    occurred_at: datetime
    include_in_visit_pack: bool = True
    profile_id: uuid.UUID | None = None

    @field_validator("title")
    @classmethod
    def _title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title must not be blank")
        return v

    @field_validator("occurred_at")
    @classmethod
    def _not_future(cls, v: datetime) -> datetime:
        aware = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        if aware > datetime.now(timezone.utc) + timedelta(minutes=10):
            raise ValueError("occurred_at cannot be in the future")
        return v


class SymptomCreate(SymptomBase):
    pass


class SymptomUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    severity: Severity | None = None
    notes: str | None = Field(default=None, max_length=2000)
    occurred_at: datetime | None = None
    include_in_visit_pack: bool | None = None


class SymptomResponse(SymptomBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
