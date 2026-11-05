import uuid
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentObservation
from app.models.user import User
from app.schemas.comparison import (
    ComparisonReportMeta,
    ComparisonSummaryMetrics,
    ReportComparisonItem,
    ReportComparisonRequest,
    ReportComparisonResponse,
)
from app.services.normalization import (
    are_units_compatible,
    convert_to_standard_unit,
    normalize_test_name,
)
from app.services.timeline import _get_best_clinical_date


def compare_medical_reports(
    db: Session,
    user: User,
    payload: ReportComparisonRequest,
) -> ReportComparisonResponse:
    """Compare two or more user medical reports and calculate observation deltas."""
    # Deduplicate requested document IDs preserving order
    seen_ids: set[str] = set()
    unique_ids: list[str] = []
    for did in payload.document_ids:
        if did not in seen_ids:
            seen_ids.add(did)
            unique_ids.append(did)

    if len(unique_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least two distinct medical reports must be selected for comparison.",
        )

    parsed_uuids: list[uuid.UUID] = []
    for did in unique_ids:
        try:
            parsed_uuids.append(uuid.UUID(did) if isinstance(did, str) else did)
        except (ValueError, TypeError, AttributeError):
            raise HTTPException(
                status_code=404,
                detail="One or more selected medical reports were not found or not accessible.",
            )

    req_prof_uuid = None
    if getattr(payload, "profile_id", None):
        from app.services.family_profile import verify_profile_access
        try:
            req_prof_uuid = uuid.UUID(payload.profile_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid profile_id format.")
        verify_profile_access(db, user, req_prof_uuid)

    # Fetch and verify document ownership
    docs_query = (
        db.query(Document)
        .filter(Document.id.in_(parsed_uuids), Document.owner_id == user.id)
    )
    if req_prof_uuid is not None:
        docs_query = docs_query.filter(Document.profile_id == req_prof_uuid)

    docs = docs_query.all()
    doc_map = {str(d.id): d for d in docs}

    if len(doc_map) != len(unique_ids):
        raise HTTPException(
            status_code=404,
            detail="One or more selected medical reports were not found or not accessible.",
        )

    # Enforce profile isolation: do not allow comparing reports belonging to different profiles
    distinct_profiles = {d.profile_id for d in docs}
    if len(distinct_profiles) > 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot compare medical reports belonging to different family profiles.",
        )

    # Determine chronological or user-selected ordering
    doc_dates: dict[str, tuple[str, str]] = {}
    for d in docs:
        doc_dates[str(d.id)] = _get_best_clinical_date(d)

    if payload.order_by_date:
        ordered_docs = sorted(
            [doc_map[did] for did in unique_ids],
            key=lambda d: (
                doc_dates[str(d.id)][0],
                d.created_at.isoformat() if d.created_at else "",
            ),
        )
        ordering_mode = "chronological"
    else:
        ordered_docs = [doc_map[did] for did in unique_ids]
        ordering_mode = "user_selected"

    baseline_doc = ordered_docs[0]
    newer_doc = ordered_docs[-1]
    baseline_date, baseline_date_type = doc_dates[str(baseline_doc.id)]
    newer_date, newer_date_type = doc_dates[str(newer_doc.id)]

    # Fetch observations for all selected documents
    obs_query = db.query(DocumentObservation).filter(
        DocumentObservation.document_id.in_(parsed_uuids),
        DocumentObservation.owner_id == user.id,
    )
    if not payload.include_unverified:
        obs_query = obs_query.filter(DocumentObservation.is_reviewed.is_(True))

    all_observations = obs_query.all()

    # Group observations by document ID
    doc_obs_counts: dict[str, int] = {did: 0 for did in unique_ids}
    obs_by_doc: dict[str, list[DocumentObservation]] = {did: [] for did in unique_ids}
    for obs in all_observations:
        did_str = str(obs.document_id)
        if did_str in obs_by_doc:
            obs_by_doc[did_str].append(obs)
            doc_obs_counts[did_str] += 1

    # Build report metadata
    selected_reports_meta: list[ComparisonReportMeta] = []
    warnings: list[str] = []

    for d in ordered_docs:
        d_id = str(d.id)
        d_date, d_type = doc_dates[d_id]
        if d_type == "inferred":
            warnings.append(
                f"Report '{d.filename}' lacks an explicit clinical collection date; upload date ({d_date}) was used."
            )
        selected_reports_meta.append(
            ComparisonReportMeta(
                document_id=d_id,
                document_title=d.filename,
                clinical_date=d_date,
                date_provenance=d_type,
                lab_name=d.lab_name,
                observation_count=doc_obs_counts[d_id],
                is_verified=d.is_verified,
            )
        )

    # Index observations for baseline and newer documents
    def index_observations(
        obs_list: list[DocumentObservation],
    ) -> dict[str, list[DocumentObservation]]:
        indexed: dict[str, list[DocumentObservation]] = {}
        for o in obs_list:
            canonical = (o.normalized_test_name or normalize_test_name(o.test_name)).strip()
            key = canonical.lower()
            indexed.setdefault(key, []).append(o)
        return indexed

    base_map = index_observations(obs_by_doc[str(baseline_doc.id)])
    newer_map = index_observations(obs_by_doc[str(newer_doc.id)])

    all_keys = sorted(list(set(base_map.keys()).union(newer_map.keys())))

    comparison_items: list[ReportComparisonItem] = []
    summary_metrics = ComparisonSummaryMetrics()

    for k in all_keys:
        b_list = base_map.get(k, [])
        n_list = newer_map.get(k, [])

        b_obs = b_list[0] if b_list else None
        n_obs = n_list[0] if n_list else None

        display_name = (
            (n_obs.test_name if n_obs else None)
            or (b_obs.test_name if b_obs else None)
            or k.title()
        )
        canonical_name = (
            (n_obs.normalized_test_name if n_obs else None)
            or (b_obs.normalized_test_name if b_obs else None)
            or normalize_test_name(display_name)
        )
        category = (
            (n_obs.category if n_obs else None)
            or (b_obs.category if b_obs else None)
            or "General"
        )

        has_duplicate_match = len(b_list) > 1 or len(n_list) > 1
        requires_review = has_duplicate_match
        review_explanation = (
            "Multiple observations with identical test names were detected in the source report. Selected first match."
            if has_duplicate_match
            else None
        )

        unverified_present = (b_obs and not b_obs.is_reviewed) or (n_obs and not n_obs.is_reviewed)
        if unverified_present:
            summary_metrics.unverified_count += 1

        # Case 1: Present in both reports
        if b_obs is not None and n_obs is not None:
            # Check unit compatibility
            if not are_units_compatible(canonical_name, b_obs.unit, n_obs.unit):
                summary_metrics.incompatible_units_count += 1
                summary_metrics.needs_review_count += 1
                comparison_items.append(
                    ReportComparisonItem(
                        test_name=display_name,
                        normalized_test_name=canonical_name,
                        category=category,
                        classification="incompatible_units",
                        classification_label="Incompatible Units",
                        baseline_value=b_obs.value,
                        baseline_unit=b_obs.unit,
                        baseline_numeric=b_obs.numeric_value,
                        baseline_reference_range=b_obs.reference_range,
                        baseline_flag=b_obs.flag,
                        baseline_date=baseline_date,
                        baseline_document_id=str(baseline_doc.id),
                        baseline_document_title=baseline_doc.filename,
                        baseline_page=b_obs.source_page,
                        baseline_source_text=b_obs.source_text,
                        baseline_is_verified=b_obs.is_reviewed,
                        newer_value=n_obs.value,
                        newer_unit=n_obs.unit,
                        newer_numeric=n_obs.numeric_value,
                        newer_reference_range=n_obs.reference_range,
                        newer_flag=n_obs.flag,
                        newer_date=newer_date,
                        newer_document_id=str(newer_doc.id),
                        newer_document_title=newer_doc.filename,
                        newer_page=n_obs.source_page,
                        newer_source_text=n_obs.source_text,
                        newer_is_verified=n_obs.is_reviewed,
                        standard_unit=None,
                        has_converted_units=False,
                        absolute_change=None,
                        percentage_change=None,
                        clinical_change_description=(
                            f"Recorded in incompatible units ('{b_obs.unit or 'none'}' vs '{n_obs.unit or 'none'}'). "
                            "Mathematical difference cannot be computed safely without facility conversion standards."
                        ),
                        requires_review=True,
                        review_explanation=(
                            review_explanation or "Units cannot be compared safely. Review raw laboratory standards."
                        ),
                    )
                )
                continue

            # Units are compatible: check if numeric comparison is valid
            if b_obs.numeric_value is not None and n_obs.numeric_value is not None:
                b_std, std_unit, conv_b = convert_to_standard_unit(
                    canonical_name, b_obs.numeric_value, b_obs.unit
                )
                n_std, _, conv_n = convert_to_standard_unit(
                    canonical_name, n_obs.numeric_value, n_obs.unit
                )
                has_converted = conv_b or conv_n

                if b_std is not None and n_std is not None:
                    delta = round(n_std - b_std, 4)
                    pct: float | None = None
                    if b_std != 0:
                        pct = round((delta / abs(b_std)) * 100, 1)

                    if abs(delta) < 1e-4:
                        classification = "unchanged"
                        classification_label = "Unchanged"
                        summary_metrics.unchanged_count += 1
                        desc = f"Stable at {n_obs.value} {n_obs.unit or ''} between {baseline_date} and {newer_date}."
                    elif delta > 0:
                        classification = "increased"
                        classification_label = "Increased"
                        summary_metrics.increased_count += 1
                        pct_str = f" (+{pct}%)" if pct is not None else ""
                        desc = f"Increased by {round(delta, 2)} {std_unit}{pct_str} from {baseline_date} to {newer_date}."
                    else:
                        classification = "decreased"
                        classification_label = "Decreased"
                        summary_metrics.decreased_count += 1
                        pct_str = f" ({pct}%)" if pct is not None else ""
                        desc = f"Decreased by {abs(round(delta, 2))} {std_unit}{pct_str} from {baseline_date} to {newer_date}."

                    comparison_items.append(
                        ReportComparisonItem(
                            test_name=display_name,
                            normalized_test_name=canonical_name,
                            category=category,
                            classification=classification,
                            classification_label=classification_label,
                            baseline_value=b_obs.value,
                            baseline_unit=b_obs.unit,
                            baseline_numeric=b_obs.numeric_value,
                            baseline_reference_range=b_obs.reference_range,
                            baseline_flag=b_obs.flag,
                            baseline_date=baseline_date,
                            baseline_document_id=str(baseline_doc.id),
                            baseline_document_title=baseline_doc.filename,
                            baseline_page=b_obs.source_page,
                            baseline_source_text=b_obs.source_text,
                            baseline_is_verified=b_obs.is_reviewed,
                            newer_value=n_obs.value,
                            newer_unit=n_obs.unit,
                            newer_numeric=n_obs.numeric_value,
                            newer_reference_range=n_obs.reference_range,
                            newer_flag=n_obs.flag,
                            newer_date=newer_date,
                            newer_document_id=str(newer_doc.id),
                            newer_document_title=newer_doc.filename,
                            newer_page=n_obs.source_page,
                            newer_source_text=n_obs.source_text,
                            newer_is_verified=n_obs.is_reviewed,
                            standard_unit=std_unit,
                            has_converted_units=has_converted,
                            absolute_change=round(delta, 2),
                            percentage_change=pct,
                            clinical_change_description=desc,
                            requires_review=requires_review,
                            review_explanation=review_explanation,
                        )
                    )
                else:
                    summary_metrics.needs_review_count += 1
                    comparison_items.append(
                        ReportComparisonItem(
                            test_name=display_name,
                            normalized_test_name=canonical_name,
                            category=category,
                            classification="needs_review",
                            classification_label="Review Required",
                            baseline_value=b_obs.value,
                            baseline_unit=b_obs.unit,
                            baseline_numeric=b_obs.numeric_value,
                            baseline_reference_range=b_obs.reference_range,
                            baseline_flag=b_obs.flag,
                            baseline_date=baseline_date,
                            baseline_document_id=str(baseline_doc.id),
                            baseline_document_title=baseline_doc.filename,
                            baseline_page=b_obs.source_page,
                            baseline_source_text=b_obs.source_text,
                            baseline_is_verified=b_obs.is_reviewed,
                            newer_value=n_obs.value,
                            newer_unit=n_obs.unit,
                            newer_numeric=n_obs.numeric_value,
                            newer_reference_range=n_obs.reference_range,
                            newer_flag=n_obs.flag,
                            newer_date=newer_date,
                            newer_document_id=str(newer_doc.id),
                            newer_document_title=newer_doc.filename,
                            newer_page=n_obs.source_page,
                            newer_source_text=n_obs.source_text,
                            newer_is_verified=n_obs.is_reviewed,
                            standard_unit=b_obs.unit,
                            has_converted_units=False,
                            absolute_change=None,
                            percentage_change=None,
                            clinical_change_description="Could not standardize numeric readings. Review source document excerpts.",
                            requires_review=True,
                            review_explanation="Numeric conversion standard is not defined for this analyte.",
                        )
                    )
            else:
                # Qualitative comparison
                b_val_clean = (b_obs.value or "").strip().lower()
                n_val_clean = (n_obs.value or "").strip().lower()

                if b_val_clean == n_val_clean:
                    classification = "unchanged"
                    classification_label = "Unchanged Qualitative"
                    summary_metrics.unchanged_count += 1
                    desc = f"Qualitative reading remains '{n_obs.value}' across both reports."
                else:
                    classification = "qualitative_changed"
                    classification_label = "Qualitative Changed"
                    summary_metrics.qualitative_changed_count += 1
                    desc = f"Qualitative reading changed from '{b_obs.value}' ({baseline_date}) to '{n_obs.value}' ({newer_date})."

                comparison_items.append(
                    ReportComparisonItem(
                        test_name=display_name,
                        normalized_test_name=canonical_name,
                        category=category,
                        classification=classification,
                        classification_label=classification_label,
                        baseline_value=b_obs.value,
                        baseline_unit=b_obs.unit,
                        baseline_numeric=None,
                        baseline_reference_range=b_obs.reference_range,
                        baseline_flag=b_obs.flag,
                        baseline_date=baseline_date,
                        baseline_document_id=str(baseline_doc.id),
                        baseline_document_title=baseline_doc.filename,
                        baseline_page=b_obs.source_page,
                        baseline_source_text=b_obs.source_text,
                        baseline_is_verified=b_obs.is_reviewed,
                        newer_value=n_obs.value,
                        newer_unit=n_obs.unit,
                        newer_numeric=None,
                        newer_reference_range=n_obs.reference_range,
                        newer_flag=n_obs.flag,
                        newer_date=newer_date,
                        newer_document_id=str(newer_doc.id),
                        newer_document_title=newer_doc.filename,
                        newer_page=n_obs.source_page,
                        newer_source_text=n_obs.source_text,
                        newer_is_verified=n_obs.is_reviewed,
                        standard_unit=None,
                        has_converted_units=False,
                        absolute_change=None,
                        percentage_change=None,
                        clinical_change_description=desc,
                        requires_review=requires_review,
                        review_explanation=review_explanation,
                    )
                )

        # Case 2: New in newer report (not present in baseline)
        elif n_obs is not None and b_obs is None:
            summary_metrics.new_tests_count += 1
            comparison_items.append(
                ReportComparisonItem(
                    test_name=display_name,
                    normalized_test_name=canonical_name,
                    category=category,
                    classification="new",
                    classification_label="New in Newer Report",
                    baseline_value=None,
                    baseline_unit=None,
                    baseline_numeric=None,
                    baseline_reference_range=None,
                    baseline_flag=None,
                    baseline_date=None,
                    baseline_document_id=None,
                    baseline_document_title=None,
                    baseline_page=None,
                    baseline_source_text=None,
                    baseline_is_verified=None,
                    newer_value=n_obs.value,
                    newer_unit=n_obs.unit,
                    newer_numeric=n_obs.numeric_value,
                    newer_reference_range=n_obs.reference_range,
                    newer_flag=n_obs.flag,
                    newer_date=newer_date,
                    newer_document_id=str(newer_doc.id),
                    newer_document_title=newer_doc.filename,
                    newer_page=n_obs.source_page,
                    newer_source_text=n_obs.source_text,
                    newer_is_verified=n_obs.is_reviewed,
                    standard_unit=n_obs.unit,
                    has_converted_units=False,
                    absolute_change=None,
                    percentage_change=None,
                    clinical_change_description=(
                        f"Analyte was tested and reported on {newer_date} ({newer_doc.filename}), "
                        f"but was not recorded in the baseline report ({baseline_date})."
                    ),
                    requires_review=requires_review,
                    review_explanation=review_explanation,
                )
            )

        # Case 3: Present in baseline report but not found in newer report
        elif b_obs is not None and n_obs is None:
            summary_metrics.missing_tests_count += 1
            comparison_items.append(
                ReportComparisonItem(
                    test_name=display_name,
                    normalized_test_name=canonical_name,
                    category=category,
                    classification="not_found",
                    classification_label="Absent from Newer Report",
                    baseline_value=b_obs.value,
                    baseline_unit=b_obs.unit,
                    baseline_numeric=b_obs.numeric_value,
                    baseline_reference_range=b_obs.reference_range,
                    baseline_flag=b_obs.flag,
                    baseline_date=baseline_date,
                    baseline_document_id=str(baseline_doc.id),
                    baseline_document_title=baseline_doc.filename,
                    baseline_page=b_obs.source_page,
                    baseline_source_text=b_obs.source_text,
                    baseline_is_verified=b_obs.is_reviewed,
                    newer_value=None,
                    newer_unit=None,
                    newer_numeric=None,
                    newer_reference_range=None,
                    newer_flag=None,
                    newer_date=None,
                    newer_document_id=None,
                    newer_document_title=None,
                    newer_page=None,
                    newer_source_text=None,
                    newer_is_verified=None,
                    standard_unit=b_obs.unit,
                    has_converted_units=False,
                    absolute_change=None,
                    percentage_change=None,
                    clinical_change_description=(
                        f"Recorded in baseline report ({baseline_date}), but not tested or extracted in the newer report ({newer_date}). "
                        "Absence does not indicate or imply that a medical condition is resolved or absent."
                    ),
                    requires_review=requires_review,
                    review_explanation=review_explanation,
                )
            )

    summary_metrics.total_comparisons = len(comparison_items)

    if summary_metrics.incompatible_units_count > 0:
        warnings.append(
            f"{summary_metrics.incompatible_units_count} test(s) have incompatible measurement units across reports."
        )
    if summary_metrics.unverified_count > 0:
        warnings.append(
            f"{summary_metrics.unverified_count} observation(s) are unverified. Confirm source values with report images."
        )

    disclaimer = (
        "HealthMate AI report comparison computes mathematical deltas and qualitative differences between recorded observations "
        "for personal health recordkeeping and clinician discussion purposes. It does not provide medical diagnoses, treatment advice, "
        "or clinical evaluations. An increased or decreased value is not an assessment of improvement or deterioration; "
        "all changes must be evaluated by a licensed healthcare professional in complete clinical context."
    )

    return ReportComparisonResponse(
        selected_reports=selected_reports_meta,
        ordering_mode=ordering_mode,
        summary=summary_metrics,
        items=comparison_items,
        warnings=warnings,
        medical_disclaimer=disclaimer,
    )
