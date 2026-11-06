"""In-memory sliding-window rate limiter for sensitive and public API endpoints.

Zero-dependency, thread-safe implementation designed to prevent credential
stuffing, brute-force enumeration of shared links, and Denial of Service.
"""

from collections import defaultdict
from datetime import datetime, timezone
import threading
from typing import Callable

from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """Thread-safe sliding-window rate limiter tracking requests per client IP."""

    def __init__(self, requests_per_window: int = 30, window_seconds: int = 60) -> None:
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds
        self._lock = threading.Lock()
        # Maps client_ip -> list of epoch timestamps
        self._access_log: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        # Check standard forwarding headers if behind proxy, fallback to client host
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client and request.client.host:
            return request.client.host
        return "127.0.0.1"

    def __call__(self, request: Request) -> None:
        client_ip = self._get_client_ip(request)
        now = datetime.now(timezone.utc).timestamp()
        cutoff = now - self.window_seconds

        with self._lock:
            timestamps = self._access_log[client_ip]
            # Prune timestamps older than window
            pruned = [ts for ts in timestamps if ts > cutoff]
            self._access_log[client_ip] = pruned

            if len(pruned) >= self.requests_per_window:
                retry_after = int(self.window_seconds - (now - pruned[0])) if pruned else self.window_seconds
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please slow down and try again later.",
                    headers={"Retry-After": str(max(1, retry_after))},
                )

            pruned.append(now)


# Pre-configured rate limiters for different sensitivity levels
auth_login_limiter = SlidingWindowRateLimiter(requests_per_window=20, window_seconds=60)
auth_register_limiter = SlidingWindowRateLimiter(requests_per_window=10, window_seconds=60)
shared_portal_limiter = SlidingWindowRateLimiter(requests_per_window=60, window_seconds=60)
password_reset_limiter = SlidingWindowRateLimiter(requests_per_window=5, window_seconds=60)
password_reset_confirm_limiter = SlidingWindowRateLimiter(requests_per_window=10, window_seconds=60)
emergency_card_limiter = SlidingWindowRateLimiter(requests_per_window=30, window_seconds=60)
