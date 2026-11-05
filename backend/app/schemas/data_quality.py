"""Pydantic schemas for Feature 5: Duplicate Detection & Data Quality Center."""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MatchReason(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str = Field(..., description="Machine-readable reason code, e.g. EXACT_HASH")
    description: str = Field(..., description="Human-readable explanation of why records matched")
    metrics: Optional[Dict[str, Any]] = Field(None, description="Detailed metrics, e.g. similarity ratio")


class RecordSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    date: Optional[str] = None
    detail: Optional[str] = None
    is_archived: bool = False


class DuplicateCandidateItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    profile_id: uuid.UUID
    profile_name: str
    record_type: Literal["document", "observation"]
    primary_record_id: uuid.UUID
    secondary_record_id: uuid.UUID
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    match_reasons: List[MatchReason]
    status: Literal["pending", "confirmed_duplicate", "not_duplicate", "resolved"]
    retained_record_id: Optional[uuid.UUID] = None
    archived_record_id: Optional[uuid.UUID] = None
    resolution_action: Optional[str] = None
    decision_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    primary_summary: Optional[RecordSummary] = None
    secondary_summary: Optional[RecordSummary] = None


class DuplicateCandidateListResponse(BaseModel):
    items: List[DuplicateCandidateItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class DuplicateComparisonView(BaseModel):
    candidate: DuplicateCandidateItem
    primary_record: Dict[str, Any]
    secondary_record: Dict[str, Any]
    similarities: List[str]
    differences: List[str]


class ResolveDuplicateRequest(BaseModel):
    retained_record_id: uuid.UUID = Field(..., description="ID of the record to retain as active")
    notes: Optional[str] = Field(None, max_length=500, description="Optional justification or clinical rationale")


class DismissDuplicateRequest(BaseModel):
    notes: Optional[str] = Field(None, max_length=500, description="Optional reason why records are distinct")


class DataQualitySummary(BaseModel):
    total_candidates: int
    pending_count: int
    confirmed_count: int
    resolved_count: int
    dismissed_count: int
    high_confidence_count: int
    documents_count: int
    observations_count: int


class DataQualityAuditLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    candidate_id: Optional[uuid.UUID] = None
    action: str
    record_type: str
    retained_record_id: Optional[uuid.UUID] = None
    archived_record_id: Optional[uuid.UUID] = None
    details: Dict[str, Any]
    created_at: datetime
