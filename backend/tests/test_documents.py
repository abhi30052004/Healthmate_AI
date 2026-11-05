import io
import shutil
import tempfile
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
from app.models.document import Document
from app.models.user import User

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures" / "synthetic_reports"


@pytest.fixture(name="db_session")
def fixture_db_session(monkeypatch):
    temp_dir = tempfile.mkdtemp(prefix="healthmate_doc_tests_")
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
        name="User A",
        email="user.a@example.com",
        hashed_password=hash_password("Password123!"),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(name="user_b")
def fixture_user_b(db_session: Session) -> User:
    user = User(
        name="User B",
        email="user.b@example.com",
        hashed_password=hash_password("Password123!"),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(name="token_a")
def fixture_token_a(user_a: User) -> str:
    return create_access_token(subject=str(user_a.id))


@pytest.fixture(name="token_b")
def fixture_token_b(user_b: User) -> str:
    return create_access_token(subject=str(user_b.id))


def test_unauthenticated_upload_rejected(client: TestClient):
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            files={"file": ("report.pdf", f, "application/pdf")},
        )
    assert res.status_code == 401


def test_successful_pdf_upload_and_extraction(client: TestClient, token_a: str):
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("report_01_cbc_2025-01-15.pdf", f, "application/pdf")},
        )

    assert res.status_code == 201
    doc = res.json()
    assert doc["filename"] == "report_01_cbc_2025-01-15.pdf"
    assert doc["mime_type"] == "application/pdf"
    assert doc["processing_status"] == "extracted"
    assert doc["page_count"] == 1
    assert doc["is_verified"] is False
    assert len(doc["checksum_sha256"]) == 64

    # Fetch extracted text
    text_res = client.get(
        f"/api/documents/{doc['id']}/text",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert text_res.status_code == 200
    text_data = text_res.json()
    assert "Hemoglobin" in text_data["extracted_text"]
    assert "Platelets" in text_data["extracted_text"]


def test_empty_file_upload_rejected(client: TestClient, token_a: str):
    empty_file = io.BytesIO(b"")
    res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("empty.pdf", empty_file, "application/pdf")},
    )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


def test_invalid_file_signature_rejected(client: TestClient, token_a: str):
    fake_pdf = io.BytesIO(b"This is a text file posing as a PDF.")
    res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("fake.pdf", fake_pdf, "application/pdf")},
    )
    assert res.status_code == 400
    assert "unsupported or invalid" in res.json()["detail"].lower()


def test_oversized_file_rejected(client: TestClient, token_a: str, monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.get_settings(), "max_upload_size_bytes", 100 * 1024)

    large_content = b"%PDF-" + b"0" * (120 * 1024)
    oversized = io.BytesIO(large_content)
    res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("large.pdf", oversized, "application/pdf")},
    )
    assert res.status_code == 413


def test_image_upload_ocr_extraction(client: TestClient, token_a: str):
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
    assert len(doc["observations"]) == 2



