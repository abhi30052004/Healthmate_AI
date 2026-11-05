"""API routes for evidence-grounded medical record search and knowledge hub."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.search import SearchQueryRequest, SearchResponse
from app.services.medical_record_search import search_medical_records

router = APIRouter(prefix="/medical-search", tags=["Medical Search"])


@router.get(
    "",
    response_model=SearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search medical records with query parameters",
)
def search_records_get(
    q: str = Query(..., min_length=1, max_length=500, description="Search query string"),
    source_type: Literal["all", "document", "observation", "medication", "appointment", "follow_up"] = Query(
        "all", description="Source type filter"
    ),
    start_date: str | None = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date filter (YYYY-MM-DD)"),
    verified_only: bool = Query(True, description="When true, only reviewed clinical observations are returned"),
    sort_by: Literal["relevance", "date"] = Query("relevance", description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    include_archived: bool = Query(False, description="When true, include archived records"),
    profile_id: str | None = Query(None, description="Filter by family profile ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SearchResponse:
    """Execute authenticated multi-source search using query parameters."""
    req = SearchQueryRequest(
        q=q,
        source_type=source_type,
        start_date=start_date,
        end_date=end_date,
        verified_only=verified_only,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
        include_archived=include_archived,
        profile_id=profile_id,
    )
    try:
        return search_medical_records(db=db, user=current_user, request=req)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


@router.post(
    "/query",
    response_model=SearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search medical records with natural-language request body",
)
def search_records_post(
    payload: SearchQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SearchResponse:
    """Execute authenticated multi-source search using JSON payload."""
    try:
        return search_medical_records(db=db, user=current_user, request=payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
