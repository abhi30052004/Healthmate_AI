"""API routes for Doctor Visit Preparation Pack generation and export."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.visit_pack import (
    DoctorVisitPackData,
    VisitPackDraftRequest,
    VisitPackExportRequest,
)
from app.services.visit_pack import export_visit_pack_pdf, generate_visit_pack_draft

router = APIRouter(prefix="/visit-pack", tags=["Doctor Visit Pack"])


@router.post(
    "/draft",
    response_model=DoctorVisitPackData,
    status_code=status.HTTP_200_OK,
    summary="Generate Doctor Visit Preparation Pack draft from authorized records",
)
def create_visit_pack_draft(
    payload: VisitPackDraftRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DoctorVisitPackData:
    """Assembles a source-grounded visit preparation pack from user's medical records and care data."""
    return generate_visit_pack_draft(db, current_user, payload)


@router.post(
    "/export-pdf",
    status_code=status.HTTP_200_OK,
    summary="Export the reviewed and edited Doctor Visit Preparation Pack as a PDF",
)
def download_visit_pack_pdf(
    payload: VisitPackExportRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    """Validates record ownership, applies safety sanitization, and streams formatted PDF."""
    pdf_bytes = export_visit_pack_pdf(db, current_user, payload.pack)
    filename = f"doctor_visit_pack_{current_user.id.hex[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
        },
    )
