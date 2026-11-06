"""Pydantic schemas for Family Health Profiles."""

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


RelationshipType = Literal[
    "self",
    "spouse",
    "child",
    "parent",
    "sibling",
    "dependent",
    "other",
]

ConsentStatusType = Literal[
    "authorized",
    "pending_consent",
    "revoked",
]

GenderType = Literal[
    "male",
    "female",
    "other",
    "prefer_not_to_say",
]


class FamilyProfileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Full name of family member")
    relationship: RelationshipType = Field(default="other", description="Relationship to account owner")
    date_of_birth: date | None = Field(None, description="Date of birth (YYYY-MM-DD)")
    gender: GenderType | None = Field(None, description="Gender identity")
    blood_type: str | None = Field(None, max_length=20, description="Blood type, e.g. O+, A-")
    emergency_contact_name: str | None = Field(None, max_length=255, description="Emergency contact name")
    emergency_contact_phone: str | None = Field(None, max_length=50, description="Emergency contact phone number")
    allergies_summary: str | None = Field(None, max_length=2000, description="Known allergies or sensitivities")
    conditions_summary: str | None = Field(None, max_length=2000, description="User-entered known conditions")
    avatar_color: str | None = Field(None, max_length=50, description="Avatar theme color or code")
    is_dependent: bool = Field(default=False, description="Whether this individual is a legal dependent")
    consent_status: ConsentStatusType = Field(default="authorized", description="Authorization or consent state")
    consent_notes: str | None = Field(None, max_length=1000, description="Consent notes or documentation reference")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Name cannot be empty or whitespace only.")
        return clean

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: date | None) -> date | None:
        if v is not None and v > date.today():
            raise ValueError("Date of birth cannot be in the future.")
        return v


class FamilyProfileCreate(FamilyProfileBase):
    pass


class FamilyProfileUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    relationship: RelationshipType | None = None
    date_of_birth: date | None = None
    gender: GenderType | None = None
    blood_type: str | None = Field(None, max_length=20)
    emergency_contact_name: str | None = Field(None, max_length=255)
    emergency_contact_phone: str | None = Field(None, max_length=50)
    allergies_summary: str | None = Field(None, max_length=2000)
    conditions_summary: str | None = Field(None, max_length=2000)
    avatar_color: str | None = Field(None, max_length=50)
    is_dependent: bool | None = None
    consent_status: ConsentStatusType | None = None
    consent_notes: str | None = Field(None, max_length=1000)
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        clean = v.strip()
        if not clean:
            raise ValueError("Name cannot be empty or whitespace only.")
        return clean

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: date | None) -> date | None:
        if v is not None and v > date.today():
            raise ValueError("Date of birth cannot be in the future.")
        return v


class ProfileHealthSummary(BaseModel):
    document_count: int = 0
    medication_count: int = 0
    appointment_count: int = 0
    reminder_count: int = 0


class FamilyProfileResponse(FamilyProfileBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    is_primary: bool
    is_active: bool
    consent_granted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    health_summary: ProfileHealthSummary | None = None

    model_config = ConfigDict(from_attributes=True)


class FamilyProfileDeactivateResponse(BaseModel):
    profile_id: uuid.UUID
    name: str
    is_active: bool
    message: str = "Family profile has been safely archived."
    record_retention_note: str = (
        "In accordance with healthcare record retention and auditability standards, "
        "historical medical documents, observations, care records, and reminders remain "
        "securely preserved."
    )


class EmergencyLinkStatus(BaseModel):
    """Owner view of a profile's public emergency-card link."""

    enabled: bool
    token: str | None = None


class PublicEmergencyCard(BaseModel):
    """What a first responder sees after scanning the QR code. Deliberately minimal."""

    name: str
    age_years: int | None = None
    blood_type: str | None = None
    allergies: str | None = None
    conditions: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    updated_at: datetime
