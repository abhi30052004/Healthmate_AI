"""Shared fixtures for newer test modules.

Older modules define their own copies of these fixtures with the same names;
module-level fixtures take precedence, so they are unaffected.
"""
import os
import tempfile
import uuid

# Never let the suite reach a real LLM account, even though backend/.env holds a key.
# Individual tests opt in by monkeypatching the LLM client.
os.environ["LLM_PROVIDER"] = "none"

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
from app.models.user import User


@pytest.fixture(name="db_session")
def fixture_db_session(monkeypatch):
    temp_dir = tempfile.mkdtemp(prefix="healthmate_tests_")
    monkeypatch.setenv("DOCUMENT_STORAGE_DIR", temp_dir)
    get_settings.cache_clear()

    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(test_engine)
    factory = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)
    session = factory()
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
        id=uuid.uuid4(),
        email="patient_a@healthmate.ai",
        name="Patient Alpha",
        hashed_password=hash_password("PatientAlphaPass123!"),
        is_active=True,
    )
    user_b = User(
        id=uuid.uuid4(),
        email="patient_b@healthmate.ai",
        name="Patient Beta",
        hashed_password=hash_password("PatientBetaPass123!"),
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
    return {
        "user_a": {"Authorization": f"Bearer {create_access_token(subject=str(user_a.id))}"},
        "user_b": {"Authorization": f"Bearer {create_access_token(subject=str(user_b.id))}"},
    }
