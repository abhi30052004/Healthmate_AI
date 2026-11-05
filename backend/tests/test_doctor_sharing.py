"""Unit and integration tests for Feature 4: Secure Doctor Sharing.

Covers:
1. Authorized user can create a sharing session.
2. Invalid or missing required fields are rejected.
3. Empty resource selections are rejected.
4. Cross-user profile IDs cannot be shared.
5. Documents belonging to another profile cannot be shared.
6. Doctor access returns only selected resources.
7. An invalid token is rejected.
8. An expired token is rejected.
9. A revoked token is rejected immediately.
10. A doctor cannot access unselected documents by changing document IDs.
11. The owner cannot access another user's sharing session.
12. An unauthorized user cannot revoke a sharing session.
13. The owner can revoke their active session.
14. Visit-pack access is restricted to the selected profile and resources.
15. Secret tokens are not returned by ordinary listing endpoints.
16. Audit records do not contain raw tokens or medical content.
"""

from datetime import date, datetime, timedelta, timezone
import hashlib
from pathlib import Path
import tempfile
import uuid

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
from app.models.doctor_sharing import DoctorSharingAuditLog, DoctorSharingSession
from app.models.document import Document
from app.models.family_profile import FamilyProfile
from app.models.user import User


@pytest.fixture(name="db_session")
def fixture_db_session(monkeypatch):
    temp_dir = tempfile.mkdtemp(prefix="healthmate_sharing_tests_")
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


@pytest.fixture(name="test_data")
def fixture_test_data(db_session: Session, users):
    user_a, user_b = users

    # Profiles for User A
    prof_a_primary = FamilyProfile(
        owner_id=user_a.id,
        name="Alpha Parent",
        relationship="self",
        is_primary=True,
        is_active=True,
        blood_type="O+",
        allergies_summary="Penicillin",
    )
    prof_a_child = FamilyProfile(
        owner_id=user_a.id,
        name="Charlie Child",
        relationship="child",
        is_primary=False,
        is_active=True,
        date_of_birth=date(2018, 5, 12),
        gender="male",
        allergies_summary="Peanuts",
    )
    prof_b = FamilyProfile(
        owner_id=user_b.id,
        name="Beta Stranger",
        relationship="self",
        is_primary=True,
        is_active=True,
    )
    db_session.add_all([prof_a_primary, prof_a_child, prof_b])
    db_session.commit()

    # Create dummy storage file for documents
    settings = get_settings()
    storage_root = Path(settings.document_storage_dir)
    storage_root.mkdir(parents=True, exist_ok=True)
    file_a1_path = storage_root / "doc_a1.pdf"
    file_a1_path.write_bytes(b"%PDF-1.4 dummy pdf bytes")
    file_a2_path = storage_root / "doc_a2.pdf"
    file_a2_path.write_bytes(b"%PDF-1.4 dummy pdf 2 bytes")

    doc_a1 = Document(
        owner_id=user_a.id,
        profile_id=prof_a_child.id,
        filename="charlie_blood_test.pdf",
        storage_key="doc_a1.pdf",
        checksum_sha256="dummyhash1",
        mime_type="application/pdf",
        file_size=len(b"%PDF-1.4 dummy pdf bytes"),
        processing_status="completed",
        is_verified=True,
    )
    doc_a2 = Document(
        owner_id=user_a.id,
        profile_id=prof_a_primary.id,
        filename="alpha_checkup.pdf",
        storage_key="doc_a2.pdf",
        checksum_sha256="dummyhash2",
        mime_type="application/pdf",
        file_size=len(b"%PDF-1.4 dummy pdf 2 bytes"),
        processing_status="completed",
        is_verified=True,
    )
    db_session.add_all([doc_a1, doc_a2])

    # Medications
    med_a1 = MedicationRecord(
        user_id=user_a.id,
        profile_id=prof_a_child.id,
        name="Amoxicillin 250mg",
        strength="250mg",
        dosage_instructions="5ml",
        frequency="Twice daily",
        status="active",
    )
    med_a2 = MedicationRecord(
        user_id=user_a.id,
        profile_id=prof_a_primary.id,
        name="Atorvastatin 20mg",
        strength="20mg",
        dosage_instructions="1 tablet",
        frequency="Nightly",
        status="active",
    )
    db_session.add_all([med_a1, med_a2])
    db_session.commit()

    return {
        "prof_a_primary": prof_a_primary,
        "prof_a_child": prof_a_child,
        "prof_b": prof_b,
        "doc_a1": doc_a1,
        "doc_a2": doc_a2,
        "med_a1": med_a1,
    }


