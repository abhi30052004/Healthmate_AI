import io
import json
import shutil
import tempfile
import uuid
from pathlib import Path

import pymupdf
import pytest
from fastapi.testclient import TestClient
from PIL import Image
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
from app.services.medical_parser import (
    compute_abnormal_flag,
    parse_medical_record,
    parse_numeric_value,
)

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures" / "synthetic_reports"


@pytest.fixture(name="db_session")
def fixture_db_session(monkeypatch):
    temp_dir = tempfile.mkdtemp(prefix="healthmate_ocr_tests_")
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
        email="patient_a@healthmate.ai",
        hashed_password=hash_password("PatientSecret123!"),
        name="Patient Alpha",
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
        email="patient_b@healthmate.ai",
        hashed_password=hash_password("PatientSecret123!"),
        name="Patient Beta",
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
# Unit Tests: Parser & Provenance Logic
# ---------------------------------------------------------------------------


def test_abnormal_flag_calculation():
    # Range format: low-high
    assert compute_abnormal_flag(12.0, "12.0", "13.5-17.5") == "LOW"
    assert compute_abnormal_flag(15.0, "15.0", "13.5-17.5") == "NORMAL"
    assert compute_abnormal_flag(18.0, "18.0", "13.5-17.5") == "HIGH"

    # Less-than format: < max
    assert compute_abnormal_flag(212.0, "212", "<200") == "HIGH"
    assert compute_abnormal_flag(150.0, "150", "<200") == "NORMAL"

    # Greater-than format: > min
    assert compute_abnormal_flag(35.0, "35", ">40") == "LOW"
    assert compute_abnormal_flag(52.0, "52", ">40") == "NORMAL"

    # Qualitative results
    assert compute_abnormal_flag(None, "NEGATIVE", None) == "NORMAL"
    assert compute_abnormal_flag(None, "NON-REACTIVE", None) == "NORMAL"
    assert compute_abnormal_flag(None, "POSITIVE", None) == "ABNORMAL"
    assert compute_abnormal_flag(None, "DETECTED", None) == "ABNORMAL"

    # No evidence: return None (never assume)
    assert compute_abnormal_flag(100.0, "100", None) is None
    assert compute_abnormal_flag(None, "Inconclusive", None) is None


def test_numeric_precision_preserved():
    clean_str, num = parse_numeric_value("13.20")
    assert clean_str == "13.20"
    assert num == 13.20

    clean_str, num = parse_numeric_value("< 0.05")
    assert clean_str == "< 0.05"
    assert num is None  # qualitative or comparison preserved without forcing


# ---------------------------------------------------------------------------
# Integration Tests: Synthetic Report Fixtures (Reports 1-5)
# ---------------------------------------------------------------------------


def test_native_pdf_cbc_report_extraction(client: TestClient, token_a: str):
    """Report 01: CBC report with low hemoglobin and low hematocrit."""
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("report_01_cbc_2025-01-15.pdf", f, "application/pdf")},
        )
    assert res.status_code == 201
    doc = res.json()
    assert doc["processing_status"] == "extracted"
    assert doc["ocr_applied"] is False
    assert doc["patient_name"] == "Test Patient One (SYNTHETIC)"
    assert doc["lab_name"] == "Northside Synthetic Labs"
    assert doc["document_date"] == "2025-01-15"

    obs = doc["observations"]
    assert len(obs) == 4

    obs_map = {o["test_name"]: o for o in obs}
    # Hemoglobin: 13.2 g/dL, range 13.5-17.5 -> LOW
    assert obs_map["Hemoglobin"]["value"] == "13.2"
    assert obs_map["Hemoglobin"]["numeric_value"] == 13.2
    assert obs_map["Hemoglobin"]["unit"] == "g/dL"
    assert obs_map["Hemoglobin"]["reference_range"] == "13.5-17.5"
    assert obs_map["Hemoglobin"]["flag"] == "LOW"
    assert obs_map["Hemoglobin"]["source_page"] == 1
    assert "Hemoglobin" in obs_map["Hemoglobin"]["source_text"]

    # WBC: 6.8 10^3/uL, range 4.0-11.0 -> NORMAL
    assert obs_map["WBC"]["flag"] == "NORMAL"

    # Platelets: 245 10^3/uL, range 150-450 -> NORMAL
    assert obs_map["Platelets"]["numeric_value"] == 245.0
    assert obs_map["Platelets"]["flag"] == "NORMAL"

    # Hematocrit: 40.1 %, range 41-53 -> LOW
    assert obs_map["Hematocrit"]["flag"] == "LOW"


