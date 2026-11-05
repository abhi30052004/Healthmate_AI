"""Medical timeline generation, trend series grouping, and factual summary service.

Organizes reviewed medical observations chronologically across multiple uploaded documents.
Enforces tenancy, distinguishes actual from inferred dates, normalizes test names,
handles unit conversions safely, and never invents clinical values or medical diagnoses.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentObservation
from app.models.user import User
from app.schemas.timeline import (
    RepeatedTestMetric,
    TimelineItem,
    TimelineResponse,
    TimelineSummaryResponse,
    TrendPoint,
    TrendSeries,
    TrendResponse,
)
from app.services.normalization import (
    are_units_compatible,
    convert_to_standard_unit,
    normalize_test_name,
)


def _get_best_clinical_date(doc: Document) -> tuple[str, str]:
    """Return best available chronological clinical date and its provenance type.

    Returns:
        (date_str 'YYYY-MM-DD', 'actual' | 'inferred')
    """
    if doc.document_date and doc.document_date.strip():
        # Clean potential whitespace
        cleaned = doc.document_date.strip()
        # Verify format YYYY-MM-DD
        if len(cleaned) == 10 and cleaned[4] == "-" and cleaned[7] == "-":
            return cleaned, "actual"
        # If alternative date format, take first 10 characters or parse
        return cleaned[:10], "actual"

    # Fallback to document created_at date, explicitly marked as inferred
    inferred_date = doc.created_at.strftime("%Y-%m-%d")
    return inferred_date, "inferred"


def get_user_medical_timeline(
    db: Session,
    current_user: User,
    include_unverified: bool = False,
    start_date: str | None = None,
    end_date: str | None = None,
    test_name: str | None = None,
    category: str | None = None,
    limit: int = 100,
    offset: int = 0,
    profile_id: uuid.UUID | None = None,
    include_archived: bool = False,
) -> TimelineResponse:
    """Retrieve chronologically ordered timeline items for the authenticated user, optionally scoped to a profile."""
    query = (
        select(DocumentObservation, Document)
        .join(Document, DocumentObservation.document_id == Document.id)
        .where(Document.owner_id == current_user.id)
    )

    if not include_archived:
        query = query.where(
            Document.is_archived.is_(False),
            DocumentObservation.is_archived.is_(False),
        )

    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        prof = verify_profile_access(db, current_user, profile_id)
        if prof and prof.is_primary:
            query = query.where((Document.profile_id == profile_id) | (Document.profile_id.is_(None)))
        else:
            query = query.where(Document.profile_id == profile_id)

    if not include_unverified:
        # Default: reviewed observations only
        query = query.where(
            (DocumentObservation.is_reviewed == True) | (Document.is_verified == True)
        )

    results = list(db.execute(query).all())

    # Build timeline item objects with computed clinical date and normalization
    timeline_items: list[TimelineItem] = []
    for obs, doc in results:
        clin_date, date_type = _get_best_clinical_date(doc)

        norm_name = obs.normalized_test_name
        cat = obs.category
        if not norm_name or not cat:
            norm_name, cat = normalize_test_name(obs.test_name)

        item = TimelineItem(
            id=obs.id,
            document_id=doc.id,
            document_filename=doc.filename,
            clinical_date=clin_date,
            date_type=date_type,
            lab_name=doc.lab_name,
            patient_name=doc.patient_name,
            original_test_name=obs.test_name,
            normalized_test_name=norm_name,
            category=cat,
            value=obs.value,
            numeric_value=obs.numeric_value,
            unit=obs.unit,
            reference_range=obs.reference_range,
            flag=obs.flag,
            source_page=obs.source_page,
            source_text=obs.source_text,
            is_reviewed=obs.is_reviewed or doc.is_verified,
            is_low_confidence=obs.is_low_confidence,
            created_at=obs.created_at,
        )
        timeline_items.append(item)

    # In-memory filtering for date range, test_name, and category
    filtered: list[TimelineItem] = []
    for item in timeline_items:
        if start_date and item.clinical_date < start_date:
            continue
        if end_date and item.clinical_date > end_date:
            continue
        if test_name:
            t_lower = test_name.strip().lower()
            if t_lower not in item.original_test_name.lower() and t_lower not in item.normalized_test_name.lower():
                continue
        if category:
            c_lower = category.strip().lower()
            if c_lower not in item.category.lower():
                continue
        filtered.append(item)

    # Sort chronologically by clinical_date ascending, then source_page, then created_at
    filtered.sort(key=lambda it: (it.clinical_date, it.source_page, it.created_at))

    total = len(filtered)
    paginated = filtered[offset : offset + limit]

    return TimelineResponse(
        items=paginated,
        total=total,
        limit=limit,
        offset=offset,
    )


def get_user_timeline_trends(
    db: Session,
    current_user: User,
    include_unverified: bool = False,
    test_name: str | None = None,
    category: str | None = None,
    profile_id: uuid.UUID | None = None,
) -> TrendResponse:
    """Group numeric observations into trend series by normalized test and compatible unit."""
    # Fetch all items across timeline without pagination
    timeline_res = get_user_medical_timeline(
        db=db,
        current_user=current_user,
        include_unverified=include_unverified,
        test_name=test_name,
        category=category,
        limit=1000,
        offset=0,
        profile_id=profile_id,
    )

    # Group numeric points by normalized test name
    tests_map: dict[str, list[TimelineItem]] = {}
    for item in timeline_res.items:
        if item.numeric_value is not None:
            tests_map.setdefault(item.normalized_test_name, []).append(item)

    all_series: list[TrendSeries] = []

    for norm_name, items in tests_map.items():
        # Items are already sorted chronologically
        cat = items[0].category

        # Partition points by compatible units
        unit_clusters: list[list[TimelineItem]] = []
        for item in items:
            matched_cluster = False
            for cluster in unit_clusters:
                if are_units_compatible(norm_name, cluster[0].unit, item.unit):
                    cluster.append(item)
                    matched_cluster = True
                    break
            if not matched_cluster:
                unit_clusters.append([item])

        for cluster in unit_clusters:
            points: list[TrendPoint] = []
            has_converted = False
            std_unit = cluster[0].unit or "units"

            for it in cluster:
                std_val, converted_unit, was_conv = convert_to_standard_unit(
                    test_name=norm_name,
                    numeric_value=it.numeric_value,
                    unit=it.unit,
                )
                if was_conv:
                    has_converted = True
                if converted_unit:
                    std_unit = converted_unit

                point = TrendPoint(
                    observation_id=it.id,
                    document_id=it.document_id,
                    document_filename=it.document_filename,
                    date=it.clinical_date,
                    date_type=it.date_type,
                    value=it.value,
                    numeric_value=it.numeric_value or 0.0,
                    original_unit=it.unit,
                    standardized_numeric_value=std_val if std_val is not None else (it.numeric_value or 0.0),
                    reference_range=it.reference_range,
                    flag=it.flag,
                    is_reviewed=it.is_reviewed,
                    source_page=it.source_page,
                    source_text=it.source_text,
                )
                points.append(point)

            warning = None
            if len(unit_clusters) > 1:
                warning = f"Observations for {norm_name} were recorded with incompatible measurement units and are displayed in separate series."

            series = TrendSeries(
                normalized_test_name=norm_name,
                category=cat,
                standard_unit=std_unit,
                points=points,
                has_multiple_points=len(points) >= 2,
                has_converted_units=has_converted,
                warning_message=warning,
            )
            all_series.append(series)

    # Sort series: repeated multi-point series first, then alphabetical by test name
    all_series.sort(key=lambda s: (not s.has_multiple_points, s.normalized_test_name))

    return TrendResponse(series=all_series)


def get_user_timeline_summary(
    db: Session,
    current_user: User,
    include_unverified: bool = False,
    profile_id: uuid.UUID | None = None,
) -> TimelineSummaryResponse:
    """Generate concise, evidence-based factual summary of clinical observation history."""
    timeline_res = get_user_medical_timeline(
        db=db,
        current_user=current_user,
        include_unverified=True,  # fetch all to report verified and unverified counts
        limit=2000,
        offset=0,
        profile_id=profile_id,
    )

    items = timeline_res.items
    total_obs = len(items)
    reviewed_count = sum(1 for it in items if it.is_reviewed)
    unverified_count = total_obs - reviewed_count

    # If requested without unverified, filter items for date span and repeated test metrics
    active_items = items if include_unverified else [it for it in items if it.is_reviewed]

    doc_ids = {it.document_id for it in active_items}
    total_reports = len(doc_ids)

    dates = sorted({it.clinical_date for it in active_items})
    earliest_date = dates[0] if dates else None
    latest_date = dates[-1] if dates else None

    categories = sorted({it.category for it in active_items})

    abnormal_count = sum(
        1 for it in active_items if it.flag in ("HIGH", "LOW", "ABNORMAL")
    )

    # Group by normalized test name to detect repeated measurements
    test_groups: dict[str, list[TimelineItem]] = {}
    for it in active_items:
        test_groups.setdefault(it.normalized_test_name, []).append(it)

    repeated_tests: list[RepeatedTestMetric] = []
    for norm_name, g_items in test_groups.items():
        if len(g_items) >= 2:
            g_dates = [it.clinical_date for it in g_items]
            earliest_it = g_items[0]
            latest_it = g_items[-1]

            # Factual trajectory description
            e_flag_str = f" ({earliest_it.flag})" if earliest_it.flag else ""
            l_flag_str = f" ({latest_it.flag})" if latest_it.flag else ""
            traj = (
                f"Recorded values: {earliest_it.value} {earliest_it.unit or ''}{e_flag_str} on {earliest_it.clinical_date} "
                f"to {latest_it.value} {latest_it.unit or ''}{l_flag_str} on {latest_it.clinical_date}."
            )

            metric = RepeatedTestMetric(
                normalized_test_name=norm_name,
                category=g_items[0].category,
                count=len(g_items),
                dates=g_dates,
                unit=latest_it.unit,
                earliest_value=earliest_it.value,
                latest_value=latest_it.value,
                trajectory_summary=traj,
            )
            repeated_tests.append(metric)

    repeated_tests.sort(key=lambda m: m.normalized_test_name)

    return TimelineSummaryResponse(
        total_reports=total_reports,
        total_observations=len(active_items),
        reviewed_observations_count=reviewed_count,
        unverified_observations_count=unverified_count,
        earliest_date=earliest_date,
        latest_date=latest_date,
        categories=categories,
        repeated_tests=repeated_tests,
        abnormal_findings_count=abnormal_count,
    )
