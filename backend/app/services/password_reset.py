"""Forgot / reset password flow.

Security properties:
- The emailed token is random (256-bit); only its SHA-256 hash is stored.
- Tokens are single use and expire (default 30 minutes). Requesting a new link voids older ones.
- The request endpoint never reveals whether an email is registered, and the email is sent in
  a background task so response timing does not leak it either.
"""

from datetime import datetime, timedelta, timezone
import hashlib
import logging
import secrets

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.services.notification_delivery import send_email_notification

logger = logging.getLogger("healthmate.password_reset")

INVALID_TOKEN_MESSAGE = "This reset link is invalid or has expired. Please request a new one."


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def create_reset_token(db: Session, email: str) -> tuple[User, str] | None:
    """Create a fresh token for an active user. Returns None when the email is unknown."""
    user = db.scalars(select(User).where(User.email == email.strip().lower())).first()
    if user is None or not user.is_active:
        return None

    now = datetime.now(timezone.utc)
    # Void any earlier outstanding links.
    db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    raw = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=_hash(raw),
            expires_at=now + timedelta(minutes=get_settings().password_reset_expire_minutes),
        )
    )
    db.commit()
    return user, raw


def send_reset_email(email: str, name: str | None, raw_token: str) -> None:
    """Background task: email the reset link (or log it in development when SMTP is not set up)."""
    settings = get_settings()
    link = f"{settings.web_base_url}/reset-password?token={raw_token}"
    body = (
        f"Hello {name or 'there'},\n\n"
        "We received a request to reset your HealthMate AI password. "
        f"Open this link to choose a new one (valid for {settings.password_reset_expire_minutes} minutes):\n\n"
        f"{link}\n\n"
        "If you did not ask for this, you can ignore this email; your password will not change."
    )
    result = send_email_notification(
        to_email=email,
        subject="Reset your HealthMate AI password",
        body_text=body,
        include_reminder_footer=False,
    )
    if result["status"] == "sent":
        return
    if result["status"] == "skipped_unconfigured" and settings.app_env.lower() == "development":
        # Developer convenience only; never logged in staging/production.
        logger.warning("SMTP not configured. Development password reset link for %s: %s", email, link)
    else:
        logger.error("Password reset email was not delivered (%s)", result["status"])


def reset_password(db: Session, raw_token: str, new_password: str) -> None:
    record = db.scalars(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == _hash(raw_token.strip()))
    ).first()
    now = datetime.now(timezone.utc)
    if record is None or record.used_at is not None or _aware(record.expires_at) < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_TOKEN_MESSAGE)

    user = db.get(User, record.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_TOKEN_MESSAGE)

    user.hashed_password = hash_password(new_password)
    record.used_at = now
    db.commit()
