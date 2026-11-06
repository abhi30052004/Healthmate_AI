import uuid
from datetime import date, datetime, time, timedelta
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ObservationBase(BaseModel):
    test_name: str
    normalized_test_name: str | None = None
    category: str | None = None
    value: str
    numeric_value: float | None = None
    unit: str | None = None
    reference_range: str | None = None
    flag: str | None = None  # "HIGH", "LOW", "NORMAL", "ABNORMAL"
    source_page: int = 1
    source_text: str
    is_low_confidence: bool = False
    is_reviewed: bool = False


class ObservationRead(ObservationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime | None = None


class ObservationUpdate(BaseModel):
    test_name: str | None = None
    value: str | None = None
    numeric_value: float | None = None
    unit: str | None = None
    reference_range: str | None = None
    flag: str | None = None
    is_reviewed: bool = True


class DocumentBase(BaseModel):
    filename: str
    mime_type: str
    file_size: int
    processing_status: str
    is_verified: bool = False


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    profile_id: uuid.UUID | None = None
    filename: str
    mime_type: str
    file_size: int
    checksum_sha256: str
    processing_status: str
    error_message: str | None = None
    page_count: int | None = None
    ocr_applied: bool = False
    patient_name: str | None = None
    document_date: str | None = None
    lab_name: str | None = None
    is_verified: bool
    verified_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None
    observations: list[ObservationRead] = Field(default_factory=list)


class DocumentTextResponse(BaseModel):
    document_id: uuid.UUID
    filename: str
    processing_status: str
    page_count: int | None = None
    ocr_applied: bool = False
    extracted_text: str | None = None
    is_verified: bool
    verified_at: datetime | None = None


class DocumentVerifyResponse(BaseModel):
    document_id: uuid.UUID
    is_verified: bool
    verified_at: datetime
    observations_verified_count: int = 0
    message: str = "Extracted document content confirmed by user."


class ObservationCreate(BaseModel):
    """A single user-entered result (manual entry, or a row the extractor missed)."""

    test_name: str = Field(min_length=1, max_length=255)
    value: str = Field(min_length=1, max_length=100)
    unit: str | None = Field(default=None, max_length=50)
    reference_range: str | None = Field(default=None, max_length=100)

    @field_validator("test_name", "value")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v


class ManualEntryCreate(BaseModel):
    """Manual lab / vital entry. Becomes a verified, file-less record in the profile."""

    profile_id: uuid.UUID | None = None
    entry_type: Literal["lab", "vital", "other"] = "lab"
    entry_date: date
    entry_time: time | None = None
    source_label: str | None = Field(default=None, max_length=255)
    observations: list[ObservationCreate] = Field(min_length=1, max_length=50)

    @field_validator("entry_date")
    @classmethod
    def _not_in_future(cls, v: date) -> date:
        if v > date.today() + timedelta(days=1):
            raise ValueError("entry_date cannot be in the future")
        return v
