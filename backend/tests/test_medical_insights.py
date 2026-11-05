import shutil
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
from app.models.document import Document, DocumentObservation
from app.models.user import User
from app.services.medical_insights import (
    calculate_overview_metrics,
    classify_observation_reference,
    get_data_quality_report,
    get_longitudinal_insights_trends,
    get_medical_findings,
)


@pytest.fixture(name="db_session")
def fixture_db_session(monkeypatch):
    temp_dir = tempfile.mkdtemp(prefix="healthmate_insights_tests_")
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
        test_engine.dispose()
        get_settings.cache_clear()
        shutil.rmtree(temp_dir, ignore_errors=True)


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
        name="User A (SYNTHETIC)",
        email="insights_a@healthmate.ai",
        hashed_password=hash_password("ValidPassword123!"),
        is_active=True,
    )
    user_b = User(
        name="User B (SYNTHETIC)",
        email="insights_b@healthmate.ai",
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


def seed_synthetic_insights_data(db_session: Session, user: User):
    """Seed documents and observations with varied reference ranges and flags."""
    # Document 1: CBC with actual date
    doc1 = Document(
        owner_id=user.id,
        filename="cbc_report_jan.pdf",
        storage_key=f"{user.id}/cbc_jan.pdf",
        mime_type="application/pdf",
        file_size=1024,
        checksum_sha256="hash1",
        processing_status="extracted",
        extracted_text="Hemoglobin: 14.2 g/dL (13.8-17.2)\nWBC: 3.8 K/uL (4.5-11.0)",
        document_date="2025-01-15",
        lab_name="Northside Synthetic Labs",
        is_verified=True,
    )
    # Document 2: Metabolic Panel with missing date (tests inferred date)
    doc2 = Document(
        owner_id=user.id,
        filename="metabolic_apr.pdf",
        storage_key=f"{user.id}/metabolic_apr.pdf",
        mime_type="application/pdf",
        file_size=1024,
        checksum_sha256="hash2",
        processing_status="extracted",
        extracted_text="Blood Glucose: 104 mg/dL [70-99]",
        document_date=None,  # Missing date
        created_at=datetime(2025, 4, 10, 10, 0, 0, tzinfo=timezone.utc),
        lab_name="Metropolitan Diagnostics",
        is_verified=True,
    )
    # Document 3: Follow-up with Glucose in mmol/L and qualitative test
    doc3 = Document(
        owner_id=user.id,
        filename="followup_jul.pdf",
        storage_key=f"{user.id}/followup_jul.pdf",
        mime_type="application/pdf",
        file_size=1024,
        checksum_sha256="hash3",
        processing_status="extracted",
        extracted_text="Fasting Glucose: 5.4 mmol/L [3.9-5.5]\nHepatitis B Surface Antigen: Positive\nTSH: 2.1 mIU/L",
        document_date="2025-07-20",
        lab_name="Apex Clinical",
        is_verified=False,
    )
    db_session.add_all([doc1, doc2, doc3])
    db_session.flush()

    obs1 = DocumentObservation(
        document_id=doc1.id,
        owner_id=user.id,
        test_name="Hemoglobin",
        normalized_test_name="Hemoglobin",
        category="Hematology",
        value="14.2",
        numeric_value=14.2,
        unit="g/dL",
        reference_range="13.8-17.2",
        flag="NORMAL",
        source_page=1,
        source_text="Hemoglobin: 14.2 g/dL (13.8-17.2)",
        is_reviewed=True,
    )
    obs2 = DocumentObservation(
        document_id=doc1.id,
        owner_id=user.id,
        test_name="WBC",
        normalized_test_name="WBC",
        category="Hematology",
        value="3.8",
        numeric_value=3.8,
        unit="K/uL",
        reference_range="4.5-11.0",
        flag="LOW",
        source_page=1,
        source_text="WBC: 3.8 K/uL (4.5-11.0)",
        is_reviewed=True,  # below reference
    )
    obs3 = DocumentObservation(
        document_id=doc2.id,
        owner_id=user.id,
        test_name="Blood Glucose",
        normalized_test_name="Fasting Glucose",
        category="Metabolic",
        value="104",
        numeric_value=104.0,
        unit="mg/dL",
        reference_range="70-99",
        flag="HIGH",
        source_page=1,
        source_text="Blood Glucose: 104 mg/dL [70-99]",
        is_reviewed=True,  # above reference
    )
    obs4 = DocumentObservation(
        document_id=doc3.id,
        owner_id=user.id,
        test_name="Fasting Glucose",
        normalized_test_name="Fasting Glucose",
        category="Metabolic",
        value="5.4",
        numeric_value=5.4,
        unit="mmol/L",
        reference_range="3.9-5.5",
        flag="NORMAL",
        source_page=1,
        source_text="Fasting Glucose: 5.4 mmol/L [3.9-5.5]",
        is_reviewed=True,  # within reference
    )
    obs5 = DocumentObservation(
        document_id=doc3.id,
        owner_id=user.id,
        test_name="Hepatitis B Surface Antigen",
        normalized_test_name="Hepatitis B Surface Antigen",
        category="Immunology",
        value="Positive",
        numeric_value=None,
        unit=None,  # missing unit
        reference_range="Negative",
        flag="ABNORMAL",
        source_page=1,
        source_text="Hepatitis B Surface Antigen: Positive",
        is_reviewed=True,  # qualitative flagged
    )
    obs6 = DocumentObservation(
        document_id=doc3.id,
        owner_id=user.id,
        test_name="TSH",
        normalized_test_name="TSH",
        category="Endocrine",
        value="2.1",
        numeric_value=2.1,
        unit="mIU/L",
        reference_range=None,  # missing reference range
        flag="NORMAL",
        source_page=1,
        source_text="TSH: 2.1 mIU/L",
        is_reviewed=False,  # unreviewed
    )
    db_session.add_all([obs1, obs2, obs3, obs4, obs5, obs6])
    db_session.commit()


def test_overview_metrics_calculation(client: TestClient, auth_headers, db_session: Session, users):
    """Test overview metrics calculation for user with documents and observations."""
    user_a, _ = users
    seed_synthetic_insights_data(db_session, user_a)

    res = client.get("/api/medical-insights/overview", headers=auth_headers["user_a"])
    assert res.status_code == 200
    data = res.json()
    assert data["total_reports"] == 3
    assert data["verified_observations_count"] == 5
    assert data["unverified_observations_count"] == 1
    assert data["reports_with_missing_dates_count"] == 1
    assert data["observations_missing_units_count"] == 1
    assert data["observations_missing_ranges_count"] == 1
    assert data["comparable_tests_with_history_count"] == 1  # Fasting Glucose has 2 verified readings
    assert data["noteworthy_findings_count"] == 3  # WBC (low), Glucose (high), Hep B (positive)


def test_empty_overview_metrics(client: TestClient, auth_headers):
    """Test overview returns safe zeros and nulls for user with zero records."""
    res = client.get("/api/medical-insights/overview", headers=auth_headers["user_b"])
    assert res.status_code == 200
    data = res.json()
    assert data["total_reports"] == 0
    assert data["verified_observations_count"] == 0
    assert data["earliest_date"] is None
    assert data["latest_date"] is None
    assert data["noteworthy_findings_count"] == 0


def test_unauthenticated_request_rejected(client: TestClient):
    """Test unauthenticated requests are rejected."""
    res = client.get("/api/medical-insights/overview")
    assert res.status_code == 401


def test_cross_user_isolation(client: TestClient, auth_headers, db_session: Session, users):
    """Test User B cannot access User A's insights findings or overview."""
    user_a, _ = users
    seed_synthetic_insights_data(db_session, user_a)

    res_b = client.get("/api/medical-insights/findings", headers=auth_headers["user_b"])
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["total"] == 0
    assert len(data_b["items"]) == 0


def test_reference_range_classifications(db_session: Session, users):
    """Test exact classification of observations against printed laboratory bounds."""
    user_a, _ = users
    doc = Document(
        owner_id=user_a.id,
        filename="test.pdf",
        storage_key="test.pdf",
        mime_type="application/pdf",
        file_size=100,
        checksum_sha256="abc",
        processing_status="extracted",
    )
    db_session.add(doc)
    db_session.flush()

    # 1. Below reference
    obs_low = DocumentObservation(
        document_id=doc.id,
        owner_id=user_a.id,
        test_name="Potassium",
        value="3.1",
        numeric_value=3.1,
        reference_range="3.5 - 5.0",
        source_text="Potassium 3.1",
    )
    cls_low, _, _ = classify_observation_reference(obs_low)
    assert cls_low == "below_reference"

    # 2. Above reference
    obs_high = DocumentObservation(
        document_id=doc.id,
        owner_id=user_a.id,
        test_name="Glucose",
        value="140",
        numeric_value=140.0,
        reference_range="70 - 99",
        source_text="Glucose 140",
    )
    cls_high, _, _ = classify_observation_reference(obs_high)
    assert cls_high == "above_reference"

    # 3. Within reference
    obs_norm = DocumentObservation(
        document_id=doc.id,
        owner_id=user_a.id,
        test_name="Hemoglobin",
        value="15.0",
        numeric_value=15.0,
        reference_range="13.8 - 17.2",
        source_text="Hemoglobin 15.0",
    )
    cls_norm, _, _ = classify_observation_reference(obs_norm)
    assert cls_norm == "within_reference"

    # 4. Unknown when missing
    obs_missing_range = DocumentObservation(
        document_id=doc.id,
        owner_id=user_a.id,
        test_name="Unknown Test",
        value="42",
        numeric_value=42.0,
        reference_range=None,
        source_text="Unknown Test 42",
    )
    cls_unknown, _, _ = classify_observation_reference(obs_missing_range)
    assert cls_unknown == "unknown"


def test_discrepancy_between_flag_and_calculated_range(db_session: Session, users):
    """Test flagging discrepancy when explicit lab flag conflicts with printed range."""
    user_a, _ = users
    doc = Document(
        owner_id=user_a.id,
        filename="test.pdf",
        storage_key="test_disc.pdf",
        mime_type="application/pdf",
        file_size=100,
        checksum_sha256="abcd",
        processing_status="extracted",
    )
    db_session.add(doc)
    db_session.flush()

    obs = DocumentObservation(
        document_id=doc.id,
        owner_id=user_a.id,
        test_name="Sodium",
        value="140",
        numeric_value=140.0,
        reference_range="135 - 145",
        flag="HIGH",  # Value is 140 within 135-145, but flag says HIGH
        source_text="Sodium: 140 (HIGH)",
    )
    cls_res, req_review, expl = classify_observation_reference(obs)
    assert cls_res == "within_reference"
    assert req_review is True
    assert "falls within printed range" in expl
    assert "HIGH" in expl


def test_findings_filters_and_unverified_exclusion(client: TestClient, auth_headers, db_session: Session, users):
    """Test findings endpoint filters by classification, category, test name, and review status."""
    user_a, _ = users
    seed_synthetic_insights_data(db_session, user_a)

    # 1. Filter by above_reference
    res = client.get(
        "/api/medical-insights/findings?classification=above_reference",
        headers=auth_headers["user_a"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["original_test_name"] == "Blood Glucose"

    # 2. Filter by category
    res_cat = client.get(
        "/api/medical-insights/findings?category=Hematology",
        headers=auth_headers["user_a"],
    )
    assert res_cat.status_code == 200
    assert res_cat.json()["total"] == 2  # Hemoglobin and WBC

    # 3. By default, unverified TSH is excluded
    res_tsh = client.get(
        "/api/medical-insights/findings?test_name=TSH",
        headers=auth_headers["user_a"],
    )
    assert res_tsh.status_code == 200
    assert res_tsh.json()["total"] == 0

    # 4. Explicit inclusion returns unverified TSH
    res_tsh_unv = client.get(
        "/api/medical-insights/findings?test_name=TSH&include_unverified=true",
        headers=auth_headers["user_a"],
    )
    assert res_tsh_unv.status_code == 200
    assert res_tsh_unv.json()["total"] == 1
    assert res_tsh_unv.json()["items"][0]["is_reviewed"] is False


def test_longitudinal_trends_delta_and_percentage_calculation(client: TestClient, auth_headers, db_session: Session, users):
    """Test historical trends compute absolute and percentage delta with unit harmonization."""
    user_a, _ = users
    seed_synthetic_insights_data(db_session, user_a)

    res = client.get("/api/medical-insights/trends", headers=auth_headers["user_a"])
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) >= 1

    glucose_trend = next((t for t in data["items"] if t["normalized_test_name"] == "Fasting Glucose"), None)
    assert glucose_trend is not None
    assert glucose_trend["standard_unit"] == "mg/dL"
    assert glucose_trend["has_converted_units"] is True
    assert glucose_trend["previous_standard_value"] == 104.0
    # 5.4 mmol/L * 18.0182 = approx 97.3 mg/dL
    assert glucose_trend["latest_standard_value"] == pytest.approx(97.3, rel=1e-2)
    assert glucose_trend["direction"] == "decreased"
    assert glucose_trend["percentage_change"] < 0
    assert "Decreased by" in glucose_trend["clinical_change_description"]


@pytest.mark.anyio
async def test_personalized_health_summary_generation(client: TestClient, auth_headers, db_session: Session, users):
    """Test personalized summary generation with citations, disclaimers, and discussion questions."""
    user_a, _ = users
    seed_synthetic_insights_data(db_session, user_a)

    res = client.get("/api/medical-insights/summary", headers=auth_headers["user_a"])
    assert res.status_code == 200
    data = res.json()
    assert data["summary_mode"] == "offline"
    assert len(data["key_findings"]) > 0
    assert len(data["longitudinal_highlights"]) > 0
    assert len(data["suggested_clinician_questions"]) > 0
    assert len(data["citations"]) > 0

    # Negative constraint verification: does not claim "all results are normal"
    assert "all results are normal" not in data["narrative_summary"].lower()
    for kf in data["key_findings"]:
        assert "all results are normal" not in kf.lower()

    # Disclaimer present
    assert "does not diagnose medical conditions" in data["medical_disclaimer"]


def test_data_quality_report_identifies_gaps(client: TestClient, auth_headers, db_session: Session, users):
    """Test data quality report identifies missing dates, missing units, and unreviewed items."""
    user_a, _ = users
    seed_synthetic_insights_data(db_session, user_a)

    res = client.get("/api/medical-insights/data-quality", headers=auth_headers["user_a"])
    assert res.status_code == 200
    data = res.json()
    assert data["total_issues"] > 0
    assert data["missing_dates_count"] == 1  # metabolic_apr has no date
    assert data["missing_units_count"] == 1  # Hep B has no unit
    assert data["missing_ranges_count"] == 1  # TSH has no range
    assert data["unverified_observations_count"] == 1  # TSH is unverified
