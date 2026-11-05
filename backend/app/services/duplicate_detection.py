"""Service for Feature 5: Duplicate Detection & Data Quality Center.

Features:
- Deterministic and rule-based duplicate detection for medical documents and observations.
- Cryptographic hash checks (SHA-256), normalized filename & file size comparison.
- Clinical observation comparison (analyte, clinical date, value, unit, flag).
- Safe resolution workflow with non-destructive archiving and link retention.
- Full audit logging without storing clinical text in audit logs.
"""

from datetime import datetime, timezone
import difflib
import re
from typing import Any, Dict, List, Optional, Tuple
import uuid

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.data_quality import DataQualityAuditLog, DuplicateCandidate
from app.models.document import Document, DocumentObservation
from app.models.family_profile import FamilyProfile
from app.models.user import User
from app.schemas.data_quality import (
    DataQualityAuditLogItem,
    DataQualitySummary,
    DuplicateCandidateItem,
    DuplicateCandidateListResponse,
    DuplicateComparisonView,
    MatchReason,
    RecordSummary,
)
from app.services.family_profile import verify_profile_access
from app.services.normalization import normalize_test_name
from app.services.timeline import _get_best_clinical_date

# Central, explainable matching thresholds
CONFIDENCE_EXACT_HASH = 1.00
CONFIDENCE_IDENTICAL_OBSERVATION = 0.95
CONFIDENCE_SIMILAR_FILENAME_SIZE = 0.85
CONFIDENCE_SIMILAR_FILENAME_DATE = 0.80
CONFIDENCE_SIMILAR_FILENAME_ONLY = 0.60
CONFIDENCE_DIFFERENT_VALUES_SAME_DATE = 0.50
CONFIDENCE_MIN_CANDIDATE = 0.50

FILENAME_SIMILARITY_THRESHOLD = 0.80
OBSERVATION_NAME_SIMILARITY_THRESHOLD = 0.85
TEXT_SIMILARITY_THRESHOLD = 0.80


def _normalize_filename(name: str) -> str:
    """Normalizes filename for comparison by stripping extension, punctuation, and date stamps."""
    base = re.sub(r"\.[a-zA-Z0-9]{2,5}$", "", name)
    cleaned = re.sub(r"[\W_]+", " ", base).strip().lower()
    return cleaned


def _text_similarity(a: str, b: str) -> float:
    """Computes string similarity ratio between 0.0 and 1.0 using standard library difflib."""
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def _record_audit_event(
    db: Session,
    user_id: uuid.UUID,
    action: str,
    record_type: str,
    candidate_id: Optional[uuid.UUID] = None,
    retained_record_id: Optional[uuid.UUID] = None,
    archived_record_id: Optional[uuid.UUID] = None,
    details: Optional[Dict[str, Any]] = None,
) -> DataQualityAuditLog:
    """Records an audit log entry for duplicate detection and review events."""
    log_entry = DataQualityAuditLog(
        user_id=user_id,
        candidate_id=candidate_id,
        action=action,
        record_type=record_type,
        retained_record_id=retained_record_id,
        archived_record_id=archived_record_id,
        details=details or {},
        created_at=datetime.now(timezone.utc),
    )
    db.add(log_entry)
    db.commit()
    return log_entry


# ============================================================================
# DETECTION LOGIC
# ============================================================================


