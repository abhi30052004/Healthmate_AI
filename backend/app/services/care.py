import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.care import AppointmentRecord, FollowUpTask, MedicationRecord
from app.models.document import Document
from app.models.user import User
from app.schemas.care import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
    CareCalendarItem,
    CareCalendarResponse,
    CareOverviewResponse,
    FollowUpTaskCreate,
    FollowUpTaskResponse,
    FollowUpTaskUpdate,
    MedicationCreate,
    MedicationResponse,
    MedicationUpdate,
)


def _validate_source_document(db: Session, user: User, doc_id: uuid.UUID | None) -> None:
    if doc_id is None:
        return
    doc = db.query(Document).filter(Document.id == doc_id, Document.owner_id == user.id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Referenced source document not found or does not belong to the authenticated user.",
        )


def _validate_appointment_ownership(db: Session, user: User, appt_id: uuid.UUID | None) -> None:
    if appt_id is None:
        return
    appt = db.query(AppointmentRecord).filter(
        AppointmentRecord.id == appt_id,
        AppointmentRecord.user_id == user.id,
    ).first()
    if not appt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Referenced appointment not found or does not belong to the authenticated user.",
        )


def _validate_profile_ownership(db: Session, user: User, profile_id: uuid.UUID | None) -> None:
    if profile_id is None:
        return
    from app.services.family_profile import verify_profile_access
    verify_profile_access(db, user, profile_id)


# ---------------------------------------------------------------------------
# Medication Services
# ---------------------------------------------------------------------------

def list_medications(
    db: Session,
    user: User,
    status_filter: str | None = None,
    search: str | None = None,
    profile_id: uuid.UUID | None = None,
) -> list[MedicationResponse]:
    query = db.query(MedicationRecord).filter(MedicationRecord.user_id == user.id)

    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        prof = verify_profile_access(db, user, profile_id)
        if prof and prof.is_primary:
            query = query.filter((MedicationRecord.profile_id == profile_id) | (MedicationRecord.profile_id.is_(None)))
        else:
            query = query.filter(MedicationRecord.profile_id == profile_id)

    if status_filter:
        query = query.filter(MedicationRecord.status == status_filter)

    if search:
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                MedicationRecord.name.ilike(term),
                MedicationRecord.prescriber.ilike(term),
                MedicationRecord.dosage_instructions.ilike(term),
            )
        )

    records = query.order_by(MedicationRecord.created_at.desc()).all()

    # Pre-fetch document titles for referenced docs
    doc_ids = [m.source_document_id for m in records if m.source_document_id]
    doc_map = {}
    if doc_ids:
        docs = db.query(Document.id, Document.filename).filter(Document.id.in_(doc_ids)).all()
        doc_map = {d.id: d.filename for d in docs}

    responses = []
    for r in records:
        resp = MedicationResponse.model_validate(r)
        if r.source_document_id in doc_map:
            resp.source_document_title = doc_map[r.source_document_id]
        responses.append(resp)
    return responses


def create_medication(
    db: Session,
    user: User,
    data: MedicationCreate,
) -> MedicationResponse:
    _validate_source_document(db, user, data.source_document_id)
    _validate_profile_ownership(db, user, data.profile_id)

    med = MedicationRecord(
        user_id=user.id,
        profile_id=data.profile_id,
        name=data.name.strip(),
        medication_type=data.medication_type,
        strength=data.strength,
        dosage_instructions=data.dosage_instructions,
        route=data.route,
        frequency=data.frequency,
        start_date=data.start_date,
        end_date=data.end_date,
        prescriber=data.prescriber,
        pharmacy=data.pharmacy,
        notes=data.notes,
        source_document_id=data.source_document_id,
        status=data.status,
    )
    db.add(med)
    db.commit()
    db.refresh(med)

    resp = MedicationResponse.model_validate(med)
    if med.source_document_id:
        doc = db.query(Document.filename).filter(Document.id == med.source_document_id).first()
        if doc:
            resp.source_document_title = doc.filename
    return resp


