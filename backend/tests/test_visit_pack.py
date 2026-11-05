import io
import tempfile
import uuid
from datetime import datetime, timezone

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
from app.models.document import Document, DocumentObservation
from app.models.user import User


@pytest.fixture(name="db_session")
def fixture_db_session(monkeypatch):
    temp_dir = tempfile.mkdtemp(prefix="healthmate_visitpack_tests_")
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
        email="patient_alpha@healthmate.ai",
        name="Alpha Patient",
        hashed_password=hash_password("ValidPassword123!"),
        is_active=True,
    )
    user_b = User(
        email="patient_beta@healthmate.ai",
        name="Beta Patient",
        hashed_password=hash_password("ValidPassword123!"),
        is_active=True,
    )
    db_session.add_all([user_a, user_b])
    db_session.commit()
    db_session.refresh(user_a)
    db_session.refresh(user_b)
    return user_a, user_b


@pytest.fixture(name="auth_headers")
def fixture_auth_headers(users):
    user_a, user_b = users
    token_a = create_access_token(str(user_a.id))
    token_b = create_access_token(str(user_b.id))
    return {
        "user_a": {"Authorization": f"Bearer {token_a}"},
        "user_b": {"Authorization": f"Bearer {token_b}"},
    }


def seed_patient_records(db_session: Session, user: User):
    doc = Document(
        id=uuid.uuid4(),
        owner_id=user.id,
        filename="metabolic_panel_2026.pdf",
        mime_type="application/pdf",
        storage_key=f"{user.id}/metabolic_panel.pdf",
        file_size=1024,
        checksum_sha256="abc123def456dummychecksum",
        processing_status="extracted",
        is_verified=True,
        extracted_text="Glucose 115 mg/dL HIGH",
        page_count=1,
        created_at=datetime(2026, 4, 15, tzinfo=timezone.utc),
    )
    db_session.add(doc)
    db_session.flush()

    obs_verified = DocumentObservation(
        id=uuid.uuid4(),
        document_id=doc.id,
        owner_id=user.id,
        category="Endocrine",
        test_name="Fasting Blood Glucose",
        normalized_test_name="Fasting Glucose",
        value="115",
        numeric_value=115.0,
        unit="mg/dL",
        reference_range="70 - 99",
        flag="HIGH",
        is_reviewed=True,
        source_page=1,
        source_text="Fasting Blood Glucose: 115 mg/dL",
    )
    obs_unverified = DocumentObservation(
        id=uuid.uuid4(),
        document_id=doc.id,
        owner_id=user.id,
        category="Lipid",
        test_name="Triglycerides",
        normalized_test_name="Triglycerides",
        value="180",
        numeric_value=180.0,
        unit="mg/dL",
        reference_range="< 150",
        flag="HIGH",
        is_reviewed=False,
        source_page=1,
        source_text="Triglycerides: 180 mg/dL",
    )
    db_session.add_all([obs_verified, obs_unverified])

    med = MedicationRecord(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Metformin",
        strength="500 mg",
        dosage_instructions="Take 1 tablet by mouth daily",
        frequency="Once daily",
        status="active",
        prescriber="Dr. Emily Thorne",
    )
    db_session.add(med)

    appt = AppointmentRecord(
        id=uuid.uuid4(),
        user_id=user.id,
        title="Annual Physical Examination",
        provider_name="Dr. Emily Thorne",
        location="Metro Clinic Suite 200",
        scheduled_at=datetime(2026, 6, 20, 9, 30, tzinfo=timezone.utc),
        status="scheduled",
    )
    db_session.add(appt)
    db_session.flush()

    task = FollowUpTask(
        id=uuid.uuid4(),
        user_id=user.id,
        title="Complete 8-hour fasting lab draw prior to visit",
        due_at=datetime(2026, 6, 18, 8, 0, tzinfo=timezone.utc),
        priority="high",
        status="pending",
        appointment_id=appt.id,
    )
    db_session.add(task)
    db_session.commit()
    return doc, obs_verified, obs_unverified, med, appt, task


def test_generate_visit_pack_draft_empty(client: TestClient, auth_headers: dict):
    res = client.post("/api/visit-pack/draft", json={}, headers=auth_headers["user_a"])
    assert res.status_code == 200
    data = res.json()
    assert data["patient_name"] == "Alpha Patient"
    assert data["patient_email"] == "patient_alpha@healthmate.ai"
    assert len(data["documents"]) == 0
    assert len(data["observations"]) == 0
    assert len(data["medications"]) == 0
    assert len(data["appointments"]) == 0
    assert len(data["clinician_questions"]) >= 1
    assert "NOTICE FOR CLINICAL DISCUSSION" in data["disclaimer"]


