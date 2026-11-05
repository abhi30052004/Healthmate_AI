"""Service logic for Smart Health Reminders and Notifications."""

import calendar
import logging
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.care import AppointmentRecord, FollowUpTask, MedicationRecord
from app.models.document import Document
from app.models.reminder import Reminder
from app.models.user import User
from app.schemas.reminder import (
    InAppNotificationItem,
    ReminderAcknowledgeResponse,
    ReminderCreate,
    ReminderProcessDueSummary,
    ReminderResponse,
    ReminderUpdate,
)
from app.services.notification_delivery import send_email_notification

logger = logging.getLogger(__name__)


def _compute_next_recurrence(current_due_utc: datetime, tz_name: str, frequency: str) -> datetime:
    """Calculate next occurrence in local timezone to properly handle daylight-saving transitions."""
    if current_due_utc.tzinfo is None:
        current_due_utc = current_due_utc.replace(tzinfo=timezone.utc)
    try:
        local_tz = ZoneInfo(tz_name)
    except (ZoneInfoNotFoundError, ValueError):
        local_tz = timezone.utc

    # Convert UTC timestamp to user's local timezone
    local_dt = current_due_utc.astimezone(local_tz)

    if frequency == "daily":
        next_local = local_dt + timedelta(days=1)
    elif frequency == "weekly":
        next_local = local_dt + timedelta(days=7)
    elif frequency == "monthly":
        year = local_dt.year
        month = local_dt.month + 1
        if month > 12:
            month = 1
            year += 1
        max_day = calendar.monthrange(year, month)[1]
        target_day = min(local_dt.day, max_day)
        next_local = local_dt.replace(year=year, month=month, day=target_day)
    else:
        # Default fallback
        next_local = local_dt + timedelta(days=1)

    return next_local.astimezone(timezone.utc)


def _validate_linked_ownership(
    db: Session,
    user: User,
    medication_id: uuid.UUID | None = None,
    appointment_id: uuid.UUID | None = None,
    task_id: uuid.UUID | None = None,
    document_id: uuid.UUID | None = None,
    profile_id: uuid.UUID | None = None,
) -> None:
    """Ensure all linked medical records and profile strictly belong to the authenticated user."""
    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        verify_profile_access(db, user, profile_id)
    if medication_id is not None:
        med = db.query(MedicationRecord).filter(
            MedicationRecord.id == medication_id,
            MedicationRecord.user_id == user.id,
        ).first()
        if not med:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Referenced medication record not found or does not belong to the authenticated user.",
            )

    if appointment_id is not None:
        appt = db.query(AppointmentRecord).filter(
            AppointmentRecord.id == appointment_id,
            AppointmentRecord.user_id == user.id,
        ).first()
        if not appt:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Referenced appointment record not found or does not belong to the authenticated user.",
            )

    if task_id is not None:
        task = db.query(FollowUpTask).filter(
            FollowUpTask.id == task_id,
            FollowUpTask.user_id == user.id,
        ).first()
        if not task:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Referenced follow-up task not found or does not belong to the authenticated user.",
            )

    if document_id is not None:
        doc = db.query(Document).filter(
            Document.id == document_id,
            Document.owner_id == user.id,
        ).first()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Referenced medical report document not found or does not belong to the authenticated user.",
            )


def _build_reminder_response(reminder: Reminder) -> ReminderResponse:
    """Build a ReminderResponse with linked title information if available."""
    linked_title = None
    if reminder.medication:
        linked_title = f"Medication: {reminder.medication.name}"
    elif reminder.appointment:
        linked_title = f"Appointment: {reminder.appointment.title}"
    elif reminder.task:
        linked_title = f"Follow-Up Task: {reminder.task.title}"
    elif reminder.document:
        linked_title = f"Report: {reminder.document.original_filename if hasattr(reminder.document, 'original_filename') else reminder.document.filename}"

    prof_name = None
    prof_rel = None
    if reminder.family_profile:
        prof_name = reminder.family_profile.name
        prof_rel = reminder.family_profile.relationship

    return ReminderResponse(
        id=reminder.id,
        user_id=reminder.user_id,
        title=reminder.title,
        description=reminder.description,
        category=reminder.category,  # type: ignore[arg-type]
        due_at=reminder.due_at,
        timezone=reminder.timezone,
        frequency=reminder.frequency,  # type: ignore[arg-type]
        send_email=reminder.send_email,
        is_enabled=reminder.is_enabled,
        medication_id=reminder.medication_id,
        appointment_id=reminder.appointment_id,
        task_id=reminder.task_id,
        document_id=reminder.document_id,
        profile_id=reminder.profile_id,
        profile_name=prof_name,
        profile_relationship=prof_rel,
        delivery_status=reminder.delivery_status,  # type: ignore[arg-type]
        delivered_at=reminder.delivered_at,
        delivery_error=reminder.delivery_error,
        is_acknowledged=reminder.is_acknowledged,
        acknowledged_at=reminder.acknowledged_at,
        is_dismissed=reminder.is_dismissed,
        dismissed_at=reminder.dismissed_at,
        created_at=reminder.created_at,
        updated_at=reminder.updated_at,
        linked_title=linked_title,
    )


