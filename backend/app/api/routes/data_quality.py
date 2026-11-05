"""API routes for Feature 5: Duplicate Detection & Data Quality Center."""

from typing import Annotated, List, Optional
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.data_quality import (
    DataQualityAuditLogItem,
    DataQualitySummary,
    DismissDuplicateRequest,
    DuplicateCandidateItem,
    DuplicateCandidateListResponse,
    DuplicateComparisonView,
    ResolveDuplicateRequest,
)
from app.services.duplicate_detection import (
    confirm_duplicate_candidate,
    dismiss_duplicate_candidate,
    get_data_quality_summary,
    get_duplicate_comparison,
    list_data_quality_audit_history,
    list_duplicate_candidates,
    resolve_duplicate_candidate,
    run_duplicate_scan,
)

router = APIRouter(prefix="/data-quality", tags=["Duplicate Detection & Data Quality"])


@router.post(
    "/scan",
    response_model=DataQualitySummary,
    status_code=status.HTTP_200_OK,
    summary="Run duplicate detection scan across medical records and observations",
)
def scan_duplicates(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    profile_id: Optional[uuid.UUID] = Query(None, description="Optional profile ID to scope duplicate scan"),
) -> DataQualitySummary:
    """Executes deterministic and explainable duplicate detection and returns summary metrics."""
    return run_duplicate_scan(db, current_user, profile_id=profile_id)


@router.get(
    "/summary",
    response_model=DataQualitySummary,
    status_code=status.HTTP_200_OK,
    summary="Get overall data quality and duplicate candidate counts",
)
def get_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    profile_id: Optional[uuid.UUID] = Query(None, description="Optional profile ID filter"),
) -> DataQualitySummary:
    """Returns candidate counts by status, record type, and high confidence flags."""
    return get_data_quality_summary(db, current_user, profile_id=profile_id)


@router.get(
    "/candidates",
    response_model=DuplicateCandidateListResponse,
    status_code=status.HTTP_200_OK,
    summary="List duplicate candidates with pagination and filters",
)
def list_candidates(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    profile_id: Optional[uuid.UUID] = Query(None, description="Filter by family profile"),
    status: Optional[str] = Query(None, description="Filter by status (pending, confirmed_duplicate, not_duplicate, resolved)"),
    record_type: Optional[str] = Query(None, description="Filter by record type (document, observation)"),
    min_confidence: Optional[float] = Query(None, description="Filter by minimum confidence score (0.0 - 1.0)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
) -> DuplicateCandidateListResponse:
    """Retrieves candidates for user review with confidence scores and matching reasons."""
    return list_duplicate_candidates(
        db,
        current_user,
        profile_id=profile_id,
        status_filter=status,
        record_type=record_type,
        min_confidence=min_confidence,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/candidates/{candidate_id}",
    response_model=DuplicateComparisonView,
    status_code=status.HTTP_200_OK,
    summary="Get detailed side-by-side comparison for a duplicate candidate pair",
)
def get_candidate_comparison(
    candidate_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DuplicateComparisonView:
    """Returns side-by-side comparison of records with highlighted similarities and differences."""
    return get_duplicate_comparison(db, current_user, candidate_id)


@router.post(
    "/candidates/{candidate_id}/confirm",
    response_model=DuplicateCandidateItem,
    status_code=status.HTTP_200_OK,
    summary="Mark candidate as confirmed duplicate, pending resolution",
)
def confirm_candidate(
    candidate_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DuplicateCandidateItem:
    """Sets status to confirmed_duplicate."""
    return confirm_duplicate_candidate(db, current_user, candidate_id)


@router.post(
    "/candidates/{candidate_id}/dismiss",
    response_model=DuplicateCandidateItem,
    status_code=status.HTTP_200_OK,
    summary="Dismiss candidate as not a duplicate (false positive)",
)
def dismiss_candidate(
    candidate_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    payload: Optional[DismissDuplicateRequest] = None,
) -> DuplicateCandidateItem:
    """Sets status to not_duplicate."""
    notes = payload.notes if payload else None
    return dismiss_duplicate_candidate(db, current_user, candidate_id, notes=notes)


@router.post(
    "/candidates/{candidate_id}/resolve",
    response_model=DuplicateCandidateItem,
    status_code=status.HTTP_200_OK,
    summary="Resolve duplicate by selecting record to retain and archiving the duplicate",
)
def resolve_candidate(
    candidate_id: uuid.UUID,
    payload: ResolveDuplicateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DuplicateCandidateItem:
    """Non-destructively archives the duplicate, links provenance, and updates candidate status."""
    return resolve_duplicate_candidate(
        db,
        current_user,
        candidate_id,
        retained_record_id=payload.retained_record_id,
        notes=payload.notes,
    )


@router.get(
    "/history",
    response_model=List[DataQualityAuditLogItem],
    status_code=status.HTTP_200_OK,
    summary="Get audit history of duplicate detection and resolution events",
)
def get_audit_history(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(50, ge=1, le=100),
) -> List[DataQualityAuditLogItem]:
    """Returns chronological audit trail of scans, confirmations, dismissals, and resolutions."""
    return list_data_quality_audit_history(db, current_user, limit=limit)
