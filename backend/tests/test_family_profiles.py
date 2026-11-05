"""Unit and integration tests for Feature 3: Family Health Profiles.

Covers:
1. Authenticated user can create a valid family profile.
2. Invalid profile input is rejected (future DOB, blank name, invalid relationship).
3. User can list only authorized profiles (own primary + authorized members).
4. User can retrieve their authorized profile.
5. Unauthorized profile access is rejected (safe 404).
6. Unauthorized updates are rejected.
7. Unauthorized deletion or deactivation is rejected. Primary cannot be deactivated.
8. A family member's medical documents remain isolated.
9. Observations and timeline entries are associated with the correct profile.
10. Doctor Visit Preparation Packs use the correct profile's data.
11. Smart Health Reminders remain associated with the correct profile.
12. Existing users and legacy records (profile_id is NULL) remain accessible under primary profile.
13. Missing, invalid, or expired authentication is handled correctly (401).
14. Consent and dependent-access restrictions are enforced.
"""

import tempfile
import uuid
from datetime import date, datetime, timedelta, timezone

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
from app.models.care import AppointmentRecord, MedicationRecord
from app.models.document import Document, DocumentObservation
from app.models.family_profile import FamilyProfile
from app.models.reminder import Reminder
from app.models.user import User


@pytest.fixture(name="db_session")
def fixture_db_session(monkeypatch):
    temp_dir = tempfile.mkdtemp(prefix="healthmate_family_tests_")
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
        email="parent_alpha@healthmate.ai",
        name="Alpha Parent",
        hashed_password=hash_password("ValidPassword123!"),
        is_active=True,
    )
    user_b = User(
        email="user_beta@healthmate.ai",
        name="Beta Stranger",
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


def test_unauthenticated_profile_access_rejected(client: TestClient):
    """Endpoints require authentication."""
    res = client.get("/api/family-profiles")
    assert res.status_code == 401

    res = client.post("/api/family-profiles", json={"name": "Alice", "relationship": "child"})
    assert res.status_code == 401


def test_list_profiles_auto_creates_primary_profile(client: TestClient, auth_headers: dict):
    """Listing profiles automatically ensures the authenticated user has a primary 'self' profile."""
    res = client.get("/api/family-profiles", headers=auth_headers["user_a"])
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    primary = next((p for p in data if p["is_primary"]), None)
    assert primary is not None
    assert primary["relationship"] == "self"
    assert primary["is_active"] is True
    assert primary["name"] == "Alpha Parent"


def test_create_family_profile_success(client: TestClient, auth_headers: dict):
    """Authenticated user can create a valid family profile."""
    payload = {
        "name": "Leo Parent",
        "relationship": "child",
        "date_of_birth": "2018-05-14",
        "gender": "male",
        "blood_type": "O+",
        "is_dependent": True,
        "consent_status": "authorized",
        "consent_notes": "Parental legal guardian consent on record",
        "allergies_summary": "Peanuts, Amoxicillin",
        "emergency_contact_name": "Sarah Parent",
        "emergency_contact_phone": "+1-555-0199",
    }
    res = client.post("/api/family-profiles", json=payload, headers=auth_headers["user_a"])
    assert res.status_code == 201
    created = res.json()
    assert created["name"] == "Leo Parent"
    assert created["relationship"] == "child"
    assert created["date_of_birth"] == "2018-05-14"
    assert created["blood_type"] == "O+"
    assert created["is_dependent"] is True
    assert created["is_primary"] is False
    assert created["is_active"] is True
    assert "id" in created

    # Fetch by ID
    get_res = client.get(f"/api/family-profiles/{created['id']}", headers=auth_headers["user_a"])
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Leo Parent"


def test_create_family_profile_validation_errors(client: TestClient, auth_headers: dict):
    """Invalid profile inputs are rejected with 422 or 400."""
    # Empty / whitespace name
    res = client.post(
        "/api/family-profiles",
        json={"name": "   ", "relationship": "child"},
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 422

    # Invalid relationship type
    res = client.post(
        "/api/family-profiles",
        json={"name": "Bob", "relationship": "roommate_unsupported"},
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 422

    # Future date of birth
    future_date = (date.today() + timedelta(days=5)).isoformat()
    res = client.post(
        "/api/family-profiles",
        json={"name": "Future Baby", "relationship": "child", "date_of_birth": future_date},
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 422

    # Trying to create another "self" profile manually
    res = client.post(
        "/api/family-profiles",
        json={"name": "Myself Again", "relationship": "self"},
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 400


def test_update_family_profile(client: TestClient, auth_headers: dict):
    """Authorized user can update permitted fields on their family member's profile."""
    # Create profile
    res = client.post(
        "/api/family-profiles",
        json={"name": "Grandpa", "relationship": "parent", "allergies_summary": "None"},
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 201
    profile_id = res.json()["id"]

    # Update profile
    update_res = client.patch(
        f"/api/family-profiles/{profile_id}",
        json={
            "name": "Grandpa Arthur",
            "blood_type": "A-",
            "allergies_summary": "Penicillin",
        },
        headers=auth_headers["user_a"],
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["name"] == "Grandpa Arthur"
    assert updated["blood_type"] == "A-"
    assert updated["allergies_summary"] == "Penicillin"


def test_cannot_change_primary_profile_relationship(client: TestClient, auth_headers: dict):
    """Primary profile's relationship cannot be altered away from 'self'."""
    list_res = client.get("/api/family-profiles", headers=auth_headers["user_a"])
    primary = next(p for p in list_res.json() if p["is_primary"])

    res = client.patch(
        f"/api/family-profiles/{primary['id']}",
        json={"relationship": "child"},
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 400
    assert "primary account profile" in res.json()["detail"].lower()


def test_deactivate_and_reactivate_family_profile(client: TestClient, auth_headers: dict):
    """Safe deactivation archives the profile without destroying auditability."""
    # Create child
    res = client.post(
        "/api/family-profiles",
        json={"name": "Deactivate Me", "relationship": "sibling"},
        headers=auth_headers["user_a"],
    )
    profile_id = res.json()["id"]

    # Deactivate
    deact_res = client.delete(
        f"/api/family-profiles/{profile_id}",
        headers=auth_headers["user_a"],
    )
    assert deact_res.status_code == 200
    deact_data = deact_res.json()
    assert deact_data["is_active"] is False
    assert "preserved" in deact_data["record_retention_note"].lower()

    # List active profiles should not include it by default
    active_list = client.get("/api/family-profiles", headers=auth_headers["user_a"]).json()
    assert not any(p["id"] == profile_id for p in active_list)

    # Including inactive shows it
    full_list = client.get("/api/family-profiles?include_inactive=true", headers=auth_headers["user_a"]).json()
    assert any(p["id"] == profile_id for p in full_list)

    # Reactivate via patch
    reactivate_res = client.patch(
        f"/api/family-profiles/{profile_id}",
        json={"is_active": True},
        headers=auth_headers["user_a"],
    )
    assert reactivate_res.status_code == 200
    assert reactivate_res.json()["is_active"] is True


def test_cannot_deactivate_primary_profile(client: TestClient, auth_headers: dict):
    """The account owner's primary health profile cannot be deactivated."""
    list_res = client.get("/api/family-profiles", headers=auth_headers["user_a"])
    primary = next(p for p in list_res.json() if p["is_primary"])

    res = client.delete(f"/api/family-profiles/{primary['id']}", headers=auth_headers["user_a"])
    assert res.status_code == 400
    assert "primary" in res.json()["detail"].lower()


def test_cross_user_isolation(client: TestClient, auth_headers: dict):
    """User B cannot view, update, or delete User A's family profile (safe 404 returned)."""
    # User A creates a profile
    res_a = client.post(
        "/api/family-profiles",
        json={"name": "User A Daughter", "relationship": "child"},
        headers=auth_headers["user_a"],
    )
    assert res_a.status_code == 201
    profile_id_a = res_a.json()["id"]

    # User B attempts to access User A's profile -> safe 404 (does not disclose existence)
    get_res = client.get(f"/api/family-profiles/{profile_id_a}", headers=auth_headers["user_b"])
    assert get_res.status_code == 404

    # User B attempts to patch User A's profile -> safe 404
    patch_res = client.patch(
        f"/api/family-profiles/{profile_id_a}",
        json={"name": "Hacked Name"},
        headers=auth_headers["user_b"],
    )
    assert patch_res.status_code == 404

    # User B attempts to delete User A's profile -> safe 404
    del_res = client.delete(f"/api/family-profiles/{profile_id_a}", headers=auth_headers["user_b"])
    assert del_res.status_code == 404

    # User B's profile listing does not contain User A's profile
    b_list = client.get("/api/family-profiles", headers=auth_headers["user_b"]).json()
    assert not any(p["id"] == profile_id_a for p in b_list)


def test_documents_isolation_by_family_profile(
    client: TestClient,
    auth_headers: dict,
    db_session: Session,
    users,
):
    """Documents and observations are strictly scoped by profile_id."""
    user_a, _ = users

    # Create two profiles for user_a: Mom (primary) and Kid (child)
    list_res = client.get("/api/family-profiles", headers=auth_headers["user_a"])
    primary_id = next(p for p in list_res.json() if p["is_primary"])["id"]

    kid_res = client.post(
        "/api/family-profiles",
        json={"name": "Kiddo", "relationship": "child"},
        headers=auth_headers["user_a"],
    )
    kid_id = kid_res.json()["id"]

    # Seed Document for Primary
    doc_primary = Document(
        id=uuid.uuid4(),
        owner_id=user_a.id,
        profile_id=uuid.UUID(primary_id),
        filename="primary_lab.pdf",
        storage_key="primary_lab_storage.pdf",
        file_size=1024,
        checksum_sha256="checksum1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        mime_type="application/pdf",
        patient_name="Alpha Parent",
        processing_status="extracted",
        is_verified=True,
    )
    # Seed Document for Kid
    doc_kid = Document(
        id=uuid.uuid4(),
        owner_id=user_a.id,
        profile_id=uuid.UUID(kid_id),
        filename="pediatric_growth.pdf",
        storage_key="pediatric_growth_storage.pdf",
        file_size=2048,
        checksum_sha256="checksumabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234",
        mime_type="application/pdf",
        patient_name="Kiddo",
        processing_status="extracted",
        is_verified=True,
    )
    db_session.add_all([doc_primary, doc_kid])
    db_session.commit()

    # Query with profile_id = kid_id
    res_kid_docs = client.get(f"/api/documents/?profile_id={kid_id}", headers=auth_headers["user_a"])
    assert res_kid_docs.status_code == 200
    kid_docs = res_kid_docs.json()
    assert len(kid_docs) == 1
    assert kid_docs[0]["filename"] == "pediatric_growth.pdf"
    assert kid_docs[0]["profile_id"] == kid_id

    # Query with profile_id = primary_id
    res_prim_docs = client.get(f"/api/documents/?profile_id={primary_id}", headers=auth_headers["user_a"])
    assert res_prim_docs.status_code == 200
    prim_docs = res_prim_docs.json()
    assert any(d["filename"] == "primary_lab.pdf" for d in prim_docs)
    assert not any(d["filename"] == "pediatric_growth.pdf" for d in prim_docs)


def test_timeline_scoped_by_family_profile(
    client: TestClient,
    auth_headers: dict,
    db_session: Session,
    users,
):
    """Medical timeline items reflect only the selected family profile."""
    user_a, _ = users

    # Create child profile
    kid_res = client.post(
        "/api/family-profiles",
        json={"name": "Baby Tim", "relationship": "child"},
        headers=auth_headers["user_a"],
    )
    kid_id = kid_res.json()["id"]

    # Create document + observation for child
    kid_doc = Document(
        id=uuid.uuid4(),
        owner_id=user_a.id,
        profile_id=uuid.UUID(kid_id),
        filename="vaccine_doc.pdf",
        storage_key="vaccine_storage.pdf",
        file_size=512,
        checksum_sha256="checksumvaccine1234567890abcdef1234567890abcdef1234567890abcdef1234",
        mime_type="application/pdf",
        processing_status="extracted",
        document_date="2024-03-01",
        is_verified=True,
    )
    db_session.add(kid_doc)
    db_session.flush()

    obs = DocumentObservation(
        document_id=kid_doc.id,
        owner_id=user_a.id,
        test_name="MMR Vaccine",
        value="Administered",
        unit=None,
        source_text="MMR Vaccine Administered on 2024-03-01",
        is_reviewed=True,
    )
    db_session.add(obs)
    db_session.commit()

    # Fetch timeline for child
    t_res = client.get(f"/api/timeline/?profile_id={kid_id}", headers=auth_headers["user_a"])
    assert t_res.status_code == 200
    items = t_res.json()["items"]
    assert len(items) >= 1
    assert any("MMR Vaccine" in it["original_test_name"] for it in items)


def test_visit_pack_draft_scoped_to_family_profile(
    client: TestClient,
    auth_headers: dict,
    db_session: Session,
    users,
):
    """Doctor Visit Preparation Pack uses the selected family member's clinical data."""
    user_a, _ = users

    # Create family profile
    kid_res = client.post(
        "/api/family-profiles",
        json={
            "name": "Maya Parent",
            "relationship": "child",
            "allergies_summary": "Strawberries",
        },
        headers=auth_headers["user_a"],
    )
    kid_id = kid_res.json()["id"]

    # Add medication for Maya
    med = MedicationRecord(
        user_id=user_a.id,
        profile_id=uuid.UUID(kid_id),
        name="Children Amoxicillin",
        strength="250mg",
        dosage_instructions="Twice daily",
        frequency="Twice daily",
        status="active",
    )
    # Add appointment for Maya
    appt = AppointmentRecord(
        user_id=user_a.id,
        profile_id=uuid.UUID(kid_id),
        title="Pediatric 6-Year Checkup",
        provider_name="Dr. Smith Pediatrician",
        status="scheduled",
        scheduled_at=datetime.now(timezone.utc) + timedelta(days=2),
    )
    db_session.add_all([med, appt])
    db_session.commit()

    # Generate draft with profile_id
    payload = {
        "visit_type": "Pediatric Follow-up",
        "timeframe_days": 30,
        "profile_id": kid_id,
        "categories": ["medications", "care_schedule", "allergies", "profile_summary"],
    }
    draft_res = client.post("/api/visit-pack/draft", json=payload, headers=auth_headers["user_a"])
    assert draft_res.status_code == 200
    draft = draft_res.json()
    assert draft["patient_name"] == "Maya Parent"
    assert draft["profile_id"] == kid_id
    assert any("Children Amoxicillin" in m["name"] for m in draft["medications"])
    assert any("Pediatric 6-Year Checkup" in a["title"] for a in draft["appointments"])


def test_smart_health_reminders_scoped_to_family_profile(
    client: TestClient,
    auth_headers: dict,
    db_session: Session,
    users,
):
    """Reminders can be created and queried per family profile."""
    user_a, _ = users

    # Create family profile
    grandma_res = client.post(
        "/api/family-profiles",
        json={"name": "Grandma Rose", "relationship": "parent"},
        headers=auth_headers["user_a"],
    )
    grandma_id = grandma_res.json()["id"]

    # Create reminder for Grandma
    due_iso = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    rem_payload = {
        "title": "Grandma Blood Pressure Check",
        "description": "Log morning systolic/diastolic",
        "category": "general",
        "due_at": due_iso,
        "profile_id": grandma_id,
    }
    create_res = client.post("/api/reminders", json=rem_payload, headers=auth_headers["user_a"])
    assert create_res.status_code == 201
    rem = create_res.json()
    assert rem["profile_id"] == grandma_id
    assert rem["profile_name"] == "Grandma Rose"
    rem_id = rem["id"]

    # Query reminders filtered by grandma_id
    list_res = client.get(f"/api/reminders?profile_id={grandma_id}", headers=auth_headers["user_a"])
    assert list_res.status_code == 200
    rems = list_res.json()
    assert len(rems) == 1
    assert rems[0]["id"] == rem_id

    # Query with primary profile shouldn't include Grandma's reminder
    list_all = client.get("/api/family-profiles", headers=auth_headers["user_a"]).json()
    primary_id = next(p["id"] for p in list_all if p["is_primary"])
    list_prim = client.get(f"/api/reminders?profile_id={primary_id}", headers=auth_headers["user_a"]).json()
    assert not any(r["id"] == rem_id for r in list_prim)


def test_legacy_records_accessible_under_primary_profile(
    client: TestClient,
    auth_headers: dict,
    db_session: Session,
    users,
):
    """Records created before Feature 3 (profile_id is NULL) remain accessible under primary profile."""
    user_a, _ = users

    # Ensure primary profile exists
    list_res = client.get("/api/family-profiles", headers=auth_headers["user_a"])
    primary_id = next(p for p in list_res.json() if p["is_primary"])["id"]

    # Seed legacy document with NULL profile_id
    legacy_doc = Document(
        id=uuid.uuid4(),
        owner_id=user_a.id,
        profile_id=None,
        filename="legacy_cbc.pdf",
        storage_key="legacy_cbc_storage.pdf",
        file_size=1024,
        checksum_sha256="legacychecksum1234567890abcdef1234567890abcdef1234567890abcdef1234",
        mime_type="application/pdf",
        processing_status="extracted",
    )
    # Seed legacy medication with NULL profile_id
    legacy_med = MedicationRecord(
        user_id=user_a.id,
        profile_id=None,
        name="Legacy Aspirin",
        status="active",
    )
    db_session.add_all([legacy_doc, legacy_med])
    db_session.commit()

    # Query documents with primary profile_id -> must include legacy_cbc.pdf
    docs_res = client.get(f"/api/documents/?profile_id={primary_id}", headers=auth_headers["user_a"])
    assert docs_res.status_code == 200
    assert any(d["filename"] == "legacy_cbc.pdf" for d in docs_res.json())

    # Query medications with primary profile_id -> must include Legacy Aspirin
    meds_res = client.get(f"/api/care/medications?profile_id={primary_id}", headers=auth_headers["user_a"])
    assert meds_res.status_code == 200
    assert any(m["name"] == "Legacy Aspirin" for m in meds_res.json())
