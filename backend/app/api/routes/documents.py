import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.document import (
    DocumentRead,
    ManualEntryCreate,
    ObservationCreate,
    DocumentTextResponse,
    DocumentVerifyResponse,
    ObservationRead,
    ObservationUpdate,
)
from app.services.document import (
    add_document_observation,
    create_manual_entry,
    delete_document_observation,
    delete_user_document,
    get_user_document,
    get_user_document_file_path,
    get_user_document_observations,
    list_user_documents,
    reprocess_user_document,
    save_and_process_document,
    update_user_document_observation,
    verify_user_document,
)

router = APIRouter(prefix="/documents", tags=["Medical Documents"])


@router.post(
    "",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and process a medical document",
)
async def upload_document(
    file: Annotated[UploadFile, File(...)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    profile_id: uuid.UUID | None = Query(None, description="Optional family profile ID to associate this document with"),
) -> DocumentRead:
    """Stream upload, validate file signature and size, extract selectable text/OCR, and persist."""
    document = await save_and_process_document(db, file, current_user, profile_id=profile_id)
    return document


@router.get(
    "",
    response_model=list[DocumentRead],
    status_code=status.HTTP_200_OK,
    summary="List all documents owned by authenticated user",
)
def list_documents(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    profile_id: uuid.UUID | None = Query(None, description="Optional family profile ID filter"),
    include_archived: bool = Query(False, description="Include archived documents"),
) -> list[DocumentRead]:
    """Return all document records owned by the current authenticated user."""
    return list_user_documents(db, current_user, profile_id=profile_id, include_archived=include_archived)


@router.get(
    "/{document_id}",
    response_model=DocumentRead,
    status_code=status.HTTP_200_OK,
    summary="Get document metadata and processing status",
)
def get_document(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DocumentRead:
    """Retrieve metadata and observations for a specific document owned by the current user."""
    return get_user_document(db, document_id, current_user)


@router.get(
    "/{document_id}/download",
    summary="Download or preview an authorized document file",
)
def download_document(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    inline: bool = False,
) -> FileResponse:
    """Stream authorized document file for download or in-browser preview."""
    doc, file_path = get_user_document_file_path(db, document_id, current_user)
    disposition = "inline" if inline else "attachment"
    return FileResponse(
        path=file_path,
        media_type=doc.mime_type,
        filename=doc.filename,
        headers={"Content-Disposition": f'{disposition}; filename="{doc.filename}"'},
    )


@router.get(
    "/{document_id}/text",
    response_model=DocumentTextResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve extracted text for review",
)
def get_document_text(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DocumentTextResponse:
    """Retrieve extracted text and page count for owner verification."""
    doc = get_user_document(db, document_id, current_user)
    return DocumentTextResponse(
        document_id=doc.id,
        filename=doc.filename,
        processing_status=doc.processing_status,
        page_count=doc.page_count,
        ocr_applied=doc.ocr_applied,
        extracted_text=doc.extracted_text,
        is_verified=doc.is_verified,
        verified_at=doc.verified_at,
    )


@router.get(
    "/{document_id}/observations",
    response_model=list[ObservationRead],
    status_code=status.HTTP_200_OK,
    summary="Get structured observations for an authorized document",
)
def get_observations(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ObservationRead]:
    """Retrieve all structured clinical observations for a document."""
    return get_user_document_observations(db, document_id, current_user)


@router.put(
    "/{document_id}/observations/{observation_id}",
    response_model=ObservationRead,
    status_code=status.HTTP_200_OK,
    summary="Update or correct a structured observation",
)
def update_observation(
    document_id: uuid.UUID,
    observation_id: uuid.UUID,
    update_data: ObservationUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ObservationRead:
    """Update observation fields and mark as user-reviewed."""
    return update_user_document_observation(
        db=db,
        document_id=document_id,
        observation_id=observation_id,
        update_data=update_data,
        current_user=current_user,
    )


@router.post(
    "/{document_id}/reprocess",
    response_model=DocumentRead,
    status_code=status.HTTP_200_OK,
    summary="Retry or reprocess OCR and structured extraction",
)
def reprocess_document(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DocumentRead:
    """Re-execute extraction and medical record parsing for a document."""
    return reprocess_user_document(db, document_id, current_user)


@router.post(
    "/{document_id}/verify",
    response_model=DocumentVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm user review of extracted text and observations",
)
def verify_document(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DocumentVerifyResponse:
    """Mark document as verified by user review and confirm all observations."""
    doc = verify_user_document(db, document_id, current_user)
    return DocumentVerifyResponse(
        document_id=doc.id,
        is_verified=doc.is_verified,
        verified_at=doc.verified_at,
        observations_verified_count=len(doc.observations),
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document and cleanup storage",
)
def delete_document(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    """Delete document and physical file from private storage."""
    delete_user_document(db, document_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/maintenance/backfill-checksums",
    status_code=status.HTTP_200_OK,
    summary="Backfill missing SHA-256 checksums on legacy documents",
)
def backfill_checksums(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Safely backfill SHA-256 cryptographic checksums for documents missing them."""
    from app.services.checksum_backfill import backfill_document_checksums
    return backfill_document_checksums(db)


@router.post(
    "/manual-entry",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record lab values or vitals by hand",
)
def manual_entry(
    payload: ManualEntryCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DocumentRead:
    """Create a verified record from user-entered values (no file)."""
    return create_manual_entry(db, current_user, payload)


@router.post(
    "/{document_id}/observations",
    response_model=ObservationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a missed result to a document",
)
def add_observation(
    document_id: uuid.UUID,
    payload: ObservationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ObservationRead:
    return add_document_observation(db, document_id, current_user, payload)


@router.delete(
    "/{document_id}/observations/{observation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reject a wrongly extracted observation",
)
def remove_observation(
    document_id: uuid.UUID,
    observation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    delete_document_observation(db, document_id, observation_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

