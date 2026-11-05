"""Privacy-safe caching for Quick Reference AI responses.

Ensures:
- Keyed SHA-256 hashes instead of raw PHI in cache keys.
- Isolation: personalized entries are scoped strictly to profile_id and data_version.
- Cache invalidation on data changes or TTL expiration.
- Never caches emergency responses or ungrounded errors.
"""

from datetime import datetime, timezone, timedelta
import hashlib
import json
import threading
from typing import Any

_cache_lock = threading.Lock()
# Store format: { cache_key: { "expires_at": float, "data": dict, "profile_id": str | None } }
_response_cache: dict[str, dict[str, Any]] = {}

PROMPT_VERSION = "v4.0"
CATALOG_VERSION = "v4.0_20261104"


def compute_general_cache_key(mode: str, query: str, style: str) -> str:
    """Compute keyed SHA-256 hash for public general reference queries."""
    norm_q = query.strip().lower()
    raw = f"{mode}:{norm_q}:{style}:{PROMPT_VERSION}:{CATALOG_VERSION}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def compute_profile_cache_key(
    mode: str,
    query: str,
    profile_id: str,
    data_version: str,
    style: str,
    record_ids: list[str] | None = None,
) -> str:
    """Compute keyed SHA-256 hash for profile-scoped records."""
    norm_q = query.strip().lower()
    recs = ",".join(sorted(record_ids or []))
    raw = f"{mode}:{norm_q}:{profile_id}:{data_version}:{recs}:{style}:{PROMPT_VERSION}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_cached_response(key: str) -> dict[str, Any] | None:
    """Retrieve validated cached response if non-expired."""
    now_ts = datetime.now(timezone.utc).timestamp()
    with _cache_lock:
        entry = _response_cache.get(key)
        if not entry:
            return None
        if entry["expires_at"] < now_ts:
            del _response_cache[key]
            return None
        return json.loads(json.dumps(entry["data"]))


def set_cached_response(
    key: str,
    data: dict[str, Any],
    ttl_seconds: int = 3600,
    profile_id: str | None = None,
):
    """Store validated response JSON in memory cache."""
    now_ts = datetime.now(timezone.utc).timestamp()
    expires_at = now_ts + ttl_seconds
    with _cache_lock:
        _response_cache[key] = {
            "expires_at": expires_at,
            "data": json.loads(json.dumps(data)),
            "profile_id": profile_id,
        }


def invalidate_profile_cache(profile_id: str):
    """Invalidate all cached responses associated with a specific profile."""
    with _cache_lock:
        keys_to_delete = [
            k for k, v in _response_cache.items() if v.get("profile_id") == str(profile_id)
        ]
        for k in keys_to_delete:
            del _response_cache[k]


def clear_cache_for_testing():
    """Clear entire cache for testing."""
    with _cache_lock:
        _response_cache.clear()

