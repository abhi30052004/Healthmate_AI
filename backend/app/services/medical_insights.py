"""Deterministic Medical Insights Service.

Performs evidence-grounded calculations over authenticated medical records:
- Evaluates reference ranges without inventing clinical norms
- Compares longitudinal trends with compatible unit harmonization
- Identifies data-quality and incomplete information indicators
- Enforces strict tenant isolation and non-diagnostic boundaries
"""

from datetime import datetime
import re
from typing import Any
import uuid

from sqlalchemy.orm import Session

from app.models.document import Document, DocumentObservation
from app.models.user import User
from app.schemas.insights import (
    DataQualityIssue,
    DataQualityReport,
    FindingItem,
    FindingsResponse,
    LongitudinalTrendItem,
    LongitudinalTrendsResponse,
    OverviewMetrics,
)
from app.services.normalization import are_units_compatible, convert_to_standard_unit


def classify_observation_reference(
    obs: DocumentObservation,
) -> tuple[str, bool, str | None]:
    """Classify an observation against its own printed laboratory reference range.

    Returns:
        (classification, requires_review, discrepancy_explanation)
    Classifications:
        "below_reference", "within_reference", "above_reference",
        "qualitative_flagged", "unknown"
    """
    clean_val = obs.value.strip().upper()

    # 1. Qualitative value checks
    if clean_val in ("POSITIVE", "REACTIVE", "DETECTED", "ABNORMAL"):
        return "qualitative_flagged", False, None
    if clean_val in ("NEGATIVE", "NON-REACTIVE", "NOT DETECTED", "NORMAL"):
        return "within_reference", False, None

    # If numeric value is missing and not standard qualitative
    if obs.numeric_value is None:
        if obs.flag in ("HIGH", "ABNORMAL"):
            return "qualitative_flagged", False, None
        if obs.flag == "LOW":
            return "below_reference", False, None
        if obs.flag == "NORMAL":
            return "within_reference", False, None
        return "unknown", False, None

    # 2. Check reference range
    if not obs.reference_range or not obs.reference_range.strip():
        # Missing reference range
        if obs.flag == "HIGH":
            return "above_reference", False, None
        if obs.flag == "LOW":
            return "below_reference", False, None
        if obs.flag in ("ABNORMAL", "POSITIVE"):
            return "qualitative_flagged", False, None
        if obs.flag == "NORMAL":
            return "within_reference", False, None
        return "unknown", False, None

    ref = obs.reference_range.strip()
    val = obs.numeric_value
    computed: str | None = None

    # Range format: "X - Y" or "X-Y"
    range_match = re.match(r"^([0-9]+(?:\.[0-9]+)?)\s*[-–—]\s*([0-9]+(?:\.[0-9]+)?)$", ref)
    if range_match:
        try:
            low = float(range_match.group(1))
            high = float(range_match.group(2))
            if val < low:
                computed = "below_reference"
            elif val > high:
                computed = "above_reference"
            else:
                computed = "within_reference"
        except (ValueError, TypeError):
            computed = "unknown"

    # Format: "< X" or "<= X"
    if not computed:
        lt_match = re.match(r"^[<≤]\s*([0-9]+(?:\.[0-9]+)?)$", ref)
        if lt_match:
            try:
                max_val = float(lt_match.group(1))
                if val > max_val:
                    computed = "above_reference"
                else:
                    computed = "within_reference"
            except (ValueError, TypeError):
                computed = "unknown"

    # Format: "> X" or ">= X"
    if not computed:
        gt_match = re.match(r"^[>≥]\s*([0-9]+(?:\.[0-9]+)?)$", ref)
        if gt_match:
            try:
                min_val = float(gt_match.group(1))
                if val < min_val:
                    computed = "below_reference"
                else:
                    computed = "within_reference"
            except (ValueError, TypeError):
                computed = "unknown"

    if not computed:
        computed = "unknown"

    # Check for discrepancy with laboratory's explicit flag
    requires_review = False
    explanation: str | None = None

    if obs.flag:
        flag_upper = obs.flag.upper()
        if computed in ("above_reference", "below_reference") and flag_upper == "NORMAL":
            requires_review = True
            explanation = (
                f"Value ({val}) falls outside printed range '{ref}', but laboratory labeled it as NORMAL."
            )
        elif computed == "within_reference" and flag_upper in ("HIGH", "LOW", "ABNORMAL"):
            requires_review = True
            explanation = (
                f"Value ({val}) falls within printed range '{ref}', but laboratory labeled it as {flag_upper}."
            )

    return computed, requires_review, explanation