def test_native_pdf_lipid_report_extraction(client: TestClient, token_a: str):
    """Report 02: Lipid panel with Total Cholesterol >200 (HIGH) and LDL >100 (HIGH)."""
    pdf_path = FIXTURES_DIR / "report_02_lipid_2025-03-10.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("report_02_lipid_2025-03-10.pdf", f, "application/pdf")},
        )
    assert res.status_code == 201
    doc = res.json()
    assert doc["document_date"] == "2025-03-10"

    obs_map = {o["test_name"]: o for o in doc["observations"]}
    assert obs_map["Total Cholesterol"]["flag"] == "HIGH"
    assert obs_map["LDL Cholesterol"]["flag"] == "HIGH"
    assert obs_map["HDL Cholesterol"]["flag"] == "NORMAL"
    assert obs_map["Triglycerides"]["flag"] == "NORMAL"


def test_native_pdf_glucose_report_extraction(client: TestClient, token_a: str):
    """Report 03: Metabolic panel with elevated Fasting Glucose and HbA1c."""
    pdf_path = FIXTURES_DIR / "report_03_glucose_2025-04-02.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("report_03_glucose_2025-04-02.pdf", f, "application/pdf")},
        )
    assert res.status_code == 201
    doc = res.json()
    obs_map = {o["test_name"]: o for o in doc["observations"]}
    assert obs_map["Fasting Glucose"]["flag"] == "HIGH"
    assert obs_map["HbA1c"]["flag"] == "HIGH"
    assert obs_map["Creatinine"]["flag"] == "NORMAL"


def test_native_pdf_glucose_mmol_report_extraction(client: TestClient, token_a: str):
    """Report 04: International units mmol/L."""
    pdf_path = FIXTURES_DIR / "report_04_glucose_mmol_2025-07-20.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("report_04_glucose_mmol_2025-07-20.pdf", f, "application/pdf")},
        )
    assert res.status_code == 201
    doc = res.json()
    obs_map = {o["test_name"]: o for o in doc["observations"]}
    assert obs_map["Fasting Glucose"]["unit"] == "mmol/L"
    assert obs_map["Fasting Glucose"]["numeric_value"] == 5.4
    assert obs_map["Fasting Glucose"]["flag"] == "NORMAL"


def test_image_ocr_report_extraction(client: TestClient, token_a: str):
    """Report 05: Scanned PNG report processed via local OCR."""
    img_path = FIXTURES_DIR / "report_05_scan_thyroid_2025-09-05.png"
    with open(img_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("report_05_scan_thyroid_2025-09-05.png", f, "image/png")},
        )
    assert res.status_code == 201
    doc = res.json()
    assert doc["mime_type"] == "image/png"
    assert doc["processing_status"] == "extracted"
    assert doc["ocr_applied"] is True
    assert doc["patient_name"] == "Test Patient One (SYNTHETIC)"
    assert doc["lab_name"] == "Eastbridge Synthetic Diagnostics"
    assert doc["document_date"] == "2025-09-05"

    obs = doc["observations"]
    assert len(obs) == 2
    obs_map = {o["test_name"]: o for o in obs}
    assert "TSH" in obs_map
    assert obs_map["TSH"]["numeric_value"] == 2.4
    assert obs_map["TSH"]["unit"] == "mIU/L"
    assert obs_map["TSH"]["reference_range"] == "0.4-4.0"
    assert obs_map["TSH"]["flag"] == "NORMAL"

    assert "Free T4" in obs_map
    assert obs_map["Free T4"]["numeric_value"] == 1.1
    assert obs_map["Free T4"]["unit"] == "ng/dL"
    assert obs_map["Free T4"]["reference_range"] == "0.8-1.8"
    assert obs_map["Free T4"]["flag"] == "NORMAL"


def test_scanned_pdf_routes_to_ocr(client: TestClient, token_a: str):
    """Create a synthetic PDF containing an image page without selectable text and ensure it triggers OCR."""
    # Convert PNG fixture into a PDF with no text layer
    img_path = FIXTURES_DIR / "report_05_scan_thyroid_2025-09-05.png"
    img = Image.open(img_path)
    pdf_bytes_io = io.BytesIO()
    img.convert("RGB").save(pdf_bytes_io, format="PDF")
    pdf_bytes_io.seek(0)

    res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("scanned_report.pdf", pdf_bytes_io, "application/pdf")},
    )
    assert res.status_code == 201
    doc = res.json()
    assert doc["processing_status"] == "extracted"
    assert doc["ocr_applied"] is True
    assert "Test Patient" in doc["patient_name"] or "Patient" in doc["patient_name"]
    assert "SYNTHETIC" in doc["patient_name"]
    assert len(doc["observations"]) >= 2


