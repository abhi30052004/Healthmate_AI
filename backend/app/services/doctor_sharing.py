"""Service layer for Feature 4: Secure Doctor Sharing.

Handles:
- Creating time-limited, revocable doctor sharing sessions.
- Generating high-entropy SHA-256 hashed access tokens.
- Strict owner authorization and family-profile validation.
- Least-privilege doctor access to authorized health records.
- Secure document streaming and scoped visit pack PDF generation.
- Immutable audit logging without leaking secrets or clinical content.
"""

from datetime import datetime, timedelta, timezone
import hashlib
from pathlib import Path
import secrets
from typing import Any, Dict, List, Optional, Tuple
import uuid

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.care import AppointmentRecord, MedicationRecord
from app.models.doctor_sharing import DoctorSharingAuditLog, DoctorSharingSession
from app.models.document import Document
from app.models.family_profile import FamilyProfile
from app.models.user import User
from app.schemas.doctor_sharing import (
    DoctorSharedAppointmentItem,
    DoctorSharedDocumentItem,
    DoctorSharedHealthView,
    DoctorSharedMedicationItem,
    DoctorSharingAuditLogItem,
    DoctorSharingCreate,
    DoctorSharingCreateResponse,
    DoctorSharingItemResponse,
    SharedResourcesConfig,
)
from app.schemas.visit_pack import VisitPackDraftRequest
from app.services.family_profile import verify_profile_access
from app.services.visit_pack import export_visit_pack_pdf, generate_visit_pack_draft


def _hash_token(raw_token: str) -> str:
    """Computes SHA-256 hex digest of a raw bearer token."""
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()


def _get_client_meta(request: Optional[Request]) -> Tuple[Optional[str], Optional[str]]:
    """Extracts client IP and user agent safely from request headers."""
    if not request:
        return None, None
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    if ua and len(ua) > 255:
        ua = ua[:255]
    return ip, ua


def _record_audit_log(
    db: Session,
    session_id: uuid.UUID,
    event_type: str,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[str] = None,
) -> DoctorSharingAuditLog:
    """Records an audit log entry for a doctor sharing session."""
    log_entry = DoctorSharingAuditLog(
        session_id=session_id,
        event_type=event_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
        created_at=datetime.now(timezone.utc),
    )
    db.add(log_entry)
    db.commit()
    return log_entry