def evaluate_document_pair(
    doc_a: Document,
    doc_b: Document,
) -> Optional[Tuple[float, List[Dict[str, Any]]]]:
    """Evaluates two documents belonging to the same profile for duplication."""
    reasons: List[Dict[str, Any]] = []
    confidence = 0.0

    # 1. Exact cryptographic hash match (high confidence)
    if doc_a.checksum_sha256 and doc_b.checksum_sha256:
        if doc_a.checksum_sha256 == doc_b.checksum_sha256:
            reasons.append({
                "code": "EXACT_HASH",
                "description": "Cryptographically identical SHA-256 file checksum",
                "metrics": {"checksum": doc_a.checksum_sha256},
            })
            return CONFIDENCE_EXACT_HASH, reasons

    # 2. Filename similarity
    norm_a = _normalize_filename(doc_a.filename)
    norm_b = _normalize_filename(doc_b.filename)
    fn_ratio = _text_similarity(norm_a, norm_b)

    # File size difference
    size_diff = abs(doc_a.file_size - doc_b.file_size)
    max_size = max(doc_a.file_size, doc_b.file_size, 1)
    size_diff_pct = size_diff / max_size

    # Date match
    date_a = doc_a.document_date
    date_b = doc_b.document_date
    same_date = bool(date_a and date_b and date_a == date_b)

    if fn_ratio >= 0.90 and size_diff_pct < 0.05:
        confidence = max(confidence, CONFIDENCE_SIMILAR_FILENAME_SIZE)
        reasons.append({
            "code": "SIMILAR_FILENAME_AND_SIZE",
            "description": f"Filename similarity {int(fn_ratio * 100)}% with nearly identical file size",
            "metrics": {"filename_similarity": round(fn_ratio, 2), "size_diff_pct": round(size_diff_pct, 4)},
        })
    elif fn_ratio >= FILENAME_SIMILARITY_THRESHOLD and same_date:
        confidence = max(confidence, CONFIDENCE_SIMILAR_FILENAME_DATE)
        reasons.append({
            "code": "SIMILAR_FILENAME_AND_DATE",
            "description": f"Filename similarity {int(fn_ratio * 100)}% and matching clinical date ({date_a})",
            "metrics": {"filename_similarity": round(fn_ratio, 2), "document_date": date_a},
        })
    elif fn_ratio >= FILENAME_SIMILARITY_THRESHOLD:
        # Similar filename alone: low confidence; must never be treated as proof of duplicate!
        confidence = max(confidence, CONFIDENCE_SIMILAR_FILENAME_ONLY)
        reasons.append({
            "code": "SIMILAR_FILENAME_ONLY",
            "description": f"Filename similarity is {int(fn_ratio * 100)}% (review contents before merging)",
            "metrics": {"filename_similarity": round(fn_ratio, 2)},
        })

    # 3. Extracted text similarity
    if doc_a.extracted_text and doc_b.extracted_text:
        text_a = doc_a.extracted_text[:1200].strip()
        text_b = doc_b.extracted_text[:1200].strip()
        text_ratio = _text_similarity(text_a, text_b)
        if text_ratio >= TEXT_SIMILARITY_THRESHOLD:
            confidence = max(confidence, 0.88)
            reasons.append({
                "code": "SIMILAR_EXTRACTED_TEXT",
                "description": f"Extracted report text matches with {int(text_ratio * 100)}% similarity",
                "metrics": {"text_similarity": round(text_ratio, 2)},
            })

    if reasons and confidence >= CONFIDENCE_MIN_CANDIDATE:
        return confidence, reasons

    return None


def evaluate_observation_pair(
    obs_a: DocumentObservation,
    obs_b: DocumentObservation,
) -> Optional[Tuple[float, List[Dict[str, Any]]]]:
    """Evaluates two observations belonging to the same profile for duplication."""
    # Compare normalized analyte name
    norm_a = (obs_a.normalized_test_name or normalize_test_name(obs_a.test_name)[0]).lower()
    norm_b = (obs_b.normalized_test_name or normalize_test_name(obs_b.test_name)[0]).lower()
    name_ratio = _text_similarity(norm_a, norm_b)

    if name_ratio < OBSERVATION_NAME_SIMILARITY_THRESHOLD:
        return None

    # Compare clinical dates
    doc_a = obs_a.document
    doc_b = obs_b.document
    date_a = doc_a.document_date if doc_a else None
    date_b = doc_b.document_date if doc_b else None

    # If clinical dates are explicitly set and different, they are longitudinal entries, NOT duplicates!
    if date_a and date_b and date_a != date_b:
        return None

    val_a = obs_a.value.strip().lower()
    val_b = obs_b.value.strip().lower()
    unit_a = (obs_a.unit or "").strip().lower()
    unit_b = (obs_b.unit or "").strip().lower()

    reasons: List[Dict[str, Any]] = []

    # Identical values and units on same date
    if val_a == val_b and unit_a == unit_b:
        reasons.append({
            "code": "IDENTICAL_OBSERVATION",
            "description": f"Identical measurement '{obs_a.test_name}' = {obs_a.value} {obs_a.unit or ''} on date {date_a or 'unspecified'}",
            "metrics": {
                "test_name": obs_a.test_name,
                "value": obs_a.value,
                "unit": obs_a.unit,
                "date": date_a,
            },
        })
        return CONFIDENCE_IDENTICAL_OBSERVATION, reasons

    # Different values with same test name on same date
    # "Similar observation names with different values must not automatically be merged."
    if val_a != val_b and (date_a == date_b or not date_a or not date_b):
        reasons.append({
            "code": "DIFFERENT_VALUES_SAME_DATE",
            "description": f"Same test '{obs_a.test_name}' on date {date_a or 'unspecified'} but conflicting values ({obs_a.value} vs {obs_b.value}). Do not merge automatically.",
            "metrics": {
                "test_name": obs_a.test_name,
                "value_a": obs_a.value,
                "value_b": obs_b.value,
                "date": date_a,
            },
        })
        return CONFIDENCE_DIFFERENT_VALUES_SAME_DATE, reasons

    return None


