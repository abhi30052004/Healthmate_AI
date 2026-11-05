"""API routes for Family Health Profile management."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.family_profile import (
    FamilyProfileCreate,
    FamilyProfileDeactivateResponse,
    FamilyProfileResponse,
    FamilyProfileUpdate,
)
from app.services.family_profile import (
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
