from fastapi.testclient import TestClient

from app.main import app
from app.core import database

client = TestClient(app)


def test_live():
    r = client.get("/health/live")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "service": "healthmate-api"}


def test_ready_ok(monkeypatch):
    monkeypatch.setattr(database, "check_database", lambda: {"database": True, "pgvector": True})
    r = client.get("/health/ready")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_ready_missing_pgvector(monkeypatch):
    monkeypatch.setattr(database, "check_database", lambda: {"database": True, "pgvector": False})
    r = client.get("/health/ready")
    assert r.status_code == 503
    assert r.json()["pgvector"] is False


def test_ready_database_down(monkeypatch):
    monkeypatch.setattr(
        database, "check_database",
        lambda: {"database": False, "pgvector": False, "error": "OperationalError"},
    )
    assert client.get("/health/ready").status_code == 503


def test_api_status():
    r = client.get("/api/status")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