def create_reminder(db: Session, user: User, payload: ReminderCreate) -> ReminderResponse:
    """Create a new smart reminder.
    
    Ensures:
    - User isolation and ownership of linked records.
    - Timestamp is normalized to UTC.
    - Preserves user's local timezone.
    - Safe non-prescriptive medication instruction checks.
    """
    _validate_linked_ownership(
        db,
        user,
        medication_id=payload.medication_id,
        appointment_id=payload.appointment_id,
        task_id=payload.task_id,
        document_id=payload.document_id,
        profile_id=payload.profile_id,
    )

    # Normalize due_at to UTC
    due_at_utc = payload.due_at
    if due_at_utc.tzinfo is None:
        # Interpret in payload.timezone
        try:
            tz = ZoneInfo(payload.timezone)
        except (ZoneInfoNotFoundError, ValueError):
            tz = timezone.utc
        due_at_utc = due_at_utc.replace(tzinfo=tz).astimezone(timezone.utc)
    else:
        due_at_utc = due_at_utc.astimezone(timezone.utc)

    reminder = Reminder(
        id=uuid.uuid4(),
        user_id=user.id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        category=payload.category,
        due_at=due_at_utc,
        timezone=payload.timezone.strip(),
        frequency=payload.frequency,
        send_email=payload.send_email,
        is_enabled=payload.is_enabled,
        medication_id=payload.medication_id,
        appointment_id=payload.appointment_id,
        task_id=payload.task_id,
        document_id=payload.document_id,
        profile_id=payload.profile_id,
        delivery_status="pending",
        is_acknowledged=False,
        is_dismissed=False,
    )

    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return _build_reminder_response(reminder)


def list_reminders(
    db: Session,
    user: User,
    category: str | None = None,
    delivery_status: str | None = None,
    is_enabled: bool | None = None,
    is_acknowledged: bool | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    profile_id: uuid.UUID | None = None,
) -> list[ReminderResponse]:
    """Retrieve user reminders with optional filters."""
    query = (
        db.query(Reminder)
        .options(
            joinedload(Reminder.medication),
            joinedload(Reminder.appointment),
            joinedload(Reminder.task),
            joinedload(Reminder.document),
            joinedload(Reminder.family_profile),
        )
        .filter(Reminder.user_id == user.id)
    )

    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        prof = verify_profile_access(db, user, profile_id)
        if prof and prof.is_primary:
            query = query.filter((Reminder.profile_id == profile_id) | (Reminder.profile_id.is_(None)))
        else:
            query = query.filter(Reminder.profile_id == profile_id)

    if category:
        query = query.filter(Reminder.category == category)
    if delivery_status:
        query = query.filter(Reminder.delivery_status == delivery_status)
    if is_enabled is not None:
        query = query.filter(Reminder.is_enabled == is_enabled)
    if is_acknowledged is not None:
        query = query.filter(Reminder.is_acknowledged == is_acknowledged)
    if from_date:
        query = query.filter(Reminder.due_at >= from_date)
    if to_date:
        query = query.filter(Reminder.due_at <= to_date)

    reminders = query.order_by(Reminder.due_at.asc()).all()
    return [_build_reminder_response(r) for r in reminders]


def get_reminder(db: Session, user: User, reminder_id: uuid.UUID) -> Reminder:
    """Retrieve a single reminder strictly verifying user ownership."""
    reminder = (
        db.query(Reminder)
        .options(
            joinedload(Reminder.medication),
            joinedload(Reminder.appointment),
            joinedload(Reminder.task),
            joinedload(Reminder.document),
        )
        .filter(Reminder.id == reminder_id, Reminder.user_id == user.id)
        .first()
    )
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found.",
        )
    return reminder


