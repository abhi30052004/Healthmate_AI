"""Pydantic schemas for Feature 4: Secure Doctor Sharing."""

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SharedResourcesConfig(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_ids: List[uuid.UUID] = Field(
        default_factory=list,
        description="List of document IDs explicitly selected for sharing",
    )
    include_visit_pack: bool = Field(
        default=False,
        description="Whether a Doctor Visit Preparation Pack is shared",
    )
    visit_pack_categories: List[str] = Field(
        default_factory=lambda: ["documents", "observations", "medications", "appointments"],
        description="Sections included in the visit pack summary",
    )
    include_medications: bool = Field(
        default=False,
        description="Whether active care medications list is shared",
    )
    include_appointments: bool = Field(
        default=False,
        description="Whether upcoming care appointments are shared",
    )

    @field_validator("document_ids", mode="before")
    @classmethod
    def parse_doc_ids(cls, v: Any) -> List[uuid.UUID]:
        if not v:
            return []
        res = []
        for item in v:
            if isinstance(item, uuid.UUID):
                res.append(item)
            else:
                try:
                    res.append(uuid.UUID(str(item)))
                except (ValueError, TypeError):
                    pass
        return res

    def has_at_least_one_resource(self) -> bool:
        return bool(
            self.document_ids
            or self.include_visit_pack
            or self.include_medications
            or self.include_appointments
        )


class DoctorSharingCreate(BaseModel):
    profile_id: uuid.UUID = Field(..., description="ID of the family profile being shared")
    doctor_name: str = Field(..., min_length=1, max_length=255, description="Name of the doctor/recipient")
    doctor_email: Optional[str] = Field(None, max_length=255, description="Email of doctor if known")
    expires_in_days: int = Field(
        default=7,
        ge=1,
        le=30,
        description="Lifetime of the share link in days (1-30 days max)",
    )
    shared_resources: SharedResourcesConfig = Field(
        ...,
        description="Explicitly selected resources to share",
    )
    notes: Optional[str] = Field(None, max_length=1000, description="Optional notes or instructions for doctor")

    @field_validator("doctor_name")
    @classmethod
    def validate_doctor_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Doctor name cannot be empty or whitespace only.")
        return clean

    @field_validator("shared_resources")
    @classmethod
    def validate_non_empty_resources(cls, v: SharedResourcesConfig) -> SharedResourcesConfig:
        if not v.has_at_least_one_resource():
            raise ValueError("At least one resource (document, visit pack, medications, or appointments) must be selected for sharing.")
        return v


class DoctorSharingItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    profile_id: uuid.UUID
    profile_name: str
    doctor_name: str
    doctor_email: Optional[str]
    status: str
    is_expired: bool
    expires_at: datetime
    revoked_at: Optional[datetime] = None
    last_accessed_at: Optional[datetime] = None
    access_count: int
    shared_resources: SharedResourcesConfig
    notes: Optional[str] = None
    created_at: datetime


class DoctorSharingCreateResponse(DoctorSharingItemResponse):
    access_token: str = Field(..., description="High-entropy raw bearer token returned strictly once upon creation")
    share_url: str = Field(..., description="Relative or absolute URL for the doctor access portal")


class DoctorSharingAuditLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    event_type: str
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime


class DoctorSharedDocumentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    category: Optional[str] = None
    document_date: Optional[date] = None
    file_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    summary: Optional[str] = None


class DoctorSharedMedicationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    is_active: bool
    notes: Optional[str] = None


class DoctorSharedAppointmentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    doctor_name: str
    specialty: Optional[str] = None
    appointment_date: Optional[datetime] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class DoctorSharedHealthView(BaseModel):
    """Clinical summary presented to the authorized doctor via valid bearer token."""
    patient_name: str
    patient_relationship: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    allergies_summary: Optional[str] = None
    emergency_contact: Optional[str] = None
    doctor_name: str
    expires_at: datetime
    status: str
    shared_resources: SharedResourcesConfig
    documents: List[DoctorSharedDocumentItem] = Field(default_factory=list)
    medications: List[DoctorSharedMedicationItem] = Field(default_factory=list)
    appointments: List[DoctorSharedAppointmentItem] = Field(default_factory=list)
    has_visit_pack: bool = False
    notes: Optional[str] = None
