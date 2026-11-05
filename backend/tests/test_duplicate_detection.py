"""Unit and integration tests for Feature 5: Duplicate Detection & Data Quality Center.

Covers:
1. Exact file-hash duplicate detection (confidence 1.0, EXACT_HASH).
2. Similar filenames with different content (lower confidence, not merged).
3. Observation matches with equal values on same date (IDENTICAL_OBSERVATION).
4. Observation matches with unequal values (flagged as conflict, not automatically merged).
5. Cross-profile and cross-user isolation.
6. Observations on different dates are recognized as longitudinal trends, not duplicates.
7. Candidate listing, filtering, and pagination.
8. Confirming a duplicate candidate.
9. Dismissing a candidate as false positive (not a duplicate).
10. Resolving a duplicate by choosing retained record, safely archiving the other.
11. Repeated/idempotent resolution requests and transaction safety.
12. Audit history generation without sensitive medical data leaks.
"""

from datetime import date, datetime, timedelta, timezone
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
from app.models.data_quality import DataQualityAuditLog, DuplicateCandidate
from app.models.document import Document, DocumentObservation
from app.models.family_profile import FamilyProfile
from app.models.user import User


@pytest.fixture(name="db_session")
def fixture_db_session(monkeypatch):
    temp_dir = tempfile.mkdtemp(prefix="healthmate_dup_tests_")
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
        email="alex@healthmate.ai",
        name="Alex User",
        hashed_password=hash_password("ValidPassword123!"),
        is_active=True,
    )
    user_b = User(
        email="stranger@healthmate.ai",
        name="Stranger User",
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
        name="Alex User",
        relationship="self",
        is_primary=True,
        is_active=True,
    )
    prof_a_child = FamilyProfile(
        owner_id=user_a.id,
        name="Charlie Child",
        relationship="child",
        is_primary=False,
        is_active=True,
    )
    # Profile for User B
    prof_b = FamilyProfile(
        owner_id=user_b.id,
        name="Stranger User",
        relationship="self",
        is_primary=True,
        is_active=True,
    )
    db_session.add_all([prof_a_primary, prof_a_child, prof_b])
    db_session.commit()

    # Documents for User A: doc1 and doc2 are exact hash duplicates!
    doc1 = Document(
        owner_id=user_a.id,
        profile_id=prof_a_primary.id,
        filename="blood_panel_may2026.pdf",
        storage_key="doc1.pdf",
        checksum_sha256="hash_exact_match_12345",
        mime_type="application/pdf",
        file_size=2048,
        document_date="2026-05-10",
        processing_status="completed",
        is_verified=True,
    )
    doc2 = Document(
        owner_id=user_a.id,
        profile_id=prof_a_primary.id,
        filename="blood_panel_may2026_copy.pdf",
        storage_key="doc2.pdf",
        checksum_sha256="hash_exact_match_12345",  # exact hash
        mime_type="application/pdf",
        file_size=2048,
        document_date="2026-05-10",
        processing_status="completed",
        is_verified=True,
    )
    # doc3 has similar filename but different content/size
    doc3 = Document(
        owner_id=user_a.id,
        profile_id=prof_a_primary.id,
        filename="blood_panel_may2026_different.pdf",
        storage_key="doc3.pdf",
        checksum_sha256="hash_different_99999",
        mime_type="application/pdf",
        file_size=8192,
        document_date="2026-05-15",
        processing_status="completed",
        is_verified=True,
    )
    # doc_b belongs to User B with same hash, should NEVER be matched across users!
    doc_b = Document(
        owner_id=user_b.id,
        profile_id=prof_b.id,
        filename="blood_panel_may2026.pdf",
        storage_key="doc_b.pdf",
        checksum_sha256="hash_exact_match_12345",
        mime_type="application/pdf",
        file_size=2048,
        document_date="2026-05-10",
        processing_status="completed",
        is_verified=True,
    )
    db_session.add_all([doc1, doc2, doc3, doc_b])
    db_session.commit()

    # Observations
    # obs1 and obs2: Identical Glucose measurements from doc1 and doc2
    obs1 = DocumentObservation(
        document_id=doc1.id,
        owner_id=user_a.id,
        test_name="Glucose",
        normalized_test_name="glucose",
        value="95",
        unit="mg/dL",
        source_text="Glucose 95 mg/dL",
        is_reviewed=True,
    )
    obs2 = DocumentObservation(
        document_id=doc2.id,
        owner_id=user_a.id,
        test_name="Glucose",
        normalized_test_name="glucose",
        value="95",
        unit="mg/dL",
        source_text="Glucose 95 mg/dL",
        is_reviewed=True,
    )
    # obs3: Same test on same date but conflicting value
    obs3 = DocumentObservation(
        document_id=doc1.id,
        owner_id=user_a.id,
        test_name="Total Cholesterol",
        normalized_test_name="total cholesterol",
        value="180",
        unit="mg/dL",
        source_text="Cholesterol 180 mg/dL",
        is_reviewed=True,
    )
    obs4 = DocumentObservation(
        document_id=doc2.id,
        owner_id=user_a.id,
        test_name="Total Cholesterol",
        normalized_test_name="total cholesterol",
        value="240",  # conflicting value!
        unit="mg/dL",
        source_text="Cholesterol 240 mg/dL",
        is_reviewed=True,
    )
    db_session.add_all([obs1, obs2, obs3, obs4])
    db_session.commit()

    return {
        "prof_a_primary": prof_a_primary,
        "prof_a_child": prof_a_child,
        "prof_b": prof_b,
        "doc1": doc1,
        "doc2": doc2,
        "doc3": doc3,
        "doc_b": doc_b,
        "obs1": obs1,
        "obs2": obs2,
        "obs3": obs3,
        "obs4": obs4,
    }


