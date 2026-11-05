import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.insights import (
    DataQualityReport,
    FindingsResponse,
    LongitudinalTrendsResponse,
    OverviewMetrics,
    PersonalizedHealthSummary,
)
from app.services.csv_export import generate_observations_csv
from app.services.health_summary import generate_personalized_health_summary
from app.services.medical_insights import (
    calculate_overview_metrics,
    get_data_quality_report,
    get_longitudinal_insights_trends,
    get_medical_findings,
)
from app.services.pdf_health_report import generate_pdf_health_report

router = APIRouter(prefix="/medical-insights", tags=["Medical Insights"])


@router.get(
    "/overview",
    response_model=OverviewMetrics,
    status_code=status.HTTP_200_OK,
    summary="Get record overview metrics and aggregate counts",
)
def get_insights_overview(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    profile_id: uuid.UUID | None = Query(None, description="Scope metrics to a specific family profile ID"),
) -> OverviewMetrics:
    """Return health-record overview metrics strictly for the authenticated user."""
    return calculate_overview_metrics(db, current_user, profile_id=profile_id)


@router.get(
    "/findings",
    response_model=FindingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get verified clinical findings with reference-range classifications",
)
def get_insights_findings(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    start_date: str | None = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    category: str | None = Query(None, description="Filter by clinical panel category"),
    test_name: str | None = Query(None, description="Filter by test analyte name"),
    classification: str | None = Query(
        None,
        description="Filter by classification: below_reference, within_reference, above_reference, qualitative_flagged, unknown",
    ),
    include_unverified: bool = Query(False, description="Include unverified observations"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    profile_id: uuid.UUID | None = Query(None, description="Scope findings to a specific family profile ID"),
) -> FindingsResponse:
    """Return observations classified against their own printed laboratory reference ranges."""
    return get_medical_findings(
        db=db,
        user=current_user,
        start_date=start_date,
        end_date=end_date,
        category=category,
        test_name=test_name,
        classification=classification,
        include_unverified=include_unverified,
        limit=limit,
        offset=offset,
        profile_id=profile_id,
    )


@router.get(
    "/trends",
    response_model=LongitudinalTrendsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get longitudinal changes and percentage differences for comparable tests",
)
def get_insights_trends(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    include_unverified: bool = Query(False, description="Include unverified observations"),
    profile_id: uuid.UUID | None = Query(None, description="Scope trends to a specific family profile ID"),
) -> LongitudinalTrendsResponse:
    """Calculate historical changes and percentage differences for comparable measurements."""
    return get_longitudinal_insights_trends(
        db=db,
        user=current_user,
        include_unverified=include_unverified,
        profile_id=profile_id,
    )


@router.get(
    "/summary",
    response_model=PersonalizedHealthSummary,
    status_code=status.HTTP_200_OK,
    summary="Generate evidence-grounded personalized health summary with citations",
)
async def get_insights_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    mode: str = Query("offline", description="Summary generation mode: 'offline' or 'llm_assisted'"),
    profile_id: uuid.UUID | None = Query(None, description="Scope summary to a specific family profile ID"),
) -> PersonalizedHealthSummary:
    """Generate personalized health summary with citations and clinician discussion points."""
    return await generate_personalized_health_summary(
        db=db,
        user=current_user,
        mode=mode,
        profile_id=profile_id,
    )


@router.get(
    "/data-quality",
    response_model=DataQualityReport,
    status_code=status.HTTP_200_OK,
    summary="Get data-quality insights, missing metadata, and unverified indicators",
)
def get_insights_data_quality(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    profile_id: uuid.UUID | None = Query(None, description="Scope data quality report to a specific family profile ID"),
) -> DataQualityReport:
    """Return data-quality report identifying missing dates, missing units/ranges, and discrepancies."""
    return get_data_quality_report(db, current_user, profile_id=profile_id)


@router.get(
    "/export/pdf",
    status_code=status.HTTP_200_OK,
    summary="Export personalized medical records and insights report as PDF",
)
def export_pdf_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    start_date: str | None = Query(None, description="Earliest clinical date to include (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="Latest clinical date to include (YYYY-MM-DD)"),
    include_unverified: bool = Query(False, description="Whether to include unreviewed observations"),
    sections: list[str] | None = Query(None, description="Optional list of specific section keys to include"),
    profile_id: uuid.UUID | None = Query(None, description="Scope PDF export to a specific family profile ID"),
):
    """Generate and download a professional PDF summary of the user's verified health records."""
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date cannot be later than end_date.",
        )
    pdf_bytes = generate_pdf_health_report(
        db=db,
        user=current_user,
        start_date=start_date,
        end_date=end_date,
        include_unverified=include_unverified,
        included_sections=sections,
        profile_id=profile_id,
    )
    filename = f"healthmate_health_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )


@router.get(
    "/export/csv",
    status_code=status.HTTP_200_OK,
    summary="Export clinical observations as spreadsheet CSV with formula injection mitigation",
)
def export_csv_observations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    start_date: str | None = Query(None, description="Earliest clinical date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="Latest clinical date (YYYY-MM-DD)"),
    include_unverified: bool = Query(False, description="Whether to include unreviewed observations"),
    profile_id: uuid.UUID | None = Query(None, description="Scope CSV export to a specific family profile ID"),
):
    """Export the user's clinical observations as sanitized CSV data for personal recordkeeping."""
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date cannot be later than end_date.",
        )
    csv_str = generate_observations_csv(
        db=db,
        user=current_user,
        start_date=start_date,
        end_date=end_date,
        include_unverified=include_unverified,
        profile_id=profile_id,
    )
    # Include UTF-8 BOM so spreadsheet viewers render accents and characters reliably
    csv_bytes = "\ufeff".encode("utf-8") + csv_str.encode("utf-8")
    filename = f"healthmate_observations_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )

