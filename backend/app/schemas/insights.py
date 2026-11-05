from datetime import datetime
from typing import Any
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.chat import CitationItem


class OverviewMetrics(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_reports: int = Field(..., description="Total uploaded and extracted reports")
    verified_observations_count: int = Field(..., description="Observations verified by user")
    unverified_observations_count: int = Field(..., description="Unreviewed observations")
    distinct_test_types_count: int = Field(..., description="Distinct normalized analyte types")
    earliest_date: str | None = Field(None, description="Earliest clinical date (YYYY-MM-DD)")
    latest_date: str | None = Field(None, description="Latest clinical date (YYYY-MM-DD)")
    reports_with_missing_dates_count: int = Field(0, description="Reports lacking printed date")
    observations_missing_units_count: int = Field(0, description="Observations without unit")
    observations_missing_ranges_count: int = Field(0, description="Observations without reference range")
    comparable_tests_with_history_count: int = Field(0, description="Tests with >= 2 historical readings")
    noteworthy_findings_count: int = Field(0, description="Observations outside printed reference or flagged")


class FindingItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    observation_id: str
    document_id: str
    document_title: str
    clinical_date: str | None
    date_type: str = "actual"  # "actual" | "inferred"
    original_test_name: str
    normalized_test_name: str | None
    category: str | None
    value: str
    numeric_value: float | None
    unit: str | None
    reference_range: str | None
    laboratory_flag: str | None  # Original lab flag (HIGH, LOW, NORMAL, etc.)
    classification: str  # "below_reference", "within_reference", "above_reference", "qualitative_flagged", "unknown"
    requires_review: bool = False
    discrepancy_explanation: str | None = None
    is_reviewed: bool
    source_page: int
    source_text: str
    citation_id: str | None = None


class FindingsResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[FindingItem]


class LongitudinalTrendItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    normalized_test_name: str
    category: str | None
    standard_unit: str
    has_converted_units: bool = False
    previous_reading: dict[str, Any]  # { value, unit, clinical_date, document_title, document_id }
    latest_reading: dict[str, Any]    # { value, unit, clinical_date, document_title, document_id, is_reviewed }
    previous_standard_value: float | None
    latest_standard_value: float | None
    absolute_change: float | None
    percentage_change: float | None
    direction: str  # "increased", "decreased", "stable", "non_numeric"
    clinical_change_description: str
    citation_ids: list[str] = []


class LongitudinalTrendsResponse(BaseModel):
    items: list[LongitudinalTrendItem]


class DataQualityIssue(BaseModel):
    issue_type: str  # "missing_date", "inferred_date", "missing_unit", "missing_reference_range", "unverified_observation", "discrepant_flag"
    description: str
    document_id: str
    document_title: str
    observation_id: str | None = None
    test_name: str | None = None
    source_page: int | None = None


class DataQualityReport(BaseModel):
    total_issues: int
    missing_dates_count: int
    missing_units_count: int
    missing_ranges_count: int
    unverified_observations_count: int
    discrepant_flags_count: int
    issues: list[DataQualityIssue]


class PersonalizedHealthSummary(BaseModel):
    summary_mode: str  # "offline" or "llm_assisted"
    narrative_summary: str
    key_findings: list[str]
    longitudinal_highlights: list[str]
    data_quality_disclosures: list[str]
    suggested_clinician_questions: list[str]
    citations: list[CitationItem] = []
    medical_disclaimer: str
