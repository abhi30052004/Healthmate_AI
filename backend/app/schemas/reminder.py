"""Pydantic schemas for Smart Health Reminders and Notifications."""

import uuid
from datetime import datetime
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator


ReminderCategory = Literal[
    "medication",
    "appointment",
    "follow_up",
    "report_review",
    "general",
]

ReminderFrequency = Literal[
    "once",
    "daily",
    "weekly",
    "monthly",
]

DeliveryStatus = Literal[
    "pending",
    "delivered",
    "failed",
]


class ReminderBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Clear, non-sensitive reminder title")
    description: str | None = Field(None, max_length=1000, description="Optional brief notes or instructions")
    category: ReminderCategory = Field(default="general", description="Category of reminder")
    due_at: datetime = Field(..., description="Scheduled timestamp (parsed as UTC or with tzinfo)")
    timezone: str = Field(default="UTC", max_length=100, description="IANA timezone identifier, e.g. 'America/New_York'")
    frequency: ReminderFrequency = Field(default="once", description="Recurrence frequency")
    send_email: bool = Field(default=False, description="Whether to also attempt an email notification if configured")
    is_enabled: bool = Field(default=True, description="Whether the reminder is active")
    
    # Linked records
    medication_id: uuid.UUID | None = None
    appointment_id: uuid.UUID | None = None
    task_id: uuid.UUID | None = None
    document_id: uuid.UUID | None = None
    profile_id: uuid.UUID | None = None

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        clean_tz = v.strip()
        try:
            ZoneInfo(clean_tz)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError(f"Invalid IANA timezone identifier: '{clean_tz}'")
        return clean_tz


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    category: ReminderCategory | None = None
    due_at: datetime | None = None
    timezone: str | None = None
    frequency: ReminderFrequency | None = None
    send_email: bool | None = None
    is_enabled: bool | None = None
    medication_id: uuid.UUID | None = None
    appointment_id: uuid.UUID | None = None
    task_id: uuid.UUID | None = None
    document_id: uuid.UUID | None = None
    profile_id: uuid.UUID | None = None

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        clean_tz = v.strip()
        try:
            ZoneInfo(clean_tz)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError(f"Invalid IANA timezone identifier: '{clean_tz}'")
        return clean_tz


class ReminderResponse(ReminderBase):
    id: uuid.UUID
    user_id: uuid.UUID
    delivery_status: DeliveryStatus
    delivered_at: datetime | None = None
    delivery_error: str | None = None
    is_acknowledged: bool
    acknowledged_at: datetime | None = None
    is_dismissed: bool
    dismissed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    # Linked entity metadata for convenience
    linked_title: str | None = None
    profile_name: str | None = None
    profile_relationship: str | None = None
    clinical_disclaimer: str = (
        "Reminder only. Acknowledging a reminder confirms notification receipt only and does "
        "not constitute medical confirmation that medication was administered or taken."
    )

    model_config = ConfigDict(from_attributes=True)


class InAppNotificationItem(BaseModel):
    reminder_id: uuid.UUID
    title: str
    description: str | None = None
    category: ReminderCategory
    due_at: datetime
    timezone: str
    delivery_status: DeliveryStatus
    delivered_at: datetime | None = None
    is_acknowledged: bool
    is_overdue: bool
    delivery_channel: str = "in_app"
    email_delivery_status: str | None = None
    profile_id: uuid.UUID | None = None
    profile_name: str | None = None
    clinical_disclaimer: str = (
        "Reminder only. Acknowledging this notification records that you saw it; "
        "it does not verify medication ingestion or clinical compliance."
    )


class ReminderAcknowledgeResponse(BaseModel):
    reminder_id: uuid.UUID
    is_acknowledged: bool
    acknowledged_at: datetime
    message: str = "Reminder acknowledged. Note: this records notification receipt only and does not verify medication administration."


class ReminderProcessDueSummary(BaseModel):
    processed_count: int
    delivered_in_app: int
    emails_sent: int
    emails_skipped: int
    errors: list[str] = []