def test_generate_visit_pack_draft_with_records(client: TestClient, db_session: Session, users: tuple, auth_headers: dict):
    user_a, _ = users
    doc, obs_v, obs_uv, med, appt, task = seed_patient_records(db_session, user_a)

    res = client.post(
        "/api/visit-pack/draft",
        json={"include_unverified": False, "chief_complaint": "Routine follow-up on fasting blood sugar"},
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["chief_complaint"] == "Routine follow-up on fasting blood sugar"
    assert len(data["documents"]) == 1
    assert data["documents"][0]["filename"] == "metabolic_panel_2026.pdf"

    # Verified observation should be included, unverified excluded by default
    assert len(data["observations"]) == 1
    assert data["observations"][0]["test_name"] == "Fasting Glucose"
    assert data["observations"][0]["flag"] == "HIGH"
    assert data["observations"][0]["is_verified"] is True

    # Active medication included
    assert len(data["medications"]) == 1
    assert data["medications"][0]["name"] == "Metformin"

    # Appointment and task included
    assert len(data["appointments"]) == 1
    assert data["appointments"][0]["title"] == "Annual Physical Examination"
    assert len(data["follow_up_tasks"]) == 1
    assert data["follow_up_tasks"][0]["title"] == "Complete 8-hour fasting lab draw prior to visit"

    # Clinician questions synthesized
    assert any("Fasting Glucose" in q["question"] for q in data["clinician_questions"])
    assert any("Metformin" in q["question"] for q in data["clinician_questions"])


def test_generate_visit_pack_include_unverified(client: TestClient, db_session: Session, users: tuple, auth_headers: dict):
    user_a, _ = users
    seed_patient_records(db_session, user_a)

    res = client.post(
        "/api/visit-pack/draft",
        json={"include_unverified": True},
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["observations"]) == 2
    test_names = {o["test_name"] for o in data["observations"]}
    assert "Fasting Glucose" in test_names
    assert "Triglycerides" in test_names


def test_generate_visit_pack_date_filtering(client: TestClient, db_session: Session, users: tuple, auth_headers: dict):
    user_a, _ = users
    seed_patient_records(db_session, user_a)

    # Inverted date boundary
    res_bad = client.post(
        "/api/visit-pack/draft",
        json={"start_date": "2026-12-31", "end_date": "2026-01-01"},
        headers=auth_headers["user_a"],
    )
    assert res_bad.status_code == 422

    # Date range after report
    res_future = client.post(
        "/api/visit-pack/draft",
        json={"start_date": "2027-01-01", "end_date": "2027-12-31"},
        headers=auth_headers["user_a"],
    )
    assert res_future.status_code == 200
    assert len(res_future.json()["documents"]) == 0


def test_export_visit_pack_pdf_success(client: TestClient, db_session: Session, users: tuple, auth_headers: dict):
    user_a, _ = users
    seed_patient_records(db_session, user_a)

    # Generate draft first
    draft_res = client.post("/api/visit-pack/draft", json={}, headers=auth_headers["user_a"])
    assert draft_res.status_code == 200
    draft_data = draft_res.json()

    # User customizes notes
    draft_data["patient_notes"] = "Experiencing occasional mild nausea in mornings."
    draft_data["clinician_name"] = "Dr. Emily Thorne, MD"

    # Export PDF
    pdf_res = client.post("/api/visit-pack/export-pdf", json={"pack": draft_data}, headers=auth_headers["user_a"])
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in pdf_res.headers["content-disposition"]
    assert len(pdf_res.content) > 1000
    # PDF magic bytes
    assert pdf_res.content.startswith(b"%PDF")


def test_export_visit_pack_pdf_cross_user_isolation(client: TestClient, db_session: Session, users: tuple, auth_headers: dict):
    user_a, user_b = users
    doc_a, obs_a, _, med_a, _, _ = seed_patient_records(db_session, user_a)

    # User B generates their draft
    draft_b = client.post("/api/visit-pack/draft", json={}, headers=auth_headers["user_b"]).json()

    # User B maliciously injects User A's document_id into their export payload
    draft_b["documents"].append({
        "document_id": str(doc_a.id),
        "filename": "injected_user_a_doc.pdf",
        "clinical_date": "2026-04-15",
        "is_verified": True,
        "page_count": 1,
    })

    # Export must be rejected with 403 Forbidden
    res = client.post("/api/visit-pack/export-pdf", json={"pack": draft_b}, headers=auth_headers["user_b"])
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]


def test_export_visit_pack_pdf_xss_markup_safety(client: TestClient, auth_headers: dict):
    draft_res = client.post("/api/visit-pack/draft", json={}, headers=auth_headers["user_a"])
    draft_data = draft_res.json()

    # Inject markup and special characters that could break ReportLab XML parser
    draft_data["patient_notes"] = "<script>alert('xss')</script> & special <characters> 'quotes' \"double\""
    draft_data["chief_complaint"] = "<b>Bold Attempt</b> & <invalid/tag>"
    draft_data["clinician_questions"].append({
        "question": "Can I take <aspirin> with & without food?",
        "rationale": "Patient <question> testing & safety",
        "source_reference": "<reference>",
        "included": True,
    })

    pdf_res = client.post("/api/visit-pack/export-pdf", json={"pack": draft_data}, headers=auth_headers["user_a"])
    assert pdf_res.status_code == 200
    assert pdf_res.content.startswith(b"%PDF")
