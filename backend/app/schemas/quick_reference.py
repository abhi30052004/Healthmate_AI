"""Pydantic schemas for the Quick Reference AI Assistant.

Complies strictly with QUICK_REFERENCE_AI.md, API.md section 7A, and F-37.
"""

from typing import Any, Literal
from pydantic import BaseModel, Field


class QuickReferenceQueryRequest(BaseModel):
    """Payload for general medical reference or public educational queries."""

    mode: Literal[
        "medical_term",
        "understand_test",
        "general_reference",
        "explain_report",
        "find_records",
        "prepare_doctor_questions",
    ] = Field("medical_term", description="Quick Reference Assistant mode")
    question: str = Field(..., min_length=1, max_length=1000, description="User question or medical term")
    term: str | None = Field(None, max_length=200, description="Optional explicit clinical term")
    unit: str | None = Field(None, max_length=50, description="Optional unit for test context")
    record_ids: list[str] = Field(default_factory=list, description="Optional selected document/record IDs")
    include_archived: bool = Field(False, description="When true, query includes archived records if permitted")
    response_style: Literal["concise", "expanded"] = Field("concise", description="Detail level of answer")


class ProfileQuickReferenceRequest(BaseModel):
    """Payload for authenticated, profile-scoped personal record queries."""

    mode: Literal[
        "explain_report",
        "find_records",
        "prepare_doctor_questions",
    ] = Field("explain_report", description="Record-scoped Quick Reference mode")
    question: str = Field(..., min_length=1, max_length=1000, description="Question about the user's records")
    record_ids: list[str] = Field(default_factory=list, description="User-selected verified documents/reports")
    include_archived: bool = Field(False, description="Whether to include archived profile documents")
    response_style: Literal["concise", "expanded"] = Field("concise", description="Detail level of answer")


class SourceItem(BaseModel):
    """Public curated medical reference source metadata."""

    id: str
    title: str
    publisher: str
    url: str
    published_at: str | None = None
    retrieved_at: str
    license_or_reuse_note: str | None = None


class RecordCitationItem(BaseModel):
    """Citation linking a personal clinical record observation to its source document."""

    id: str
    document_id: str
    document_title: str
    page_number: int | None = None
    clinical_date: str | None = None
    test_name: str | None = None
    value: str | None = None
    unit: str | None = None
    reference_range: str | None = None
    abnormal_flag: str | None = None
    is_reviewed: bool = True


class GenerationMetadata(BaseModel):
    """Observability metadata on provider generation and cache status."""

    used: bool
    provider: str
    cached: bool


class QuickReferenceResponse(BaseModel):
    """Unified response contract for Quick Reference AI."""

    mode: str
    scope: Literal["general_reference", "from_records"]
    answer: str
    expanded_answer: str | None = None
    sources: list[SourceItem] = Field(default_factory=list)
    record_citations: list[RecordCitationItem] = Field(default_factory=list)
    limitations: list[str] = Field(
        default_factory=lambda: [
            "This information helps explain health records and general medical terms. "
            "It does not diagnose or prescribe. Discuss decisions with your doctor."
        ]
    )
    generation: GenerationMetadata
    status: Literal["grounded", "no_evidence_found", "fallback", "quota_exhausted", "emergency_redirect"]
    request_id: str
    questions_to_ask: list[str] = Field(default_factory=list)


class SuggestionMode(BaseModel):
    mode: str
    title: str
    description: str
    example_prompts: list[str]


class SuggestionsResponse(BaseModel):
    suggestions: list[SuggestionMode]


class CuratedSourcesResponse(BaseModel):
    count: int
    sources: list[dict[str, Any]]


class AiUsageResponse(BaseModel):
    quick_reference_limit: int
    quick_reference_used: int
    quick_reference_remaining: int
    chat_limit: int
    chat_used: int
    chat_remaining: int
    quota_reset_at: str

