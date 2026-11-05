from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.comparison import ReportComparisonRequest, ReportComparisonResponse
from app.services.report_comparison import compare_medical_reports

router = APIRouter(prefix="/report-comparison", tags=["report-comparison"])


@router.post("", response_model=ReportComparisonResponse)
def create_report_comparison(
    payload: ReportComparisonRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReportComparisonResponse:
    """Compare two or more user-selected medical reports and calculate observation deltas."""
    return compare_medical_reports(db=db, user=current_user, payload=payload)