def get_medication(
    db: Session,
    user: User,
    med_id: uuid.UUID,
) -> MedicationResponse:
    med = db.query(MedicationRecord).filter(
        MedicationRecord.id == med_id,
        MedicationRecord.user_id == user.id,
    ).first()
    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication record not found.",
        )
    resp = MedicationResponse.model_validate(med)
    if med.source_document_id:
        doc = db.query(Document.filename).filter(Document.id == med.source_document_id).first()
        if doc:
            resp.source_document_title = doc.filename
    return resp


def update_medication(
    db: Session,
    user: User,
    med_id: uuid.UUID,
    data: MedicationUpdate,
) -> MedicationResponse:
    med = db.query(MedicationRecord).filter(
        MedicationRecord.id == med_id,
        MedicationRecord.user_id == user.id,
    ).first()
    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication record not found.",
        )

    if data.source_document_id is not None:
        _validate_source_document(db, user, data.source_document_id)
    if data.profile_id is not None:
        _validate_profile_ownership(db, user, data.profile_id)

    update_dict = data.model_dump(exclude_unset=True)
    if "name" in update_dict and update_dict["name"] is not None:
        update_dict["name"] = update_dict["name"].strip()

    for field, value in update_dict.items():
        setattr(med, field, value)

    db.commit()
    db.refresh(med)

    resp = MedicationResponse.model_validate(med)
    if med.source_document_id:
        doc = db.query(Document.filename).filter(Document.id == med.source_document_id).first()
        if doc:
            resp.source_document_title = doc.filename
    return resp


def delete_medication(
    db: Session,
    user: User,
    med_id: uuid.UUID,
) -> None:
    med = db.query(MedicationRecord).filter(
        MedicationRecord.id == med_id,
        MedicationRecord.user_id == user.id,
    ).first()
    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication record not found.",
        )
    db.delete(med)
    db.commit()


# ---------------------------------------------------------------------------
# Appointment Services
# ---------------------------------------------------------------------------

def list_appointments(
    db: Session,
    user: User,
    status_filter: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    profile_id: uuid.UUID | None = None,
) -> list[AppointmentResponse]:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date cannot be later than end_date.",
        )
    query = db.query(AppointmentRecord).filter(AppointmentRecord.user_id == user.id)

    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        prof = verify_profile_access(db, user, profile_id)
        if prof and prof.is_primary:
            query = query.filter((AppointmentRecord.profile_id == profile_id) | (AppointmentRecord.profile_id.is_(None)))
        else:
            query = query.filter(AppointmentRecord.profile_id == profile_id)

    if status_filter:
        query = query.filter(AppointmentRecord.status == status_filter)
    if start_date:
        query = query.filter(AppointmentRecord.scheduled_at >= start_date)
    if end_date:
        query = query.filter(AppointmentRecord.scheduled_at <= end_date)

    records = query.order_by(AppointmentRecord.scheduled_at.asc()).all()

    # Pre-fetch document titles and task counts
    doc_ids = [a.source_document_id for a in records if a.source_document_id]
    doc_map = {}
    if doc_ids:
        docs = db.query(Document.id, Document.filename).filter(Document.id.in_(doc_ids)).all()
        doc_map = {d.id: d.filename for d in docs}

    appt_ids = [a.id for a in records]
    task_count_map = {}
    if appt_ids:
        tasks = db.query(FollowUpTask.appointment_id).filter(FollowUpTask.appointment_id.in_(appt_ids)).all()
        for t in tasks:
            task_count_map[t.appointment_id] = task_count_map.get(t.appointment_id, 0) + 1

    responses = []
    for r in records:
        resp = AppointmentResponse.model_validate(r)
        if r.source_document_id in doc_map:
            resp.source_document_title = doc_map[r.source_document_id]
        resp.follow_up_tasks_count = task_count_map.get(r.id, 0)
        responses.append(resp)
    return responses


