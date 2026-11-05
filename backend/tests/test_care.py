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
from app.models.document import Document
from app.models.user import User


@pytest.fixture(name="db_session")
def fixture_db_session(monkeypatch):
    temp_dir = tempfile.mkdtemp(prefix="healthmate_care_tests_")
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


@pytest.fixture(name="users")
def fixture_users(db_session: Session):
    user_a = User(
        id=uuid.uuid4(),
        email="patient_a@healthmate.ai",
        name="Patient Alpha",
        hashed_password=hash_password("PatientAlphaPass123!"),
        is_active=True,
    )
    user_b = User(
        id=uuid.uuid4(),
        email="patient_b@healthmate.ai",
        name="Patient Beta",
        hashed_password=hash_password("PatientBetaPass123!"),
        is_active=True,
    )
    db_session.add(user_a)
    db_session.add(user_b)
    db_session.commit()
    db_session.refresh(user_a)
    db_session.refresh(user_b)
    return user_a, user_b


@pytest.fixture(name="auth_headers")
def fixture_auth_headers(users):
    user_a, user_b = users
    token_a = create_access_token(subject=str(user_a.id))
    token_b = create_access_token(subject=str(user_b.id))
    return {
        "user_a": {"Authorization": f"Bearer {token_a}"},
        "user_b": {"Authorization": f"Bearer {token_b}"},
    }