def update_reminder(
    db: Session,
    user: User,
    reminder_id: uuid.UUID,
    payload: ReminderUpdate,
) -> ReminderResponse:
    """Update a user's reminder while enforcing linked ownership."""
    reminder = get_reminder(db, user, reminder_id)

    # Validate updated linked IDs if provided
    _validate_linked_ownership(
        db,
        user,
        medication_id=payload.medication_id if payload.medication_id is not None else reminder.medication_id,
        appointment_id=payload.appointment_id if payload.appointment_id is not None else reminder.appointment_id,
        task_id=payload.task_id if payload.task_id is not None else reminder.task_id,
        document_id=payload.document_id if payload.document_id is not None else reminder.document_id,
        profile_id=payload.profile_id if payload.profile_id is not None else reminder.profile_id,
    )

    if payload.title is not None:
        reminder.title = payload.title.strip()
    if payload.description is not None:
        reminder.description = payload.description.strip() if payload.description else None
    if payload.category is not None:
        reminder.category = payload.category
    if payload.timezone is not None:
        reminder.timezone = payload.timezone.strip()
    if payload.due_at is not None:
        due_utc = payload.due_at
        if due_utc.tzinfo is None:
            try:
                tz = ZoneInfo(reminder.timezone)
            except (ZoneInfoNotFoundError, ValueError):
                tz = timezone.utc
            due_utc = due_utc.replace(tzinfo=tz).astimezone(timezone.utc)
        else:
            due_utc = due_utc.astimezone(timezone.utc)
        reminder.due_at = due_utc
        # If rescheduled into future, reset delivery status
        if due_utc > datetime.now(timezone.utc):
            reminder.delivery_status = "pending"
            reminder.delivery_error = None
    if payload.frequency is not None:
        reminder.frequency = payload.frequency
    if payload.send_email is not None:
        reminder.send_email = payload.send_email
    if payload.is_enabled is not None:
        reminder.is_enabled = payload.is_enabled
    if payload.medication_id is not None:
        reminder.medication_id = payload.medication_id
    if payload.appointment_id is not None:
        reminder.appointment_id = payload.appointment_id
    if payload.task_id is not None:
        reminder.task_id = payload.task_id
    if payload.document_id is not None:
        reminder.document_id = payload.document_id
    if payload.profile_id is not None:
        reminder.profile_id = payload.profile_id

    db.commit()
    db.refresh(reminder)
    return _build_reminder_response(reminder)


def delete_reminder(db: Session, user: User, reminder_id: uuid.UUID) -> dict:
    """Delete a reminder without modifying or deleting any associated clinical records."""
    reminder = get_reminder(db, user, reminder_id)
    db.delete(reminder)
    db.commit()
    return {"message": "Reminder cancelled successfully. Associated medical records remain untouched."}


def acknowledge_reminder(
    db: Session,
    user: User,
    reminder_id: uuid.UUID,
) -> ReminderAcknowledgeResponse:
    """Record that the user acknowledged the notification.
    
    Safety rule:
    Does NOT mark any medication as taken.
    Does NOT alter medication schedules.
    """
    reminder = get_reminder(db, user, reminder_id)
    now_utc = datetime.now(timezone.utc)

    reminder.is_acknowledged = True
    reminder.acknowledged_at = now_utc
    db.commit()

    return ReminderAcknowledgeResponse(
        reminder_id=reminder.id,
        is_acknowledged=True,
        acknowledged_at=now_utc,
        message=(
            "Notification acknowledged. Note: this records notification receipt only "
            "and does not verify medication administration or clinical compliance."
        ),
    )


def dismiss_reminder(
    db: Session,
    user: User,
    reminder_id: uuid.UUID,
) -> ReminderResponse:
    """Dismiss a reminder notification from the active notification view without deleting records."""
    reminder = get_reminder(db, user, reminder_id)
    now_utc = datetime.now(timezone.utc)

    reminder.is_dismissed = True
    reminder.dismissed_at = now_utc
    db.commit()
    db.refresh(reminder)
    return _build_reminder_response(reminder)


def list_in_app_notifications(
    db: Session,
    user: User,
    unacknowledged_only: bool = False,
    limit: int = 50,
) -> list[InAppNotificationItem]:
    """Retrieve notifications intended for the in-app notification center."""
    now_utc = datetime.now(timezone.utc)

    query = (
        db.query(Reminder)
        .filter(
            Reminder.user_id == user.id,
            Reminder.is_enabled == True,
            Reminder.is_dismissed == False,
            or_(
                Reminder.delivery_status == "delivered",
                Reminder.due_at <= now_utc,
            ),
        )
    )

    if unacknowledged_only:
        query = query.filter(Reminder.is_acknowledged == False)

    reminders = query.order_by(Reminder.due_at.desc()).limit(limit).all()

    items = []
    for r in reminders:
        r_due = r.due_at if r.due_at.tzinfo is not None else r.due_at.replace(tzinfo=timezone.utc)
        is_overdue = r_due < now_utc and not r.is_acknowledged
        email_status = None
        if r.send_email:
            email_status = r.delivery_error or "Attempted"

        items.append(
            InAppNotificationItem(
                reminder_id=r.id,
                title=r.title,
                description=r.description,
                category=r.category,  # type: ignore[arg-type]
                due_at=r.due_at,
                timezone=r.timezone,
                delivery_status=r.delivery_status,  # type: ignore[arg-type]
                delivered_at=r.delivered_at,
                is_acknowledged=r.is_acknowledged,
                is_overdue=is_overdue,
                delivery_channel="in_app",
                email_delivery_status=email_status,
                profile_id=r.profile_id,
                profile_name=r.family_profile.name if r.family_profile else None,
            )
        )
    return items


