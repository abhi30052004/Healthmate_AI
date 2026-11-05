import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.care import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
    CareCalendarResponse,
    CareOverviewResponse,
    FollowUpTaskCreate,
    FollowUpTaskResponse,
    FollowUpTaskUpdate,
    MedicationCreate,
    MedicationResponse,
    MedicationUpdate,
)
from app.services import care as care_service

router = APIRouter(prefix="/care", tags=["care"])


# ---------------------------------------------------------------------------
# Care Overview & Calendar
# ---------------------------------------------------------------------------

@router.get("/overview", response_model=CareOverviewResponse)
def get_care_overview(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    profile_id: uuid.UUID | None = Query(None, description="Scope overview to a specific family profile ID"),
):
    """Retrieve high-level care metrics, upcoming appointments, pending tasks, and active meds."""
    return care_service.get_care_overview(db, current_user, profile_id=profile_id)


@router.get("/calendar", response_model=CareCalendarResponse)
def get_care_calendar(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    start_date: datetime | None = Query(None, description="Filter items scheduled/due on or after this timestamp"),
    end_date: datetime | None = Query(None, description="Filter items scheduled/due on or before this timestamp"),
    profile_id: uuid.UUID | None = Query(None, description="Scope calendar to a specific family profile ID"),
):
    """Retrieve a unified chronological calendar of appointments and due follow-up tasks."""
    return care_service.get_care_calendar(db, current_user, start_date=start_date, end_date=end_date, profile_id=profile_id)


# ---------------------------------------------------------------------------
# Medication Endpoints
# ---------------------------------------------------------------------------

@router.get("/medications", response_model=list[MedicationResponse])
def list_medications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: str | None = Query(None, description="Filter by status: active, paused, completed, archived"),
    search: str | None = Query(None, description="Search by name, prescriber, or dosage instructions"),
    profile_id: uuid.UUID | None = Query(None, description="Filter medications by family profile ID"),
):
    """List recorded medications for the authenticated user."""
    return care_service.list_medications(db, current_user, status_filter=status, search=search, profile_id=profile_id)


@router.post("/medications", response_model=MedicationResponse, status_code=status.HTTP_201_CREATED)
def create_medication(
    payload: MedicationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Record a medication with exact user-entered or extracted dosage instructions."""
    return care_service.create_medication(db, current_user, payload)


@router.get("/medications/{medication_id}", response_model=MedicationResponse)
def get_medication(
    medication_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retrieve a specific medication record owned by the authenticated user."""
    return care_service.get_medication(db, current_user, medication_id)


@router.patch("/medications/{medication_id}", response_model=MedicationResponse)
def update_medication(
    medication_id: uuid.UUID,
    payload: MedicationUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Update fields of an existing medication record."""
    return care_service.update_medication(db, current_user, medication_id, payload)


@router.delete("/medications/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication(
    medication_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Delete a medication record owned by the authenticated user."""
    care_service.delete_medication(db, current_user, medication_id)
    return None


# ---------------------------------------------------------------------------
# Appointment Endpoints
# ---------------------------------------------------------------------------

@router.get("/appointments", response_model=list[AppointmentResponse])
def list_appointments(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: str | None = Query(None, description="Filter by status: scheduled, completed, cancelled, rescheduled"),
    start_date: datetime | None = Query(None, description="Filter by scheduled_at >= start_date"),
    end_date: datetime | None = Query(None, description="Filter by scheduled_at <= end_date"),
    profile_id: uuid.UUID | None = Query(None, description="Filter appointments by family profile ID"),
):
    """List medical appointments for the authenticated user."""
    return care_service.list_appointments(
        db, current_user, status_filter=status, start_date=start_date, end_date=end_date, profile_id=profile_id
    )


@router.post("/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Create a new medical appointment record."""
    return care_service.create_appointment(db, current_user, payload)


@router.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retrieve an appointment record owned by the authenticated user."""
    return care_service.get_appointment(db, current_user, appointment_id)


@router.patch("/appointments/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: uuid.UUID,
    payload: AppointmentUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Update fields or status of an existing appointment."""
    return care_service.update_appointment(db, current_user, appointment_id, payload)


@router.delete("/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Delete an appointment record owned by the authenticated user."""
    care_service.delete_appointment(db, current_user, appointment_id)
    return None


# ---------------------------------------------------------------------------
# Follow-Up Task Endpoints
# ---------------------------------------------------------------------------

@router.get("/follow-ups", response_model=list[FollowUpTaskResponse])
def list_follow_ups(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: str | None = Query(None, description="Filter by status: pending, completed, dismissed"),
    appointment_id: uuid.UUID | None = Query(None, description="Filter tasks linked to a specific appointment"),
    profile_id: uuid.UUID | None = Query(None, description="Filter follow-up tasks by family profile ID"),
):
    """List care follow-up tasks for the authenticated user."""
    return care_service.list_follow_ups(db, current_user, status_filter=status, appointment_id=appointment_id, profile_id=profile_id)


@router.post("/follow-ups", response_model=FollowUpTaskResponse, status_code=status.HTTP_201_CREATED)
def create_follow_up(
    payload: FollowUpTaskCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Create a follow-up task with user-selected priority and optional appointment link."""
    return care_service.create_follow_up(db, current_user, payload)


@router.get("/follow-ups/{task_id}", response_model=FollowUpTaskResponse)
def get_follow_up(
    task_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retrieve a follow-up task owned by the authenticated user."""
    return care_service.get_follow_up(db, current_user, task_id)


@router.patch("/follow-ups/{task_id}", response_model=FollowUpTaskResponse)
def update_follow_up(
    task_id: uuid.UUID,
    payload: FollowUpTaskUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Update fields or status (pending, completed, dismissed) of a follow-up task."""
    return care_service.update_follow_up(db, current_user, task_id, payload)


@router.delete("/follow-ups/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_follow_up(
    task_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Delete a follow-up task owned by the authenticated user."""
    care_service.delete_follow_up(db, current_user, task_id)
    return None