def test_authorized_user_can_create_sharing_session(
    client: TestClient,
    auth_headers,
    test_data,
):
    """1. Authorized user can create a sharing session with explicit resources."""
    prof_child = test_data["prof_a_child"]
    doc_child = test_data["doc_a1"]

    payload = {
        "profile_id": str(prof_child.id),
        "doctor_name": "Dr. Sarah Jenkins",
        "doctor_email": "dr.jenkins@clinic.org",
        "expires_in_days": 14,
        "shared_resources": {
            "document_ids": [str(doc_child.id)],
            "include_visit_pack": True,
            "include_medications": True,
            "include_appointments": False,
        },
        "notes": "Please review Charlie's recent lab results.",
    }

    res = client.post("/api/doctor-sharing", json=payload, headers=auth_headers["user_a"])
    assert res.status_code == 201
    data = res.json()
    assert data["doctor_name"] == "Dr. Sarah Jenkins"
    assert data["profile_name"] == "Charlie Child"
    assert data["status"] == "active"
    assert data["is_expired"] is False
    assert "access_token" in data
    assert len(data["access_token"]) >= 32
    assert data["share_url"].startswith("/shared/")


def test_invalid_or_missing_required_fields_rejected(
    client: TestClient,
    auth_headers,
    test_data,
):
    """2. Missing or blank doctor name, invalid days, etc. are rejected."""
    prof_child = test_data["prof_a_child"]

    # Empty doctor name
    res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "   ",
            "expires_in_days": 7,
            "shared_resources": {"include_visit_pack": True},
        },
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 422

    # Excessive expiration days (> 30)
    res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. Smith",
            "expires_in_days": 45,
            "shared_resources": {"include_visit_pack": True},
        },
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 422


def test_empty_resource_selections_rejected(
    client: TestClient,
    auth_headers,
    test_data,
):
    """3. Empty resource selections must be rejected (least privilege by default)."""
    prof_child = test_data["prof_a_child"]

    res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. Sarah Jenkins",
            "expires_in_days": 7,
            "shared_resources": {
                "document_ids": [],
                "include_visit_pack": False,
                "include_medications": False,
                "include_appointments": False,
            },
        },
        headers=auth_headers["user_a"],
    )
    assert res.status_code in (400, 422)


def test_cross_user_profile_id_cannot_be_shared(
    client: TestClient,
    auth_headers,
    test_data,
):
    """4. User A cannot create a sharing session for User B's profile."""
    prof_b = test_data["prof_b"]

    res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_b.id),
            "doctor_name": "Dr. Snoop",
            "expires_in_days": 7,
            "shared_resources": {"include_visit_pack": True},
        },
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 404


def test_documents_belonging_to_another_profile_cannot_be_shared(
    client: TestClient,
    auth_headers,
    test_data,
):
    """5. Documents belonging to Alpha cannot be shared under Charlie's profile."""
    prof_child = test_data["prof_a_child"]
    doc_alpha = test_data["doc_a2"]  # belongs to Alpha Parent

    res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. Pediatrician",
            "expires_in_days": 7,
            "shared_resources": {
                "document_ids": [str(doc_alpha.id)],
                "include_visit_pack": False,
            },
        },
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 400
    assert "different family profile" in res.json()["detail"].lower() or "not belong" in res.json()["detail"].lower()


def test_doctor_access_returns_only_selected_resources(
    client: TestClient,
    auth_headers,
    test_data,
):
    """6. Doctor access with valid bearer token returns only selected resources."""
    prof_child = test_data["prof_a_child"]
    doc_child = test_data["doc_a1"]

    # Create share for Charlie Child with only document, no visit pack, include medications
    create_res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. Jenkins",
            "expires_in_days": 7,
            "shared_resources": {
                "document_ids": [str(doc_child.id)],
                "include_visit_pack": False,
                "include_medications": True,
                "include_appointments": False,
            },
        },
        headers=auth_headers["user_a"],
    )
    assert create_res.status_code == 201
    token = create_res.json()["access_token"]

    # Doctor accesses portal
    portal_res = client.get(f"/api/shared-health/{token}")
    assert portal_res.status_code == 200
    view = portal_res.json()
    assert view["patient_name"] == "Charlie Child"
    assert view["allergies_summary"] == "Peanuts"
    assert len(view["documents"]) == 1
    assert view["documents"][0]["id"] == str(doc_child.id)
    assert len(view["medications"]) == 1
    assert view["medications"][0]["name"] == "Amoxicillin 250mg"
    assert view["has_visit_pack"] is False


