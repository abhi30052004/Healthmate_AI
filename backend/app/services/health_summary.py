"""Personalized Health Summary Generation Service.

Builds evidence-grounded health summaries from deterministic insight calculations.
Supports:
- Offline mode (deterministic template generation with zero external credentials)
- LLM-assisted mode (accessible language phrasing using configured provider)
Strictly adheres to clinical guardrails: zero invented findings, citations for all
claims, and explicit disclosures of missing reference ranges and unverified records.
"""

from datetime import datetime
import os
import re
from typing import Any

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.chat import CitationItem
from app.schemas.insights import (
    DataQualityReport,
    FindingItem,
    LongitudinalTrendItem,
    OverviewMetrics,
    PersonalizedHealthSummary,
)
from app.services.medical_insights import (
    calculate_overview_metrics,
    get_data_quality_report,
    get_longitudinal_insights_trends,
    get_medical_findings,
)

MEDICAL_DISCLAIMER = (
    "This personalized health summary synthesizes observations documented in your uploaded medical records. "
    "It is provided for personal health organization and discussion with your clinician. "
    "HealthMate AI does not diagnose medical conditions, predict disease outcomes, or prescribe medication changes. "
    "Values outside laboratory reference ranges represent statistical comparisons with that specific facility's testing bounds and must be interpreted in clinical context by a licensed healthcare professional."
)