def calculate_overview_metrics(
    db: Session,
    user: User,
    profile_id: uuid.UUID | None = None,
) -> OverviewMetrics:
    """Calculate factual health-record overview metrics strictly for the authenticated user."""
    # Validate profile ownership
    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        verify_profile_access(db, user, profile_id)

    # 1. Documents
    docs_query = (
        db.query(Document)
        .filter(Document.owner_id == user.id, Document.processing_status == "extracted")
    )
    if profile_id is not None:
        docs_query = docs_query.filter(Document.profile_id == profile_id)
    docs = docs_query.all()
    total_reports = len(docs)
    reports_missing_dates = sum(1 for d in docs if not d.document_date)

    # Date bounds
    dates = [d.document_date for d in docs if d.document_date]
    earliest_date = min(dates) if dates else None
    latest_date = max(dates) if dates else None

    # 2. Observations
    obs_query = (
        db.query(DocumentObservation, Document)
        .join(Document, DocumentObservation.document_id == Document.id)
        .filter(Document.owner_id == user.id)
    )
    if profile_id is not None:
        obs_query = obs_query.filter(Document.profile_id == profile_id)
    obs_list = obs_query.all()

    verified_count = sum(1 for obs, _ in obs_list if obs.is_reviewed)
    unverified_count = sum(1 for obs, _ in obs_list if not obs.is_reviewed)

    # Distinct test types
    distinct_tests = {
        obs.normalized_test_name or obs.test_name for obs, _ in obs_list
    }
    distinct_test_types_count = len(distinct_tests)

    # Missing units and ranges
    missing_units = sum(1 for obs, _ in obs_list if not obs.unit or not obs.unit.strip())
    missing_ranges = sum(1 for obs, _ in obs_list if not obs.reference_range or not obs.reference_range.strip())

    # Count tests with historical readings (>= 2 verified observations)
    test_reading_counts: dict[str, int] = {}
    for obs, _ in obs_list:
        if obs.is_reviewed:
            tname = obs.normalized_test_name or obs.test_name
            test_reading_counts[tname] = test_reading_counts.get(tname, 0) + 1

    comparable_tests_with_history = sum(1 for c in test_reading_counts.values() if c >= 2)

    # Noteworthy findings: verified observations outside reference or flagged
    noteworthy_count = 0
    for obs, _ in obs_list:
        if obs.is_reviewed:
            classification, _, _ = classify_observation_reference(obs)
            if classification in ("above_reference", "below_reference", "qualitative_flagged"):
                noteworthy_count += 1

    return OverviewMetrics(
        total_reports=total_reports,
        verified_observations_count=verified_count,
        unverified_observations_count=unverified_count,
        distinct_test_types_count=distinct_test_types_count,
        earliest_date=earliest_date,
        latest_date=latest_date,
        reports_with_missing_dates_count=reports_missing_dates,
        observations_missing_units_count=missing_units,
        observations_missing_ranges_count=missing_ranges,
        comparable_tests_with_history_count=comparable_tests_with_history,
        noteworthy_findings_count=noteworthy_count,
    )


def get_medical_findings(
    db: Session,
    user: User,
    start_date: str | None = None,
    end_date: str | None = None,
    category: str | None = None,
    test_name: str | None = None,
    classification: str | None = None,
    include_unverified: bool = False,
    limit: int = 100,
    offset: int = 0,
    profile_id: uuid.UUID | None = None,
) -> FindingsResponse:
    """Retrieve observations evaluated with reference-range classifications and citations."""
    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        verify_profile_access(db, user, profile_id)

    query = (
        db.query(DocumentObservation, Document)
        .join(Document, DocumentObservation.document_id == Document.id)
        .filter(Document.owner_id == user.id)
    )
    if profile_id is not None:
        query = query.filter(Document.profile_id == profile_id)

    if not include_unverified:
        query = query.filter(DocumentObservation.is_reviewed.is_(True))

    if category:
        query = query.filter(DocumentObservation.category.ilike(f"%{category}%"))

    if test_name:
        query = query.filter(
            (DocumentObservation.test_name.ilike(f"%{test_name}%"))
            | (DocumentObservation.normalized_test_name.ilike(f"%{test_name}%"))
        )

    records = query.all()

    # In-memory classification, date filtering, and sorting
    findings: list[FindingItem] = []
    for obs, doc in records:
        clinical_date = doc.document_date
        date_type = "actual"
        if not clinical_date and doc.created_at:
            clinical_date = doc.created_at.strftime("%Y-%m-%d")
            date_type = "inferred"

        # Date range filtering
        if start_date and clinical_date and clinical_date < start_date:
            continue
        if end_date and clinical_date and clinical_date > end_date:
            continue

        cls_res, req_review, discrepancy = classify_observation_reference(obs)

        if classification and classification.lower() != "all" and cls_res.lower() != classification.lower():
            continue

        finding = FindingItem(
            observation_id=str(obs.id),
            document_id=str(doc.id),
            document_title=doc.filename,
            clinical_date=clinical_date,
            date_type=date_type,
            original_test_name=obs.test_name,
            normalized_test_name=obs.normalized_test_name,
            category=obs.category,
            value=obs.value,
            numeric_value=obs.numeric_value,
            unit=obs.unit,
            reference_range=obs.reference_range,
            laboratory_flag=obs.flag,
            classification=cls_res,
            requires_review=req_review,
            discrepancy_explanation=discrepancy,
            is_reviewed=obs.is_reviewed,
            source_page=obs.source_page if obs.source_page and obs.source_page > 0 else 1,
            source_text=obs.source_text,
            citation_id="",
        )
        findings.append(finding)

    # Sort chronologically descending
    findings.sort(key=lambda x: x.clinical_date or "", reverse=True)

    # Assign citations: [S1], [S2]...
    for idx, f in enumerate(findings, start=1):
        f.citation_id = f"[S{idx}]"

    total = len(findings)
    paged = findings[offset : offset + limit]

    return FindingsResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=paged,
    )


