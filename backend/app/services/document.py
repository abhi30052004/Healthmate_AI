import hashlib
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models.document import Document, DocumentObservation
from app.models.user import User
from app.schemas.document import ObservationUpdate
from app.services.extraction import extract_document_content
from app.services.medical_parser import compute_abnormal_flag, parse_medical_record, parse_numeric_value
from app.services.normalization import normalize_test_name

SUPPORTED_SIGNATURES = {
    b"%PDF-": ("application/pdf", ".pdf"),
    b"\x89PNG\r\n\x1a\n": ("image/png", ".png"),
    b"\xff\xd8\xff": ("image/jpeg", ".jpg"),
}

ALLOWED_EXTENSIONS = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


def sanitize_filename(filename: str | None) -> str:
    """Sanitize original filename for safe display and prevent path traversal."""
    if not filename:
        return "unnamed_document"

    base = os.path.basename(filename.strip().replace("\\", "/"))
    cleaned = re.sub(r"[^\w\s\.-]", "_", base).strip()
    return cleaned[:255] if cleaned else "unnamed_document"


def validate_filename_extension(filename: str | None) -> str:
    """Validate filename extension against allowed formats."""
    if not filename or not filename.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing or empty.",
        )
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file extension. Supported file formats are PDF, PNG, and JPEG (.pdf, .png, .jpg, .jpeg).",
        )
    return ext


def validate_file_signature(sample: bytes) -> tuple[str, str]:
    """Validate file signature (magic bytes)."""
    for signature, (mime_type, ext) in SUPPORTED_SIGNATURES.items():
        if sample.startswith(signature):
            return mime_type, ext

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported or invalid file format. Supported file types are PDF, PNG, and JPEG.",
    )


def safe_unlink(path: Path) -> None:
    """Safely unlink a file with garbage collection retry for Windows file lock releases."""
    try:
        if path.exists():
            path.unlink(missing_ok=True)
    except Exception:
        import gc

        gc.collect()
        try:
            if path.exists():
                path.unlink(missing_ok=True)
        except Exception:
            pass


async def save_and_process_document(
    db: Session,
    file: UploadFile,
    current_user: User,
    profile_id: uuid.UUID | None = None,
) -> Document:
    """Stream-validate, store, extract, parse structured medical records, and persist."""
    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        verify_profile_access(db, current_user, profile_id)
    settings = get_settings()
    max_size = settings.max_upload_size_bytes
    storage_root = Path(settings.document_storage_dir).resolve()
    user_storage_dir = storage_root / str(current_user.id)
    user_storage_dir.mkdir(parents=True, exist_ok=True)

    file_ext = validate_filename_extension(file.filename)
    sanitized_name = sanitize_filename(file.filename)
    doc_id = uuid.uuid4()
    unique_key = f"{current_user.id}/{doc_id.hex}_{sanitized_name}"
    target_path = storage_root / unique_key

    # Stream read, validate size and signature
    hasher = hashlib.sha256()
    total_size = 0
    signature_sample = b""
    chunk_size = 64 * 1024  # 64 KB chunks
    mime_type = ""

    try:
        with open(target_path, "wb") as destination:
            while chunk := await file.read(chunk_size):
                if not signature_sample:
                    signature_sample = chunk[:16]
                    mime_type, _ = validate_file_signature(signature_sample)
                    if ALLOWED_EXTENSIONS.get(file_ext) != mime_type:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File extension '{file_ext}' does not match detected file content ({mime_type}).",
                        )

                total_size += len(chunk)
                if total_size > max_size:
                    raise HTTPException(
                        status_code=getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413),
                        detail=f"File exceeds maximum allowed size of {max_size // (1024 * 1024)} MB.",
                    )

                hasher.update(chunk)
                destination.write(chunk)

        if total_size == 0:
            safe_unlink(target_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file uploads are not permitted.",
            )

        checksum = hasher.hexdigest()
    except HTTPException:
        safe_unlink(target_path)
        raise
    except Exception as exc:
        safe_unlink(target_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage write failed: {type(exc).__name__}",
        )

    # Validate structural integrity for PDFs and Images before accepting
    if mime_type == "application/pdf":
        try:
            import pymupdf

            with open(target_path, "rb") as f:
                pdf_bytes = f.read()

            pdf_doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
            if pdf_doc.is_encrypted:
                pdf_doc.close()
                safe_unlink(target_path)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password-protected or encrypted PDFs cannot be processed.",
                )
            if len(pdf_doc) == 0:
                pdf_doc.close()
                safe_unlink(target_path)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Malformed or empty PDF document with no readable pages.",
                )
            pdf_doc.close()
        except HTTPException:
            raise
        except Exception as exc:
            safe_unlink(target_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Malformed or corrupt PDF document: {type(exc).__name__}",
            )
    elif mime_type in ("image/png", "image/jpeg"):
        try:
            from PIL import Image

            with Image.open(target_path) as img:
                img.verify()
        except Exception as exc:
            safe_unlink(target_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Malformed or corrupt image file: {type(exc).__name__}",
            )

    # Perform text extraction (native or OCR)
    extraction = extract_document_content(target_path, mime_type)

    # Structured parsing if extraction succeeded
    parsed_record = parse_medical_record(extraction.extracted_text)

    document = Document(
        id=doc_id,
        owner_id=current_user.id,
        profile_id=profile_id,
        filename=sanitized_name,
        storage_key=unique_key,
        mime_type=mime_type,
        file_size=total_size,
        checksum_sha256=checksum,
        processing_status=extraction.status,
        extracted_text=extraction.extracted_text,
        page_count=extraction.page_count,
        ocr_applied=extraction.ocr_applied,
        patient_name=parsed_record.patient_name,
        document_date=parsed_record.document_date,
        lab_name=parsed_record.lab_name,
        error_message=extraction.error_message,
        is_verified=False,
    )

    try:
        db.add(document)
        db.flush()

        # Persist structured observations
        for obs in parsed_record.observations:
            db_obs = DocumentObservation(
                document_id=doc_id,
                owner_id=current_user.id,
                test_name=obs.test_name,
                value=obs.value,
                numeric_value=obs.numeric_value,
                unit=obs.unit,
                reference_range=obs.reference_range,
                flag=obs.flag,
                source_page=obs.source_page,
                source_text=obs.source_text,
                is_low_confidence=obs.is_low_confidence,
                normalized_test_name=obs.normalized_test_name,
                category=obs.category,
                is_reviewed=False,
            )
            db.add(db_obs)

        db.commit()
        return get_user_document(db, doc_id, current_user)
    except Exception as exc:
        db.rollback()
        safe_unlink(target_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database persistence failed: {type(exc).__name__}",
        )