def _seed_document(db: Session, owner_id: uuid.UUID, filename: str) -> Document:
    doc = Document(
        id=uuid.uuid4(),
        owner_id=owner_id,
        filename=filename,
        storage_key=f"uploads/{uuid.uuid4()}_{filename}",
        mime_type="application/pdf",
        file_size=1024,
        checksum_sha256="abc123hash",
        processing_status="extracted",
        is_verified=True,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


# ---------------------------------------------------------------------------
# Test 1: Unauthenticated Requests are Rejected
# ---------------------------------------------------------------------------

def test_unauthenticated_requests_rejected(client: TestClient):
    endpoints = [
        ("GET", "/api/care/medications"),
        ("POST", "/api/care/medications"),
        ("GET", "/api/care/appointments"),
        ("POST", "/api/care/appointments"),
        ("GET", "/api/care/follow-ups"),
        ("POST", "/api/care/follow-ups"),
        ("GET", "/api/care/calendar"),
        ("GET", "/api/care/overview"),
    ]
    for method, path in endpoints:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.post(path, json={})
        assert res.status_code == 401, f"{method} {path} should require authentication"


# ---------------------------------------------------------------------------
# Test 2: Medication CRUD & Exact Instructions Retention
# ---------------------------------------------------------------------------

def test_medication_crud_and_exact_instructions_retention(
    client: TestClient, auth_headers, db_session: Session, users
):
    user_a, _ = users
    doc = _seed_document(db_session, user_a.id, "prescription_discharge.pdf")

    exact_instructions = "Take 1 tablet (500mg) by mouth twice daily with breakfast and dinner. Do not crush."

    payload = {
        "name": "Metformin Hydrochloride",
        "medication_type": "Prescription",
        "strength": "500 mg",
        "dosage_instructions": exact_instructions,
        "route": "Oral",
        "frequency": "Twice daily with meals",
        "start_date": "2025-02-01",
        "end_date": "2025-08-01",
        "prescriber": "Dr. Sarah Jenkins",
        "pharmacy": "CVS Pharmacy #4102",
        "notes": "Monitor gastrointestinal tolerance.",
        "source_document_id": str(doc.id),
        "status": "active",
    }

    # Create
    create_res = client.post("/api/care/medications", json=payload, headers=auth_headers["user_a"])
    assert create_res.status_code == 201
    created_med = create_res.json()
    med_id = created_med["id"]
    assert created_med["name"] == "Metformin Hydrochloride"
    assert created_med["dosage_instructions"] == exact_instructions
    assert created_med["source_document_title"] == "prescription_discharge.pdf"
    assert created_med["status"] == "active"

    # Read Single
    get_res = client.get(f"/api/care/medications/{med_id}", headers=auth_headers["user_a"])
    assert get_res.status_code == 200
    assert get_res.json()["dosage_instructions"] == exact_instructions

    # List & Search
    list_res = client.get("/api/care/medications?search=Metformin", headers=auth_headers["user_a"])
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Update (Pause medication)
    patch_res = client.patch(
        f"/api/care/medications/{med_id}",
        json={"status": "paused", "notes": "Temporarily paused for lab fasting test."},
        headers=auth_headers["user_a"],
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "paused"
    assert patch_res.json()["notes"] == "Temporarily paused for lab fasting test."

    # Delete
    del_res = client.delete(f"/api/care/medications/{med_id}", headers=auth_headers["user_a"])
    assert del_res.status_code == 204

    # Confirm deleted
    get_again = client.get(f"/api/care/medications/{med_id}", headers=auth_headers["user_a"])
    assert get_again.status_code == 404


# ---------------------------------------------------------------------------
# Test 3: Cross-User Medication Isolation
# ---------------------------------------------------------------------------

def test_cross_user_medication_isolation(client: TestClient, auth_headers):
    # User A creates a medication
    create_res = client.post(
        "/api/care/medications",
        json={"name": "Lisinopril", "strength": "10 mg", "status": "active"},
        headers=auth_headers["user_a"],
    )
    assert create_res.status_code == 201
    med_id = create_res.json()["id"]

    # User B cannot read User A's medication
    get_res = client.get(f"/api/care/medications/{med_id}", headers=auth_headers["user_b"])
    assert get_res.status_code == 404

    # User B cannot update User A's medication
    patch_res = client.patch(
        f"/api/care/medications/{med_id}",
        json={"name": "Hacked Name"},
        headers=auth_headers["user_b"],
    )
    assert patch_res.status_code == 404

    # User B cannot delete User A's medication
    del_res = client.delete(f"/api/care/medications/{med_id}", headers=auth_headers["user_b"])
    assert del_res.status_code == 404

    # User B's list does not show User A's medication
    list_res = client.get("/api/care/medications", headers=auth_headers["user_b"])
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0


# ---------------------------------------------------------------------------
# Test 4: Cross-User Document Linking is Rejected
# ---------------------------------------------------------------------------

def test_cross_user_document_link_rejected(
    client: TestClient, auth_headers, db_session: Session, users
):
    user_a, _ = users
    # Document belongs to User A
    doc_a = _seed_document(db_session, user_a.id, "confidential_a.pdf")

    # User B tries to link User A's document to a medication
    med_res = client.post(
        "/api/care/medications",
        json={"name": "Aspirin", "source_document_id": str(doc_a.id)},
        headers=auth_headers["user_b"],
    )
    assert med_res.status_code == 400
    assert "does not belong" in med_res.json()["detail"].lower()

    # User B tries to link User A's document to an appointment
    now_str = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    appt_res = client.post(
        "/api/care/appointments",
        json={"title": "Checkup", "scheduled_at": now_str, "source_document_id": str(doc_a.id)},
        headers=auth_headers["user_b"],
    )
    assert appt_res.status_code == 400

    # User B tries to link User A's document to a follow-up task
    task_res = client.post(
        "/api/care/follow-ups",
        json={"title": "Follow up call", "source_document_id": str(doc_a.id)},
        headers=auth_headers["user_b"],
    )
    assert task_res.status_code == 400


# ---------------------------------------------------------------------------
# Test 5: Appointment CRUD & Status Transitions
# ---------------------------------------------------------------------------

def test_appointment_crud_and_status_transitions(client: TestClient, auth_headers):
    scheduled_time = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()

    payload = {
        "title": "Annual Comprehensive Cardiology Evaluation",
        "appointment_type": "Consultation",
        "provider_name": "Dr. Marcus Vance, MD",
        "location": "Suite 405, Heart Institute, Metro Hospital",
        "scheduled_at": scheduled_time,
        "timezone": "America/New_York",
        "status": "scheduled",
        "notes": "Bring previous echocardiogram and list of current supplements.",
    }

    # Create
    create_res = client.post("/api/care/appointments", json=payload, headers=auth_headers["user_a"])
    assert create_res.status_code == 201
    appt = create_res.json()
    appt_id = appt["id"]
    assert appt["title"] == payload["title"]
    assert appt["status"] == "scheduled"
    assert appt["follow_up_tasks_count"] == 0

    # Read Single
    get_res = client.get(f"/api/care/appointments/{appt_id}", headers=auth_headers["user_a"])
    assert get_res.status_code == 200
    assert get_res.json()["provider_name"] == "Dr. Marcus Vance, MD"

    # Status transition to rescheduled
    resched_time = (datetime.now(timezone.utc) + timedelta(days=12)).isoformat()
    patch_res = client.patch(
        f"/api/care/appointments/{appt_id}",
        json={"status": "rescheduled", "scheduled_at": resched_time},
        headers=auth_headers["user_a"],
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "rescheduled"

    # Status transition to completed
    complete_res = client.patch(
        f"/api/care/appointments/{appt_id}",
        json={"status": "completed"},
        headers=auth_headers["user_a"],
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"

    # Delete
    del_res = client.delete(f"/api/care/appointments/{appt_id}", headers=auth_headers["user_a"])
    assert del_res.status_code == 204

    # Confirm 404
    assert client.get(f"/api/care/appointments/{appt_id}", headers=auth_headers["user_a"]).status_code == 404


# ---------------------------------------------------------------------------
# Test 6: Cross-User Appointment Isolation
# ---------------------------------------------------------------------------

def test_cross_user_appointment_isolation(client: TestClient, auth_headers):
    time_str = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    res = client.post(
        "/api/care/appointments",
        json={"title": "Private Consultation", "scheduled_at": time_str},
        headers=auth_headers["user_a"],
    )
    appt_id = res.json()["id"]

    assert client.get(f"/api/care/appointments/{appt_id}", headers=auth_headers["user_b"]).status_code == 404
    assert client.patch(f"/api/care/appointments/{appt_id}", json={"title": "Hacked"}, headers=auth_headers["user_b"]).status_code == 404
    assert client.delete(f"/api/care/appointments/{appt_id}", headers=auth_headers["user_b"]).status_code == 404


# ---------------------------------------------------------------------------
# Test 7: Follow-Up Task CRUD, Priority, & Appointment Link
# ---------------------------------------------------------------------------

def test_follow_up_task_crud_priority_and_appointment_link(client: TestClient, auth_headers):
    # Create appointment first
    appt_time = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    appt_res = client.post(
        "/api/care/appointments",
        json={"title": "Endocrine Follow-Up", "scheduled_at": appt_time},
        headers=auth_headers["user_a"],
    )
    appt_id = appt_res.json()["id"]

    # Create task linked to appointment
    due_time = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    task_payload = {
        "title": "Complete 12-hour fasting lipid panel and HbA1c blood draw",
        "description": "Have blood drawn at Quest Diagnostics at least 2 days prior to appointment.",
        "due_at": due_time,
        "priority": "high",
        "appointment_id": appt_id,
        "status": "pending",
    }

    create_res = client.post("/api/care/follow-ups", json=task_payload, headers=auth_headers["user_a"])
    assert create_res.status_code == 201
    task = create_res.json()
    task_id = task["id"]
    assert task["title"] == task_payload["title"]
    assert task["priority"] == "high"
    assert task["appointment_title"] == "Endocrine Follow-Up"
    assert task["is_overdue"] is False

    # List tasks by appointment_id
    list_res = client.get(f"/api/care/follow-ups?appointment_id={appt_id}", headers=auth_headers["user_a"])
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Mark complete
    patch_res = client.patch(
        f"/api/care/follow-ups/{task_id}",
        json={"status": "completed"},
        headers=auth_headers["user_a"],
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "completed"

    # Mark dismissed
    patch_dismiss = client.patch(
        f"/api/care/follow-ups/{task_id}",
        json={"status": "dismissed"},
        headers=auth_headers["user_a"],
    )
    assert patch_dismiss.status_code == 200
    assert patch_dismiss.json()["status"] == "dismissed"

    # Delete
    del_res = client.delete(f"/api/care/follow-ups/{task_id}", headers=auth_headers["user_a"])
    assert del_res.status_code == 204


# ---------------------------------------------------------------------------
# Test 8: Cross-User Appointment Link in Follow-Up is Rejected
# ---------------------------------------------------------------------------

def test_cross_user_appointment_link_in_follow_up_rejected(client: TestClient, auth_headers):
    # User A creates appointment
    appt_res = client.post(
        "/api/care/appointments",
        json={"title": "User A Private Appt", "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=4)).isoformat()},
        headers=auth_headers["user_a"],
    )
    appt_a_id = appt_res.json()["id"]

    # User B attempts to attach User A's appointment_id to their own task
    task_res = client.post(
        "/api/care/follow-ups",
        json={"title": "Unauthorized linked task", "appointment_id": appt_a_id},
        headers=auth_headers["user_b"],
    )
    assert task_res.status_code == 400
    assert "does not belong" in task_res.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 9: Cross-User Follow-Up Isolation
# ---------------------------------------------------------------------------

def test_cross_user_follow_up_isolation(client: TestClient, auth_headers):
    res = client.post(
        "/api/care/follow-ups",
        json={"title": "Private task", "priority": "low"},
        headers=auth_headers["user_a"],
    )
    task_id = res.json()["id"]

    assert client.get(f"/api/care/follow-ups/{task_id}", headers=auth_headers["user_b"]).status_code == 404
    assert client.patch(f"/api/care/follow-ups/{task_id}", json={"status": "completed"}, headers=auth_headers["user_b"]).status_code == 404
    assert client.delete(f"/api/care/follow-ups/{task_id}", headers=auth_headers["user_b"]).status_code == 404


# ---------------------------------------------------------------------------
# Test 10: Unified Care Calendar Aggregation & Chronological Ordering
# ---------------------------------------------------------------------------

def test_unified_calendar_aggregation_and_ordering(client: TestClient, auth_headers):
    now = datetime.now(timezone.utc)
    t1 = (now + timedelta(days=1)).isoformat()
    t2 = (now + timedelta(days=2)).isoformat()
    t3 = (now + timedelta(days=3)).isoformat()
    t4 = (now + timedelta(days=4)).isoformat()

    # Create Appt 1 at T1
    client.post(
        "/api/care/appointments",
        json={"title": "Event 1 - Blood Draw", "scheduled_at": t1},
        headers=auth_headers["user_a"],
    )

    # Create Task 1 due at T2
    client.post(
        "/api/care/follow-ups",
        json={"title": "Event 2 - Pick up prescription", "due_at": t2, "priority": "medium"},
        headers=auth_headers["user_a"],
    )

    # Create Appt 2 at T3
    client.post(
        "/api/care/appointments",
        json={"title": "Event 3 - Specialist Visit", "scheduled_at": t3},
        headers=auth_headers["user_a"],
    )

    # Create Task 2 due at T4
    client.post(
        "/api/care/follow-ups",
        json={"title": "Event 4 - Log blood pressure readings", "due_at": t4, "priority": "low"},
        headers=auth_headers["user_a"],
    )

    # Fetch calendar
    cal_res = client.get("/api/care/calendar", headers=auth_headers["user_a"])
    assert cal_res.status_code == 200
    cal_data = cal_res.json()
    assert cal_data["total"] == 4

    items = cal_data["items"]
    # Check chronological ordering
    assert items[0]["title"] == "Event 1 - Blood Draw"
    assert items[0]["item_type"] == "appointment"

    assert items[1]["title"] == "Event 2 - Pick up prescription"
    assert items[1]["item_type"] == "follow_up"

    assert items[2]["title"] == "Event 3 - Specialist Visit"
    assert items[2]["item_type"] == "appointment"

    assert items[3]["title"] == "Event 4 - Log blood pressure readings"
    assert items[3]["item_type"] == "follow_up"

    # Date range filter: only T2 and T3
    filtered_res = client.get(
        "/api/care/calendar",
        params={"start_date": t2, "end_date": t3},
        headers=auth_headers["user_a"],
    )
    assert filtered_res.status_code == 200
    assert filtered_res.json()["total"] == 2


# ---------------------------------------------------------------------------
# Test 11: Care Overview Summary Metrics
# ---------------------------------------------------------------------------

def test_care_overview_metrics(client: TestClient, auth_headers):
    # Active medication
    client.post(
        "/api/care/medications",
        json={"name": "Atorvastatin", "strength": "20 mg", "status": "active"},
        headers=auth_headers["user_a"],
    )

    # Upcoming appointment
    future_time = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    client.post(
        "/api/care/appointments",
        json={"title": "Follow Up", "scheduled_at": future_time, "status": "scheduled"},
        headers=auth_headers["user_a"],
    )

    # Overdue task (due yesterday)
    past_time = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    client.post(
        "/api/care/follow-ups",
        json={"title": "Past task", "due_at": past_time, "status": "pending"},
        headers=auth_headers["user_a"],
    )

    res = client.get("/api/care/overview", headers=auth_headers["user_a"])
    assert res.status_code == 200
    data = res.json()
    assert data["active_medications_count"] == 1
    assert data["upcoming_appointments_count"] == 1
    assert data["pending_follow_ups_count"] == 1
    assert data["overdue_follow_ups_count"] == 1
    assert len(data["active_medications"]) == 1
    assert len(data["upcoming_appointments"]) == 1
    assert len(data["pending_tasks"]) == 1
    assert "disclaimer" in data
    assert "does not prescribe medication" in data["disclaimer"].lower()


# ---------------------------------------------------------------------------
# Test 12: Ownership Validation for Linked Entities & Date Range Boundaries
# ---------------------------------------------------------------------------

def test_cannot_link_other_users_document_to_medication_or_appointment(client: TestClient, db_session: Session, users, auth_headers):
    user_a, user_b = users
    # Create Document owned by User B
    b_doc = Document(
        id=uuid.uuid4(),
        owner_id=user_b.id,
        filename="Private_B_Lab.pdf",
        storage_key=f"{user_b.id}/private_b.pdf",
        mime_type="application/pdf",
        file_size=1024,
        checksum_sha256="abc1234",
        processing_status="completed",
    )
    db_session.add(b_doc)
    db_session.commit()

    # User A tries to link User B's document to a medication
    res_med = client.post(
        "/api/care/medications",
        json={
            "name": "Lisinopril",
            "strength": "10 mg",
            "source_document_id": str(b_doc.id),
        },
        headers=auth_headers["user_a"],
    )
    assert res_med.status_code == 400
    assert "not belong to the authenticated user" in res_med.json()["detail"]

    # User A tries to link User B's document to an appointment
    appt_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    res_appt = client.post(
        "/api/care/appointments",
        json={
            "title": "Nephrology Consultation",
            "scheduled_at": appt_time,
            "source_document_id": str(b_doc.id),
        },
        headers=auth_headers["user_a"],
    )
    assert res_appt.status_code == 400
    assert "not belong to the authenticated user" in res_appt.json()["detail"]


def test_cannot_link_other_users_appointment_or_document_to_task(client: TestClient, db_session: Session, users, auth_headers):
    user_a, user_b = users
    # Appointment owned by User B
    b_appt_time = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    b_appt_res = client.post(
        "/api/care/appointments",
        json={"title": "Private Consultation User B", "scheduled_at": b_appt_time},
        headers=auth_headers["user_b"],
    )
    b_appt_id = b_appt_res.json()["id"]

    # User A tries to create follow-up task linked to User B's appointment
    res_task = client.post(
        "/api/care/follow-ups",
        json={
            "title": "Unauthorized task link",
            "appointment_id": b_appt_id,
        },
        headers=auth_headers["user_a"],
    )
    assert res_task.status_code == 400
    assert "not belong to the authenticated user" in res_task.json()["detail"]


def test_care_inverted_date_boundaries_rejected(client: TestClient, auth_headers):
    now = datetime.now(timezone.utc)
    t_start = (now + timedelta(days=10)).isoformat()
    t_end = (now + timedelta(days=1)).isoformat()

    # Appointments with start_date > end_date
    res_appt = client.get(
        "/api/care/appointments",
        params={"start_date": t_start, "end_date": t_end},
        headers=auth_headers["user_a"],
    )
    assert res_appt.status_code == 422

    # Calendar with start_date > end_date
    res_cal = client.get(
        "/api/care/calendar",
        params={"start_date": t_start, "end_date": t_end},
        headers=auth_headers["user_a"],
    )
    assert res_cal.status_code == 422
