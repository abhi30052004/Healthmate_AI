"""Account self-service: profile name, full data export and account deletion."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import verify_password
from app.models import (
    AppointmentRecord,
    DoctorSharingAuditLog,
    DoctorSharingSession,
    Document,
    DocumentObservation,
    DoseLog,
    FamilyProfile,
    FollowUpTask,
    MedicationRecord,
    Reminder,
    SymptomEntry,
)
from app.models.user import User
from app.schemas.auth import UserRead

router = APIRouter(prefix="/account", tags=["Account"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]

# Columns that must never leave the server, even in the owner's own export.
_SECRET_COLUMNS = {"hashed_password", "storage_key", "token", "pin"}


def _row(obj: Any) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for col in obj.__table__.columns:
        name = col.name
        if name in _SECRET_COLUMNS or name.endswith("_hash"):
            continue
        out[name] = getattr(obj, name)
    return out


class AccountUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)

    @field_validator("name")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v


class AccountDelete(BaseModel):
    password: str = Field(min_length=1, max_length=128)


@router.patch("", response_model=UserRead)
def update_account(payload: AccountUpdate, current_user: CurrentUser, db: DbSession):
    current_user.name = payload.name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/export")
def export_account_data(current_user: CurrentUser, db: DbSession):
    """Everything this account owns, as one JSON document (files are not embedded)."""
    uid = current_user.id
    docs = db.query(Document).filter(Document.owner_id == uid).all()
    session_ids = [s.id for s in db.query(DoctorSharingSession).filter(DoctorSharingSession.owner_id == uid).all()]

    payload = {
        "exported_at": datetime.now(timezone.utc),
        "format_version": 1,
        "account": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "created_at": current_user.created_at,
        },
        "profiles": [_row(p) for p in db.query(FamilyProfile).filter(FamilyProfile.owner_id == uid).all()],
        "documents": [
            {
                **_row(d),
                "observations": [
                    _row(o) for o in db.query(DocumentObservation).filter(DocumentObservation.document_id == d.id).all()
                ],
            }
            for d in docs
        ],
        "medications": [_row(m) for m in db.query(MedicationRecord).filter(MedicationRecord.user_id == uid).all()],
        "dose_logs": [_row(r) for r in db.query(DoseLog).filter(DoseLog.user_id == uid).all()],
        "appointments": [_row(a) for a in db.query(AppointmentRecord).filter(AppointmentRecord.user_id == uid).all()],
        "follow_ups": [_row(t) for t in db.query(FollowUpTask).filter(FollowUpTask.user_id == uid).all()],
        "reminders": [_row(r) for r in db.query(Reminder).filter(Reminder.user_id == uid).all()],
        "symptoms": [_row(s) for s in db.query(SymptomEntry).filter(SymptomEntry.user_id == uid).all()],
        "doctor_shares": [
            _row(s) for s in db.query(DoctorSharingSession).filter(DoctorSharingSession.owner_id == uid).all()
        ],
        "doctor_share_access_log": (
            [_row(a) for a in db.query(DoctorSharingAuditLog).filter(DoctorSharingAuditLog.session_id.in_(session_ids)).all()]
            if session_ids
            else []
        ),
    }
    return Response(
        content=json.dumps(jsonable_encoder(payload), indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="healthmate-export.json"',
            "Cache-Control": "no-store",
        },
    )


@router.post("/delete", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(payload: AccountDelete, current_user: CurrentUser, db: DbSession):
    """Permanently delete the account, all records and stored files. Requires the password."""
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Incorrect password.")

    storage_root = Path(get_settings().document_storage_dir).resolve()
    keys = [k for (k,) in db.query(Document.storage_key).filter(Document.owner_id == current_user.id).all()]

    db.delete(current_user)  # ORM cascades remove every owned row
    db.commit()

    for key in keys:  # remove files only after the database commit succeeded
        try:
            target = (storage_root / key).resolve()
            target.relative_to(storage_root)
            if target.is_file():
                target.unlink()
        except (ValueError, OSError):
            continue
    return Response(status_code=status.HTTP_204_NO_CONTENT)