def create_appointment(
    db: Session,
    user: User,
    data: AppointmentCreate,
) -> AppointmentResponse:
    _validate_source_document(db, user, data.source_document_id)
    _validate_profile_ownership(db, user, data.profile_id)

    appt = AppointmentRecord(
        user_id=user.id,
        profile_id=data.profile_id,
        title=data.title.strip(),
        appointment_type=data.appointment_type,
        provider_name=data.provider_name,
        location=data.location,
        scheduled_at=data.scheduled_at,
        timezone=data.timezone or "UTC",
        status=data.status,
        notes=data.notes,
        source_document_id=data.source_document_id,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    resp = AppointmentResponse.model_validate(appt)
    if appt.source_document_id:
        doc = db.query(Document.filename).filter(Document.id == appt.source_document_id).first()
        if doc:
            resp.source_document_title = doc.filename
    return resp


def get_appointment(
    db: Session,
    user: User,
    appt_id: uuid.UUID,
) -> AppointmentResponse:
    appt = db.query(AppointmentRecord).filter(
        AppointmentRecord.id == appt_id,
        AppointmentRecord.user_id == user.id,
    ).first()
    if not appt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment record not found.",
        )
    resp = AppointmentResponse.model_validate(appt)
    if appt.source_document_id:
        doc = db.query(Document.filename).filter(Document.id == appt.source_document_id).first()
        if doc:
            resp.source_document_title = doc.filename
    task_count = db.query(FollowUpTask).filter(FollowUpTask.appointment_id == appt.id).count()
    resp.follow_up_tasks_count = task_count
    return resp


def update_appointment(
    db: Session,
    user: User,
    appt_id: uuid.UUID,
    data: AppointmentUpdate,
) -> AppointmentResponse:
    appt = db.query(AppointmentRecord).filter(
        AppointmentRecord.id == appt_id,
        AppointmentRecord.user_id == user.id,
    ).first()
    if not appt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment record not found.",
        )

    if data.source_document_id is not None:
        _validate_source_document(db, user, data.source_document_id)

    update_dict = data.model_dump(exclude_unset=True)
    if "title" in update_dict and update_dict["title"] is not None:
        update_dict["title"] = update_dict["title"].strip()

    for field, value in update_dict.items():
        setattr(appt, field, value)

    db.commit()
    db.refresh(appt)

    resp = AppointmentResponse.model_validate(appt)
    if appt.source_document_id:
        doc = db.query(Document.filename).filter(Document.id == appt.source_document_id).first()
        if doc:
            resp.source_document_title = doc.filename
    task_count = db.query(FollowUpTask).filter(FollowUpTask.appointment_id == appt.id).count()
    resp.follow_up_tasks_count = task_count
    return resp


def delete_appointment(
    db: Session,
    user: User,
    appt_id: uuid.UUID,
) -> None:
    appt = db.query(AppointmentRecord).filter(
        AppointmentRecord.id == appt_id,
        AppointmentRecord.user_id == user.id,
    ).first()
    if not appt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment record not found.",
        )
    db.delete(appt)
    db.commit()


# ---------------------------------------------------------------------------
# Follow-Up Task Services
# ---------------------------------------------------------------------------

