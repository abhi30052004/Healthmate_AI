"""API routes for Smart Health Reminders and Notifications."""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.reminder import (
    InAppNotificationItem,
    ReminderAcknowledgeResponse,
    ReminderCreate,
    ReminderProcessDueSummary,
    ReminderResponse,
    ReminderUpdate,
)
from app.services.reminder import (
    acknowledge_reminder,
    create_reminder,
    delete_reminder,
    dismiss_reminder,
    get_reminder,
    list_in_app_notifications,
    list_reminders,
    process_due_reminders,
    update_reminder,
)

router = APIRouter(prefix="/reminders", tags=["Smart Health Reminders"])


@router.post(
    "",
    response_model=ReminderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new smart health reminder",
)
def create_new_reminder(
    payload: ReminderCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ReminderResponse:
    """Create a new smart reminder tied to medication, appointment, follow-up task, or report review."""
    return create_reminder(db, current_user, payload)


@router.get(
    "",
    response_model=list[ReminderResponse],
    status_code=status.HTTP_200_OK,
    summary="List reminders with status and date filters",
)
def get_user_reminders(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    category: str | None = Query(None, description="Filter by category"),
    delivery_status: str | None = Query(None, description="Filter by delivery status"),
    is_enabled: bool | None = Query(None, description="Filter by enabled state"),
    is_acknowledged: bool | None = Query(None, description="Filter by acknowledgement state"),
    from_date: datetime | None = Query(None, description="Filter due_at >= from_date"),
    to_date: datetime | None = Query(None, description="Filter due_at <= to_date"),
    profile_id: uuid.UUID | None = Query(None, description="Filter by family profile ID"),
) -> list[ReminderResponse]:
    """Retrieve all reminders configured by the authenticated user."""
    return list_reminders(
        db,
        current_user,
        category=category,
        delivery_status=delivery_status,
        is_enabled=is_enabled,
        is_acknowledged=is_acknowledged,
        from_date=from_date,
        to_date=to_date,
        profile_id=profile_id,
    )


@router.get(
    "/notifications/in-app",
    response_model=list[InAppNotificationItem],
    status_code=status.HTTP_200_OK,
    summary="List in-app notifications",
)
def get_in_app_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    unacknowledged_only: bool = Query(False, description="Filter only unacknowledged notifications"),
    limit: int = Query(50, ge=1, le=100, description="Max notifications to retrieve"),
) -> list[InAppNotificationItem]:
    """Fetch active notifications for in-app display banner and history center."""
    return list_in_app_notifications(
        db,
        current_user,
        unacknowledged_only=unacknowledged_only,
        limit=limit,
    )


@router.post(
    "/process-due",
    response_model=ReminderProcessDueSummary,
    status_code=status.HTTP_200_OK,
    summary="Process due reminders and trigger in-app/email deliveries",
)
def trigger_process_due_reminders(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ReminderProcessDueSummary:
    """Safely transitions due reminders from pending to delivered and attempts email notification if requested."""
    return process_due_reminders(db, user=current_user)


@router.get(
    "/{reminder_id}",
    response_model=ReminderResponse,
    status_code=status.HTTP_200_OK,
    summary="Get reminder details",
)
def get_single_reminder(
    reminder_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ReminderResponse:
    reminder = get_reminder(db, current_user, reminder_id)
    from app.services.reminder import _build_reminder_response
    return _build_reminder_response(reminder)


@router.patch(
    "/{reminder_id}",
    response_model=ReminderResponse,
    status_code=status.HTTP_200_OK,
    summary="Update or toggle reminder configuration",
)
def update_existing_reminder(
    reminder_id: uuid.UUID,
    payload: ReminderUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ReminderResponse:
    """Update title, schedule, frequency, or enabled state of a reminder."""
    return update_reminder(db, current_user, reminder_id, payload)


@router.delete(
    "/{reminder_id}",
    status_code=status.HTTP_200_OK,
    summary="Cancel a reminder",
)
def cancel_existing_reminder(
    reminder_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Cancel and delete a reminder. Clinical records remain unmodified."""
    return delete_reminder(db, current_user, reminder_id)


@router.post(
    "/{reminder_id}/acknowledge",
    response_model=ReminderAcknowledgeResponse,
    status_code=status.HTTP_200_OK,
    summary="Acknowledge reminder notification receipt",
)
def acknowledge_user_reminder(
    reminder_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ReminderAcknowledgeResponse:
    """Record receipt of a notification. Does NOT confirm medication intake or clinical administration."""
    return acknowledge_reminder(db, current_user, reminder_id)


@router.post(
    "/{reminder_id}/dismiss",
    response_model=ReminderResponse,
    status_code=status.HTTP_200_OK,
    summary="Dismiss notification from active list",
)
def dismiss_user_reminder(
    reminder_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ReminderResponse:
    """Dismiss notification from active view without altering clinical records."""
    return dismiss_reminder(db, current_user, reminder_id)