def get_longitudinal_insights_trends(
    db: Session,
    user: User,
    include_unverified: bool = False,
    profile_id: uuid.UUID | None = None,
) -> LongitudinalTrendsResponse:
    """Calculate historical changes and percentage differences for comparable measurements."""
    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        verify_profile_access(db, user, profile_id)

    obs_query = (
        db.query(DocumentObservation, Document)
        .join(Document, DocumentObservation.document_id == Document.id)
        .filter(Document.owner_id == user.id, DocumentObservation.numeric_value.is_not(None))
    )
    if profile_id is not None:
        obs_query = obs_query.filter(Document.profile_id == profile_id)

    if not include_unverified:
        obs_query = obs_query.filter(DocumentObservation.is_reviewed.is_(True))

    records = obs_query.all()

    # Group by normalized test name
    grouped: dict[str, list[tuple[DocumentObservation, Document]]] = {}
    for obs, doc in records:
        tname = obs.normalized_test_name or obs.test_name
        grouped.setdefault(tname, []).append((obs, doc))

    trends: list[LongitudinalTrendItem] = []

    for tname, items in grouped.items():
        if len(items) < 2:
            continue

        # Sort chronologically ascending
        def sort_key(pair):
            o, d = pair
            return d.document_date or (d.created_at.strftime("%Y-%m-%d") if d.created_at else "")

        items.sort(key=sort_key)

        # Compare penultimate (previous) with latest
        prev_obs, prev_doc = items[-2]
        latest_obs, latest_doc = items[-1]

        prev_date = prev_doc.document_date or (prev_doc.created_at.strftime("%Y-%m-%d") if prev_doc.created_at else "Unknown")
        latest_date = latest_doc.document_date or (latest_doc.created_at.strftime("%Y-%m-%d") if latest_doc.created_at else "Unknown")

        # Check unit compatibility
        if not are_units_compatible(tname, prev_obs.unit, latest_obs.unit):
            continue

        prev_std_val, std_unit, conv_prev = convert_to_standard_unit(tname, prev_obs.numeric_value, prev_obs.unit)
        latest_std_val, _, conv_latest = convert_to_standard_unit(tname, latest_obs.numeric_value, latest_obs.unit)

        has_converted = conv_prev or conv_latest

        # Calculate absolute and percentage delta
        abs_change: float | None = None
        pct_change: float | None = None
        direction = "stable"

        if prev_std_val is not None and latest_std_val is not None:
            abs_change = round(latest_std_val - prev_std_val, 2)
            if prev_std_val != 0:
                pct_change = round(((latest_std_val - prev_std_val) / abs(prev_std_val)) * 100, 1)

            if abs_change > 0:
                direction = "increased"
            elif abs_change < 0:
                direction = "decreased"
            else:
                direction = "stable"

        desc_parts = []
        if direction == "increased":
            desc_parts.append(f"Increased by {abs_change} {std_unit}")
        elif direction == "decreased":
            desc_parts.append(f"Decreased by {abs(abs_change)} {std_unit}")
        else:
            desc_parts.append(f"Remained stable at {latest_std_val} {std_unit}")

        if pct_change is not None and abs(pct_change) > 0:
            sign = "+" if pct_change > 0 else ""
            desc_parts.append(f"({sign}{pct_change}%)")

        desc_parts.append(f"between {prev_date} and {latest_date}.")
        if has_converted:
            desc_parts.append(f"Values standardized to {std_unit}.")

        trend_item = LongitudinalTrendItem(
            normalized_test_name=tname,
            category=latest_obs.category or prev_obs.category,
            standard_unit=std_unit,
            has_converted_units=has_converted,
            previous_reading={
                "value": prev_obs.value,
                "unit": prev_obs.unit,
                "clinical_date": prev_date,
                "document_title": prev_doc.filename,
                "document_id": str(prev_doc.id),
            },
            latest_reading={
                "value": latest_obs.value,
                "unit": latest_obs.unit,
                "clinical_date": latest_date,
                "document_title": latest_doc.filename,
                "document_id": str(latest_doc.id),
                "is_reviewed": latest_obs.is_reviewed,
            },
            previous_standard_value=prev_std_val,
            latest_standard_value=latest_std_val,
            absolute_change=abs_change,
            percentage_change=pct_change,
            direction=direction,
            clinical_change_description=" ".join(desc_parts),
            citation_ids=[],
        )
        trends.append(trend_item)

    return LongitudinalTrendsResponse(items=trends)