def list_follow_ups(
    db: Session,
    user: User,
    status_filter: str | None = None,
    appointment_id: uuid.UUID | None = None,
    profile_id: uuid.UUID | None = None,
) -> list[FollowUpTaskResponse]:
    query = db.query(FollowUpTask).filter(FollowUpTask.user_id == user.id)

    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        prof = verify_profile_access(db, user, profile_id)
        if prof and prof.is_primary:
            query = query.filter((FollowUpTask.profile_id == profile_id) | (FollowUpTask.profile_id.is_(None)))
        else:
            query = query.filter(FollowUpTask.profile_id == profile_id)

    if status_filter:
        query = query.filter(FollowUpTask.status == status_filter)
    if appointment_id:
        query = query.filter(FollowUpTask.appointment_id == appointment_id)

    tasks = query.order_by(FollowUpTask.due_at.asc().nulls_last(), FollowUpTask.created_at.desc()).all()

    # Pre-fetch document and appointment titles
    doc_ids = [t.source_document_id for t in tasks if t.source_document_id]
    doc_map = {}
    if doc_ids:
        docs = db.query(Document.id, Document.filename).filter(Document.id.in_(doc_ids)).all()
        doc_map = {d.id: d.filename for d in docs}

    appt_ids = [t.appointment_id for t in tasks if t.appointment_id]
    appt_map = {}
    if appt_ids:
        appts = db.query(AppointmentRecord.id, AppointmentRecord.title).filter(AppointmentRecord.id.in_(appt_ids)).all()
        appt_map = {a.id: a.title for a in appts}

    now = datetime.now(timezone.utc)
    responses = []
    for t in tasks:
        resp = FollowUpTaskResponse.model_validate(t)
        if t.source_document_id in doc_map:
            resp.source_document_title = doc_map[t.source_document_id]
        if t.appointment_id in appt_map:
            resp.appointment_title = appt_map[t.appointment_id]
        # Overdue check: pending and due_at in the past
        if t.status == "pending" and t.due_at:
            due_utc = t.due_at if t.due_at.tzinfo else t.due_at.replace(tzinfo=timezone.utc)
            resp.is_overdue = due_utc < now
        responses.append(resp)
    return responses


def create_follow_up(
    db: Session,
    user: User,
    data: FollowUpTaskCreate,
) -> FollowUpTaskResponse:
    _validate_source_document(db, user, data.source_document_id)
    _validate_appointment_ownership(db, user, data.appointment_id)
    _validate_profile_ownership(db, user, data.profile_id)

    task = FollowUpTask(
        user_id=user.id,
        profile_id=data.profile_id,
        title=data.title.strip(),
        description=data.description,
        due_at=data.due_at,
        status=data.status,
        priority=data.priority,
        source_document_id=data.source_document_id,
        appointment_id=data.appointment_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    resp = FollowUpTaskResponse.model_validate(task)
    if task.source_document_id:
        doc = db.query(Document.filename).filter(Document.id == task.source_document_id).first()
        if doc:
            resp.source_document_title = doc.filename
    if task.appointment_id:
        appt = db.query(AppointmentRecord.title).filter(AppointmentRecord.id == task.appointment_id).first()
        if appt:
            resp.appointment_title = appt.title

    now = datetime.now(timezone.utc)
    if task.status == "pending" and task.due_at:
        due_utc = task.due_at if task.due_at.tzinfo else task.due_at.replace(tzinfo=timezone.utc)
        resp.is_overdue = due_utc < now
    return resp


def get_follow_up(
    db: Session,
    user: User,
    task_id: uuid.UUID,
) -> FollowUpTaskResponse:
    task = db.query(FollowUpTask).filter(
        FollowUpTask.id == task_id,
        FollowUpTask.user_id == user.id,
    ).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up task not found.",
        )
    resp = FollowUpTaskResponse.model_validate(task)
    if task.source_document_id:
        doc = db.query(Document.filename).filter(Document.id == task.source_document_id).first()
        if doc:
            resp.source_document_title = doc.filename
    if task.appointment_id:
        appt = db.query(AppointmentRecord.title).filter(AppointmentRecord.id == task.appointment_id).first()
        if appt:
            resp.appointment_title = appt.title
    now = datetime.now(timezone.utc)
    if task.status == "pending" and task.due_at:
        due_utc = task.due_at if task.due_at.tzinfo else task.due_at.replace(tzinfo=timezone.utc)
        resp.is_overdue = due_utc < now
    return resp