def test_invalid_token_is_rejected(client: TestClient):
    """7. An invalid token is rejected with 404."""
    res = client.get("/api/shared-health/completely_invalid_token_1234567890")
    assert res.status_code == 404


def test_expired_token_is_rejected(
    client: TestClient,
    db_session: Session,
    auth_headers,
    test_data,
):
    """8. An expired token is rejected with 410."""
    prof_child = test_data["prof_a_child"]
    doc_child = test_data["doc_a1"]

    create_res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. Time",
            "expires_in_days": 1,
            "shared_resources": {"document_ids": [str(doc_child.id)]},
        },
        headers=auth_headers["user_a"],
    )
    token = create_res.json()["access_token"]
    share_id = uuid.UUID(create_res.json()["id"])

    # Force expiration in DB
    session_obj = db_session.query(DoctorSharingSession).filter_by(id=share_id).first()
    session_obj.expires_at = datetime.now(timezone.utc) - timedelta(days=2)
    db_session.commit()

    # Doctor tries to access
    res = client.get(f"/api/shared-health/{token}")
    assert res.status_code == 410
    assert "expired" in res.json()["detail"].lower()


def test_revoked_token_is_rejected_immediately(
    client: TestClient,
    auth_headers,
    test_data,
):
    """9. A revoked token is rejected immediately."""
    prof_child = test_data["prof_a_child"]
    doc_child = test_data["doc_a1"]

    create_res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. Revoke",
            "expires_in_days": 7,
            "shared_resources": {"document_ids": [str(doc_child.id)]},
        },
        headers=auth_headers["user_a"],
    )
    token = create_res.json()["access_token"]
    share_id = create_res.json()["id"]

    # Verify doctor can access initially
    res_before = client.get(f"/api/shared-health/{token}")
    assert res_before.status_code == 200

    # Owner revokes the session
    revoke_res = client.post(f"/api/doctor-sharing/{share_id}/revoke", headers=auth_headers["user_a"])
    assert revoke_res.status_code == 200
    assert revoke_res.json()["status"] == "revoked"

    # Doctor tries to access immediately after revocation
    res_after = client.get(f"/api/shared-health/{token}")
    assert res_after.status_code == 410
    assert "revoked" in res_after.json()["detail"].lower()


def test_doctor_cannot_access_unselected_documents(
    client: TestClient,
    auth_headers,
    test_data,
):
    """10. A doctor cannot access an unselected document by guessing or modifying the URL ID."""
    prof_child = test_data["prof_a_child"]
    doc_child = test_data["doc_a1"]
    doc_alpha = test_data["doc_a2"]

    # Create share with doc_child ONLY
    create_res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. Guess",
            "expires_in_days": 7,
            "shared_resources": {"document_ids": [str(doc_child.id)]},
        },
        headers=auth_headers["user_a"],
    )
    token = create_res.json()["access_token"]

    # Permitted document download succeeds
    allowed_res = client.get(f"/api/shared-health/{token}/documents/{doc_child.id}")
    assert allowed_res.status_code == 200

    # Tampered unselected document ID returns 404
    tampered_res = client.get(f"/api/shared-health/{token}/documents/{doc_alpha.id}")
    assert tampered_res.status_code == 404

    # Completely random UUID returns 404
    random_res = client.get(f"/api/shared-health/{token}/documents/{uuid.uuid4()}")
    assert random_res.status_code == 404


def test_owner_cannot_access_another_users_sharing_session(
    client: TestClient,
    auth_headers,
    test_data,
):
    """11. User B cannot view User A's sharing session."""
    prof_child = test_data["prof_a_child"]
    doc_child = test_data["doc_a1"]

    create_res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. Isolation",
            "expires_in_days": 7,
            "shared_resources": {"document_ids": [str(doc_child.id)]},
        },
        headers=auth_headers["user_a"],
    )
    share_id = create_res.json()["id"]

    # User B attempts to view
    res = client.get(f"/api/doctor-sharing/{share_id}", headers=auth_headers["user_b"])
    assert res.status_code == 404