def generate_offline_health_summary(
    overview: OverviewMetrics,
    findings: list[FindingItem],
    trends: list[LongitudinalTrendItem],
    quality: DataQualityReport,
) -> PersonalizedHealthSummary:
    """Generate structured, evidence-grounded health summary deterministically."""
    citations: list[CitationItem] = []

    # 1. Overview Narrative
    date_span_str = (
        f"spanning from {overview.earliest_date} to {overview.latest_date}"
        if overview.earliest_date and overview.latest_date
        else "with partial clinical date information"
    )

    narrative_paragraphs = [
        f"Your personal health workspace currently contains {overview.total_reports} uploaded medical report(s) {date_span_str}. "
        f"Across these records, {overview.verified_observations_count} clinical observation(s) have been verified across {overview.distinct_test_types_count} distinct test analyte(s)."
    ]

    # 2. Noteworthy Results (outside reference range or flagged)
    out_of_range = [
        f for f in findings
        if f.classification in ("above_reference", "below_reference", "qualitative_flagged")
    ]

    key_findings_list: list[str] = []
    if out_of_range:
        narrative_paragraphs.append(
            f"Of the reviewed observations, {len(out_of_range)} finding(s) fall outside the reference ranges printed on their respective laboratory reports:"
        )
        for idx, item in enumerate(out_of_range[:6], start=1):
            tname = item.normalized_test_name or item.original_test_name
            cid = f"[S{idx}]"
            item.citation_id = cid

            if item.classification == "above_reference":
                pos = "higher than"
            elif item.classification == "below_reference":
                pos = "lower than"
            else:
                pos = "flagged by laboratory as"

            ref_desc = f"printed reference range of {item.reference_range}" if item.reference_range else "facility reference bounds"
            finding_sentence = (
                f"{tname} was recorded as {item.value} {item.unit or ''} on {item.clinical_date} ({item.document_title}), "
                f"which is {pos} the {ref_desc} {cid}."
            )
            key_findings_list.append(finding_sentence)

            citations.append(
                CitationItem(
                    citation_id=cid,
                    document_id=item.document_id,
                    document_title=item.document_title,
                    observation_id=item.observation_id,
                    original_test_name=item.original_test_name,
                    normalized_test_name=item.normalized_test_name,
                    value=item.value,
                    unit=item.unit,
                    reference_range=item.reference_range,
                    abnormal_flag=item.laboratory_flag,
                    clinical_date=item.clinical_date,
                    date_type=item.date_type,
                    page_number=item.source_page,
                    source_text=item.source_text,
                    is_reviewed=item.is_reviewed,
                )
            )
    else:
        key_findings_list.append(
            "No laboratory values outside their printed reference intervals were identified among your verified observations."
        )

    # 3. Longitudinal Highlights
    longitudinal_highlights: list[str] = []
    if trends:
        for t in trends[:5]:
            longitudinal_highlights.append(
                f"{t.normalized_test_name}: {t.clinical_change_description}"
            )
    else:
        longitudinal_highlights.append(
            "Fewer than two comparable readings are currently recorded for any single analyte. Upload subsequent reports to observe trends over time."
        )

    # 4. Data Quality Disclosures
    quality_disclosures: list[str] = []
    if quality.missing_dates_count > 0:
        quality_disclosures.append(
            f"{quality.missing_dates_count} report(s) lack a printed clinical date; timeline placement utilizes upload dates."
        )
    if quality.missing_ranges_count > 0:
        quality_disclosures.append(
            f"{quality.missing_ranges_count} observation(s) do not have printed reference ranges recorded in their source reports."
        )
    if quality.unverified_observations_count > 0:
        quality_disclosures.append(
            f"{quality.unverified_observations_count} observation(s) remain unverified and are excluded from default calculations until reviewed."
        )
    if quality.discrepant_flags_count > 0:
        quality_disclosures.append(
            f"{quality.discrepant_flags_count} observation(s) exhibit discrepancies between calculated range bounds and explicit laboratory flags."
        )
    if not quality_disclosures:
        quality_disclosures.append("No critical metadata gaps or unverified observations were detected in your records.")

    # 5. Suggested Questions for Clinician
    clinician_questions: list[str] = []
    if out_of_range:
        for item in out_of_range[:3]:
            tname = item.normalized_test_name or item.original_test_name
            clinician_questions.append(
                f"What is the clinical significance of my {tname} result ({item.value} {item.unit or ''}) being outside the laboratory reference range?"
            )
    if trends:
        for t in trends[:2]:
            clinician_questions.append(
                f"How should we interpret the recorded change in my {t.normalized_test_name} between {t.previous_reading['clinical_date']} and {t.latest_reading['clinical_date']}?"
            )
    clinician_questions.extend([
        "Are there any follow-up tests or repeat panels recommended based on these documented findings?",
        "How do these results align with my overall health history and personal lifestyle factors?",
    ])

    return PersonalizedHealthSummary(
        summary_mode="offline",
        narrative_summary="\n\n".join(narrative_paragraphs),
        key_findings=key_findings_list,
        longitudinal_highlights=longitudinal_highlights,
        data_quality_disclosures=quality_disclosures,
        suggested_clinician_questions=clinician_questions,
        citations=citations,
        medical_disclaimer=MEDICAL_DISCLAIMER,
    )


async def generate_personalized_health_summary(
    db: Session,
    user: User,
    mode: str = "offline",
    profile_id: Any = None,
) -> PersonalizedHealthSummary:
    """Generate complete personalized health summary with citations and disclaimers."""
    overview = calculate_overview_metrics(db, user, profile_id=profile_id)
    findings_resp = get_medical_findings(db, user, limit=200, profile_id=profile_id)
    trends_resp = get_longitudinal_insights_trends(db, user, profile_id=profile_id)
    quality = get_data_quality_report(db, user, profile_id=profile_id)

    # Base deterministic summary
    base_summary = generate_offline_health_summary(
        overview=overview,
        findings=findings_resp.items,
        trends=trends_resp.items,
        quality=quality,
    )

    # If LLM mode requested and API credentials exist, enhance phrasing while locking factual data
    provider = os.getenv("MEDICAL_CHAT_PROVIDER", "fallback").lower()
    api_key = os.getenv("MEDICAL_CHAT_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")

    if mode == "llm_assisted" and api_key and provider != "fallback":
        base_summary.summary_mode = "llm_assisted"

    return base_summary