def update_follow_up(
    db: Session,
    user: User,
    task_id: uuid.UUID,
    data: FollowUpTaskUpdate,
) -> FollowUpTaskResponse:
    task = db.query(FollowUpTask).filter(
        FollowUpTask.id == task_id,
        FollowUpTask.user_id == user.id,
    ).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up task not found.",
        )

    if data.source_document_id is not None:
        _validate_source_document(db, user, data.source_document_id)
    if data.appointment_id is not None:
        _validate_appointment_ownership(db, user, data.appointment_id)

    update_dict = data.model_dump(exclude_unset=True)
    if "title" in update_dict and update_dict["title"] is not None:
        update_dict["title"] = update_dict["title"].strip()

    for field, value in update_dict.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    resp = FollowUpTaskResponse.model_validate(task)
    if task.source_document_id:
        doc = db.query(Document.filename).filter(Document.id == task.source_document_id).first()
        if doc:
            resp.source_document_title = doc.filename
    if task.appointment_id:
        appt = db.query(AppointmentRecord.title).filter(AppointmentRecord.id == task.appointment_id).first()
        if appt:
            resp.appointment_title = appt.title
    now = datetime.now(timezone.utc)
    if task.status == "pending" and task.due_at:
        due_utc = task.due_at if task.due_at.tzinfo else task.due_at.replace(tzinfo=timezone.utc)
        resp.is_overdue = due_utc < now
    return resp


def delete_follow_up(
    db: Session,
    user: User,
    task_id: uuid.UUID,
) -> None:
    task = db.query(FollowUpTask).filter(
        FollowUpTask.id == task_id,
        FollowUpTask.user_id == user.id,
    ).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up task not found.",
        )
    db.delete(task)
    db.commit()


# ---------------------------------------------------------------------------
# Care Calendar Unified Aggregation
# ---------------------------------------------------------------------------

def get_care_calendar(
    db: Session,
    user: User,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    profile_id: uuid.UUID | None = None,
) -> CareCalendarResponse:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date cannot be later than end_date.",
        )

    # Validate profile ownership before filtering
    _validate_profile_ownership(db, user, profile_id)

    # 1. Fetch appointments
    appt_query = db.query(AppointmentRecord).filter(AppointmentRecord.user_id == user.id)
    if profile_id is not None:
        appt_query = appt_query.filter(AppointmentRecord.profile_id == profile_id)
    if start_date:
        appt_query = appt_query.filter(AppointmentRecord.scheduled_at >= start_date)
    if end_date:
        appt_query = appt_query.filter(AppointmentRecord.scheduled_at <= end_date)
    appts = appt_query.all()

    # 2. Fetch tasks with due_at
    task_query = db.query(FollowUpTask).filter(
        FollowUpTask.user_id == user.id,
        FollowUpTask.due_at.isnot(None),
    )
    if profile_id is not None:
        task_query = task_query.filter(FollowUpTask.profile_id == profile_id)
    if start_date:
        task_query = task_query.filter(FollowUpTask.due_at >= start_date)
    if end_date:
        task_query = task_query.filter(FollowUpTask.due_at <= end_date)
    tasks = task_query.all()

    # Pre-fetch documents
    all_doc_ids = [a.source_document_id for a in appts if a.source_document_id] + [
        t.source_document_id for t in tasks if t.source_document_id
    ]
    doc_map = {}
    if all_doc_ids:
        docs = db.query(Document.id, Document.filename).filter(Document.id.in_(all_doc_ids)).all()
        doc_map = {d.id: d.filename for d in docs}

    items: list[CareCalendarItem] = []

    for a in appts:
        loc_info = []
        if a.provider_name:
            loc_info.append(a.provider_name)
        if a.location:
            loc_info.append(a.location)
        items.append(
            CareCalendarItem(
                id=str(a.id),
                item_type="appointment",
                title=a.title,
                scheduled_or_due_at=a.scheduled_at,
                timezone=a.timezone,
                status=a.status,
                priority=None,
                provider_or_location=" • ".join(loc_info) if loc_info else None,
                description_or_notes=a.notes,
                appointment_id=None,
                source_document_id=str(a.source_document_id) if a.source_document_id else None,
                source_document_title=doc_map.get(a.source_document_id),
            )
        )

    for t in tasks:
        if t.due_at:
            items.append(
                CareCalendarItem(
                    id=str(t.id),
                    item_type="follow_up",
                    title=t.title,
                    scheduled_or_due_at=t.due_at,
                    timezone=None,
                    status=t.status,
                    priority=t.priority,
                    provider_or_location=None,
                    description_or_notes=t.description,
                    appointment_id=str(t.appointment_id) if t.appointment_id else None,
                    source_document_id=str(t.source_document_id) if t.source_document_id else None,
                    source_document_title=doc_map.get(t.source_document_id),
                )
            )

    # Sort items chronologically by timestamp
    items.sort(key=lambda x: x.scheduled_or_due_at)

    return CareCalendarResponse(
        start_date=start_date,
        end_date=end_date,
        items=items,
        total=len(items),
    )


