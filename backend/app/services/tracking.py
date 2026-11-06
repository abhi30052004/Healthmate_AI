"""Dose schedule/outcome tracking and symptom diary services.

Nothing here interprets, recommends or alters treatment: it records what the user
was prescribed (as typed) and what they say they did.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.care import MedicationRecord
from app.models.tracking import DoseLog, SymptomEntry
from app.models.user import User
from app.schemas.tracking import (
    AdherenceDay,
    AdherenceSummary,
    DoseLogResponse,
    DoseLogUpsert,
    DoseSlot,
    SymptomCreate,
    SymptomResponse,
    SymptomUpdate,
)


def _scope_to_profile(query, model, db: Session, user: User, profile_id: uuid.UUID | None):
    """Scope a query to a profile the user owns. The primary profile also owns un-profiled legacy rows."""
    if profile_id is None:
        return query
    from app.services.family_profile import verify_profile_access

    profile = verify_profile_access(db, user, profile_id)
    if profile and profile.is_primary:
        return query.filter((model.profile_id == profile_id) | (model.profile_id.is_(None)))
    return query.filter(model.profile_id == profile_id)


# ---------------------------------------------------------------------------
# Doses
# ---------------------------------------------------------------------------

def _slot_applies(med: MedicationRecord, on_date: date) -> list[str]:
    """Return the HH:MM dose times that apply to this medication on this date."""
    if med.status != "active":
        return []
    if med.start_date and on_date < med.start_date:
        return []
    if med.end_date and on_date > med.end_date:
        return []
    days = med.schedule_days or []
    if days and on_date.weekday() not in days:
        return []
    return list(med.schedule_times or [])


def _active_medications(db: Session, user: User, profile_id: uuid.UUID | None) -> list[MedicationRecord]:
    q = db.query(MedicationRecord).filter(
        MedicationRecord.user_id == user.id, MedicationRecord.status == "active"
    )
    q = _scope_to_profile(q, MedicationRecord, db, user, profile_id)
    return q.order_by(MedicationRecord.name.asc()).all()


def _logs_by_slot(db: Session, user: User, med_ids: list[uuid.UUID], start: date, end: date):
    if not med_ids:
        return {}
    rows = (
        db.query(DoseLog)
        .filter(
            DoseLog.user_id == user.id,
            DoseLog.medication_id.in_(med_ids),
            DoseLog.scheduled_date >= start,
            DoseLog.scheduled_date <= end,
        )
        .all()
    )
    return {(r.medication_id, r.scheduled_date, r.scheduled_time): r for r in rows}


def list_dose_slots(db: Session, user: User, on_date: date, profile_id: uuid.UUID | None) -> list[DoseSlot]:
    meds = _active_medications(db, user, profile_id)
    logs = _logs_by_slot(db, user, [m.id for m in meds], on_date, on_date)
    slots: list[DoseSlot] = []
    for med in meds:
        for hhmm in _slot_applies(med, on_date):
            log = logs.get((med.id, on_date, hhmm))
            slots.append(
                DoseSlot(
                    medication_id=med.id,
                    medication_name=med.name,
                    strength=med.strength,
                    instructions=med.dosage_instructions,
                    profile_id=med.profile_id,
                    scheduled_date=on_date,
                    scheduled_time=hhmm,
                    outcome=log.outcome if log else None,
                    log_id=log.id if log else None,
                    logged_at=log.logged_at if log else None,
                    snoozed_until=log.snoozed_until if log else None,
                )
            )
    slots.sort(key=lambda s: (s.scheduled_time, s.medication_name.lower()))
    return slots


def upsert_dose_log(db: Session, user: User, payload: DoseLogUpsert) -> DoseLogResponse:
    med = (
        db.query(MedicationRecord)
        .filter(MedicationRecord.id == payload.medication_id, MedicationRecord.user_id == user.id)
        .first()
    )
    if med is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication record not found.")
    if payload.scheduled_date > date.today() + timedelta(days=1):
        raise HTTPException(status_code=422, detail="Cannot log a dose for a future date.")
    if payload.scheduled_time not in _slot_applies(med, payload.scheduled_date):
        raise HTTPException(
            status_code=422,
            detail="That dose time is not part of this medication's schedule on that date.",
        )

    log = (
        db.query(DoseLog)
        .filter(
            DoseLog.medication_id == med.id,
            DoseLog.scheduled_date == payload.scheduled_date,
            DoseLog.scheduled_time == payload.scheduled_time,
        )
        .first()
    )
    if log is None:
        log = DoseLog(
            user_id=user.id,
            profile_id=med.profile_id,
            medication_id=med.id,
            scheduled_date=payload.scheduled_date,
            scheduled_time=payload.scheduled_time,
            outcome=payload.outcome,
        )
        db.add(log)
    log.outcome = payload.outcome
    log.note = payload.note
    log.logged_at = datetime.now(timezone.utc)
    log.snoozed_until = (
        datetime.now(timezone.utc) + timedelta(minutes=payload.snooze_minutes)
        if payload.outcome == "snoozed"
        else None
    )
    db.commit()
    db.refresh(log)
    return DoseLogResponse.model_validate(log)


def delete_dose_log(db: Session, user: User, log_id: uuid.UUID) -> None:
    log = db.query(DoseLog).filter(DoseLog.id == log_id, DoseLog.user_id == user.id).first()
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose log not found.")
    db.delete(log)
    db.commit()


def adherence_summary(
    db: Session, user: User, days: int, today: date, profile_id: uuid.UUID | None
) -> AdherenceSummary:
    meds = _active_medications(db, user, profile_id)
    start = today - timedelta(days=days - 1)
    logs = _logs_by_slot(db, user, [m.id for m in meds], start, today)

    per_day: list[AdherenceDay] = []
    totals = {"expected": 0, "taken": 0, "skipped": 0, "missed": 0}
    for offset in range(days):
        d = start + timedelta(days=offset)
        expected = taken = skipped = 0
        for med in meds:
            for hhmm in _slot_applies(med, d):
                expected += 1
                log = logs.get((med.id, d, hhmm))
                if log and log.outcome == "taken":
                    taken += 1
                elif log and log.outcome == "skipped":
                    skipped += 1
        # Doses still ahead today are not "missed" yet.
        missed = max(expected - taken - skipped, 0) if d < today else 0
        per_day.append(AdherenceDay(date=d, expected=expected, taken=taken, skipped=skipped, missed=missed))
        totals["expected"] += expected
        totals["taken"] += taken
        totals["skipped"] += skipped
        totals["missed"] += missed

    # Percent is judged only over doses that are due (exclude those still pending today).
    due = sum(day.expected for day in per_day if day.date < today) + sum(
        day.taken + day.skipped for day in per_day if day.date == today
    )
    taken_pct = round(100 * totals["taken"] / due) if due else None
    return AdherenceSummary(days=days, taken_percent=taken_pct, per_day=per_day, **totals)


# ---------------------------------------------------------------------------
# Symptom diary
# ---------------------------------------------------------------------------

def list_symptoms(
    db: Session,
    user: User,
    profile_id: uuid.UUID | None,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = 200,
) -> list[SymptomResponse]:
    q = db.query(SymptomEntry).filter(SymptomEntry.user_id == user.id)
    q = _scope_to_profile(q, SymptomEntry, db, user, profile_id)
    if start:
        q = q.filter(SymptomEntry.occurred_at >= start)
    if end:
        q = q.filter(SymptomEntry.occurred_at <= end)
    rows = q.order_by(SymptomEntry.occurred_at.desc()).limit(limit).all()
    return [SymptomResponse.model_validate(r) for r in rows]


def create_symptom(db: Session, user: User, data: SymptomCreate) -> SymptomResponse:
    if data.profile_id is not None:
        from app.services.family_profile import verify_profile_access

        verify_profile_access(db, user, data.profile_id)
    row = SymptomEntry(
        user_id=user.id,
        profile_id=data.profile_id,
        title=data.title,
        severity=data.severity,
        notes=data.notes.strip() if data.notes else None,
        occurred_at=data.occurred_at,
        include_in_visit_pack=data.include_in_visit_pack,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return SymptomResponse.model_validate(row)


def _get_symptom(db: Session, user: User, symptom_id: uuid.UUID) -> SymptomEntry:
    row = db.query(SymptomEntry).filter(SymptomEntry.id == symptom_id, SymptomEntry.user_id == user.id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Symptom entry not found.")
    return row


def update_symptom(db: Session, user: User, symptom_id: uuid.UUID, data: SymptomUpdate) -> SymptomResponse:
    row = _get_symptom(db, user, symptom_id)
    changes = data.model_dump(exclude_unset=True)
    if changes.get("title") is not None:
        changes["title"] = changes["title"].strip()
        if not changes["title"]:
            raise HTTPException(status_code=422, detail="title must not be blank")
    for field, value in changes.items():
        if field in ("title", "severity", "occurred_at", "include_in_visit_pack") and value is None:
            continue
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return SymptomResponse.model_validate(row)


def delete_symptom(db: Session, user: User, symptom_id: uuid.UUID) -> None:
    db.delete(_get_symptom(db, user, symptom_id))
    db.commit()