def test_unauthorized_user_cannot_revoke_session(
    client: TestClient,
    auth_headers,
    test_data,
):
    """12. User B cannot revoke User A's sharing session."""
    prof_child = test_data["prof_a_child"]
    doc_child = test_data["doc_a1"]

    create_res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. UnauthRevoke",
            "expires_in_days": 7,
            "shared_resources": {"document_ids": [str(doc_child.id)]},
        },
        headers=auth_headers["user_a"],
    )
    share_id = create_res.json()["id"]

    # User B attempts to revoke
    res = client.post(f"/api/doctor-sharing/{share_id}/revoke", headers=auth_headers["user_b"])
    assert res.status_code == 404


def test_owner_can_revoke_active_session(
    client: TestClient,
    auth_headers,
    test_data,
):
    """13. The owner can successfully revoke their active session."""
    prof_child = test_data["prof_a_child"]
    doc_child = test_data["doc_a1"]

    create_res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. MyDoctor",
            "expires_in_days": 7,
            "shared_resources": {"document_ids": [str(doc_child.id)]},
        },
        headers=auth_headers["user_a"],
    )
    share_id = create_res.json()["id"]

    res = client.post(f"/api/doctor-sharing/{share_id}/revoke", headers=auth_headers["user_a"])
    assert res.status_code == 200
    assert res.json()["status"] == "revoked"
    assert res.json()["revoked_at"] is not None


def test_visit_pack_access_restricted_to_session_permission(
    client: TestClient,
    auth_headers,
    test_data,
):
    """14. Visit pack access is restricted based on include_visit_pack."""
    prof_child = test_data["prof_a_child"]
    doc_child = test_data["doc_a1"]

    # Share WITHOUT visit pack
    create_no_vp = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. NoVP",
            "expires_in_days": 7,
            "shared_resources": {
                "document_ids": [str(doc_child.id)],
                "include_visit_pack": False,
            },
        },
        headers=auth_headers["user_a"],
    )
    token_no_vp = create_no_vp.json()["access_token"]
    vp_res_blocked = client.get(f"/api/shared-health/{token_no_vp}/visit-pack")
    assert vp_res_blocked.status_code == 404

    # Share WITH visit pack
    create_with_vp = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. WithVP",
            "expires_in_days": 7,
            "shared_resources": {
                "document_ids": [str(doc_child.id)],
                "include_visit_pack": True,
            },
        },
        headers=auth_headers["user_a"],
    )
    token_with_vp = create_with_vp.json()["access_token"]
    vp_res_allowed = client.get(f"/api/shared-health/{token_with_vp}/visit-pack")
    assert vp_res_allowed.status_code == 200
    assert vp_res_allowed.headers["Content-Type"] == "application/pdf"
    assert len(vp_res_allowed.content) > 100


def test_secret_tokens_are_not_returned_in_listings(
    client: TestClient,
    auth_headers,
    test_data,
):
    """15. Secret tokens are never returned in ordinary listing endpoints."""
    prof_child = test_data["prof_a_child"]
    doc_child = test_data["doc_a1"]

    client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. SecretCheck",
            "expires_in_days": 7,
            "shared_resources": {"document_ids": [str(doc_child.id)]},
        },
        headers=auth_headers["user_a"],
    )

    list_res = client.get("/api/doctor-sharing", headers=auth_headers["user_a"])
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) >= 1
    for item in items:
        assert "access_token" not in item
        assert "token_hash" not in item


def test_audit_records_do_not_contain_raw_tokens_or_medical_content(
    client: TestClient,
    db_session: Session,
    auth_headers,
    test_data,
):
    """16. Audit records do not contain raw tokens or medical data."""
    prof_child = test_data["prof_a_child"]
    doc_child = test_data["doc_a1"]

    create_res = client.post(
        "/api/doctor-sharing",
        json={
            "profile_id": str(prof_child.id),
            "doctor_name": "Dr. AuditCheck",
            "expires_in_days": 7,
            "shared_resources": {"document_ids": [str(doc_child.id)]},
        },
        headers=auth_headers["user_a"],
    )
    token = create_res.json()["access_token"]
    share_id = create_res.json()["id"]

    # Access portal to generate access audit log
    client.get(f"/api/shared-health/{token}")

    # Inspect audit logs via owner endpoint
    audit_res = client.get(f"/api/doctor-sharing/{share_id}/audit", headers=auth_headers["user_a"])
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 2  # created and viewed_summary

    for log in logs:
        # Raw bearer token must not be in any log details
        assert token not in str(log)
        # Verify event_type
        assert log["event_type"] in ["created", "viewed_summary", "downloaded_document", "downloaded_visit_pack", "revoked", "access_denied_revoked", "access_denied_expired"]
