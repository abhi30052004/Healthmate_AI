import io
import shutil
import tempfile
import uuid
from pathlib import Path

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
from app.services.normalization import (
    are_units_compatible,
    convert_to_standard_unit,
    normalize_test_name,
)

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures" / "synthetic_reports"


@pytest.fixture(name="db_session")
def fixture_db_session(monkeypatch):
    temp_dir = tempfile.mkdtemp(prefix="healthmate_timeline_tests_")
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


@pytest.fixture(name="user_a")
def fixture_user_a(db_session: Session) -> User:
    user = User(
        id=uuid.uuid4(),
        email="timeline_a@healthmate.ai",
        hashed_password=hash_password("PatientSecret123!"),
        name="Timeline Patient A",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(name="token_a")
def fixture_token_a(user_a: User) -> str:
    return create_access_token(str(user_a.id))


@pytest.fixture(name="user_b")
def fixture_user_b(db_session: Session) -> User:
    user = User(
        id=uuid.uuid4(),
        email="timeline_b@healthmate.ai",
        hashed_password=hash_password("PatientSecret123!"),
        name="Timeline Patient B",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(name="token_b")
def fixture_token_b(user_b: User) -> str:
    return create_access_token(str(user_b.id))


# ---------------------------------------------------------------------------
# Unit Tests: Normalization and Unit Conversion
# ---------------------------------------------------------------------------


def test_test_name_normalization():
    # Glucose variations
    assert normalize_test_name("Fasting Glucose") == ("Fasting Glucose", "Metabolic")
    assert normalize_test_name("Blood Glucose") == ("Fasting Glucose", "Metabolic")
    assert normalize_test_name("Glucose") == ("Fasting Glucose", "Metabolic")

    # Hb variations
    assert normalize_test_name("Hemoglobin") == ("Hemoglobin", "Hematology")
    assert normalize_test_name("Hb") == ("Hemoglobin", "Hematology")
    assert normalize_test_name("Hgb") == ("Hemoglobin", "Hematology")

    # Cholesterol variations
    assert normalize_test_name("Total Cholesterol") == ("Total Cholesterol", "Lipids")
    assert normalize_test_name("Cholesterol") == ("Total Cholesterol", "Lipids")
    assert normalize_test_name("LDL-C") == ("LDL Cholesterol", "Lipids")

    # Endocrine
    assert normalize_test_name("TSH") == ("TSH", "Endocrine")
    assert normalize_test_name("Free T4") == ("Free T4", "Endocrine")


def test_unit_compatibility_and_conversion():
    # Glucose: mmol/L to mg/dL is compatible
    assert are_units_compatible("Fasting Glucose", "mg/dL", "mmol/L") is True
    assert are_units_compatible("Fasting Glucose", "mg/dL", "mg/dL") is True
    # Incompatible units
    assert are_units_compatible("Fasting Glucose", "mg/dL", "%") is False
    assert are_units_compatible("Hemoglobin", "g/dL", "mIU/L") is False

    # Conversion of 5.4 mmol/L to mg/dL: 5.4 * 18.0182 = 97.3 mg/dL
    conv_val, std_unit, was_conv = convert_to_standard_unit("Fasting Glucose", 5.4, "mmol/L")
    assert conv_val == 97.3
    assert std_unit == "mg/dL"
    assert was_conv is True

    # Already standard unit: 104 mg/dL
    conv_val2, std_unit2, was_conv2 = convert_to_standard_unit("Fasting Glucose", 104.0, "mg/dL")
    assert conv_val2 == 104.0
    assert std_unit2 == "mg/dL"
    assert was_conv2 is False


# ---------------------------------------------------------------------------
# Integration Tests: Timeline API & Chronological Ordering
# ---------------------------------------------------------------------------


def test_timeline_chronological_ordering_and_provenance(client: TestClient, token_a: str):
    """Upload Reports 1, 2, 3, 4, 5 and verify timeline sorts strictly chronologically."""
    # 1. Upload Report 03 (2025-04-02) first
    r3_path = FIXTURES_DIR / "report_03_glucose_2025-04-02.pdf"
    with open(r3_path, "rb") as f:
        res = client.post("/api/documents", headers={"Authorization": f"Bearer {token_a}"}, files={"file": (r3_path.name, f, "application/pdf")})
    d3_id = res.json()["id"]
    client.post(f"/api/documents/{d3_id}/verify", headers={"Authorization": f"Bearer {token_a}"})

    # 2. Upload Report 01 (2025-01-15) second
    r1_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(r1_path, "rb") as f:
        res = client.post("/api/documents", headers={"Authorization": f"Bearer {token_a}"}, files={"file": (r1_path.name, f, "application/pdf")})
    d1_id = res.json()["id"]
    client.post(f"/api/documents/{d1_id}/verify", headers={"Authorization": f"Bearer {token_a}"})

    # 3. Upload Report 04 (2025-07-20) third
    r4_path = FIXTURES_DIR / "report_04_glucose_mmol_2025-07-20.pdf"
    with open(r4_path, "rb") as f:
        res = client.post("/api/documents", headers={"Authorization": f"Bearer {token_a}"}, files={"file": (r4_path.name, f, "application/pdf")})
    d4_id = res.json()["id"]
    client.post(f"/api/documents/{d4_id}/verify", headers={"Authorization": f"Bearer {token_a}"})

    # Fetch timeline
    timeline_res = client.get("/api/timeline", headers={"Authorization": f"Bearer {token_a}"})
    assert timeline_res.status_code == 200
    data = timeline_res.json()
    items = data["items"]
    assert len(items) == 9  # CBC (4) + Metabolic (3) + Glucose/HbA1c (2)

    # Check chronological ordering: earliest to latest
    dates = [it["clinical_date"] for it in items]
    assert dates == sorted(dates)
    assert dates[0] == "2025-01-15"
    assert dates[-1] == "2025-07-20"

    # Verify provenance fields
    for item in items:
        assert item["document_id"] is not None
        assert item["document_filename"] is not None
        assert item["source_page"] >= 1
        assert len(item["source_text"]) > 0
        assert item["date_type"] == "actual"
        assert item["is_reviewed"] is True


def test_timeline_filters(client: TestClient, token_a: str):
    """Test date-range, category, and test-name filtering."""
    # Upload Report 1 (CBC: 2025-01-15) and Report 2 (Lipid: 2025-03-10)
    with open(FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf", "rb") as f:
        d1 = client.post("/api/documents", headers={"Authorization": f"Bearer {token_a}"}, files={"file": ("cbc.pdf", f, "application/pdf")}).json()["id"]
    client.post(f"/api/documents/{d1}/verify", headers={"Authorization": f"Bearer {token_a}"})

    with open(FIXTURES_DIR / "report_02_lipid_2025-03-10.pdf", "rb") as f:
        d2 = client.post("/api/documents", headers={"Authorization": f"Bearer {token_a}"}, files={"file": ("lipid.pdf", f, "application/pdf")}).json()["id"]
    client.post(f"/api/documents/{d2}/verify", headers={"Authorization": f"Bearer {token_a}"})

    # Filter by category: Hematology
    res_cat = client.get("/api/timeline?category=Hematology", headers={"Authorization": f"Bearer {token_a}"})
    assert res_cat.status_code == 200
    assert len(res_cat.json()["items"]) == 4
    for it in res_cat.json()["items"]:
        assert it["category"] == "Hematology"

    # Filter by category: Lipids
    res_lip = client.get("/api/timeline?category=Lipids", headers={"Authorization": f"Bearer {token_a}"})
    assert len(res_lip.json()["items"]) == 4

    # Filter by test name: Hemoglobin
    res_test = client.get("/api/timeline?test_name=Hemoglobin", headers={"Authorization": f"Bearer {token_a}"})
    assert len(res_test.json()["items"]) == 1
    assert res_test.json()["items"][0]["normalized_test_name"] == "Hemoglobin"

    # Filter by date range: only 2025-03-01 to 2025-03-31
    res_date = client.get("/api/timeline?start_date=2025-03-01&end_date=2025-03-31", headers={"Authorization": f"Bearer {token_a}"})
    assert len(res_date.json()["items"]) == 4
    assert res_date.json()["items"][0]["clinical_date"] == "2025-03-10"


def test_timeline_include_unverified_toggle(client: TestClient, token_a: str):
    """By default, unverified observations are excluded; included when include_unverified=true."""
    with open(FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf", "rb") as f:
        client.post("/api/documents", headers={"Authorization": f"Bearer {token_a}"}, files={"file": ("cbc.pdf", f, "application/pdf")})

    # Unverified document
    # Default: include_unverified=false -> 0 items
    res_default = client.get("/api/timeline", headers={"Authorization": f"Bearer {token_a}"})
    assert res_default.status_code == 200
    assert len(res_default.json()["items"]) == 0

    # With include_unverified=true -> 4 items returned, each marked is_reviewed=False
    res_unverified = client.get("/api/timeline?include_unverified=true", headers={"Authorization": f"Bearer {token_a}"})
    assert res_unverified.status_code == 200
    assert len(res_unverified.json()["items"]) == 4
    for it in res_unverified.json()["items"]:
        assert it["is_reviewed"] is False


def test_timeline_trends_longitudinal_series(client: TestClient, token_a: str):
    """Verify trends group repeated measurements for Fasting Glucose across 2 reports."""
    # Report 3 (Fasting Glucose 104 mg/dL on 2025-04-02)
    with open(FIXTURES_DIR / "report_03_glucose_2025-04-02.pdf", "rb") as f:
        d3 = client.post("/api/documents", headers={"Authorization": f"Bearer {token_a}"}, files={"file": ("glucose_mg.pdf", f, "application/pdf")}).json()["id"]
    client.post(f"/api/documents/{d3}/verify", headers={"Authorization": f"Bearer {token_a}"})

    # Report 4 (Fasting Glucose 5.4 mmol/L on 2025-07-20)
    with open(FIXTURES_DIR / "report_04_glucose_mmol_2025-07-20.pdf", "rb") as f:
        d4 = client.post("/api/documents", headers={"Authorization": f"Bearer {token_a}"}, files={"file": ("glucose_mmol.pdf", f, "application/pdf")}).json()["id"]
    client.post(f"/api/documents/{d4}/verify", headers={"Authorization": f"Bearer {token_a}"})

    res = client.get("/api/timeline/trends", headers={"Authorization": f"Bearer {token_a}"})
    assert res.status_code == 200
    series_list = res.json()["series"]

    glucose_series = next((s for s in series_list if s["normalized_test_name"] == "Fasting Glucose"), None)
    assert glucose_series is not None
    assert glucose_series["has_multiple_points"] is True
    assert glucose_series["has_converted_units"] is True
    assert glucose_series["standard_unit"] == "mg/dL"
    assert len(glucose_series["points"]) == 2

    # Point 1 (2025-04-02): 104.0 mg/dL
    assert glucose_series["points"][0]["date"] == "2025-04-02"
    assert glucose_series["points"][0]["standardized_numeric_value"] == 104.0

    # Point 2 (2025-07-20): 5.4 mmol/L converted to 97.3 mg/dL
    assert glucose_series["points"][1]["date"] == "2025-07-20"
    assert glucose_series["points"][1]["original_unit"] == "mmol/L"
    assert glucose_series["points"][1]["standardized_numeric_value"] == 97.3


def test_timeline_summary_metrics(client: TestClient, token_a: str):
    """Test GET /api/timeline/summary returns factual metrics and repeated tests."""
    with open(FIXTURES_DIR / "report_03_glucose_2025-04-02.pdf", "rb") as f:
        d3 = client.post("/api/documents", headers={"Authorization": f"Bearer {token_a}"}, files={"file": ("r3.pdf", f, "application/pdf")}).json()["id"]
    client.post(f"/api/documents/{d3}/verify", headers={"Authorization": f"Bearer {token_a}"})

    with open(FIXTURES_DIR / "report_04_glucose_mmol_2025-07-20.pdf", "rb") as f:
        d4 = client.post("/api/documents", headers={"Authorization": f"Bearer {token_a}"}, files={"file": ("r4.pdf", f, "application/pdf")}).json()["id"]
    client.post(f"/api/documents/{d4}/verify", headers={"Authorization": f"Bearer {token_a}"})

    summary_res = client.get("/api/timeline/summary", headers={"Authorization": f"Bearer {token_a}"})
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_reports"] == 2
    assert summary["total_observations"] == 5
    assert summary["earliest_date"] == "2025-04-02"
    assert summary["latest_date"] == "2025-07-20"
    assert "Metabolic" in summary["categories"]

    repeated = summary["repeated_tests"]
    assert len(repeated) >= 2  # Fasting Glucose and HbA1c
    rep_names = [r["normalized_test_name"] for r in repeated]
    assert "Fasting Glucose" in rep_names
    assert "HbA1c" in rep_names


def test_cross_user_timeline_isolation(client: TestClient, token_a: str, token_b: str):
    """Ensure User B cannot see User A's timeline, trends, or summary."""
    with open(FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf", "rb") as f:
        d1 = client.post("/api/documents", headers={"Authorization": f"Bearer {token_a}"}, files={"file": ("cbc.pdf", f, "application/pdf")}).json()["id"]
    client.post(f"/api/documents/{d1}/verify", headers={"Authorization": f"Bearer {token_a}"})

    # User B queries timeline
    res_b_time = client.get("/api/timeline", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b_time.status_code == 200
    assert len(res_b_time.json()["items"]) == 0

    # User B queries trends
    res_b_trends = client.get("/api/timeline/trends", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b_trends.status_code == 200
    assert len(res_b_trends.json()["series"]) == 0

    # User B queries summary
    res_b_sum = client.get("/api/timeline/summary", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b_sum.status_code == 200
    assert res_b_sum.json()["total_reports"] == 0
    assert res_b_sum.json()["total_observations"] == 0


def test_reprocess_does_not_duplicate_reviewed_observations(client: TestClient, token_a: str):
    """Reprocessing a document preserves reviewed observations and prevents duplicates."""
    with open(FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf", "rb") as f:
        d1 = client.post("/api/documents", headers={"Authorization": f"Bearer {token_a}"}, files={"file": ("cbc.pdf", f, "application/pdf")}).json()["id"]

    # Verify document (all 4 observations become is_reviewed=True)
    client.post(f"/api/documents/{d1}/verify", headers={"Authorization": f"Bearer {token_a}"})

    # Reprocess document
    reproc_res = client.post(f"/api/documents/{d1}/reprocess", headers={"Authorization": f"Bearer {token_a}"})
    assert reproc_res.status_code == 200
    assert len(reproc_res.json()["observations"]) == 4

    # Check timeline has exactly 4 observations, not 8
    timeline_res = client.get("/api/timeline", headers={"Authorization": f"Bearer {token_a}"})
    assert len(timeline_res.json()["items"]) == 4


def test_timeline_inverted_date_boundaries_rejected(client: TestClient, token_a: str):
    res = client.get(
        "/api/timeline?start_date=2025-12-31&end_date=2025-01-01",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res.status_code == 422
    assert "start_date cannot be later than end_date" in res.json()["detail"]
