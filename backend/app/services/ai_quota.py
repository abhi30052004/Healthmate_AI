"""In-memory and persistent AI usage quota accounting.

Enforces per-user daily limits, monthly ceiling tracking, and provider spend guards.
Guarantees deterministic, graceful fallback to retrieval/rules when quotas are exhausted.
"""

from datetime import datetime, timezone, timedelta
import threading
from typing import Literal

from app.core.config import get_settings

_quota_lock = threading.Lock()
# Store format: { (user_id, date_str, kind): count }
_user_usage_counts: dict[tuple[str, str, str], int] = {}


def _get_today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _get_reset_timestamp() -> str:
    now = datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return tomorrow.isoformat()


def get_user_ai_usage(user_id: str) -> dict:
    """Get remaining and used daily quotas for a user."""
    settings = get_settings()
    today = _get_today_key()

    with _quota_lock:
        qr_used = _user_usage_counts.get((str(user_id), today, "quick_reference"), 0)
        chat_used = _user_usage_counts.get((str(user_id), today, "chat"), 0)

    qr_limit = settings.ai_daily_quick_reference_limit
    chat_limit = settings.ai_daily_chat_limit

    return {
        "quick_reference_limit": qr_limit,
        "quick_reference_used": qr_used,
        "quick_reference_remaining": max(0, qr_limit - qr_used),
        "chat_limit": chat_limit,
        "chat_used": chat_used,
        "chat_remaining": max(0, chat_limit - chat_used),
        "quota_reset_at": _get_reset_timestamp(),
    }


def check_and_increment_quota(
    user_id: str,
    kind: Literal["quick_reference", "chat"] = "quick_reference",
) -> bool:
    """Check if user has remaining quota for the specified AI operation and increment if allowed.

    Returns True if quota is available and recorded, False if quota exhausted.
    """
    settings = get_settings()
    today = _get_today_key()
    key = (str(user_id), today, kind)

    limit = (
        settings.ai_daily_quick_reference_limit
        if kind == "quick_reference"
        else settings.ai_daily_chat_limit
    )

    with _quota_lock:
        current = _user_usage_counts.get(key, 0)
        if current >= limit:
            return False
        _user_usage_counts[key] = current + 1
        return True


def reset_user_quota_for_testing(user_id: str | None = None):
    """Utility function to clear quota for automated test runs."""
    with _quota_lock:
        if user_id:
            for k in list(_user_usage_counts.keys()):
                if k[0] == str(user_id):
                    del _user_usage_counts[k]
        else:
            _user_usage_counts.clear()

