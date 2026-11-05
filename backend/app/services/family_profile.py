"""Service for Family Health Profile management and authorization."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.care import AppointmentRecord, MedicationRecord
from app.models.document import Document
from app.models.family_profile import FamilyProfile
from app.models.reminder import Reminder
from app.models.user import User
from app.schemas.family_profile import (
    FamilyProfileCreate,
    FamilyProfileDeactivateResponse,
    FamilyProfileResponse,
    FamilyProfileUpdate,
    ProfileHealthSummary,
)


def get_or_create_primary_profile(db: Session, user: User) -> FamilyProfile:
    """Ensure the user has an active primary 'self' profile."""
    profile = db.scalars(
        select(FamilyProfile).where(
            FamilyProfile.owner_id == user.id,
            FamilyProfile.is_primary.is_(True),
        )
    ).first()

    if profile is not None:
        return profile

    profile_name = user.name.strip() if user.name and user.name.strip() else user.email.split("@")[0].capitalize()
    primary = FamilyProfile(
        id=uuid.uuid4(),
        owner_id=user.id,
        name=profile_name,
        relationship="self",
        is_primary=True,
        is_active=True,
        is_dependent=False,
        consent_status="authorized",
        consent_granted_at=datetime.now(timezone.utc),
        avatar_color="#2563eb",
        consent_notes="Primary account holder profile (self).",
    )
    db.add(primary)
    db.commit()
    db.refresh(primary)
    return primary


def _compute_profile_summary(db: Session, user_id: uuid.UUID, profile: FamilyProfile) -> ProfileHealthSummary:
    """Calculate health record counts associated with a specific family profile."""
    if profile.is_primary:
        # Primary profile includes records specifically assigned to it OR legacy records without a profile_id
        doc_count = db.query(func.count(Document.id)).filter(
            Document.owner_id == user_id,
            (Document.profile_id == profile.id) | (Document.profile_id.is_(None)),
        ).scalar() or 0

        med_count = db.query(func.count(MedicationRecord.id)).filter(
            MedicationRecord.user_id == user_id,
            (MedicationRecord.profile_id == profile.id) | (MedicationRecord.profile_id.is_(None)),
        ).scalar() or 0

        appt_count = db.query(func.count(AppointmentRecord.id)).filter(
            AppointmentRecord.user_id == user_id,
            (AppointmentRecord.profile_id == profile.id) | (AppointmentRecord.profile_id.is_(None)),
        ).scalar() or 0

        rem_count = db.query(func.count(Reminder.id)).filter(
            Reminder.user_id == user_id,
            (Reminder.profile_id == profile.id) | (Reminder.profile_id.is_(None)),
        ).scalar() or 0
    else:
        doc_count = db.query(func.count(Document.id)).filter(
            Document.owner_id == user_id,
            Document.profile_id == profile.id,
        ).scalar() or 0

        med_count = db.query(func.count(MedicationRecord.id)).filter(
            MedicationRecord.user_id == user_id,
            MedicationRecord.profile_id == profile.id,
        ).scalar() or 0

        appt_count = db.query(func.count(AppointmentRecord.id)).filter(
            AppointmentRecord.user_id == user_id,
            AppointmentRecord.profile_id == profile.id,
        ).scalar() or 0

        rem_count = db.query(func.count(Reminder.id)).filter(
            Reminder.user_id == user_id,
            Reminder.profile_id == profile.id,
        ).scalar() or 0

    return ProfileHealthSummary(
        document_count=doc_count,
        medication_count=med_count,
        appointment_count=appt_count,
        reminder_count=rem_count,
    )


def _build_profile_response(db: Session, user_id: uuid.UUID, profile: FamilyProfile) -> FamilyProfileResponse:
    summary = _compute_profile_summary(db, user_id, profile)
    res = FamilyProfileResponse.model_validate(profile)
    res.health_summary = summary
    return res


def create_family_profile(db: Session, user: User, payload: FamilyProfileCreate) -> FamilyProfileResponse:
    """Create a new family health profile owned by the authenticated user."""
    # Ensure primary profile exists
    get_or_create_primary_profile(db, user)

    # Disallow creating duplicate "self" or "primary" profiles
    if payload.relationship == "self":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A primary 'self' profile already exists for this account.",
        )

    # If dependent flag is set or relationship is child, auto-set is_dependent
    is_dep = payload.is_dependent or (payload.relationship == "child")

    now = datetime.now(timezone.utc)
    granted_at = now if payload.consent_status == "authorized" else None

    # Default avatar color palette if not provided
    avatar_color = payload.avatar_color or "#0d9488"

    profile = FamilyProfile(
        id=uuid.uuid4(),
        owner_id=user.id,
        name=payload.name,
        relationship=payload.relationship,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        blood_type=payload.blood_type,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        allergies_summary=payload.allergies_summary,
        avatar_color=avatar_color,
        is_primary=False,
        is_active=True,
        is_dependent=is_dep,
        consent_status=payload.consent_status,
        consent_granted_at=granted_at,
        consent_notes=payload.consent_notes,
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return _build_profile_response(db, user.id, profile)


def list_family_profiles(
    db: Session,
    user: User,
    include_inactive: bool = False,
) -> list[FamilyProfileResponse]:
    """Retrieve all authorized profiles for the authenticated user."""
    get_or_create_primary_profile(db, user)

    query = select(FamilyProfile).where(FamilyProfile.owner_id == user.id)
    if not include_inactive:
        query = query.where(FamilyProfile.is_active.is_(True))

    query = query.order_by(FamilyProfile.is_primary.desc(), FamilyProfile.name.asc())
    profiles = db.scalars(query).all()

    return [_build_profile_response(db, user.id, p) for p in profiles]


def get_family_profile(db: Session, user: User, profile_id: uuid.UUID) -> FamilyProfileResponse:
    """Retrieve details for a single authorized profile."""
    profile = db.scalars(
        select(FamilyProfile).where(
            FamilyProfile.id == profile_id,
            FamilyProfile.owner_id == user.id,
        )
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family profile not found or unauthorized.",
        )

    return _build_profile_response(db, user.id, profile)


def update_family_profile(
    db: Session,
    user: User,
    profile_id: uuid.UUID,
    payload: FamilyProfileUpdate,
) -> FamilyProfileResponse:
    """Update permitted fields on an authorized profile."""
    profile = db.scalars(
        select(FamilyProfile).where(
            FamilyProfile.id == profile_id,
            FamilyProfile.owner_id == user.id,
        )
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family profile not found or unauthorized.",
        )

    # Disallow changing relationship of primary profile away from self
    if profile.is_primary and payload.relationship is not None and payload.relationship != "self":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change relationship of the primary account profile.",
        )

    data = payload.model_dump(exclude_unset=True)

    # Update consent granted timestamp if transitioning to authorized
    if "consent_status" in data:
        if data["consent_status"] == "authorized" and profile.consent_status != "authorized":
            profile.consent_granted_at = datetime.now(timezone.utc)
        elif data["consent_status"] != "authorized":
            profile.consent_granted_at = None

    for key, value in data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return _build_profile_response(db, user.id, profile)


def deactivate_family_profile(
    db: Session,
    user: User,
    profile_id: uuid.UUID,
) -> FamilyProfileDeactivateResponse:
    """Safely archive/deactivate a profile without destroying medical history."""
    profile = db.scalars(
        select(FamilyProfile).where(
            FamilyProfile.id == profile_id,
            FamilyProfile.owner_id == user.id,
        )
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family profile not found or unauthorized.",
        )

    if profile.is_primary:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Primary account profile cannot be deactivated.",
        )

    profile.is_active = False
    db.commit()

    return FamilyProfileDeactivateResponse(
        profile_id=profile.id,
        name=profile.name,
        is_active=False,
    )


def verify_profile_access(
    db: Session,
    user: User,
    profile_id: uuid.UUID | None,
    allow_unauthorized_consent: bool = False,
) -> FamilyProfile | None:
    """Verify that the user owns the profile and that it is active and authorized."""
    if profile_id is None:
        return None

    profile = db.scalars(
        select(FamilyProfile).where(
            FamilyProfile.id == profile_id,
            FamilyProfile.owner_id == user.id,
        )
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified family profile not found or access denied.",
        )

    if not profile.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot perform operations on an archived family profile.",
        )

    if not allow_unauthorized_consent and profile.consent_status == "revoked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this family member's clinical records has been revoked.",
        )

    return profile
