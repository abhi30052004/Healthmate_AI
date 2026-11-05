import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TimelineItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    document_filename: str
    clinical_date: str
    date_type: str  # "actual" or "inferred"
    lab_name: str | None = None
    patient_name: str | None = None
    original_test_name: str
    normalized_test_name: str
    category: str
    value: str
    numeric_value: float | None = None
    unit: str | None = None
    reference_range: str | None = None
    flag: str | None = None  # "HIGH", "LOW", "NORMAL", "ABNORMAL"
    source_page: int
    source_text: str
    is_reviewed: bool
    is_low_confidence: bool
    created_at: datetime


class TimelineResponse(BaseModel):
    items: list[TimelineItem]
    total: int
    limit: int
    offset: int


class TrendPoint(BaseModel):
    observation_id: uuid.UUID
    document_id: uuid.UUID
    document_filename: str
    date: str
    date_type: str  # "actual" or "inferred"
    value: str
    numeric_value: float
    original_unit: str | None
    standardized_numeric_value: float
    reference_range: str | None = None
    flag: str | None = None
    is_reviewed: bool
    source_page: int
    source_text: str


class TrendSeries(BaseModel):
    normalized_test_name: str
    category: str
    standard_unit: str
    points: list[TrendPoint]
    has_multiple_points: bool
    has_converted_units: bool
    warning_message: str | None = None


class TrendResponse(BaseModel):
    series: list[TrendSeries]


class RepeatedTestMetric(BaseModel):
    normalized_test_name: str
    category: str
    count: int
    dates: list[str]
    unit: str | None
    earliest_value: str
    latest_value: str
    trajectory_summary: str


class TimelineSummaryResponse(BaseModel):
    total_reports: int
    total_observations: int
    reviewed_observations_count: int
    unverified_observations_count: int
    earliest_date: str | None = None
    latest_date: str | None = None
    categories: list[str] = Field(default_factory=list)
    repeated_tests: list[RepeatedTestMetric] = Field(default_factory=list)
    abnormal_findings_count: int = 0
