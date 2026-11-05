"""Notification delivery service supporting in-app records and optional SMTP email dispatch."""

import logging
import smtplib
from email.message import EmailMessage
from typing import TypedDict

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class DeliveryResult(TypedDict):
    status: str  # "sent", "skipped_unconfigured", "skipped_unverified", "failed"
    channel: str  # "email", "in_app"
    error: str | None


def send_email_notification(
    to_email: str,
    subject: str,
    body_text: str,
    user_is_verified: bool = True,
) -> DeliveryResult:
    """Safely deliver an email notification if SMTP is configured.
    
    Adheres to safety requirements:
    - Never throws an uncaught exception that would break in-app reminder flows.
    - If SMTP is not configured, returns 'skipped_unconfigured' with an explicit message.
    - Never claims email was sent unless the provider confirms success.
    - Refuses delivery if user email is unverified.
    - Does not log sensitive clinical data.
    """
    settings = get_settings()

    # Safety check: Verified email check
    if not user_is_verified:
        return {
            "status": "skipped_unverified",
            "channel": "email",
            "error": "User email address is not verified; email notification skipped.",
        }

    # Safety check: SMTP configuration presence
    if not settings.smtp_host or not settings.smtp_host.strip():
        return {
            "status": "skipped_unconfigured",
            "channel": "email",
            "error": "Email delivery unavailable: SMTP server host is not configured on the backend.",
        }

    # Format email with non-clinical privacy disclaimer
    try:
        msg = EmailMessage()
        # Ensure subject contains no detailed clinical findings
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from_email or "notifications@healthmate.ai"
        msg["To"] = to_email

        footer = (
            "\n\n---\n"
            "HealthMate AI Smart Health Reminder.\n"
            "This reminder is an organizational aid based on schedules you entered or confirmed. "
            "It does not constitute medical advice or confirmation that medication was administered. "
            "Please log in to HealthMate AI to manage your care reminders."
        )
        msg.set_content(body_text + footer)

        if settings.smtp_use_tls:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.starttls()
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)

        logger.info("Email notification successfully dispatched via SMTP provider.")
        return {
            "status": "sent",
            "channel": "email",
            "error": None,
        }
    except Exception as exc:
        logger.warning("SMTP email notification delivery failed: %s", str(exc))
        return {
            "status": "failed",
            "channel": "email",
            "error": f"SMTP delivery error: {str(exc)}",
        }