def list_user_documents(
    db: Session,
    current_user: User,
    profile_id: uuid.UUID | None = None,
    include_archived: bool = False,
) -> list[Document]:
    """List documents owned by current authenticated user, optionally scoped to a family profile."""
    stmt = (
        select(Document)
        .where(Document.owner_id == current_user.id)
        .options(selectinload(Document.observations))
        .order_by(Document.created_at.desc())
    )

    if not include_archived:
        stmt = stmt.where(Document.is_archived.is_(False))

    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        profile = verify_profile_access(db, current_user, profile_id)
        if profile and profile.is_primary:
            stmt = stmt.where((Document.profile_id == profile_id) | (Document.profile_id.is_(None)))
        else:
            stmt = stmt.where(Document.profile_id == profile_id)

    return list(db.scalars(stmt).all())


def get_user_document(
    db: Session,
    document_id: uuid.UUID,
    current_user: User,
) -> Document:
    """Retrieve document owned by current user with observations loaded or raise 404."""
    doc = db.scalars(
        select(Document)
        .where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
        )
        .options(selectinload(Document.observations))
    ).first()

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    return doc


def get_user_document_file_path(
    db: Session,
    document_id: uuid.UUID,
    current_user: User,
) -> tuple[Document, Path]:
    """Retrieve document record and verified physical file path on disk for authorized user."""
    doc = get_user_document(db, document_id, current_user)
    settings = get_settings()
    storage_root = Path(settings.document_storage_dir).resolve()
    file_path = (storage_root / doc.storage_key).resolve()

    try:
        file_path.relative_to(storage_root)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to the requested file path is forbidden.",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found in storage.",
        )

    return doc, file_path


def get_user_document_observations(
    db: Session,
    document_id: uuid.UUID,
    current_user: User,
) -> list[DocumentObservation]:
    """Get all structured clinical observations for an authorized user's document."""
    # Ensure document belongs to user
    get_user_document(db, document_id, current_user)

    return list(
        db.scalars(
            select(DocumentObservation)
            .where(
                DocumentObservation.document_id == document_id,
                DocumentObservation.owner_id == current_user.id,
            )
            .order_by(
                DocumentObservation.source_page.asc(),
                DocumentObservation.created_at.asc(),
            )
        ).all()
    )