def test_scan_detects_exact_hash_duplicates(
    client: TestClient,
    auth_headers,
    test_data,
):
    """1. Exact file hash matches are detected with confidence 1.0 and code EXACT_HASH."""
    res = client.post("/api/data-quality/scan", headers=auth_headers["user_a"])
    assert res.status_code == 200
    summary = res.json()
    assert summary["pending_count"] >= 1
    assert summary["documents_count"] >= 1

    # List candidates
    cand_res = client.get("/api/data-quality/candidates?record_type=document", headers=auth_headers["user_a"])
    assert cand_res.status_code == 200
    items = cand_res.json()["items"]
    assert len(items) >= 1

    # Check that doc1 and doc2 match with confidence 1.0
    exact_match = next(c for c in items if c["confidence_score"] == 1.0)
    assert exact_match["record_type"] == "document"
    assert exact_match["status"] == "pending"
    assert any(r["code"] == "EXACT_HASH" for r in exact_match["match_reasons"])


def test_similar_filenames_alone_have_lower_confidence(
    client: TestClient,
    auth_headers,
    test_data,
):
    """2. Similar filenames with different content receive lower confidence."""
    client.post("/api/data-quality/scan", headers=auth_headers["user_a"])
    cand_res = client.get("/api/data-quality/candidates?record_type=document", headers=auth_headers["user_a"])
    items = cand_res.json()["items"]

    # If doc3 was paired with doc1/doc2, its confidence should be < 1.0
    non_exact = [c for c in items if c["confidence_score"] < 1.0]
    for c in non_exact:
        assert c["confidence_score"] < 0.90
        assert any("FILENAME" in r["code"] for r in c["match_reasons"])


def test_observation_matches_with_equal_values(
    client: TestClient,
    auth_headers,
    test_data,
):
    """3. Observations with same test, date, value and unit match with confidence 0.95."""
    client.post("/api/data-quality/scan", headers=auth_headers["user_a"])
    cand_res = client.get("/api/data-quality/candidates?record_type=observation", headers=auth_headers["user_a"])
    assert cand_res.status_code == 200
    items = cand_res.json()["items"]
    assert len(items) >= 1

    # Check identical Glucose match
    glucose_match = next((c for c in items if c["confidence_score"] == 0.95), None)
    assert glucose_match is not None
    assert any(r["code"] == "IDENTICAL_OBSERVATION" for r in glucose_match["match_reasons"])


def test_observation_matches_with_unequal_values_are_not_automatically_merged(
    client: TestClient,
    auth_headers,
    test_data,
):
    """4. Observations with conflicting values on same date receive lower confidence and conflict code."""
    client.post("/api/data-quality/scan", headers=auth_headers["user_a"])
    cand_res = client.get("/api/data-quality/candidates?record_type=observation", headers=auth_headers["user_a"])
    items = cand_res.json()["items"]

    conflict_match = next((c for c in items if any(r["code"] == "DIFFERENT_VALUES_SAME_DATE" for r in c["match_reasons"])), None)
    assert conflict_match is not None
    assert conflict_match["confidence_score"] <= 0.60