# ============================================================================
# SCAN & MANAGEMENT SERVICES
# ============================================================================


def run_duplicate_scan(
    db: Session,
    user: User,
    profile_id: Optional[uuid.UUID] = None,
) -> DataQualitySummary:
    """Scans all active records for duplicates and updates candidate pairs."""
    target_profiles = []
    if profile_id:
        p = verify_profile_access(db, user, profile_id)
        target_profiles.append(p)
    else:
        target_profiles = (
            db.query(FamilyProfile)
            .filter(FamilyProfile.owner_id == user.id, FamilyProfile.is_active == True)
            .all()
        )

    new_candidates_count = 0

    for prof in target_profiles:
        # 1. Fetch non-archived documents for this profile
        doc_q = db.query(Document).filter(
            Document.owner_id == user.id,
            Document.is_archived == False,
        )
        if prof.is_primary:
            doc_q = doc_q.filter((Document.profile_id == prof.id) | (Document.profile_id.is_(None)))
        else:
            doc_q = doc_q.filter(Document.profile_id == prof.id)

        docs = doc_q.order_by(Document.created_at.desc()).all()

        # Pairwise compare documents
        for i in range(len(docs)):
            for j in range(i + 1, len(docs)):
                doc_a = docs[i]
                doc_b = docs[j]

                eval_result = evaluate_document_pair(doc_a, doc_b)
                if eval_result:
                    confidence, reasons = eval_result
                    # Ensure deterministic UUID ordering
                    prim_id, sec_id = (doc_a.id, doc_b.id) if str(doc_a.id) < str(doc_b.id) else (doc_b.id, doc_a.id)

                    existing = (
                        db.query(DuplicateCandidate)
                        .filter(
                            DuplicateCandidate.user_id == user.id,
                            DuplicateCandidate.record_type == "document",
                            DuplicateCandidate.primary_record_id == prim_id,
                            DuplicateCandidate.secondary_record_id == sec_id,
                        )
                        .first()
                    )

                    if not existing:
                        candidate = DuplicateCandidate(
                            user_id=user.id,
                            profile_id=prof.id,
                            record_type="document",
                            primary_record_id=prim_id,
                            secondary_record_id=sec_id,
                            confidence_score=confidence,
                            match_reasons=reasons,
                            status="pending",
                        )
                        db.add(candidate)
                        new_candidates_count += 1
                    elif existing.status == "pending":
                        existing.confidence_score = confidence
                        existing.match_reasons = reasons

        # 2. Fetch non-archived observations for this profile
        obs_q = (
            db.query(DocumentObservation)
            .join(Document, DocumentObservation.document_id == Document.id)
            .filter(
                DocumentObservation.owner_id == user.id,
                DocumentObservation.is_archived == False,
                Document.is_archived == False,
            )
            .options(selectinload(DocumentObservation.document))
        )
        if prof.is_primary:
            obs_q = obs_q.filter((Document.profile_id == prof.id) | (Document.profile_id.is_(None)))
        else:
            obs_q = obs_q.filter(Document.profile_id == prof.id)

        observations = obs_q.order_by(DocumentObservation.created_at.desc()).all()

        # Pairwise compare observations
        for i in range(len(observations)):
            for j in range(i + 1, len(observations)):
                obs_a = observations[i]
                obs_b = observations[j]

                # Don't compare same record ID
                if obs_a.id == obs_b.id:
                    continue

                eval_result = evaluate_observation_pair(obs_a, obs_b)
                if eval_result:
                    confidence, reasons = eval_result
                    prim_id, sec_id = (obs_a.id, obs_b.id) if str(obs_a.id) < str(obs_b.id) else (obs_b.id, obs_a.id)

                    existing = (
                        db.query(DuplicateCandidate)
                        .filter(
                            DuplicateCandidate.user_id == user.id,
                            DuplicateCandidate.record_type == "observation",
                            DuplicateCandidate.primary_record_id == prim_id,
                            DuplicateCandidate.secondary_record_id == sec_id,
                        )
                        .first()
                    )

                    if not existing:
                        candidate = DuplicateCandidate(
                            user_id=user.id,
                            profile_id=prof.id,
                            record_type="observation",
                            primary_record_id=prim_id,
                            secondary_record_id=sec_id,
                            confidence_score=confidence,
                            match_reasons=reasons,
                            status="pending",
                        )
                        db.add(candidate)
                        new_candidates_count += 1
                    elif existing.status == "pending":
                        existing.confidence_score = confidence
                        existing.match_reasons = reasons

    db.commit()

    _record_audit_event(
        db=db,
        user_id=user.id,
        action="scan_completed",
        record_type="system",
        details={"new_candidates_found": new_candidates_count, "profile_scoped": str(profile_id) if profile_id else None},
    )

    return get_data_quality_summary(db, user, profile_id=profile_id)