def process_due_reminders(
    db: Session,
    user: User | None = None,
) -> ReminderProcessDueSummary:
    """Process pending reminders whose due_at timestamp is <= current UTC time.
    
    Safe concurrency & deduplication:
    - Queries only `delivery_status == 'pending'` and `is_enabled == True`.
    - If running on PostgreSQL, utilizes row-level locking (`with_for_update(skip_locked=True)`)
      to guarantee multi-worker and multi-instance deduplication without race conditions.
    - Transitions `delivery_status` to `'delivered'` (or `'failed'`) immediately.
    - For recurring schedules, spawns the next occurrence clean and preserves current history.
    """
    now_utc = datetime.now(timezone.utc)

    query = (
        db.query(Reminder)
        .options(joinedload(Reminder.user))
        .filter(
            Reminder.delivery_status == "pending",
            Reminder.is_enabled == True,
            Reminder.due_at <= now_utc,
        )
    )

    if user is not None:
        query = query.filter(Reminder.user_id == user.id)

    # Use row-level lock with skip_locked where supported (e.g. Postgres)
    try:
        bind = db.get_bind()
        if bind.dialect.name == "postgresql":
            query = query.with_for_update(skip_locked=True)
    except Exception as exc:
        logger.debug("Row-level lock skip_locked not applicable: %s", exc)

    due_list = query.all()

    processed_count = 0
    delivered_in_app = 0
    emails_sent = 0
    emails_skipped = 0
    errors: list[str] = []

    for reminder in due_list:
        try:
            # 1. Deliver In-App (always succeeds)
            reminder.delivered_at = now_utc
            reminder.delivery_status = "delivered"
            delivered_in_app += 1

            # 2. Deliver Email if requested
            if reminder.send_email and reminder.user:
                email_result = send_email_notification(
                    to_email=reminder.user.email,
                    subject=f"HealthMate Reminder: {reminder.title}",
                    body_text=(
                        f"Reminder: {reminder.title}\n"
                        f"Category: {reminder.category.capitalize()}\n"
                        f"Scheduled For: {reminder.due_at.strftime('%Y-%m-%d %H:%M UTC')}\n"
                        f"Notes: {reminder.description or 'None'}"
                    ),
                    user_is_verified=getattr(reminder.user, "is_verified", True),
                )
                if email_result["status"] == "sent":
                    emails_sent += 1
                else:
                    emails_skipped += 1
                    reminder.delivery_error = email_result["error"]
            else:
                reminder.delivery_error = None

            # 3. Handle Recurrence: if recurring, schedule the subsequent occurrence
            if reminder.frequency in ("daily", "weekly", "monthly"):
                next_due = _compute_next_recurrence(
                    reminder.due_at,
                    reminder.timezone,
                    reminder.frequency,
                )
                next_reminder = Reminder(
                    id=uuid.uuid4(),
                    user_id=reminder.user_id,
                    title=reminder.title,
                    description=reminder.description,
                    category=reminder.category,
                    due_at=next_due,
                    timezone=reminder.timezone,
                    frequency=reminder.frequency,
                    send_email=reminder.send_email,
                    is_enabled=reminder.is_enabled,
                    medication_id=reminder.medication_id,
                    appointment_id=reminder.appointment_id,
                    task_id=reminder.task_id,
                    document_id=reminder.document_id,
                    profile_id=reminder.profile_id,
                    delivery_status="pending",
                    is_acknowledged=False,
                    is_dismissed=False,
                )
                db.add(next_reminder)

            processed_count += 1
            db.commit()
        except Exception as exc:
            db.rollback()
            err_msg = f"Failed processing reminder {reminder.id}: {str(exc)}"
            logger.error(err_msg)
            errors.append(err_msg)

    return ReminderProcessDueSummary(
        processed_count=processed_count,
        delivered_in_app=delivered_in_app,
        emails_sent=emails_sent,
        emails_skipped=emails_skipped,
        errors=errors,
    )