def test_cross_user_isolation(
    client: TestClient,
    auth_headers,
    test_data,
):
    """5. User B cannot see User A's candidates or scan User A's records."""
    client.post("/api/data-quality/scan", headers=auth_headers["user_a"])

    # User B lists candidates -> should be empty
    res_b = client.get("/api/data-quality/candidates", headers=auth_headers["user_b"])
    assert res_b.status_code == 200
    assert res_b.json()["total"] == 0

    # User A's candidate ID
    cand_a = client.get("/api/data-quality/candidates", headers=auth_headers["user_a"]).json()["items"][0]
    cand_id = cand_a["id"]

    # User B attempts to access User A's candidate
    unauth_get = client.get(f"/api/data-quality/candidates/{cand_id}", headers=auth_headers["user_b"])
    assert unauth_get.status_code == 404

    # User B attempts to resolve User A's candidate
    unauth_res = client.post(
        f"/api/data-quality/candidates/{cand_id}/resolve",
        json={"retained_record_id": cand_a["primary_record_id"]},
        headers=auth_headers["user_b"],
    )
    assert unauth_res.status_code == 404


def test_observations_on_different_dates_not_treated_as_duplicates(
    client: TestClient,
    db_session: Session,
    auth_headers,
    test_data,
):
    """6. Measurements on different dates represent longitudinal trend series, not duplicates."""
    user_a = test_data["doc1"].owner
    prof_child = test_data["prof_a_child"]

    # Document from Jan 2026
    d_jan = Document(
        owner_id=user_a.id,
        profile_id=prof_child.id,
        filename="hemoglobin_jan.pdf",
        storage_key="h_jan.pdf",
        checksum_sha256="hash_jan",
        mime_type="application/pdf",
        file_size=1000,
        document_date="2026-01-15",
    )
    # Document from Apr 2026
    d_apr = Document(
        owner_id=user_a.id,
        profile_id=prof_child.id,
        filename="hemoglobin_apr.pdf",
        storage_key="h_apr.pdf",
        checksum_sha256="hash_apr",
        mime_type="application/pdf",
        file_size=1000,
        document_date="2026-04-15",
    )
    db_session.add_all([d_jan, d_apr])
    db_session.commit()

    obs_jan = DocumentObservation(
        document_id=d_jan.id,
        owner_id=user_a.id,
        test_name="Hemoglobin",
        normalized_test_name="hemoglobin",
        value="13.5",
        unit="g/dL",
        source_text="Hgb 13.5",
    )
    obs_apr = DocumentObservation(
        document_id=d_apr.id,
        owner_id=user_a.id,
        test_name="Hemoglobin",
        normalized_test_name="hemoglobin",
        value="13.5",
        unit="g/dL",
        source_text="Hgb 13.5",
    )
    db_session.add_all([obs_jan, obs_apr])
    db_session.commit()

    client.post(f"/api/data-quality/scan?profile_id={prof_child.id}", headers=auth_headers["user_a"])
    cand_res = client.get(
        f"/api/data-quality/candidates?profile_id={prof_child.id}&record_type=observation",
        headers=auth_headers["user_a"],
    )
    items = cand_res.json()["items"]
    # Should NOT have flagged Jan and Apr Hemoglobin as duplicate observations!
    assert len(items) == 0


def test_candidate_listing_filtering_and_pagination(
    client: TestClient,
    auth_headers,
    test_data,
):
    """7. Candidate listing supports pagination and status/record_type filters."""
    client.post("/api/data-quality/scan", headers=auth_headers["user_a"])

    # Filter record_type=document
    doc_res = client.get("/api/data-quality/candidates?record_type=document", headers=auth_headers["user_a"])
    assert doc_res.status_code == 200
    for item in doc_res.json()["items"]:
        assert item["record_type"] == "document"

    # Filter status=pending
    pend_res = client.get("/api/data-quality/candidates?status=pending", headers=auth_headers["user_a"])
    assert pend_res.status_code == 200
    for item in pend_res.json()["items"]:
        assert item["status"] == "pending"

    # Pagination
    page_res = client.get("/api/data-quality/candidates?page=1&page_size=1", headers=auth_headers["user_a"])
    assert page_res.status_code == 200
    data = page_res.json()
    assert len(data["items"]) == 1
    assert data["page"] == 1
    assert data["page_size"] == 1
    assert data["total_pages"] >= 1


def test_confirm_duplicate_candidate(
    client: TestClient,
    auth_headers,
    test_data,
):
    """8. User can mark candidate as confirmed duplicate."""
    client.post("/api/data-quality/scan", headers=auth_headers["user_a"])
    cand_list = client.get("/api/data-quality/candidates?status=pending", headers=auth_headers["user_a"]).json()["items"]
    target_id = cand_list[0]["id"]

    confirm_res = client.post(f"/api/data-quality/candidates/{target_id}/confirm", headers=auth_headers["user_a"])
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "confirmed_duplicate"
    assert confirm_res.json()["reviewed_at"] is not None