def get_data_quality_report(
    db: Session,
    user: User,
    profile_id: uuid.UUID | None = None,
) -> DataQualityReport:
    """Identify missing metadata, unverified observations, and flag discrepancies."""
    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        verify_profile_access(db, user, profile_id)

    docs_query = (
        db.query(Document)
        .filter(Document.owner_id == user.id, Document.processing_status == "extracted")
    )
    if profile_id is not None:
        docs_query = docs_query.filter(Document.profile_id == profile_id)
    docs = docs_query.all()

    issues: list[DataQualityIssue] = []
    missing_dates_count = 0
    missing_units_count = 0
    missing_ranges_count = 0
    unverified_count = 0
    discrepant_count = 0

    # 1. Documents missing dates
    for d in docs:
        if not d.document_date or not d.document_date.strip():
            missing_dates_count += 1
            issues.append(
                DataQualityIssue(
                    issue_type="missing_date",
                    description=f"Report '{d.filename}' lacks printed clinical date; uses upload timestamp.",
                    document_id=str(d.id),
                    document_title=d.filename,
                    source_page=1,
                )
            )

    # 2. Observations
    obs_records = (
        db.query(DocumentObservation, Document)
        .join(Document, DocumentObservation.document_id == Document.id)
        .filter(Document.owner_id == user.id)
    )
    if profile_id is not None:
        obs_records = obs_records.filter(Document.profile_id == profile_id)
    obs_records = obs_records.all()

    for obs, doc in obs_records:
        tname = obs.normalized_test_name or obs.test_name

        if not obs.is_reviewed:
            unverified_count += 1
            issues.append(
                DataQualityIssue(
                    issue_type="unverified_observation",
                    description=f"Observation '{tname}' ({obs.value} {obs.unit or ''}) is awaiting user review.",
                    document_id=str(doc.id),
                    document_title=doc.filename,
                    observation_id=str(obs.id),
                    test_name=tname,
                    source_page=obs.source_page,
                )
            )

        if not obs.unit or not obs.unit.strip():
            missing_units_count += 1
            issues.append(
                DataQualityIssue(
                    issue_type="missing_unit",
                    description=f"Observation '{tname}' ({obs.value}) does not have a recorded measurement unit.",
                    document_id=str(doc.id),
                    document_title=doc.filename,
                    observation_id=str(obs.id),
                    test_name=tname,
                    source_page=obs.source_page,
                )
            )

        if not obs.reference_range or not obs.reference_range.strip():
            missing_ranges_count += 1
            issues.append(
                DataQualityIssue(
                    issue_type="missing_reference_range",
                    description=f"Observation '{tname}' lacks a printed reference interval on this report.",
                    document_id=str(doc.id),
                    document_title=doc.filename,
                    observation_id=str(obs.id),
                    test_name=tname,
                    source_page=obs.source_page,
                )
            )

        # Discrepancies between printed range and explicit flag
        _, req_review, disc_expl = classify_observation_reference(obs)
        if req_review and disc_expl:
            discrepant_count += 1
            issues.append(
                DataQualityIssue(
                    issue_type="discrepant_flag",
                    description=f"Observation '{tname}': {disc_expl}",
                    document_id=str(doc.id),
                    document_title=doc.filename,
                    observation_id=str(obs.id),
                    test_name=tname,
                    source_page=obs.source_page,
                )
            )

    return DataQualityReport(
        total_issues=len(issues),
        missing_dates_count=missing_dates_count,
        missing_units_count=missing_units_count,
        missing_ranges_count=missing_ranges_count,
        unverified_observations_count=unverified_count,
        discrepant_flags_count=discrepant_count,
        issues=issues,
    )
