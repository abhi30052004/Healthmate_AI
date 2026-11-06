import uuid
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.tracking import (
    AdherenceSummary,
    DoseLogResponse,
    DoseLogUpsert,
    DoseSlot,
    SymptomCreate,
    SymptomResponse,
    SymptomUpdate,
)
from app.services import tracking as svc

doses_router = APIRouter(prefix="/care", tags=["Dose Tracking"])
symptoms_router = APIRouter(prefix="/symptoms", tags=["Symptom Diary"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


@doses_router.get("/doses", response_model=list[DoseSlot])
def list_doses(
    current_user: CurrentUser,
    db: DbSession,
    on_date: date = Query(..., alias="date", description="Local calendar date, YYYY-MM-DD"),
    profile_id: uuid.UUID | None = Query(None),
):
    """Scheduled doses for one day with the user's recorded outcomes."""
    return svc.list_dose_slots(db, current_user, on_date, profile_id)


@doses_router.post("/dose-logs", response_model=DoseLogResponse)
def log_dose(payload: DoseLogUpsert, current_user: CurrentUser, db: DbSession):
    """Record taken / skipped / snoozed for a scheduled dose (idempotent per slot)."""
    return svc.upsert_dose_log(db, current_user, payload)


@doses_router.delete("/dose-logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def undo_dose_log(log_id: uuid.UUID, current_user: CurrentUser, db: DbSession):
    svc.delete_dose_log(db, current_user, log_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@doses_router.get("/adherence", response_model=AdherenceSummary)
def adherence(
    current_user: CurrentUser,
    db: DbSession,
    days: int = Query(7, ge=1, le=90),
    today: date = Query(..., description="The caller's local date, YYYY-MM-DD"),
    profile_id: uuid.UUID | None = Query(None),
):
    return svc.adherence_summary(db, current_user, days, today, profile_id)


@symptoms_router.get("", response_model=list[SymptomResponse])
def list_symptoms(
    current_user: CurrentUser,
    db: DbSession,
    profile_id: uuid.UUID | None = Query(None),
    start: datetime | None = Query(None),
    end: datetime | None = Query(None),
    limit: int = Query(200, ge=1, le=500),
):
    return svc.list_symptoms(db, current_user, profile_id, start, end, limit)


@symptoms_router.post("", response_model=SymptomResponse, status_code=status.HTTP_201_CREATED)
def create_symptom(payload: SymptomCreate, current_user: CurrentUser, db: DbSession):
    return svc.create_symptom(db, current_user, payload)


@symptoms_router.patch("/{symptom_id}", response_model=SymptomResponse)
def update_symptom(symptom_id: uuid.UUID, payload: SymptomUpdate, current_user: CurrentUser, db: DbSession):
    return svc.update_symptom(db, current_user, symptom_id, payload)


@symptoms_router.delete("/{symptom_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_symptom(symptom_id: uuid.UUID, current_user: CurrentUser, db: DbSession):
    svc.delete_symptom(db, current_user, symptom_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