def get_data_quality_summary(
    db: Session,
    user: User,
    profile_id: Optional[uuid.UUID] = None,
) -> DataQualitySummary:
    """Returns high-level data quality metrics for the user / profile."""
    q = db.query(DuplicateCandidate).filter(DuplicateCandidate.user_id == user.id)
    if profile_id:
        q = q.filter(DuplicateCandidate.profile_id == profile_id)

    candidates = q.all()

    total = len(candidates)
    pending = sum(1 for c in candidates if c.status == "pending")
    confirmed = sum(1 for c in candidates if c.status == "confirmed_duplicate")
    resolved = sum(1 for c in candidates if c.status == "resolved")
    dismissed = sum(1 for c in candidates if c.status == "not_duplicate")
    high_conf = sum(1 for c in candidates if c.confidence_score >= 0.85 and c.status == "pending")
    docs = sum(1 for c in candidates if c.record_type == "document")
    obs = sum(1 for c in candidates if c.record_type == "observation")

    return DataQualitySummary(
        total_candidates=total,
        pending_count=pending,
        confirmed_count=confirmed,
        resolved_count=resolved,
        dismissed_count=dismissed,
        high_confidence_count=high_conf,
        documents_count=docs,
        observations_count=obs,
    )


def list_duplicate_candidates(
    db: Session,
    user: User,
    profile_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = None,
    record_type: Optional[str] = None,
    min_confidence: Optional[float] = None,
    page: int = 1,
    page_size: int = 20,
) -> DuplicateCandidateListResponse:
    """Lists duplicate candidates with filtering and pagination."""
    q = db.query(DuplicateCandidate).filter(DuplicateCandidate.user_id == user.id)

    if profile_id:
        q = q.filter(DuplicateCandidate.profile_id == profile_id)
    if status_filter:
        q = q.filter(DuplicateCandidate.status == status_filter)
    if record_type:
        q = q.filter(DuplicateCandidate.record_type == record_type)
    if min_confidence is not None:
        q = q.filter(DuplicateCandidate.confidence_score >= min_confidence)

    total = q.count()
    total_pages = max(1, (total + page_size - 1) // page_size)

    candidates = (
        q.order_by(DuplicateCandidate.confidence_score.desc(), DuplicateCandidate.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items: List[DuplicateCandidateItem] = []
    for c in candidates:
        prim_summary, sec_summary = _get_candidate_summaries(db, c)
        items.append(
            DuplicateCandidateItem(
                id=c.id,
                user_id=c.user_id,
                profile_id=c.profile_id,
                profile_name=c.profile.name if c.profile else "Profile",
                record_type=c.record_type,  # type: ignore
                primary_record_id=c.primary_record_id,
                secondary_record_id=c.secondary_record_id,
                confidence_score=c.confidence_score,
                match_reasons=[MatchReason(**r) for r in c.match_reasons],
                status=c.status,  # type: ignore
                retained_record_id=c.retained_record_id,
                archived_record_id=c.archived_record_id,
                resolution_action=c.resolution_action,
                decision_notes=c.decision_notes,
                reviewed_at=c.reviewed_at,
                resolved_at=c.resolved_at,
                created_at=c.created_at,
                primary_summary=prim_summary,
                secondary_summary=sec_summary,
            )
        )

    return DuplicateCandidateListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def _get_candidate_summaries(
    db: Session,
    candidate: DuplicateCandidate,
) -> Tuple[Optional[RecordSummary], Optional[RecordSummary]]:
    """Generates brief summary for candidate records."""
    if candidate.record_type == "document":
        doc_a = db.query(Document).filter(Document.id == candidate.primary_record_id).first()
        doc_b = db.query(Document).filter(Document.id == candidate.secondary_record_id).first()
        sum_a = (
            RecordSummary(
                id=doc_a.id,
                title=doc_a.filename,
                date=doc_a.document_date or doc_a.created_at.strftime("%Y-%m-%d"),
                detail=f"{doc_a.file_size} bytes • {doc_a.page_count or 1} pg",
                is_archived=doc_a.is_archived,
            )
            if doc_a
            else None
        )
        sum_b = (
            RecordSummary(
                id=doc_b.id,
                title=doc_b.filename,
                date=doc_b.document_date or doc_b.created_at.strftime("%Y-%m-%d"),
                detail=f"{doc_b.file_size} bytes • {doc_b.page_count or 1} pg",
                is_archived=doc_b.is_archived,
            )
            if doc_b
            else None
        )
        return sum_a, sum_b
    else:
        obs_a = db.query(DocumentObservation).filter(DocumentObservation.id == candidate.primary_record_id).first()
        obs_b = db.query(DocumentObservation).filter(DocumentObservation.id == candidate.secondary_record_id).first()
        sum_a = (
            RecordSummary(
                id=obs_a.id,
                title=obs_a.test_name,
                date=obs_a.created_at.strftime("%Y-%m-%d"),
                detail=f"{obs_a.value} {obs_a.unit or ''}",
                is_archived=obs_a.is_archived,
            )
            if obs_a
            else None
        )
        sum_b = (
            RecordSummary(
                id=obs_b.id,
                title=obs_b.test_name,
                date=obs_b.created_at.strftime("%Y-%m-%d"),
                detail=f"{obs_b.value} {obs_b.unit or ''}",
                is_archived=obs_b.is_archived,
            )
            if obs_b
            else None
        )
        return sum_a, sum_b


def get_duplicate_comparison(
    db: Session,
    user: User,
    candidate_id: uuid.UUID,
) -> DuplicateComparisonView:
    """Returns side-by-side comparison details for two candidate records."""
    candidate = (
        db.query(DuplicateCandidate)
        .filter(DuplicateCandidate.id == candidate_id, DuplicateCandidate.user_id == user.id)
        .first()
    )
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Duplicate candidate record not found.",
        )

    prim_summary, sec_summary = _get_candidate_summaries(db, candidate)
    cand_item = DuplicateCandidateItem(
        id=candidate.id,
        user_id=candidate.user_id,
        profile_id=candidate.profile_id,
        profile_name=candidate.profile.name if candidate.profile else "Profile",
        record_type=candidate.record_type,  # type: ignore
        primary_record_id=candidate.primary_record_id,
        secondary_record_id=candidate.secondary_record_id,
        confidence_score=candidate.confidence_score,
        match_reasons=[MatchReason(**r) for r in candidate.match_reasons],
        status=candidate.status,  # type: ignore
        retained_record_id=candidate.retained_record_id,
        archived_record_id=candidate.archived_record_id,
        resolution_action=candidate.resolution_action,
        decision_notes=candidate.decision_notes,
        reviewed_at=candidate.reviewed_at,
        resolved_at=candidate.resolved_at,
        created_at=candidate.created_at,
        primary_summary=prim_summary,
        secondary_summary=sec_summary,
    )

    similarities: List[str] = []
    differences: List[str] = []

    if candidate.record_type == "document":
        doc_a = db.query(Document).filter(Document.id == candidate.primary_record_id, Document.owner_id == user.id).first()
        doc_b = db.query(Document).filter(Document.id == candidate.secondary_record_id, Document.owner_id == user.id).first()
        if not doc_a or not doc_b:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referenced document records not found.")

        prim_dict = {
            "id": str(doc_a.id),
            "filename": doc_a.filename,
            "document_date": doc_a.document_date or doc_a.created_at.strftime("%Y-%m-%d"),
            "file_size": doc_a.file_size,
            "mime_type": doc_a.mime_type,
            "checksum_sha256": doc_a.checksum_sha256,
            "page_count": doc_a.page_count,
            "is_archived": doc_a.is_archived,
            "extracted_text_preview": doc_a.extracted_text[:400] if doc_a.extracted_text else None,
        }
        sec_dict = {
            "id": str(doc_b.id),
            "filename": doc_b.filename,
            "document_date": doc_b.document_date or doc_b.created_at.strftime("%Y-%m-%d"),
            "file_size": doc_b.file_size,
            "mime_type": doc_b.mime_type,
            "checksum_sha256": doc_b.checksum_sha256,
            "page_count": doc_b.page_count,
            "is_archived": doc_b.is_archived,
            "extracted_text_preview": doc_b.extracted_text[:400] if doc_b.extracted_text else None,
        }

        if doc_a.checksum_sha256 == doc_b.checksum_sha256:
            similarities.append("Exact cryptographic SHA-256 hash match")
        else:
            differences.append("Different cryptographic checksums")

        if doc_a.filename.strip().lower() == doc_b.filename.strip().lower():
            similarities.append("Identical filenames")
        else:
            differences.append(f"Filenames differ ('{doc_a.filename}' vs '{doc_b.filename}')")

        if doc_a.file_size == doc_b.file_size:
            similarities.append(f"Identical file size ({doc_a.file_size} bytes)")
        else:
            differences.append(f"File sizes differ ({doc_a.file_size} bytes vs {doc_b.file_size} bytes)")

        return DuplicateComparisonView(
            candidate=cand_item,
            primary_record=prim_dict,
            secondary_record=sec_dict,
            similarities=similarities,
            differences=differences,
        )
    else:
        obs_a = db.query(DocumentObservation).filter(DocumentObservation.id == candidate.primary_record_id, DocumentObservation.owner_id == user.id).first()
        obs_b = db.query(DocumentObservation).filter(DocumentObservation.id == candidate.secondary_record_id, DocumentObservation.owner_id == user.id).first()
        if not obs_a or not obs_b:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referenced observation records not found.")

        prim_dict = {
            "id": str(obs_a.id),
            "test_name": obs_a.test_name,
            "normalized_test_name": obs_a.normalized_test_name,
            "value": obs_a.value,
            "unit": obs_a.unit,
            "reference_range": obs_a.reference_range,
            "flag": obs_a.flag,
            "source_document": obs_a.document.filename if obs_a.document else None,
            "is_archived": obs_a.is_archived,
        }
        sec_dict = {
            "id": str(obs_b.id),
            "test_name": obs_b.test_name,
            "normalized_test_name": obs_b.normalized_test_name,
            "value": obs_b.value,
            "unit": obs_b.unit,
            "reference_range": obs_b.reference_range,
            "flag": obs_b.flag,
            "source_document": obs_b.document.filename if obs_b.document else None,
            "is_archived": obs_b.is_archived,
        }

        if obs_a.test_name.strip().lower() == obs_b.test_name.strip().lower():
            similarities.append(f"Matching test name '{obs_a.test_name}'")
        else:
            differences.append(f"Test names differ ('{obs_a.test_name}' vs '{obs_b.test_name}')")

        if obs_a.value.strip().lower() == obs_b.value.strip().lower():
            similarities.append(f"Identical value '{obs_a.value}'")
        else:
            differences.append(f"Values differ ('{obs_a.value}' vs '{obs_b.value}')")

        if (obs_a.unit or "").strip().lower() == (obs_b.unit or "").strip().lower():
            similarities.append(f"Matching unit '{obs_a.unit or 'none'}'")
        else:
            differences.append(f"Units differ ('{obs_a.unit}' vs '{obs_b.unit}')")

        return DuplicateComparisonView(
            candidate=cand_item,
            primary_record=prim_dict,
            secondary_record=sec_dict,
            similarities=similarities,
            differences=differences,
        )


def confirm_duplicate_candidate(
    db: Session,
    user: User,
    candidate_id: uuid.UUID,
) -> DuplicateCandidateItem:
    """Marks candidate pair as confirmed duplicate, pending resolution."""
    candidate = (
        db.query(DuplicateCandidate)
        .filter(DuplicateCandidate.id == candidate_id, DuplicateCandidate.user_id == user.id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duplicate candidate not found.")

    candidate.status = "confirmed_duplicate"
    candidate.reviewed_at = datetime.now(timezone.utc)
    db.commit()

    _record_audit_event(
        db=db,
        user_id=user.id,
        action="confirmed_duplicate",
        record_type=candidate.record_type,
        candidate_id=candidate.id,
        details={"status": "confirmed_duplicate"},
    )

    prim_sum, sec_sum = _get_candidate_summaries(db, candidate)
    return DuplicateCandidateItem(
        id=candidate.id,
        user_id=candidate.user_id,
        profile_id=candidate.profile_id,
        profile_name=candidate.profile.name if candidate.profile else "Profile",
        record_type=candidate.record_type,  # type: ignore
        primary_record_id=candidate.primary_record_id,
        secondary_record_id=candidate.secondary_record_id,
        confidence_score=candidate.confidence_score,
        match_reasons=[MatchReason(**r) for r in candidate.match_reasons],
        status=candidate.status,  # type: ignore
        retained_record_id=candidate.retained_record_id,
        archived_record_id=candidate.archived_record_id,
        resolution_action=candidate.resolution_action,
        decision_notes=candidate.decision_notes,
        reviewed_at=candidate.reviewed_at,
        resolved_at=candidate.resolved_at,
        created_at=candidate.created_at,
        primary_summary=prim_sum,
        secondary_summary=sec_sum,
    )


def dismiss_duplicate_candidate(
    db: Session,
    user: User,
    candidate_id: uuid.UUID,
    notes: Optional[str] = None,
) -> DuplicateCandidateItem:
    """Marks candidate pair as NOT a duplicate (false positive)."""
    candidate = (
        db.query(DuplicateCandidate)
        .filter(DuplicateCandidate.id == candidate_id, DuplicateCandidate.user_id == user.id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duplicate candidate not found.")

    candidate.status = "not_duplicate"
    candidate.resolution_action = "dismissed_false_positive"
    candidate.decision_notes = notes
    candidate.reviewed_at = datetime.now(timezone.utc)
    db.commit()

    _record_audit_event(
        db=db,
        user_id=user.id,
        action="marked_not_duplicate",
        record_type=candidate.record_type,
        candidate_id=candidate.id,
        details={"notes": notes},
    )

    prim_sum, sec_sum = _get_candidate_summaries(db, candidate)
    return DuplicateCandidateItem(
        id=candidate.id,
        user_id=candidate.user_id,
        profile_id=candidate.profile_id,
        profile_name=candidate.profile.name if candidate.profile else "Profile",
        record_type=candidate.record_type,  # type: ignore
        primary_record_id=candidate.primary_record_id,
        secondary_record_id=candidate.secondary_record_id,
        confidence_score=candidate.confidence_score,
        match_reasons=[MatchReason(**r) for r in candidate.match_reasons],
        status=candidate.status,  # type: ignore
        retained_record_id=candidate.retained_record_id,
        archived_record_id=candidate.archived_record_id,
        resolution_action=candidate.resolution_action,
        decision_notes=candidate.decision_notes,
        reviewed_at=candidate.reviewed_at,
        resolved_at=candidate.resolved_at,
        created_at=candidate.created_at,
        primary_summary=prim_sum,
        secondary_summary=sec_sum,
    )


def resolve_duplicate_candidate(
    db: Session,
    user: User,
    candidate_id: uuid.UUID,
    retained_record_id: uuid.UUID,
    notes: Optional[str] = None,
) -> DuplicateCandidateItem:
    """Resolves duplicate by retaining chosen record and safely archiving the duplicate.

    Enforces:
    - User ownership and authorization over both records.
    - Transactional integrity with safe rollback on error.
    - Non-destructive soft archive preserving provenance.
    """
    candidate = (
        db.query(DuplicateCandidate)
        .filter(DuplicateCandidate.id == candidate_id, DuplicateCandidate.user_id == user.id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duplicate candidate not found.")

    if candidate.status == "resolved":
        # Idempotent check
        prim_sum, sec_sum = _get_candidate_summaries(db, candidate)
        return DuplicateCandidateItem(
            id=candidate.id,
            user_id=candidate.user_id,
            profile_id=candidate.profile_id,
            profile_name=candidate.profile.name if candidate.profile else "Profile",
            record_type=candidate.record_type,  # type: ignore
            primary_record_id=candidate.primary_record_id,
            secondary_record_id=candidate.secondary_record_id,
            confidence_score=candidate.confidence_score,
            match_reasons=[MatchReason(**r) for r in candidate.match_reasons],
            status=candidate.status,  # type: ignore
            retained_record_id=candidate.retained_record_id,
            archived_record_id=candidate.archived_record_id,
            resolution_action=candidate.resolution_action,
            decision_notes=candidate.decision_notes,
            reviewed_at=candidate.reviewed_at,
            resolved_at=candidate.resolved_at,
            created_at=candidate.created_at,
            primary_summary=prim_sum,
            secondary_summary=sec_sum,
        )

    # Validate retained_record_id is one of the pair
    if retained_record_id not in (candidate.primary_record_id, candidate.secondary_record_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="retained_record_id must be either the primary or secondary record of this duplicate candidate.",
        )

    archived_record_id = (
        candidate.secondary_record_id
        if retained_record_id == candidate.primary_record_id
        else candidate.primary_record_id
    )

    now = datetime.now(timezone.utc)

    try:
        if candidate.record_type == "document":
            retained_doc = db.query(Document).filter(Document.id == retained_record_id, Document.owner_id == user.id).first()
            archived_doc = db.query(Document).filter(Document.id == archived_record_id, Document.owner_id == user.id).first()

            if not retained_doc or not archived_doc:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referenced document records not found.")

            retained_doc.is_archived = False
            retained_doc.archived_at = None

            archived_doc.is_archived = True
            archived_doc.archived_at = now
            archived_doc.duplicate_of_id = retained_record_id

            # Cascading archive of observations belonging to the archived document
            db.query(DocumentObservation).filter(DocumentObservation.document_id == archived_record_id).update(
                {"is_archived": True, "archived_at": now, "duplicate_of_id": None},
                synchronize_session="fetch",
            )
        else:
            retained_obs = db.query(DocumentObservation).filter(DocumentObservation.id == retained_record_id, DocumentObservation.owner_id == user.id).first()
            archived_obs = db.query(DocumentObservation).filter(DocumentObservation.id == archived_record_id, DocumentObservation.owner_id == user.id).first()

            if not retained_obs or not archived_obs:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referenced observation records not found.")

            retained_obs.is_archived = False
            retained_obs.archived_at = None

            archived_obs.is_archived = True
            archived_obs.archived_at = now
            archived_obs.duplicate_of_id = retained_record_id

        action_name = "retained_primary" if retained_record_id == candidate.primary_record_id else "retained_secondary"
        candidate.status = "resolved"
        candidate.retained_record_id = retained_record_id
        candidate.archived_record_id = archived_record_id
        candidate.resolution_action = action_name
        candidate.decision_notes = notes
        candidate.resolved_at = now
        candidate.reviewed_at = now

        db.commit()

        _record_audit_event(
            db=db,
            user_id=user.id,
            action="resolved_duplicate",
            record_type=candidate.record_type,
            candidate_id=candidate.id,
            retained_record_id=retained_record_id,
            archived_record_id=archived_record_id,
            details={"action": action_name, "notes": notes},
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve duplicate: {str(exc)}",
        )

    prim_sum, sec_sum = _get_candidate_summaries(db, candidate)
    return DuplicateCandidateItem(
        id=candidate.id,
        user_id=candidate.user_id,
        profile_id=candidate.profile_id,
        profile_name=candidate.profile.name if candidate.profile else "Profile",
        record_type=candidate.record_type,  # type: ignore
        primary_record_id=candidate.primary_record_id,
        secondary_record_id=candidate.secondary_record_id,
        confidence_score=candidate.confidence_score,
        match_reasons=[MatchReason(**r) for r in candidate.match_reasons],
        status=candidate.status,  # type: ignore
        retained_record_id=candidate.retained_record_id,
        archived_record_id=candidate.archived_record_id,
        resolution_action=candidate.resolution_action,
        decision_notes=candidate.decision_notes,
        reviewed_at=candidate.reviewed_at,
        resolved_at=candidate.resolved_at,
        created_at=candidate.created_at,
        primary_summary=prim_sum,
        secondary_summary=sec_sum,
    )


def list_data_quality_audit_history(
    db: Session,
    user: User,
    limit: int = 50,
) -> List[DataQualityAuditLogItem]:
    """Returns audit history of duplicate detection and resolution decisions."""
    logs = (
        db.query(DataQualityAuditLog)
        .filter(DataQualityAuditLog.user_id == user.id)
        .order_by(DataQualityAuditLog.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        DataQualityAuditLogItem(
            id=log.id,
            candidate_id=log.candidate_id,
            action=log.action,
            record_type=log.record_type,
            retained_record_id=log.retained_record_id,
            archived_record_id=log.archived_record_id,
            details=log.details,
            created_at=log.created_at,
        )
        for log in logs
    ]