def create_sharing_session(
    db: Session,
    user: User,
    payload: DoctorSharingCreate,
    request: Optional[Request] = None,
) -> DoctorSharingCreateResponse:
    """Creates a new secure sharing session for an authorized family profile."""
    # 1. Validate profile ownership and authorization
    profile = verify_profile_access(db, user, payload.profile_id)

    # 2. Validate resource selection (must have at least one resource)
    if not payload.shared_resources.has_at_least_one_resource():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one resource (documents, visit pack, medications, or appointments) must be selected for sharing.",
        )

    # 3. Validate documents belong to profile and user
    doc_ids = payload.shared_resources.document_ids
    if doc_ids:
        docs = (
            db.query(Document)
            .filter(
                Document.id.in_(doc_ids),
                Document.owner_id == user.id,
            )
            .all()
        )
        if len(docs) != len(doc_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more selected documents do not exist or access is denied.",
            )

        # Cross-profile document ownership check
        for doc in docs:
            if profile.is_primary:
                # Primary profile can access documents assigned to it or unassigned
                if doc.profile_id is not None and doc.profile_id != profile.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Document '{doc.filename}' belongs to a different family profile.",
                    )
            else:
                if doc.profile_id != profile.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Document '{doc.filename}' does not belong to the selected profile.",
                    )

    # 4. Generate high-entropy raw bearer token & SHA-256 hash
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)

    # 5. Enforce time limits (1 to 30 days max)
    valid_days = max(1, min(payload.expires_in_days, 30))
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=valid_days)

    # Convert shared_resources to JSON serializable dict
    shared_res_dict = {
        "document_ids": [str(d) for d in doc_ids],
        "include_visit_pack": payload.shared_resources.include_visit_pack,
        "visit_pack_categories": payload.shared_resources.visit_pack_categories,
        "include_medications": payload.shared_resources.include_medications,
        "include_appointments": payload.shared_resources.include_appointments,
    }

    session = DoctorSharingSession(
        owner_id=user.id,
        profile_id=profile.id,
        doctor_name=payload.doctor_name,
        doctor_email=payload.doctor_email,
        token_hash=token_hash,
        status="active",
        expires_at=expires_at,
        shared_resources=shared_res_dict,
        notes=payload.notes,
        created_at=now,
        updated_at=now,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # 6. Record audit log for session creation
    client_ip, user_agent = _get_client_meta(request)
    _record_audit_log(
        db=db,
        session_id=session.id,
        event_type="created",
        ip_address=client_ip,
        user_agent=user_agent,
        details=f"Created sharing link for {payload.doctor_name} (valid for {valid_days} days)",
    )

    share_url = f"/shared/{raw_token}"

    return DoctorSharingCreateResponse(
        id=session.id,
        owner_id=session.owner_id,
        profile_id=session.profile_id,
        profile_name=profile.name,
        doctor_name=session.doctor_name,
        doctor_email=session.doctor_email,
        status=session.status,
        is_expired=False,
        expires_at=session.expires_at,
        revoked_at=session.revoked_at,
        last_accessed_at=session.last_accessed_at,
        access_count=session.access_count,
        shared_resources=payload.shared_resources,
        notes=session.notes,
        created_at=session.created_at,
        access_token=raw_token,
        share_url=share_url,
    )


def list_sharing_sessions(
    db: Session,
    user: User,
    profile_id: Optional[uuid.UUID] = None,
) -> List[DoctorSharingItemResponse]:
    """Lists sharing sessions owned by current user with dynamic expiry resolution."""
    query = (
        db.query(DoctorSharingSession)
        .filter(DoctorSharingSession.owner_id == user.id)
    )
    if profile_id:
        query = query.filter(DoctorSharingSession.profile_id == profile_id)

    sessions = query.order_by(DoctorSharingSession.created_at.desc()).all()
    now = datetime.now(timezone.utc)
    results: List[DoctorSharingItemResponse] = []

    for s in sessions:
        # Check dynamic expiry
        is_expired = s.status == "expired" or (s.expires_at.replace(tzinfo=timezone.utc) if s.expires_at.tzinfo is None else s.expires_at) < now
        current_status = s.status
        if is_expired and current_status == "active":
            current_status = "expired"
            s.status = "expired"
            db.commit()

        # Parse shared resources safely
        sr = s.shared_resources or {}
        config = SharedResourcesConfig(
            document_ids=sr.get("document_ids", []),
            include_visit_pack=sr.get("include_visit_pack", False),
            visit_pack_categories=sr.get("visit_pack_categories", ["documents", "observations", "medications", "appointments"]),
            include_medications=sr.get("include_medications", False),
            include_appointments=sr.get("include_appointments", False),
        )

        results.append(
            DoctorSharingItemResponse(
                id=s.id,
                owner_id=s.owner_id,
                profile_id=s.profile_id,
                profile_name=s.profile.name if s.profile else "Unknown Profile",
                doctor_name=s.doctor_name,
                doctor_email=s.doctor_email,
                status=current_status,
                is_expired=is_expired,
                expires_at=s.expires_at,
                revoked_at=s.revoked_at,
                last_accessed_at=s.last_accessed_at,
                access_count=s.access_count,
                shared_resources=config,
                notes=s.notes,
                created_at=s.created_at,
            )
        )
    return results


def get_sharing_session(
    db: Session,
    user: User,
    share_id: uuid.UUID,
) -> DoctorSharingItemResponse:
    """Retrieves session metadata for the owner without disclosing the secret token."""
    session = (
        db.query(DoctorSharingSession)
        .filter(
            DoctorSharingSession.id == share_id,
            DoctorSharingSession.owner_id == user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sharing session not found.",
        )

    now = datetime.now(timezone.utc)
    expires_at_utc = session.expires_at.replace(tzinfo=timezone.utc) if session.expires_at.tzinfo is None else session.expires_at
    is_expired = session.status == "expired" or expires_at_utc < now
    current_status = session.status
    if is_expired and current_status == "active":
        current_status = "expired"
        session.status = "expired"
        db.commit()

    sr = session.shared_resources or {}
    config = SharedResourcesConfig(
        document_ids=sr.get("document_ids", []),
        include_visit_pack=sr.get("include_visit_pack", False),
        visit_pack_categories=sr.get("visit_pack_categories", ["documents", "observations", "medications", "appointments"]),
        include_medications=sr.get("include_medications", False),
        include_appointments=sr.get("include_appointments", False),
    )

    return DoctorSharingItemResponse(
        id=session.id,
        owner_id=session.owner_id,
        profile_id=session.profile_id,
        profile_name=session.profile.name if session.profile else "Unknown Profile",
        doctor_name=session.doctor_name,
        doctor_email=session.doctor_email,
        status=current_status,
        is_expired=is_expired,
        expires_at=session.expires_at,
        revoked_at=session.revoked_at,
        last_accessed_at=session.last_accessed_at,
        access_count=session.access_count,
        shared_resources=config,
        notes=session.notes,
        created_at=session.created_at,
    )


def revoke_sharing_session(
    db: Session,
    user: User,
    share_id: uuid.UUID,
    request: Optional[Request] = None,
) -> DoctorSharingItemResponse:
    """Immediately revokes an active sharing session."""
    session = (
        db.query(DoctorSharingSession)
        .filter(
            DoctorSharingSession.id == share_id,
            DoctorSharingSession.owner_id == user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sharing session not found.",
        )

    now = datetime.now(timezone.utc)
    session.status = "revoked"
    session.revoked_at = now
    db.commit()

    client_ip, user_agent = _get_client_meta(request)
    _record_audit_log(
        db=db,
        session_id=session.id,
        event_type="revoked",
        ip_address=client_ip,
        user_agent=user_agent,
        details="Access revoked by account owner",
    )

    return get_sharing_session(db, user, share_id)


def get_sharing_audit_logs(
    db: Session,
    user: User,
    share_id: uuid.UUID,
) -> List[DoctorSharingAuditLogItem]:
    """Returns the security audit log for a sharing session owned by the user."""
    session = (
        db.query(DoctorSharingSession)
        .filter(
            DoctorSharingSession.id == share_id,
            DoctorSharingSession.owner_id == user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sharing session not found.",
        )

    logs = (
        db.query(DoctorSharingAuditLog)
        .filter(DoctorSharingAuditLog.session_id == share_id)
        .order_by(DoctorSharingAuditLog.created_at.desc())
        .all()
    )

    return [
        DoctorSharingAuditLogItem(
            id=log.id,
            session_id=log.session_id,
            event_type=log.event_type,
            resource_id=log.resource_id,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            details=log.details,
            created_at=log.created_at,
        )
        for log in logs
    ]


# ============================================================================
# DOCTOR-FACING ACCESS FUNCTIONS
# ============================================================================


def validate_doctor_session(
    db: Session,
    token: str,
    request: Optional[Request] = None,
) -> DoctorSharingSession:
    """Validates the bearer token, checks revocation and expiry, and updates access telemetry."""
    if not token or len(token.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or unrecognized health sharing link.",
        )

    token_hash = _hash_token(token)
    session = (
        db.query(DoctorSharingSession)
        .filter(DoctorSharingSession.token_hash == token_hash)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or unrecognized health sharing link.",
        )

    client_ip, user_agent = _get_client_meta(request)

    # Check revocation
    if session.status == "revoked" or session.revoked_at is not None:
        _record_audit_log(
            db=db,
            session_id=session.id,
            event_type="access_denied_revoked",
            ip_address=client_ip,
            user_agent=user_agent,
            details="Access attempt on revoked sharing link",
        )
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This health sharing link has been revoked by the patient.",
        )

    # Check expiration
    now = datetime.now(timezone.utc)
    expires_at_utc = session.expires_at.replace(tzinfo=timezone.utc) if session.expires_at.tzinfo is None else session.expires_at
    if now > expires_at_utc:
        if session.status != "expired":
            session.status = "expired"
            db.commit()
        _record_audit_log(
            db=db,
            session_id=session.id,
            event_type="access_denied_expired",
            ip_address=client_ip,
            user_agent=user_agent,
            details="Access attempt on expired sharing link",
        )
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This health sharing link has expired.",
        )

    # Update telemetry
    session.last_accessed_at = now
    session.access_count += 1
    db.commit()

    return session


def get_shared_health_summary(
    db: Session,
    token: str,
    request: Optional[Request] = None,
) -> DoctorSharedHealthView:
    """Returns authorized clinical summary view for the visiting doctor."""
    session = validate_doctor_session(db, token, request)
    profile = session.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found.",
        )

    sr = session.shared_resources or {}
    doc_ids_str = sr.get("document_ids", [])
    doc_uuids = []
    for d in doc_ids_str:
        try:
            doc_uuids.append(uuid.UUID(str(d)))
        except (ValueError, TypeError):
            pass

    # Documents query: scoped strictly to authorized documents for this session
    shared_docs: List[DoctorSharedDocumentItem] = []
    if doc_uuids:
        docs = (
            db.query(Document)
            .filter(
                Document.id.in_(doc_uuids),
                Document.owner_id == session.owner_id,
            )
            .all()
        )
        for doc in docs:
            # Format clinical date if available
            c_date = doc.created_at.date() if doc.created_at else None
            shared_docs.append(
                DoctorSharedDocumentItem(
                    id=doc.id,
                    title=doc.filename,
                    category=doc.mime_type,
                    document_date=c_date,
                    file_type=doc.mime_type,
                    file_size_bytes=doc.file_size,
                    summary=f"Processed medical record ({doc.page_count or 1} pages)",
                )
            )

    # Medications query (only if explicitly shared)
    shared_meds: List[DoctorSharedMedicationItem] = []
    if sr.get("include_medications"):
        med_q = db.query(MedicationRecord).filter(
            MedicationRecord.user_id == session.owner_id,
            MedicationRecord.status == "active",
        )
        if profile.is_primary:
            med_q = med_q.filter(
                (MedicationRecord.profile_id == profile.id)
                | (MedicationRecord.profile_id.is_(None))
            )
        else:
            med_q = med_q.filter(MedicationRecord.profile_id == profile.id)
        
        for m in med_q.all():
            dosage_str = m.strength
            if m.dosage_instructions:
                dosage_str = f"{dosage_str} - {m.dosage_instructions}" if dosage_str else m.dosage_instructions
            shared_meds.append(
                DoctorSharedMedicationItem(
                    id=m.id,
                    name=m.name,
                    dosage=dosage_str,
                    frequency=m.frequency,
                    is_active=(m.status == "active"),
                    notes=m.notes,
                )
            )

    # Appointments query (only if explicitly shared)
    shared_appts: List[DoctorSharedAppointmentItem] = []
    if sr.get("include_appointments"):
        appt_q = db.query(AppointmentRecord).filter(
            AppointmentRecord.user_id == session.owner_id,
        )
        if profile.is_primary:
            appt_q = appt_q.filter(
                (AppointmentRecord.profile_id == profile.id)
                | (AppointmentRecord.profile_id.is_(None))
            )
        else:
            appt_q = appt_q.filter(AppointmentRecord.profile_id == profile.id)

        for a in appt_q.all():
            shared_appts.append(
                DoctorSharedAppointmentItem(
                    id=a.id,
                    doctor_name=a.provider_name or a.title,
                    specialty=a.appointment_type or a.title,
                    appointment_date=a.scheduled_at,
                    location=a.location,
                    notes=a.notes,
                )
            )

    # Calculate patient age safely
    patient_age = None
    if profile.date_of_birth:
        today = datetime.now(timezone.utc).date()
        dob = profile.date_of_birth
        patient_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    client_ip, user_agent = _get_client_meta(request)
    _record_audit_log(
        db=db,
        session_id=session.id,
        event_type="viewed_summary",
        ip_address=client_ip,
        user_agent=user_agent,
        details=f"Doctor viewed clinical summary portal",
    )

    config = SharedResourcesConfig(
        document_ids=sr.get("document_ids", []),
        include_visit_pack=sr.get("include_visit_pack", False),
        visit_pack_categories=sr.get("visit_pack_categories", ["documents", "observations", "medications", "appointments"]),
        include_medications=sr.get("include_medications", False),
        include_appointments=sr.get("include_appointments", False),
    )

    emergency_str = None
    if profile.emergency_contact_name:
        emergency_str = profile.emergency_contact_name
        if profile.emergency_contact_phone:
            emergency_str += f" ({profile.emergency_contact_phone})"

    return DoctorSharedHealthView(
        patient_name=profile.name,
        patient_relationship=profile.relationship,
        patient_age=patient_age,
        patient_gender=profile.gender,
        allergies_summary=profile.allergies_summary,
        emergency_contact=emergency_str,
        doctor_name=session.doctor_name,
        expires_at=session.expires_at,
        status=session.status,
        shared_resources=config,
        documents=shared_docs,
        medications=shared_meds,
        appointments=shared_appts,
        has_visit_pack=bool(sr.get("include_visit_pack")),
        notes=session.notes,
    )


def download_shared_document(
    db: Session,
    token: str,
    document_id: uuid.UUID,
    request: Optional[Request] = None,
) -> Tuple[Document, Path]:
    """Retrieves verified document and verified physical file path on disk for doctor access."""
    session = validate_doctor_session(db, token, request)
    sr = session.shared_resources or {}
    allowed_ids = [str(x) for x in sr.get("document_ids", [])]

    # Least privilege check: Document MUST be explicitly selected in this session
    if str(document_id) not in allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access not authorized for this sharing session.",
        )

    doc = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.owner_id == session.owner_id,
        )
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document record not found.",
        )

    # Verify profile consistency
    if not session.profile.is_primary and doc.profile_id != session.profile_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found in patient profile.",
        )

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
            detail="Physical document file missing from storage.",
        )

    client_ip, user_agent = _get_client_meta(request)
    _record_audit_log(
        db=db,
        session_id=session.id,
        event_type="downloaded_document",
        resource_id=str(document_id),
        ip_address=client_ip,
        user_agent=user_agent,
        details=f"Doctor downloaded document '{doc.filename}'",
    )

    return doc, file_path