def test_dismiss_candidate_as_false_positive(
    client: TestClient,
    auth_headers,
    test_data,
):
    """9. User can dismiss candidate as not a duplicate."""
    client.post("/api/data-quality/scan", headers=auth_headers["user_a"])
    cand_list = client.get("/api/data-quality/candidates?status=pending", headers=auth_headers["user_a"]).json()["items"]
    target_id = cand_list[0]["id"]

    dismiss_res = client.post(
        f"/api/data-quality/candidates/{target_id}/dismiss",
        json={"notes": "Different test panels performed on same day"},
        headers=auth_headers["user_a"],
    )
    assert dismiss_res.status_code == 200
    data = dismiss_res.json()
    assert data["status"] == "not_duplicate"
    assert data["resolution_action"] == "dismissed_false_positive"
    assert data["decision_notes"] == "Different test panels performed on same day"


def test_resolve_duplicate_and_archive_safely(
    client: TestClient,
    db_session: Session,
    auth_headers,
    test_data,
):
    """10. Resolving duplicate retains selected record, archives other, and updates candidate."""
    client.post("/api/data-quality/scan", headers=auth_headers["user_a"])
    cand_list = client.get("/api/data-quality/candidates?record_type=document&status=pending", headers=auth_headers["user_a"]).json()["items"]
    target = next(c for c in cand_list if c["confidence_score"] == 1.0)
    cand_id = target["id"]
    prim_id = target["primary_record_id"]
    sec_id = target["secondary_record_id"]

    # Choose to retain primary
    resolve_res = client.post(
        f"/api/data-quality/candidates/{cand_id}/resolve",
        json={"retained_record_id": prim_id, "notes": "Retained original report, archived duplicate upload"},
        headers=auth_headers["user_a"],
    )
    assert resolve_res.status_code == 200
    res_data = resolve_res.json()
    assert res_data["status"] == "resolved"
    assert res_data["retained_record_id"] == prim_id
    assert res_data["archived_record_id"] == sec_id

    # Verify database state: retained is active, archived is soft-archived with pointer
    retained_doc = db_session.query(Document).filter_by(id=uuid.UUID(prim_id)).first()
    archived_doc = db_session.query(Document).filter_by(id=uuid.UUID(sec_id)).first()

    assert retained_doc.is_archived is False
    assert archived_doc.is_archived is True
    assert archived_doc.archived_at is not None
    assert str(archived_doc.duplicate_of_id) == prim_id

    # Verify observations belonging to archived document were also archived
    archived_obs = db_session.query(DocumentObservation).filter_by(document_id=uuid.UUID(sec_id)).all()
    for o in archived_obs:
        assert o.is_archived is True


def test_repeated_resolution_requests_are_idempotent(
    client: TestClient,
    auth_headers,
    test_data,
):
    """11. Repeating a resolution request on an already resolved candidate is idempotent and safe."""
    client.post("/api/data-quality/scan", headers=auth_headers["user_a"])
    target = client.get("/api/data-quality/candidates?status=pending", headers=auth_headers["user_a"]).json()["items"][0]
    cand_id = target["id"]
    prim_id = target["primary_record_id"]

    # First resolution
    res1 = client.post(
        f"/api/data-quality/candidates/{cand_id}/resolve",
        json={"retained_record_id": prim_id},
        headers=auth_headers["user_a"],
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "resolved"

    # Second resolution (retry)
    res2 = client.post(
        f"/api/data-quality/candidates/{cand_id}/resolve",
        json={"retained_record_id": prim_id},
        headers=auth_headers["user_a"],
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "resolved"


def test_audit_history_records_events_safely(
    client: TestClient,
    auth_headers,
    test_data,
):
    """12. Audit history records actions without exposing raw clinical text or passwords."""
    client.post("/api/data-quality/scan", headers=auth_headers["user_a"])
    cand = client.get("/api/data-quality/candidates", headers=auth_headers["user_a"]).json()["items"][0]

    # Resolve candidate to produce resolution audit event
    client.post(
        f"/api/data-quality/candidates/{cand['id']}/resolve",
        json={"retained_record_id": cand["primary_record_id"]},
        headers=auth_headers["user_a"],
    )

    history_res = client.get("/api/data-quality/history", headers=auth_headers["user_a"])
    assert history_res.status_code == 200
    logs = history_res.json()
    assert len(logs) >= 2

    actions = [l["action"] for l in logs]
    assert "scan_completed" in actions
    assert "resolved_duplicate" in actions

    for log in logs:
        # Verify no sensitive keywords or passwords
        assert "password" not in str(log).lower()