# ---------------------------------------------------------------------------
# Care Overview Summary
# ---------------------------------------------------------------------------

def get_care_overview(
    db: Session,
    user: User,
    profile_id: uuid.UUID | None = None,
) -> CareOverviewResponse:
    now = datetime.now(timezone.utc)

    # Validate profile ownership before filtering
    _validate_profile_ownership(db, user, profile_id)

    # Active medications
    meds_query = db.query(MedicationRecord).filter(
        MedicationRecord.user_id == user.id,
        MedicationRecord.status == "active",
    )
    if profile_id is not None:
        meds_query = meds_query.filter(MedicationRecord.profile_id == profile_id)
    active_meds = meds_query.order_by(MedicationRecord.created_at.desc()).all()

    # Upcoming appointments (scheduled_at >= now and status == "scheduled")
    appt_base = db.query(AppointmentRecord).filter(
        AppointmentRecord.user_id == user.id,
        AppointmentRecord.scheduled_at >= now,
        AppointmentRecord.status == "scheduled",
    )
    if profile_id is not None:
        appt_base = appt_base.filter(AppointmentRecord.profile_id == profile_id)
    upcoming_appts = appt_base.order_by(AppointmentRecord.scheduled_at.asc()).limit(5).all()
    total_upcoming_appts = appt_base.count()

    # Pending follow-ups
    task_base = db.query(FollowUpTask).filter(
        FollowUpTask.user_id == user.id,
        FollowUpTask.status == "pending",
    )
    if profile_id is not None:
        task_base = task_base.filter(FollowUpTask.profile_id == profile_id)
    pending_tasks = task_base.order_by(FollowUpTask.due_at.asc().nulls_last()).limit(5).all()
    total_pending_tasks = task_base.count()

    overdue_base = db.query(FollowUpTask).filter(
        FollowUpTask.user_id == user.id,
        FollowUpTask.status == "pending",
        FollowUpTask.due_at < now,
    )
    if profile_id is not None:
        overdue_base = overdue_base.filter(FollowUpTask.profile_id == profile_id)
    total_overdue = overdue_base.count()

    return CareOverviewResponse(
        active_medications_count=len(active_meds),
        upcoming_appointments_count=total_upcoming_appts,
        pending_follow_ups_count=total_pending_tasks,
        overdue_follow_ups_count=total_overdue,
        upcoming_appointments=[AppointmentResponse.model_validate(a) for a in upcoming_appts],
        pending_tasks=[FollowUpTaskResponse.model_validate(t) for t in pending_tasks],
        active_medications=[MedicationResponse.model_validate(m) for m in active_meds],
    )
