"""API routes for Family Health Profile management."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.core.rate_limit import emergency_card_limiter
from app.schemas.family_profile import (
    EmergencyLinkStatus,
    PublicEmergencyCard,
    FamilyProfileCreate,
    FamilyProfileDeactivateResponse,
    FamilyProfileResponse,
    FamilyProfileUpdate,
)
from app.services.family_profile import (
    disable_emergency_link,
    enable_emergency_link,
    get_emergency_link,
    get_public_emergency_card,
    create_family_profile,
    deactivate_family_profile,
    get_family_profile,
    list_family_profiles,
    update_family_profile,
)

router = APIRouter(prefix="/family-profiles", tags=["Family Health Profiles"])


@router.post(
    "",
    response_model=FamilyProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new family health profile",
)
def create_profile(
    payload: FamilyProfileCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyProfileResponse:
    """Create a new family profile with relationship and consent metadata."""
    return create_family_profile(db, current_user, payload)


@router.get(
    "",
    response_model=list[FamilyProfileResponse],
    status_code=status.HTTP_200_OK,
    summary="List all authorized family profiles",
)
def list_profiles(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    include_inactive: bool = Query(False, description="Include archived/inactive profiles"),
) -> list[FamilyProfileResponse]:
    """Retrieve all family profiles authorized for the authenticated user."""
    return list_family_profiles(db, current_user, include_inactive=include_inactive)


@router.get(
    "/{profile_id}",
    response_model=FamilyProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single family profile details",
)
def get_single_profile(
    profile_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyProfileResponse:
    """Retrieve details and record counts for an authorized family profile."""
    return get_family_profile(db, current_user, profile_id)


@router.patch(
    "/{profile_id}",
    response_model=FamilyProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update family profile fields or consent",
)
def update_profile(
    profile_id: uuid.UUID,
    payload: FamilyProfileUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyProfileResponse:
    """Update permitted non-ownership profile attributes."""
    return update_family_profile(db, current_user, profile_id, payload)


@router.delete(
    "/{profile_id}",
    response_model=FamilyProfileDeactivateResponse,
    status_code=status.HTTP_200_OK,
    summary="Safely deactivate or archive a family profile",
)
def deactivate_profile(
    profile_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FamilyProfileDeactivateResponse:
    """Safely archive a family profile while preserving associated medical records for compliance."""
    return deactivate_family_profile(db, current_user, profile_id)


@router.get("/{profile_id}/emergency-link", response_model=EmergencyLinkStatus, summary="Is the public emergency card on?")
def read_emergency_link(
    profile_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> EmergencyLinkStatus:
    return get_emergency_link(db, current_user, profile_id)


@router.post("/{profile_id}/emergency-link", response_model=EmergencyLinkStatus, summary="Turn on (or rotate) the public emergency card")
def turn_on_emergency_link(
    profile_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    rotate: bool = Query(False, description="Issue a new token; previously printed QR codes stop working"),
) -> EmergencyLinkStatus:
    return enable_emergency_link(db, current_user, profile_id, rotate=rotate)


@router.delete("/{profile_id}/emergency-link", response_model=EmergencyLinkStatus, summary="Turn off the public emergency card")
def turn_off_emergency_link(
    profile_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> EmergencyLinkStatus:
    return disable_emergency_link(db, current_user, profile_id)


# Public, unauthenticated: what a first responder reaches by scanning the QR code.
public_router = APIRouter(prefix="/emergency", tags=["Emergency Card"])


@public_router.get(
    "/{token}",
    response_model=PublicEmergencyCard,
    summary="Public emergency card (QR target)",
    dependencies=[Depends(emergency_card_limiter)],
)
def public_emergency_card(
    token: str,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> PublicEmergencyCard:
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return get_public_emergency_card(db, token)
