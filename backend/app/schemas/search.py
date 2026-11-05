from datetime import datetime
from typing import Literal
import uuid
from pydantic import BaseModel, Field


class SearchResultItem(BaseModel):
    id: str = Field(..., description="Unique result ID")
    result_type: Literal["document", "observation", "medication", "appointment", "follow_up"]
    record_id: str = Field(..., description="Underlying record UUID")
    title: str = Field(..., description="Display title or analyte name")
    snippet: str = Field(..., description="Highlighted matching text or description")
    source_document_id: str | None = None
    source_document_title: str | None = None
    page_number: int | None = None
    date: str | None = None
    date_provenance: Literal["explicit", "inferred", "unknown"] = "unknown"
    is_verified: bool | None = None
    verification_status: Literal["verified", "unverified", "reviewed", "not_applicable"] | None = None
    value: str | None = None
    unit: str | None = None
    reference_range: str | None = None
    flag: str | None = None
    relevance_score: float = 0.0
    frontend_destination: str = Field(..., description="Tab or target in frontend, e.g. documents, timeline, care")


class SearchQueryRequest(BaseModel):
    q: str = Field(..., min_length=1, max_length=500, description="Search query")
    source_type: Literal["all", "document", "observation", "medication", "appointment", "follow_up"] = "all"
    start_date: str | None = Field(default=None, description="ISO date boundary start")
    end_date: str | None = Field(default=None, description="ISO date boundary end")
    verified_only: bool = Field(default=True, description="When true, exclude unverified clinical observations")
    sort_by: Literal["relevance", "date"] = "relevance"
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Results per page")
    include_archived: bool = Field(default=False, description="When true, include archived records")
    profile_id: uuid.UUID | None = Field(default=None, description="Filter by family profile ID")


class SearchResponse(BaseModel):
    query: str
    parsed_intent: str | None = None
    total_results: int
    page: int
    page_size: int
    results: list[SearchResultItem]
    disclaimer: str = (
        "This search feature retrieves stored records for reference only. "
        "It does not provide medical advice, diagnosis, or treatment recommendations."
    )