def test_jpeg_image_ocr(client: TestClient, token_a: str):
    """Verify JPEG image extraction via local OCR."""
    img_path = FIXTURES_DIR / "report_05_scan_thyroid_2025-09-05.png"
    img = Image.open(img_path)
    jpeg_bytes_io = io.BytesIO()
    img.convert("RGB").save(jpeg_bytes_io, format="JPEG")
    jpeg_bytes_io.seek(0)

    res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("scan_thyroid.jpg", jpeg_bytes_io, "image/jpeg")},
    )
    assert res.status_code == 201
    doc = res.json()
    assert doc["processing_status"] == "extracted"
    assert doc["ocr_applied"] is True
    assert len(doc["observations"]) == 2


def test_multi_page_pdf_processing(client: TestClient, token_a: str):
    """Test multi-page document preserving page boundaries and source_page provenance."""
    doc1 = pymupdf.open(FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf")
    doc2 = pymupdf.open(FIXTURES_DIR / "report_02_lipid_2025-03-10.pdf")

    multi_doc = pymupdf.open()
    multi_doc.insert_pdf(doc1)
    multi_doc.insert_pdf(doc2)

    multi_pdf_bytes = multi_doc.tobytes()
    doc1.close()
    doc2.close()
    multi_doc.close()

    res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("combined_report.pdf", io.BytesIO(multi_pdf_bytes), "application/pdf")},
    )
    assert res.status_code == 201
    doc = res.json()
    assert doc["page_count"] == 2
    obs = doc["observations"]
    # Total observations should combine CBC (4) and Lipid (4)
    assert len(obs) == 8
    pages = {o["source_page"] for o in obs}
    assert 1 in pages
    assert 2 in pages


def test_get_observations_endpoint(client: TestClient, token_a: str):
    """Test GET /api/documents/{id}/observations endpoint."""
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("cbc.pdf", f, "application/pdf")},
        )
    doc_id = res.json()["id"]

    obs_res = client.get(
        f"/api/documents/{doc_id}/observations",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert obs_res.status_code == 200
    observations = obs_res.json()
    assert len(observations) == 4
    for o in observations:
        assert "test_name" in o
        assert "value" in o
        assert "source_text" in o
        assert o["is_reviewed"] is False


def test_update_observation_correction(client: TestClient, token_a: str):
    """Test PUT /api/documents/{id}/observations/{obs_id} allows user to correct value."""
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("cbc.pdf", f, "application/pdf")},
        )
    doc_id = res.json()["id"]
    obs_id = res.json()["observations"][0]["id"]

    # User corrects the value and unit
    update_res = client.put(
        f"/api/documents/{doc_id}/observations/{obs_id}",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "value": "14.5",
            "unit": "g/dL",
        },
    )
    assert update_res.status_code == 200
    updated_obs = update_res.json()
    assert updated_obs["value"] == "14.5"
    assert updated_obs["numeric_value"] == 14.5
    assert updated_obs["flag"] == "NORMAL"  # 14.5 is within 13.5-17.5
    assert updated_obs["is_reviewed"] is True


def test_reprocess_document_endpoint(client: TestClient, token_a: str):
    """Test POST /api/documents/{id}/reprocess endpoint."""
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("cbc.pdf", f, "application/pdf")},
        )
    doc_id = res.json()["id"]

    reprocess_res = client.post(
        f"/api/documents/{doc_id}/reprocess",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert reprocess_res.status_code == 200
    reprocessed = reprocess_res.json()
    assert reprocessed["processing_status"] == "extracted"
    assert len(reprocessed["observations"]) == 4


def test_verify_document_marks_observations_reviewed(client: TestClient, token_a: str):
    """Test POST /api/documents/{id}/verify confirms document and all observations."""
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("cbc.pdf", f, "application/pdf")},
        )
    doc_id = res.json()["id"]

    verify_res = client.post(
        f"/api/documents/{doc_id}/verify",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["is_verified"] is True
    assert verify_res.json()["observations_verified_count"] == 4

    obs_res = client.get(
        f"/api/documents/{doc_id}/observations",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    for o in obs_res.json():
        assert o["is_reviewed"] is True


def test_cross_user_observation_access_denied(client: TestClient, token_a: str, token_b: str):
    """Ensure user B cannot view, modify, or reprocess user A's document or observations."""
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("cbc.pdf", f, "application/pdf")},
        )
    doc_id = res.json()["id"]
    obs_id = res.json()["observations"][0]["id"]

    # User B attempts to get observations
    get_res = client.get(
        f"/api/documents/{doc_id}/observations",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_res.status_code == 404

    # User B attempts to modify observation
    put_res = client.put(
        f"/api/documents/{doc_id}/observations/{obs_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"value": "99.9"},
    )
    assert put_res.status_code == 404

    # User B attempts to reprocess
    reprocess_res = client.post(
        f"/api/documents/{doc_id}/reprocess",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert reprocess_res.status_code == 404