def update_user_document_observation(
    db: Session,
    document_id: uuid.UUID,
    observation_id: uuid.UUID,
    update_data: ObservationUpdate,
    current_user: User,
) -> DocumentObservation:
    """Update a specific observation with user review or correction."""
    # Verify document ownership
    get_user_document(db, document_id, current_user)

    obs = db.scalars(
        select(DocumentObservation).where(
            DocumentObservation.id == observation_id,
            DocumentObservation.document_id == document_id,
            DocumentObservation.owner_id == current_user.id,
        )
    ).first()

    if obs is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Observation not found.",
        )

    if update_data.test_name is not None:
        obs.test_name = update_data.test_name
        obs.normalized_test_name, obs.category = normalize_test_name(update_data.test_name)
    if update_data.value is not None:
        clean_str, num_val = parse_numeric_value(update_data.value)
        obs.value = clean_str
        obs.numeric_value = num_val
    if update_data.numeric_value is not None:
        obs.numeric_value = update_data.numeric_value
    if update_data.unit is not None:
        obs.unit = update_data.unit
    if update_data.reference_range is not None:
        obs.reference_range = update_data.reference_range

    # Recalculate flag if requested or if flag was explicitly provided
    if update_data.flag is not None:
        obs.flag = update_data.flag
    elif update_data.value is not None or update_data.reference_range is not None:
        obs.flag = compute_abnormal_flag(obs.numeric_value, obs.value, obs.reference_range)

    obs.is_reviewed = True
    obs.is_low_confidence = False
    obs.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(obs)
    return obs


def reprocess_user_document(
    db: Session,
    document_id: uuid.UUID,
    current_user: User,
) -> Document:
    """Re-run text extraction (native/OCR) and structured parsing on an existing document."""
    doc, file_path = get_user_document_file_path(db, document_id, current_user)

    # Re-extract content
    extraction = extract_document_content(file_path, doc.mime_type)

    # Preserve reviewed existing observations, only delete unreviewed ones
    reviewed_test_names = set()
    for old_obs in list(doc.observations):
        if old_obs.is_reviewed:
            reviewed_test_names.add(old_obs.test_name.lower())
        else:
            db.delete(old_obs)

    doc.processing_status = extraction.status
    doc.extracted_text = extraction.extracted_text
    doc.page_count = extraction.page_count
    doc.ocr_applied = extraction.ocr_applied
    doc.error_message = extraction.error_message

    if extraction.status == "extracted":
        parsed = parse_medical_record(extraction.extracted_text)
        doc.patient_name = parsed.patient_name or doc.patient_name
        doc.document_date = parsed.document_date or doc.document_date
        doc.lab_name = parsed.lab_name or doc.lab_name

        for obs in parsed.observations:
            # Avoid duplicating observations already verified/reviewed by the user
            if obs.test_name.lower() in reviewed_test_names:
                continue

            db_obs = DocumentObservation(
                document_id=doc.id,
                owner_id=current_user.id,
                test_name=obs.test_name,
                value=obs.value,
                numeric_value=obs.numeric_value,
                unit=obs.unit,
                reference_range=obs.reference_range,
                flag=obs.flag,
                source_page=obs.source_page,
                source_text=obs.source_text,
                is_low_confidence=obs.is_low_confidence,
                normalized_test_name=obs.normalized_test_name,
                category=obs.category,
                is_reviewed=False,
            )
            db.add(db_obs)

    db.commit()
    return get_user_document(db, document_id, current_user)


def verify_user_document(
    db: Session,
    document_id: uuid.UUID,
    current_user: User,
) -> Document:
    """Confirm user review of extracted text and observations."""
    doc = get_user_document(db, document_id, current_user)

    if doc.processing_status != "extracted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot verify document in status '{doc.processing_status}'. "
                "Document must be successfully extracted before verification."
            ),
        )

    doc.is_verified = True
    now = datetime.now(timezone.utc)
    doc.verified_at = now

    for obs in doc.observations:
        obs.is_reviewed = True

    db.commit()
    db.refresh(doc)
    return doc


def delete_user_document(
    db: Session,
    document_id: uuid.UUID,
    current_user: User,
) -> None:
    """Delete document record and associated disk file."""
    doc, file_path = get_user_document_file_path(db, document_id, current_user)
    safe_unlink(file_path)
    db.delete(doc)
    db.commit()
