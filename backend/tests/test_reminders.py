"""Unit and integration tests for Feature 2: Smart Health Reminders and Notifications."""

import tempfile
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.main import app
from app.models.care import AppointmentRecord, FollowUpTask, MedicationRecord
from app.models.reminder import Reminder
from app.models.user import User
from app.services.notification_delivery import send_email_notification


@pytest.fixture(name="db_session")
def fixture_db_session(monkeypatch):
    temp_dir = tempfile.mkdtemp(prefix="healthmate_reminder_tests_")
    monkeypatch.setenv("DOCUMENT_STORAGE_DIR", temp_dir)
    get_settings.cache_clear()

    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(test_engine)
    testing_session_factory = sessionmaker(
        bind=test_engine,
        autoflush=False,
        expire_on_commit=False,
    )
    session = testing_session_factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(test_engine)


@pytest.fixture(name="client")
def fixture_client(db_session: Session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(name="auth_headers")
def fixture_auth_headers(db_session: Session):
    user = User(
        id=uuid.uuid4(),
        email="patient_a@example.com",
        hashed_password=hash_password("PatientSecret123!"),
        name="Alice Patient",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token(str(user.id))
    return {"Authorization": f"Bearer {token}"}, user


@pytest.fixture(name="other_user_auth_headers")
def fixture_other_user_auth_headers(db_session: Session):
    user_b = User(
        id=uuid.uuid4(),
        email="patient_b@example.com",
        hashed_password=hash_password("PatientSecret456!"),
        name="Bob Patient",
        is_active=True,
    )
    db_session.add(user_b)
    db_session.commit()
    token = create_access_token(str(user_b.id))
    return {"Authorization": f"Bearer {token}"}, user_b


def test_create_and_get_reminder(client: TestClient, auth_headers):
    headers, user = auth_headers
    due = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    payload = {
        "title": "Take Morning Metformin",
        "description": "500mg with breakfast",
        "category": "medication",
        "due_at": due,
        "timezone": "America/New_York",
        "frequency": "daily",
        "send_email": False,
        "is_enabled": True,
    }

    res = client.post("/api/reminders", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Take Morning Metformin"
    assert data["category"] == "medication"
    assert data["delivery_status"] == "pending"
    assert data["is_acknowledged"] is False
    assert "clinical_disclaimer" in data

    # Retrieve by ID
    get_res = client.get(f"/api/reminders/{data['id']}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Take Morning Metformin"


def test_update_and_disable_and_cancel_reminder(client: TestClient, auth_headers):
    headers, user = auth_headers
    due = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    create_res = client.post(
        "/api/reminders",
        json={
            "title": "Cardiology Followup",
            "category": "appointment",
            "due_at": due,
            "timezone": "UTC",
            "frequency": "once",
            "is_enabled": True,
        },
        headers=headers,
    )
    rem_id = create_res.json()["id"]

    # Update title and disable
    patch_res = client.patch(
        f"/api/reminders/{rem_id}",
        json={"title": "Updated Cardiology Followup", "is_enabled": False},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Updated Cardiology Followup"
    assert patch_res.json()["is_enabled"] is False

    # Cancel (delete) reminder
    del_res = client.delete(f"/api/reminders/{rem_id}", headers=headers)
    assert del_res.status_code == 200
    assert "associated medical records remain untouched" in del_res.json()["message"].lower()

    # Verify 404 after cancellation
    get_res = client.get(f"/api/reminders/{rem_id}", headers=headers)
    assert get_res.status_code == 404


def test_user_isolation_and_cross_user_linked_ownership(
    client: TestClient,
    auth_headers,
    other_user_auth_headers,
    db_session: Session,
):
    headers_a, user_a = auth_headers
    headers_b, user_b = other_user_auth_headers

    # User B owns a medication record
    med_b = MedicationRecord(
        id=uuid.uuid4(),
        user_id=user_b.id,
        name="Lisinopril",
        strength="10mg",
        status="active",
    )
    db_session.add(med_b)
    db_session.commit()

    # User A attempts to link User B's medication -> must fail with 403 Forbidden
    due = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    res = client.post(
        "/api/reminders",
        json={
            "title": "Illicit link to Bob's medication",
            "category": "medication",
            "due_at": due,
            "timezone": "UTC",
            "medication_id": str(med_b.id),
        },
        headers=headers_a,
    )
    assert res.status_code == 403
    assert "does not belong" in res.json()["detail"]


def test_acknowledgement_safety_does_not_mark_medication_as_taken(
    client: TestClient,
    auth_headers,
    db_session: Session,
):
    headers, user = auth_headers

    # Create user-owned medication
    med = MedicationRecord(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Metformin",
        strength="500mg",
        status="active",
        dosage_instructions="Take 1 tablet daily with dinner",
    )
    db_session.add(med)
    db_session.commit()

    # Create reminder linked to medication
    due = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()  # past due
    res = client.post(
        "/api/reminders",
        json={
            "title": "Evening Metformin",
            "category": "medication",
            "due_at": due,
            "timezone": "UTC",
            "medication_id": str(med.id),
        },
        headers=headers,
    )
    rem_id = res.json()["id"]

    # Acknowledge the reminder
    ack_res = client.post(f"/api/reminders/{rem_id}/acknowledge", headers=headers)
    assert ack_res.status_code == 200
    ack_data = ack_res.json()
    assert ack_data["is_acknowledged"] is True
    assert "does not verify medication administration" in ack_data["message"]

    # Crucial Clinical Safety Verification:
    # Ensure medication record in database was NOT altered or marked taken
    db_session.refresh(med)
    assert med.status == "active"
    assert med.dosage_instructions == "Take 1 tablet daily with dinner"


def test_process_due_reminders_and_duplicate_protection(
    client: TestClient,
    auth_headers,
    db_session: Session,
):
    headers, user = auth_headers

    # Create a due reminder in the past
    past_due = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    create_res = client.post(
        "/api/reminders",
        json={
            "title": "Due Follow-Up Task Reminder",
            "category": "follow_up",
            "due_at": past_due,
            "timezone": "UTC",
            "frequency": "once",
            "send_email": True,  # requested email
        },
        headers=headers,
    )
    rem_id = create_res.json()["id"]

    # Run process-due
    proc_res = client.post("/api/reminders/process-due", headers=headers)
    assert proc_res.status_code == 200
    summary = proc_res.json()
    assert summary["processed_count"] == 1
    assert summary["delivered_in_app"] == 1
    # Since SMTP host is unconfigured, email is safely skipped without throwing an error
    assert summary["emails_skipped"] == 1

    # Verify reminder delivery status transitioned to delivered
    rem_check = client.get(f"/api/reminders/{rem_id}", headers=headers).json()
    assert rem_check["delivery_status"] == "delivered"
    assert rem_check["delivered_at"] is not None
    assert "SMTP" in rem_check["delivery_error"]  # helpful error message recorded

    # Run process-due AGAIN immediately -> must NOT process again (duplicate delivery protection)
    proc_res_second = client.post("/api/reminders/process-due", headers=headers)
    assert proc_res_second.status_code == 200
    assert proc_res_second.json()["processed_count"] == 0


def test_in_app_notifications_list_and_dismiss(client: TestClient, auth_headers):
    headers, user = auth_headers

    # Create reminder
    past_due = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    create_res = client.post(
        "/api/reminders",
        json={
            "title": "Review Blood Test Results",
            "category": "report_review",
            "due_at": past_due,
            "timezone": "UTC",
        },
        headers=headers,
    )
    rem_id = create_res.json()["id"]

    # Check in-app notifications
    notif_res = client.get("/api/reminders/notifications/in-app", headers=headers)
    assert notif_res.status_code == 200
    items = notif_res.json()
    assert any(item["reminder_id"] == rem_id for item in items)

    # Dismiss notification
    dismiss_res = client.post(f"/api/reminders/{rem_id}/dismiss", headers=headers)
    assert dismiss_res.status_code == 200
    assert dismiss_res.json()["is_dismissed"] is True

    # Check that dismissed notification is no longer in active notifications list
    notif_res_after = client.get("/api/reminders/notifications/in-app", headers=headers)
    assert not any(item["reminder_id"] == rem_id for item in notif_res_after.json())


def test_unconfigured_smtp_fallback():
    # Directly test notification delivery service with unconfigured SMTP
    result = send_email_notification(
        to_email="test@example.com",
        subject="Test Reminder",
        body_text="Test content",
        user_is_verified=True,
    )
    assert result["status"] == "skipped_unconfigured"
    assert "SMTP server host is not configured" in result["error"]


def test_recurrence_dst_handling():
    from zoneinfo import ZoneInfo
    from app.services.reminder import _compute_next_recurrence

    # Nov 1, 2026 is before US DST switch (EDT, UTC-4), Nov 2 is after or near DST shift
    # US clocks 'fall back' on Nov 1, 2026 2:00 AM EDT -> 1:00 AM EST (UTC-5)
    # A daily reminder at 08:00 AM New York time on Oct 31 is 12:00 UTC
    dt_ny = datetime(2026, 10, 31, 8, 0, tzinfo=ZoneInfo("America/New_York"))
    dt_utc = dt_ny.astimezone(timezone.utc)

    next_utc = _compute_next_recurrence(dt_utc, "America/New_York", "daily")
    # Verify local time in New York remains exactly 8:00 AM
    next_ny = next_utc.astimezone(ZoneInfo("America/New_York"))
    assert next_ny.hour == 8
    assert next_ny.minute == 0
    assert next_ny.day == 1
    assert next_ny.month == 11

