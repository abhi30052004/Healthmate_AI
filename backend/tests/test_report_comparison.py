import io
import tempfile
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


@pytest.fixture(name="db_session")
def fixture_db_session(monkeypatch):
    temp_dir = tempfile.mkdtemp(prefix="healthmate_comparison_tests_")
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
        hashed_password=hash_password("ValidPassword123!"),
        is_active=True,
    )
    user_b = User(
        email="patient_beta@healthmate.ai",
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


def seed_comparison_test_reports(db_session: Session, user: User):
    """Seed baseline and newer reports with overlapping, new, missing, and unit-mismatched tests."""
    doc_base = Document(
        owner_id=user.id,
        filename="baseline_blood_work.pdf",
        storage_key=f"{user.id}/base.pdf",
        mime_type="application/pdf",
        file_size=1024,
        checksum_sha256="hash_base",
        processing_status="extracted",
        extracted_text="Glucose: 104 mg/dL [70-99]\nHemoglobin: 14.5 g/dL [13.8-17.2]\nPotassium: 4.0 mEq/L [3.5-5.0]",
        document_date="2025-01-15",
        lab_name="Northside Clinical Labs",
        is_verified=True,
    )
    doc_newer = Document(
        owner_id=user.id,
        filename="followup_blood_work.pdf",
        storage_key=f"{user.id}/newer.pdf",
        mime_type="application/pdf",
        file_size=1024,
        checksum_sha256="hash_newer",
        processing_status="extracted",
        extracted_text="Blood Glucose: 5.4 mmol/L [3.9-5.5]\nHemoglobin: 14.5 g/dL [13.8-17.2]\nTSH: 2.1 mIU/L [0.4-4.0]",
        document_date="2025-07-20",
        lab_name="Apex Health Labs",
        is_verified=True,
    )
    doc_third_inferred = Document(
        owner_id=user.id,
        filename="undated_specialist.pdf",
        storage_key=f"{user.id}/undated.pdf",
        mime_type="application/pdf",
        file_size=1024,
        checksum_sha256="hash_undated",
        processing_status="extracted",
        extracted_text="WBC: 12.0 mg/dL\nHepatitis B: Positive",
        document_date=None,  # Inferred date
        created_at=datetime(2025, 9, 1, 10, 0, tzinfo=timezone.utc),
        lab_name="Specialist Diagnostics",
        is_verified=False,
    )
    db_session.add_all([doc_base, doc_newer, doc_third_inferred])
    db_session.flush()

    # Baseline observations
    # 1. Glucose: 104 mg/dL (Metabolic)
    obs_b1 = DocumentObservation(
        document_id=doc_base.id,
        owner_id=user.id,
        test_name="Glucose",
        normalized_test_name="Fasting Glucose",
        category="Metabolic",
        value="104",
        numeric_value=104.0,
        unit="mg/dL",
        reference_range="70 - 99",
        flag="HIGH",
        source_page=1,
        source_text="Glucose: 104 mg/dL [70-99]",
        is_reviewed=True,
    )
    # 2. Hemoglobin: 14.5 g/dL (Hematology) - will be unchanged
    obs_b2 = DocumentObservation(
        document_id=doc_base.id,
        owner_id=user.id,
        test_name="Hemoglobin",
        normalized_test_name="Hemoglobin",
        category="Hematology",
        value="14.5",
        numeric_value=14.5,
        unit="g/dL",
        reference_range="13.8 - 17.2",
        flag="NORMAL",
        source_page=1,
        source_text="Hemoglobin: 14.5 g/dL [13.8-17.2]",
        is_reviewed=True,
    )
    # 3. Potassium: 4.0 mEq/L (Metabolic) - will be absent from newer (not_found)
    obs_b3 = DocumentObservation(
        document_id=doc_base.id,
        owner_id=user.id,
        test_name="Potassium",
        normalized_test_name="Potassium",
        category="Metabolic",
        value="4.0",
        numeric_value=4.0,
        unit="mEq/L",
        reference_range="3.5 - 5.0",
        flag="NORMAL",
        source_page=1,
        source_text="Potassium: 4.0 mEq/L [3.5-5.0]",
        is_reviewed=True,
    )
    # 4. Zero baseline test (to test safe percentage change)
    obs_b4 = DocumentObservation(
        document_id=doc_base.id,
        owner_id=user.id,
        test_name="Coronary Calcium",
        normalized_test_name="Coronary Calcium",
        category="Cardiovascular",
        value="0",
        numeric_value=0.0,
        unit="Agatston",
        reference_range="0",
        flag="NORMAL",
        source_page=1,
        source_text="Coronary Calcium: 0",
        is_reviewed=True,
    )

    # Newer observations
    # 1. Glucose: 5.4 mmol/L -> converts to ~97.3 mg/dL (decreased from 104)
    obs_n1 = DocumentObservation(
        document_id=doc_newer.id,
        owner_id=user.id,
        test_name="Blood Glucose",
        normalized_test_name="Fasting Glucose",
        category="Metabolic",
        value="5.4",
        numeric_value=5.4,
        unit="mmol/L",
        reference_range="3.9 - 5.5",
        flag="NORMAL",
        source_page=1,
        source_text="Blood Glucose: 5.4 mmol/L [3.9-5.5]",
        is_reviewed=True,
    )
    # 2. Hemoglobin: 14.5 g/dL -> unchanged
    obs_n2 = DocumentObservation(
        document_id=doc_newer.id,
        owner_id=user.id,
        test_name="Hemoglobin",
        normalized_test_name="Hemoglobin",
        category="Hematology",
        value="14.5",
        numeric_value=14.5,
        unit="g/dL",
        reference_range="13.8 - 17.2",
        flag="NORMAL",
        source_page=1,
        source_text="Hemoglobin: 14.5 g/dL [13.8-17.2]",
        is_reviewed=True,
    )
    # 3. TSH: 2.1 mIU/L -> new test (not present in baseline)
    obs_n3 = DocumentObservation(
        document_id=doc_newer.id,
        owner_id=user.id,
        test_name="TSH",
        normalized_test_name="TSH",
        category="Endocrine",
        value="2.1",
        numeric_value=2.1,
        unit="mIU/L",
        reference_range="0.4 - 4.0",
        flag="NORMAL",
        source_page=1,
        source_text="TSH: 2.1 mIU/L [0.4-4.0]",
        is_reviewed=True,
    )
    # 4. Coronary Calcium increased from 0 to 12
    obs_n4 = DocumentObservation(
        document_id=doc_newer.id,
        owner_id=user.id,
        test_name="Coronary Calcium",
        normalized_test_name="Coronary Calcium",
        category="Cardiovascular",
        value="12",
        numeric_value=12.0,
        unit="Agatston",
        reference_range="0",
        flag="ABNORMAL",
        source_page=1,
        source_text="Coronary Calcium: 12",
        is_reviewed=True,
    )

    # Incompatible unit test: e.g. WBC in doc_base (K/uL) vs in third doc (mg/dL)
    obs_b_wbc = DocumentObservation(
        document_id=doc_base.id,
        owner_id=user.id,
        test_name="WBC",
        normalized_test_name="WBC",
        category="Hematology",
        value="7.2",
        numeric_value=7.2,
        unit="K/uL",
        reference_range="4.5 - 11.0",
        flag="NORMAL",
        source_page=1,
        source_text="WBC: 7.2 K/uL",
        is_reviewed=True,
    )
    obs_3_wbc = DocumentObservation(
        document_id=doc_third_inferred.id,
        owner_id=user.id,
        test_name="WBC",
        normalized_test_name="WBC",
        category="Hematology",
        value="12.0",
        numeric_value=12.0,
        unit="mg/dL",  # Incompatible unit!
        reference_range="4.5 - 11.0",
        flag="HIGH",
        source_page=1,
        source_text="WBC: 12.0 mg/dL",
        is_reviewed=False,  # Unreviewed
    )

    # Qualitative observation
    obs_b_hep = DocumentObservation(
        document_id=doc_base.id,
        owner_id=user.id,
        test_name="Hepatitis B Surface Antigen",
        normalized_test_name="Hepatitis B Surface Antigen",
        category="Immunology",
        value="Negative",
        numeric_value=None,
        unit=None,
        reference_range="Negative",
        flag="NORMAL",
        source_page=1,
        source_text="Hepatitis B Surface Antigen: Negative",
        is_reviewed=True,
    )
    obs_3_hep = DocumentObservation(
        document_id=doc_third_inferred.id,
        owner_id=user.id,
        test_name="Hepatitis B Surface Antigen",
        normalized_test_name="Hepatitis B Surface Antigen",
        category="Immunology",
        value="Positive",
        numeric_value=None,
        unit=None,
        reference_range="Negative",
        flag="ABNORMAL",
        source_page=1,
        source_text="Hepatitis B Surface Antigen: Positive",
        is_reviewed=False,
    )

    db_session.add_all([
        obs_b1, obs_b2, obs_b3, obs_b4, obs_b_wbc, obs_b_hep,
        obs_n1, obs_n2, obs_n3, obs_n4,
        obs_3_wbc, obs_3_hep,
    ])
    db_session.commit()
    return doc_base, doc_newer, doc_third_inferred


def test_authenticated_user_can_compare_own_reports(client: TestClient, auth_headers, db_session: Session, users):
    """Test authenticated user can compare two of their uploaded reports."""
    user_a, _ = users
    doc_base, doc_newer, _ = seed_comparison_test_reports(db_session, user_a)

    payload = {
        "document_ids": [str(doc_base.id), str(doc_newer.id)],
        "order_by_date": True,
        "include_unverified": False,
    }
    res = client.post("/api/report-comparison", json=payload, headers=auth_headers["user_a"])
    assert res.status_code == 200
    data = res.json()

    assert len(data["selected_reports"]) == 2
    assert data["ordering_mode"] == "chronological"
    assert data["summary"]["total_comparisons"] >= 4
    assert "does not provide medical diagnoses" in data["medical_disclaimer"]


def test_unauthenticated_request_rejected(client: TestClient):
    """Test unauthenticated request returns 401."""
    res = client.post("/api/report-comparison", json={"document_ids": ["doc-1", "doc-2"]})
    assert res.status_code == 401


def test_cross_user_document_ids_cannot_be_compared(client: TestClient, auth_headers, db_session: Session, users):
    """Test User B cannot compare User A's documents."""
    user_a, user_b = users
    doc_base, doc_newer, _ = seed_comparison_test_reports(db_session, user_a)

    payload = {"document_ids": [str(doc_base.id), str(doc_newer.id)]}
    res = client.post("/api/report-comparison", json=payload, headers=auth_headers["user_b"])
    assert res.status_code == 404
    assert "not accessible" in res.json()["detail"].lower()


def test_equivalent_normalized_test_names_match_correctly(client: TestClient, auth_headers, db_session: Session, users):
    """Test 'Glucose' and 'Blood Glucose' match canonical 'Fasting Glucose'."""
    user_a, _ = users
    doc_base, doc_newer, _ = seed_comparison_test_reports(db_session, user_a)

    payload = {"document_ids": [str(doc_base.id), str(doc_newer.id)]}
    res = client.post("/api/report-comparison", json=payload, headers=auth_headers["user_a"])
    assert res.status_code == 200
    data = res.json()

    glucose_item = next((item for item in data["items"] if item["normalized_test_name"] == "Fasting Glucose"), None)
    assert glucose_item is not None
    assert glucose_item["classification"] == "decreased"
    assert glucose_item["has_converted_units"] is True
    assert glucose_item["standard_unit"] == "mg/dL"


def test_unchanged_numeric_and_new_and_missing_observations(client: TestClient, auth_headers, db_session: Session, users):
    """Test unchanged (Hemoglobin), new (TSH), and missing (Potassium) observations."""
    user_a, _ = users
    doc_base, doc_newer, _ = seed_comparison_test_reports(db_session, user_a)

    payload = {"document_ids": [str(doc_base.id), str(doc_newer.id)]}
    res = client.post("/api/report-comparison", json=payload, headers=auth_headers["user_a"])
    assert res.status_code == 200
    data = res.json()

    # Hemoglobin: unchanged
    hgb = next((i for i in data["items"] if i["normalized_test_name"] == "Hemoglobin"), None)
    assert hgb is not None
    assert hgb["classification"] == "unchanged"
    assert hgb["absolute_change"] == 0.0

    # TSH: new
    tsh = next((i for i in data["items"] if i["normalized_test_name"] == "TSH"), None)
    assert tsh is not None
    assert tsh["classification"] == "new"
    assert tsh["baseline_value"] is None
    assert tsh["newer_value"] == "2.1"

    # Potassium: not_found (in baseline, absent from newer)
    pot = next((i for i in data["items"] if i["normalized_test_name"] == "Potassium"), None)
    assert pot is not None
    assert pot["classification"] == "not_found"
    assert pot["baseline_value"] == "4.0"
    assert pot["newer_value"] is None
    assert "does not indicate" in pot["clinical_change_description"].lower()


def test_percentage_change_handled_safely_for_zero_baseline(client: TestClient, auth_headers, db_session: Session, users):
    """Test percentage change does not raise ZeroDivisionError when baseline numeric value is 0.0."""
    user_a, _ = users
    doc_base, doc_newer, _ = seed_comparison_test_reports(db_session, user_a)

    payload = {"document_ids": [str(doc_base.id), str(doc_newer.id)]}
    res = client.post("/api/report-comparison", json=payload, headers=auth_headers["user_a"])
    assert res.status_code == 200
    data = res.json()

    cac = next((i for i in data["items"] if i["normalized_test_name"] == "Coronary Calcium"), None)
    assert cac is not None
    assert cac["classification"] == "increased"
    assert cac["absolute_change"] == 12.0
    assert cac["percentage_change"] is None  # Handled safely without ZeroDivisionError


def test_incompatible_units_and_unverified_exclusion_inclusion(client: TestClient, auth_headers, db_session: Session, users):
    """Test incompatible units are not compared numerically, and unverified toggle works."""
    user_a, _ = users
    doc_base, _, doc_third = seed_comparison_test_reports(db_session, user_a)

    # 1. Default: include_unverified=False (doc_third observations are unverified, so none compared)
    payload_default = {"document_ids": [str(doc_base.id), str(doc_third.id)], "include_unverified": False}
    res_def = client.post("/api/report-comparison", json=payload_default, headers=auth_headers["user_a"])
    assert res_def.status_code == 200
    data_def = res_def.json()
    # WBC in doc_third is unverified, so in doc_base it's classified as not_found
    wbc_def = next((i for i in data_def["items"] if i["normalized_test_name"] == "WBC"), None)
    assert wbc_def is not None
    assert wbc_def["classification"] == "not_found"

    # 2. Explicit include_unverified=True -> WBC units K/uL vs mg/dL triggers incompatible_units
    payload_unverified = {"document_ids": [str(doc_base.id), str(doc_third.id)], "include_unverified": True}
    res_unv = client.post("/api/report-comparison", json=payload_unverified, headers=auth_headers["user_a"])
    assert res_unv.status_code == 200
    data_unv = res_unv.json()

    wbc_unv = next((i for i in data_unv["items"] if i["normalized_test_name"] == "WBC"), None)
    assert wbc_unv is not None
    assert wbc_unv["classification"] == "incompatible_units"
    assert wbc_unv["requires_review"] is True
    assert "incompatible units" in wbc_unv["clinical_change_description"].lower()

    # Qualitative comparison: Hepatitis B changed Negative -> Positive
    hep = next((i for i in data_unv["items"] if i["normalized_test_name"] == "Hepatitis B Surface Antigen"), None)
    assert hep is not None
    assert hep["classification"] == "qualitative_changed"
    assert hep["baseline_value"] == "Negative"
    assert hep["newer_value"] == "Positive"


def test_pdf_export_endpoint(client: TestClient, auth_headers, db_session: Session, users):
    """Test GET /api/medical-insights/export/pdf returns valid PDF content."""
    user_a, _ = users
    seed_comparison_test_reports(db_session, user_a)

    res = client.get("/api/medical-insights/export/pdf", headers=auth_headers["user_a"])
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")
    assert "attachment; filename=" in res.headers["content-disposition"]


def test_pdf_export_empty_state_for_user_with_no_records(client: TestClient, auth_headers):
    """Test PDF export generates safe empty-state report when user has no uploads."""
    res = client.get("/api/medical-insights/export/pdf", headers=auth_headers["user_b"])
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")


def test_csv_export_mitigates_formula_injection_and_includes_provenance(client: TestClient, auth_headers, db_session: Session, users):
    """Test CSV export sanitizes formula characters (=, +, -, @) and exports observations."""
    user_a, _ = users
    doc_base, _, _ = seed_comparison_test_reports(db_session, user_a)

    # Add an observation with formula injection payload
    injected_obs = DocumentObservation(
        document_id=doc_base.id,
        owner_id=user_a.id,
        test_name="=HYPERLINK('http://evil.com','Click')",
        normalized_test_name="Formula Test",
        category="Toxicology",
        value="+1234",
        numeric_value=None,
        unit=None,
        reference_range="@RANGE",
        flag="-ALERT",
        source_text="=HYPERLINK('http://evil.com','Click')",
        source_page=1,
        is_reviewed=True,
    )
    db_session.add(injected_obs)
    db_session.commit()

    res = client.get("/api/medical-insights/export/csv", headers=auth_headers["user_a"])
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    csv_text = res.content.decode("utf-8-sig")

    # Verify formula mitigation: prefix with single quote
    assert "'=HYPERLINK" in csv_text
    assert "'+1234" in csv_text
    assert "'@RANGE" in csv_text
    assert "'-ALERT" in csv_text
    assert "Clinical Date" in csv_text
    assert "Date Provenance" in csv_text


def test_export_endpoints_cross_user_isolation(client: TestClient, auth_headers, db_session: Session, users):
    """Test User B's CSV export does not contain User A's observations."""
    user_a, _ = users
    seed_comparison_test_reports(db_session, user_a)

    res_b = client.get("/api/medical-insights/export/csv", headers=auth_headers["user_b"])
    assert res_b.status_code == 200
    csv_text_b = res_b.content.decode("utf-8-sig")

    # Header is present, but User A's documents/observations are not
    assert "Clinical Date" in csv_text_b
    assert "Fasting Glucose" not in csv_text_b
    assert "baseline_blood_work.pdf" not in csv_text_b


def test_export_endpoints_inverted_date_boundaries_rejected(client: TestClient, auth_headers):
    # PDF export with start_date > end_date
    res_pdf = client.get(
        "/api/medical-insights/export/pdf?start_date=2025-12-31&end_date=2025-01-01",
        headers=auth_headers["user_a"],
    )
    assert res_pdf.status_code == 422
    assert "start_date cannot be later than end_date" in res_pdf.json()["detail"]

    # CSV export with start_date > end_date
    res_csv = client.get(
        "/api/medical-insights/export/csv?start_date=2025-12-31&end_date=2025-01-01",
        headers=auth_headers["user_a"],
    )
    assert res_csv.status_code == 422
    assert "start_date cannot be later than end_date" in res_csv.json()["detail"]
