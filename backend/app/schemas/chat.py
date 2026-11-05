from datetime import datetime
from typing import Any
import uuid

from pydantic import BaseModel, ConfigDict, Field


class CitationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    citation_id: str = Field(..., description="Stable citation identifier, e.g. [S1]")
    document_id: str = Field(..., description="Source document UUID")
    document_title: str = Field(..., description="Source document file name")
    observation_id: str | None = Field(None, description="Observation UUID if derived from observation")
    original_test_name: str | None = Field(None, description="Verbatim test name printed in report")
    normalized_test_name: str | None = Field(None, description="Canonical test analyte name")
    value: str | None = Field(None, description="Observed result value")
    unit: str | None = Field(None, description="Laboratory measurement unit")
    reference_range: str | None = Field(None, description="Laboratory reference range")
    abnormal_flag: str | None = Field(None, description="Recorded flag: HIGH, LOW, NORMAL, ABNORMAL")
    clinical_date: str | None = Field(None, description="Best available clinical date (YYYY-MM-DD)")
    date_type: str = Field("actual", description="'actual' (report date) or 'inferred' (upload date)")
    page_number: int | None = Field(None, description="Source page number (null if unavailable, never invented)")
    source_text: str | None = Field(None, description="Verbatim extracted line or supporting excerpt")
    is_reviewed: bool = Field(False, description="Whether observation has been verified by user")
    relevance_score: float | None = Field(None, description="Heuristic retrieval relevance score")


class MedicalChatMessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="The user's clinical inquiry or medical question")
    include_unverified: bool = Field(False, description="Whether to include unreviewed observations in retrieval")
    profile_id: uuid.UUID | None = Field(None, description="Optional family profile ID to scope evidence retrieval")
    include_archived: bool = Field(False, description="Whether to include archived records in retrieval")


class MedicalChatMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    citations: list[CitationItem] | None = None
    created_at: datetime


class MedicalChatConversationCreate(BaseModel):
    title: str | None = Field(None, max_length=255, description="Optional conversation title")


class MedicalChatConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class MedicalChatConversationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MedicalChatMessageRead] = []


class MedicalChatAnswerResponse(BaseModel):
    conversation_id: str
    message_id: str
    answer: str
    citations: list[CitationItem] = []
    retrieval_metadata: dict[str, Any] = Field(default_factory=dict)
