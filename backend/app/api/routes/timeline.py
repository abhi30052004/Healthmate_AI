import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.timeline import (
    TimelineResponse,
    TimelineSummaryResponse,
    TrendResponse,
)
from app.services.timeline import (
    get_user_medical_timeline,
    get_user_timeline_summary,
    get_user_timeline_trends,
)

router = APIRouter(prefix="/timeline", tags=["Medical Timeline"])


@router.get(
    "",
    response_model=TimelineResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user's chronological medical observation timeline",
)
def get_timeline(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    include_unverified: bool = Query(
        False,
        description="Include unreviewed observations marked as unverified",
    ),
    start_date: str | None = Query(
        None,
        description="Filter by start date (YYYY-MM-DD)",
    ),
    end_date: str | None = Query(
        None,
        description="Filter by end date (YYYY-MM-DD)",
    ),
    test_name: str | None = Query(
        None,
        description="Filter by test name or canonical alias",
    ),
    category: str | None = Query(
        None,
        description="Filter by clinical category (Hematology, Lipids, Metabolic, Endocrine)",
    ),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    profile_id: uuid.UUID | None = Query(None, description="Filter by family profile ID"),
    include_archived: bool = Query(False, description="Include archived observations"),
) -> TimelineResponse:
    """Retrieve chronologically organized timeline of medical report observations."""
    if start_date and end_date and start_date > end_date:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date cannot be later than end_date.",
        )
    return get_user_medical_timeline(
        db=db,
        current_user=current_user,
        include_unverified=include_unverified,
        start_date=start_date,
        end_date=end_date,
        test_name=test_name,
        category=category,
        limit=limit,
        offset=offset,
        profile_id=profile_id,
        include_archived=include_archived,
    )


@router.get(
    "/trends",
    response_model=TrendResponse,
    status_code=status.HTTP_200_OK,
    summary="Get chronological trend series grouped by test and compatible unit",
)
def get_trends(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    include_unverified: bool = Query(
        False,
        description="Include unreviewed observations in trend points",
    ),
    test_name: str | None = Query(
        None,
        description="Filter to a specific test name",
    ),
    category: str | None = Query(
        None,
        description="Filter by clinical category",
    ),
    profile_id: uuid.UUID | None = Query(None, description="Filter by family profile ID"),
) -> TrendResponse:
    """Retrieve grouped numeric observations over time for longitudinal trend charting."""
    return get_user_timeline_trends(
        db=db,
        current_user=current_user,
        include_unverified=include_unverified,
        test_name=test_name,
        category=category,
        profile_id=profile_id,
    )


@router.get(
    "/summary",
    response_model=TimelineSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get factual summary of medical history and repeated measurements",
)
def get_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    include_unverified: bool = Query(
        False,
        description="Include unverified observations in summary metrics",
    ),
    profile_id: uuid.UUID | None = Query(None, description="Filter by family profile ID"),
) -> TimelineSummaryResponse:
    """Generate concise, factual, evidence-based overview of user's recorded observations."""
    return get_user_timeline_summary(
        db=db,
        current_user=current_user,
        include_unverified=include_unverified,
        profile_id=profile_id,
    )
