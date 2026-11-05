from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.db.base import Base
from app.main import app
from app.models.user import User


@pytest.fixture(name="db_session")
def fixture_db_session():
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


def test_registration_success(client: TestClient, db_session: Session):
    payload = {
        "name": "Test User",
        "email": "Test.User@Example.com",
        "password": "StrongPassword123!",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["name"] == "Test User"
    assert data["email"] == "test.user@example.com"
    assert data["is_active"] is True
    assert "id" in data
    assert "created_at" in data
    assert "hashed_password" not in data
    assert "password" not in data

    # Verify password was hashed with Argon2id and not stored plain
    user_in_db = db_session.query(User).filter_by(email="test.user@example.com").first()
    assert user_in_db is not None
    assert user_in_db.hashed_password.startswith("$argon2id$")
    assert user_in_db.hashed_password != payload["password"]
    assert verify_password(payload["password"], user_in_db.hashed_password)


def test_registration_invalid_email(client: TestClient):
    payload = {
        "name": "Invalid Email",
        "email": "not-an-email",
        "password": "StrongPassword123!",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422


def test_registration_weak_passwords(client: TestClient):
    # Too short
    res_short = client.post(
        "/api/auth/register",
        json={"name": "User", "email": "short@example.com", "password": "123"},
    )
    assert res_short.status_code == 422

    # No numbers or special characters
    res_no_digits = client.post(
        "/api/auth/register",
        json={"name": "User", "email": "nodigits@example.com", "password": "alllettersonly"},
    )
    assert res_no_digits.status_code == 422


def test_duplicate_registration_returns_409(client: TestClient):
    payload = {
        "name": "First User",
        "email": "duplicate@example.com",
        "password": "StrongPassword123!",
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    # Attempt to register again with same normalized email
    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"].lower()


def test_login_success(client: TestClient):
    reg_payload = {
        "name": "Login User",
        "email": "login@example.com",
        "password": "SecurePassword123!",
    }
    client.post("/api/auth/register", json=reg_payload)

    login_payload = {
        "email": "login@example.com",
        "password": "SecurePassword123!",
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 900
    assert data["user"]["email"] == "login@example.com"
    assert data["user"]["name"] == "Login User"
    assert "id" in data["user"]


def test_login_incorrect_password_returns_401(client: TestClient):
    client.post(
        "/api/auth/register",
        json={"name": "User", "email": "wrongpw@example.com", "password": "CorrectPassword123!"},
    )

    response = client.post(
        "/api/auth/login",
        json={"email": "wrongpw@example.com", "password": "WrongPassword123!"},
    )
    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"
    assert response.json()["detail"] == "Incorrect email or password"


def test_login_unknown_email_returns_generic_401(client: TestClient):
    response = client.post(
        "/api/auth/login",
        json={"email": "unknown@example.com", "password": "AnyPassword123!"},
    )
    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"
    assert response.json()["detail"] == "Incorrect email or password"


def test_auth_me_success(client: TestClient):
    reg_payload = {
        "name": "Me User",
        "email": "me@example.com",
        "password": "SecurePassword123!",
    }
    client.post("/api/auth/register", json=reg_payload)

    login_res = client.post(
        "/api/auth/login",
        json={"email": "me@example.com", "password": "SecurePassword123!"},
    )
    token = login_res.json()["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert data["name"] == "Me User"
    assert data["is_active"] is True
    assert "id" in data


def test_auth_me_missing_token_returns_401(client: TestClient):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


def test_auth_me_invalid_token_returns_401(client: TestClient):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


def test_auth_me_expired_token_returns_401(client: TestClient, db_session: Session):
    user = User(
        name="Expired User",
        email="expired@example.com",
        hashed_password=hash_password("Password123!"),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    expired_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(seconds=-10),
    )

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


def test_inactive_user_cannot_authenticate_or_access_me(
    client: TestClient, db_session: Session
):
    inactive_user = User(
        name="Inactive User",
        email="inactive@example.com",
        hashed_password=hash_password("Password123!"),
        is_active=False,
    )
    db_session.add(inactive_user)
    db_session.commit()
    db_session.refresh(inactive_user)

    # Login rejection
    login_res = client.post(
        "/api/auth/login",
        json={"email": "inactive@example.com", "password": "Password123!"},
    )
    assert login_res.status_code == 401
    assert "inactive" in login_res.json()["detail"].lower()

    # /me rejection even with newly minted token
    valid_token = create_access_token(subject=str(inactive_user.id))
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {valid_token}"})
    assert me_res.status_code == 401
    assert "inactive" in me_res.json()["detail"].lower()
