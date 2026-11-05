"""API routes for Feature 4: Secure Doctor Sharing.

Provides:
- Authenticated owner routes for creating and managing sharing sessions.
- Doctor-facing bearer-token portal routes with least privilege and cache controls.
"""

from typing import Annotated, List, Optional
import uuid

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.doctor_sharing import (
    DoctorSharedHealthView,
    DoctorSharingAuditLogItem,
    DoctorSharingCreate,
    DoctorSharingCreateResponse,
    DoctorSharingItemResponse,
)
from app.services.doctor_sharing import (
    create_sharing_session,
    download_shared_document,
    download_shared_visit_pack_pdf,
    get_shared_health_summary,
    get_sharing_audit_logs,
    get_sharing_session,
    list_sharing_sessions,
    revoke_sharing_session,
)

from app.core.rate_limit import shared_portal_limiter

# Authenticated Owner Router
router = APIRouter(prefix="/doctor-sharing", tags=["Secure Doctor Sharing"])

# Public / Bearer Doctor Portal Router (Rate Limited)
doctor_router = APIRouter(
    prefix="/shared-health",
    tags=["Doctor Shared Health Portal"],
    dependencies=[Depends(shared_portal_limiter)],
)


# ============================================================================
# OWNER ENDPOINTS
# ============================================================================


@router.post(
    "",
    response_model=DoctorSharingCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a secure doctor sharing session for an authorized family profile",
)
def create_share(
    payload: DoctorSharingCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    request: Request,
) -> DoctorSharingCreateResponse:
    """Creates a time-limited, revocable sharing session and returns the access link once."""
    return create_sharing_session(db, current_user, payload, request)


@router.get(
    "",
    response_model=List[DoctorSharingItemResponse],
    status_code=status.HTTP_200_OK,
    summary="List all sharing sessions owned by authenticated user",
)
def list_shares(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    profile_id: Optional[uuid.UUID] = Query(None, description="Optional profile ID filter"),
) -> List[DoctorSharingItemResponse]:
    """Lists sharing sessions without exposing sensitive tokens."""
    return list_sharing_sessions(db, current_user, profile_id=profile_id)


@router.get(
    "/{share_id}",
    response_model=DoctorSharingItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Get sharing session details for the owner",
)
def get_share(
    share_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DoctorSharingItemResponse:
    """Retrieves metadata of an existing session owned by current user."""
    return get_sharing_session(db, current_user, share_id)


@router.post(
    "/{share_id}/revoke",
    response_model=DoctorSharingItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Immediately revoke an active sharing session",
)
def revoke_share(
    share_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    request: Request,
) -> DoctorSharingItemResponse:
    """Revokes access immediately, blocking all subsequent doctor requests."""
    return revoke_sharing_session(db, current_user, share_id, request)


@router.get(
    "/{share_id}/audit",
    response_model=List[DoctorSharingAuditLogItem],
    status_code=status.HTTP_200_OK,
    summary="Get audit logs for a sharing session",
)
def get_share_audit(
    share_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> List[DoctorSharingAuditLogItem]:
    """Returns access history and lifecycle events for the session."""
    return get_sharing_audit_logs(db, current_user, share_id)


# ============================================================================
# DOCTOR-FACING ACCESS ENDPOINTS
# ============================================================================


@doctor_router.get(
    "/{token}",
    response_model=DoctorSharedHealthView,
    status_code=status.HTTP_200_OK,
    summary="Doctor access endpoint: retrieves authorized clinical health view",
)
def view_shared_health(
    token: str,
    db: Annotated[Session, Depends(get_db)],
    request: Request,
    response: Response,
) -> DoctorSharedHealthView:
    """Validates token, checks expiry/revocation, logs access, and returns authorized health data."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
    response.headers["Pragma"] = "no-cache"
    return get_shared_health_summary(db, token, request=request)


@doctor_router.get(
    "/{token}/documents/{document_id}",
    summary="Doctor document download endpoint",
)
def download_document_for_doctor(
    token: str,
    document_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    request: Request,
    inline: bool = False,
) -> FileResponse:
    """Streams authorized document for doctor if explicitly permitted in the session."""
    doc, file_path = download_shared_document(db, token, document_id, request=request)
    disposition = "inline" if inline else "attachment"
    return FileResponse(
        path=file_path,
        media_type=doc.mime_type,
        filename=doc.filename,
        headers={
            "Content-Disposition": f'{disposition}; filename="{doc.filename}"',
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            "Pragma": "no-cache",
        },
    )


@doctor_router.get(
    "/{token}/visit-pack",
    summary="Doctor visit preparation pack download endpoint",
)
def download_visit_pack_for_doctor(
    token: str,
    db: Annotated[Session, Depends(get_db)],
    request: Request,
) -> Response:
    """Streams dynamically generated scoped visit preparation pack PDF."""
    pdf_bytes = download_shared_visit_pack_pdf(db, token, request=request)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="doctor_visit_pack.pdf"',
            "Content-Type": "application/pdf",
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            "Pragma": "no-cache",
        },
    )
