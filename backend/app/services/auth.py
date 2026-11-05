from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import TokenResponse, UserLogin, UserLoginSummary, UserRegister


def register_user(db: Session, register_data: UserRegister) -> User:
    """Register a new user, enforcing email uniqueness and Argon2id hashing."""
    existing_user = db.scalars(
        select(User).where(User.email == register_data.email)
    ).first()
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        name=register_data.name,
        email=register_data.email,
        hashed_password=hash_password(register_data.password),
        is_active=True,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Authenticate user with email and password using constant/generic failure message."""
    clean_email = email.lower().strip() if email else ""
    user = db.scalars(select(User).where(User.email == clean_email)).first()

    # Automatic fallback provisioning for dedicated demo account if database was reset
    if user is None and clean_email == "demo@healthmate.ai" and password == "Demo@12345":
        try:
            from app.scripts.seed_demo import seed_demo_data
            user = seed_demo_data(db)
        except Exception:
            user = None

    # Generic error message to prevent account enumeration
    invalid_creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if user is None:
        # Dummy verify to mitigate timing attacks against non-existent accounts
        verify_password(password, "$argon2id$v=19$m=65536,t=3,p=4$dummyhashdummysalt$dummyhash")
        raise invalid_creds_exc

    if not verify_password(password, user.hashed_password):
        raise invalid_creds_exc

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user account",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def login_user(db: Session, login_data: UserLogin) -> TokenResponse:
    """Authenticate and create signed access token."""
    user = authenticate_user(db, login_data.email, login_data.password)
    settings = get_settings()
    access_token = create_access_token(subject=str(user.id))

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserLoginSummary.model_validate(user),
    )
