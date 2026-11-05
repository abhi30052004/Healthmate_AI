from typing import Literal
from pydantic import BaseModel, Field


ComparisonClassification = Literal[
    "unchanged",
    "increased",
    "decreased",
    "new",
    "not_found",
    "incompatible_units",
    "needs_review",
    "qualitative_changed",
]


class ComparisonReportMeta(BaseModel):
    document_id: str
    document_title: str
    clinical_date: str
    date_provenance: Literal["actual", "inferred"]
    lab_name: str | None = None
    observation_count: int = 0
    is_verified: bool = False


class ReportComparisonItem(BaseModel):
    test_name: str
    normalized_test_name: str
    category: str
    classification: ComparisonClassification
    classification_label: str

    # Baseline observation details
    baseline_value: str | None = None
    baseline_unit: str | None = None
    baseline_numeric: float | None = None
    baseline_reference_range: str | None = None
    baseline_flag: str | None = None
    baseline_date: str | None = None
    baseline_document_id: str | None = None
    baseline_document_title: str | None = None
    baseline_page: int | None = None
    baseline_source_text: str | None = None
    baseline_is_verified: bool | None = None

    # Newer observation details
    newer_value: str | None = None
    newer_unit: str | None = None
    newer_numeric: float | None = None
    newer_reference_range: str | None = None
    newer_flag: str | None = None
    newer_date: str | None = None
    newer_document_id: str | None = None
    newer_document_title: str | None = None
    newer_page: int | None = None
    newer_source_text: str | None = None
    newer_is_verified: bool | None = None

    # Harmonization & changes
    standard_unit: str | None = None
    has_converted_units: bool = False
    absolute_change: float | None = None
    percentage_change: float | None = None
    clinical_change_description: str

    # Review flag & discrepancies
    requires_review: bool = False
    review_explanation: str | None = None


class ComparisonSummaryMetrics(BaseModel):
    total_comparisons: int = 0
    increased_count: int = 0
    decreased_count: int = 0
    unchanged_count: int = 0
    new_tests_count: int = 0
    missing_tests_count: int = 0
    incompatible_units_count: int = 0
    qualitative_changed_count: int = 0
    needs_review_count: int = 0
    unverified_count: int = 0


class ReportComparisonRequest(BaseModel):
    document_ids: list[str] = Field(..., min_length=2, max_length=10)
    order_by_date: bool = True
    include_unverified: bool = False
    profile_id: str | None = None


class ReportComparisonResponse(BaseModel):
    selected_reports: list[ComparisonReportMeta]
    ordering_mode: Literal["chronological", "user_selected"]
    summary: ComparisonSummaryMetrics
    items: list[ReportComparisonItem]
    warnings: list[str]
    medical_disclaimer: str