def test_list_documents_only_returns_owner_documents(
    client: TestClient, token_a: str, token_b: str
):
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("user_a_report.pdf", f, "application/pdf")},
        )

    # User B lists documents
    res_b = client.get("/api/documents", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b.status_code == 200
    assert len(res_b.json()) == 0

    # User A lists documents
    res_a = client.get("/api/documents", headers={"Authorization": f"Bearer {token_a}"})
    assert res_a.status_code == 200
    assert len(res_a.json()) == 1
    assert res_a.json()[0]["filename"] == "user_a_report.pdf"


def test_cross_user_document_access_denied(
    client: TestClient, token_a: str, token_b: str
):
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        doc_res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("private_report.pdf", f, "application/pdf")},
        )
    doc_id = doc_res.json()["id"]

    # User B attempts to access metadata
    get_res = client.get(
        f"/api/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_res.status_code == 404

    # User B attempts to access extracted text
    text_res = client.get(
        f"/api/documents/{doc_id}/text",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert text_res.status_code == 404

    # User B attempts to verify
    verify_res = client.post(
        f"/api/documents/{doc_id}/verify",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert verify_res.status_code == 404

    # User B attempts to delete
    del_res = client.delete(
        f"/api/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert del_res.status_code == 404


def test_verification_flow_and_rejection_before_extraction(
    client: TestClient, token_a: str
):
    from PIL import Image

    # Upload a blank image resulting in 'failed' status (no readable text)
    blank = Image.new("RGB", (50, 50), color=(255, 255, 255))
    buf = io.BytesIO()
    blank.save(buf, format="PNG")
    buf.seek(0)
    img_res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("blank.png", buf, "image/png")},
    )
    assert img_res.status_code == 201
    assert img_res.json()["processing_status"] == "failed"
    img_id = img_res.json()["id"]

    # Verification must be rejected when status != 'extracted'
    reject_verify = client.post(
        f"/api/documents/{img_id}/verify",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert reject_verify.status_code == 400
    assert "cannot verify" in reject_verify.json()["detail"].lower()

    # Upload clean PDF resulting in 'extracted'
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        pdf_res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("cbc.pdf", f, "application/pdf")},
        )
    pdf_id = pdf_res.json()["id"]

    # Verification succeeds
    ok_verify = client.post(
        f"/api/documents/{pdf_id}/verify",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert ok_verify.status_code == 200
    verify_data = ok_verify.json()
    assert verify_data["is_verified"] is True
    assert verify_data["verified_at"] is not None


def test_safe_deletion_and_storage_cleanup(
    client: TestClient, token_a: str, db_session: Session
):
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("to_delete.pdf", f, "application/pdf")},
        )
    doc_id = res.json()["id"]

    # Check file exists on disk
    doc_model = db_session.query(Document).filter_by(filename="to_delete.pdf").first()
    storage_root = Path(get_settings().document_storage_dir)
    disk_file = storage_root / doc_model.storage_key
    assert disk_file.exists()

    # Delete document
    del_res = client.delete(
        f"/api/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert del_res.status_code == 204

    # Verify DB record is gone and file on disk is removed
    assert db_session.query(Document).filter_by(id=doc_model.id).first() is None
    assert not disk_file.exists()


def test_malformed_pdf_rejected(client: TestClient, token_a: str):
    corrupt_pdf = io.BytesIO(b"%PDF-corrupted-and-broken-header-data")
    res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("corrupt.pdf", corrupt_pdf, "application/pdf")},
    )
    assert res.status_code == 400
    assert "malformed" in res.json()["detail"].lower()


def test_unsupported_file_extension_rejected(client: TestClient, token_a: str):
    script_file = io.BytesIO(b"print('hello')")
    res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("script.py", script_file, "text/x-python")},
    )
    assert res.status_code == 400
    assert "extension" in res.json()["detail"].lower()


def test_extension_mismatch_rejected(client: TestClient, token_a: str):
    # PNG signature with .pdf extension
    fake_ext_file = io.BytesIO(b"\x89PNG\r\n\x1a\nfake-png-content")
    res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("mismatch.pdf", fake_ext_file, "application/pdf")},
    )
    assert res.status_code == 400
    assert "does not match" in res.json()["detail"].lower()


def test_authorized_download_and_preview(client: TestClient, token_a: str):
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        upload_res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("download_test.pdf", f, "application/pdf")},
        )
    doc_id = upload_res.json()["id"]

    # Download attachment
    dl_res = client.get(
        f"/api/documents/{doc_id}/download",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert 'attachment; filename="download_test.pdf"' in dl_res.headers["content-disposition"]
    assert len(dl_res.content) > 0

    # Inline preview
    preview_res = client.get(
        f"/api/documents/{doc_id}/download?inline=true",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert preview_res.status_code == 200
    assert 'inline; filename="download_test.pdf"' in preview_res.headers["content-disposition"]


def test_cross_user_download_denied(
    client: TestClient, token_a: str, token_b: str
):
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    with open(pdf_path, "rb") as f:
        upload_res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("private_dl.pdf", f, "application/pdf")},
        )
    doc_id = upload_res.json()["id"]

    # User B attempts to download
    dl_res = client.get(
        f"/api/documents/{doc_id}/download",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert dl_res.status_code == 404


def test_database_failure_cleans_up_storage_file(
    client: TestClient, token_a: str, db_session: Session, monkeypatch
):
    pdf_path = FIXTURES_DIR / "report_01_cbc_2025-01-15.pdf"
    storage_root = Path(get_settings().document_storage_dir)

    # Monkeypatch db_session.commit to simulate database failure
    def failing_commit():
        raise RuntimeError("Simulated DB connection drop")

    monkeypatch.setattr(db_session, "commit", failing_commit)

    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("db_fail_test.pdf", f, "application/pdf")},
        )

    assert res.status_code == 500
    assert "Database persistence failed" in res.json()["detail"]

    # Verify no partial or orphaned file remains in user storage directory
    stored_files = list(storage_root.glob("**/*db_fail_test*"))
    assert len(stored_files) == 0