def download_shared_visit_pack_pdf(
    db: Session,
    token: str,
    request: Optional[Request] = None,
) -> bytes:
    """Dynamically generates and returns a scoped Doctor Visit Preparation Pack PDF for doctor access."""
    session = validate_doctor_session(db, token, request)
    sr = session.shared_resources or {}

    if not sr.get("include_visit_pack"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor Visit Preparation Pack was not authorized for this sharing session.",
        )

    categories = sr.get("visit_pack_categories") or [
        "documents",
        "observations",
        "medications",
        "care_schedule",
        "patient_notes",
    ]

    draft_req = VisitPackDraftRequest(
        profile_id=str(session.profile_id),
        categories=categories,
        clinician_name=session.doctor_name,
        patient_notes=session.notes,
    )

    # Generate draft scoped to profile and session owner
    draft = generate_visit_pack_draft(db, session.owner, draft_req)

    # Filter documents in draft if specific document IDs were selected
    selected_doc_ids = set(str(d) for d in sr.get("document_ids", []))
    if selected_doc_ids:
        draft.documents = [d for d in draft.documents if d.document_id in selected_doc_ids]
        draft.observations = [o for o in draft.observations if o.document_id in selected_doc_ids]

    pdf_bytes = export_visit_pack_pdf(db, session.owner, draft)

    client_ip, user_agent = _get_client_meta(request)
    _record_audit_log(
        db=db,
        session_id=session.id,
        event_type="downloaded_visit_pack",
        ip_address=client_ip,
        user_agent=user_agent,
        details=f"Doctor downloaded visit pack PDF for {session.profile.name}",
    )

    return pdf_bytes
