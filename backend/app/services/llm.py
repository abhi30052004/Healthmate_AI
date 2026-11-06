"""Single entry point for external LLM calls (Groq or OpenAI).

Both providers expose an OpenAI-compatible ``/chat/completions`` endpoint, so one
client covers them. Every caller treats a ``None`` result as "use the deterministic
fallback", which keeps the product usable without credentials or when the provider
is down, rate-limited, or out of quota.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import logging
import ssl

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger("healthmate.llm")

_DISABLED = {"none", "off", "fallback", "offline", "disabled"}
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


@dataclass(frozen=True)
class LLMTarget:
    provider: str  # "groq" | "openai"
    base_url: str
    api_key: str
    model: str


def resolve_llm_target(settings: Settings | None = None) -> LLMTarget | None:
    """Pick the provider to use from settings, or None when AI is unavailable."""
    settings = settings or get_settings()
    if not settings.ai_enabled:
        return None

    choice = (settings.llm_provider or "auto").strip().lower()
    if choice in _DISABLED:
        return None

    groq_key = (settings.groq_api_key or "").strip()
    openai_key = (settings.openai_api_key or "").strip()

    if choice in ("groq", "auto") and groq_key:
        return LLMTarget("groq", settings.groq_base_url.rstrip("/"), groq_key, settings.groq_model)
    if choice in ("openai", "auto") and openai_key:
        return LLMTarget("openai", "https://api.openai.com/v1", openai_key, settings.openai_model)
    return None


def llm_provider_name() -> str | None:
    target = resolve_llm_target()
    return target.provider if target else None


def _ssl_context() -> ssl.SSLContext | bool:
    """Trust the operating-system certificate store.

    httpx defaults to the certifi bundle, which fails behind corporate TLS-inspection
    proxies whose root CA is only installed in the OS store. Verification stays on.
    """
    try:
        return ssl.create_default_context()
    except Exception:  # pragma: no cover - extremely unusual platform failure
        return True


async def complete(
    system: str,
    user: str,
    *,
    max_tokens: int | None = None,
    temperature: float = 0.1,
    timeout: float | None = None,
) -> str | None:
    """Return the model's reply text, or None if unavailable / failed / empty."""
    settings = get_settings()
    target = resolve_llm_target(settings)
    if target is None:
        return None

    payload: dict = {
        "model": target.model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens or settings.ai_max_output_tokens,
    }
    if target.provider == "groq" and target.model.startswith("openai/gpt-oss"):
        # Keep hidden reasoning short so the visible answer is not truncated.
        payload["reasoning_effort"] = "low"

    request_timeout = timeout if timeout is not None else float(settings.ai_request_timeout_seconds)
    headers = {"Authorization": f"Bearer {target.api_key}", "Content-Type": "application/json"}
    url = f"{target.base_url}/chat/completions"

    for attempt in (1, 2):
        try:
            async with httpx.AsyncClient(timeout=request_timeout, verify=_ssl_context()) as client:
                res = await client.post(url, headers=headers, json=payload)
            if res.status_code in _RETRYABLE_STATUS and attempt == 1:
                await asyncio.sleep(0.8)
                continue
            if res.status_code != 200:
                logger.warning("%s returned HTTP %s; using fallback", target.provider, res.status_code)
                return None
            choice = res.json()["choices"][0]
            text = (choice.get("message", {}).get("content") or "").strip()
            if not text:
                logger.warning("%s returned empty content (finish_reason=%s)", target.provider, choice.get("finish_reason"))
                return None
            return text
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
            if attempt == 1 and isinstance(exc, (httpx.ConnectError, httpx.ReadTimeout)):
                await asyncio.sleep(0.8)
                continue
            logger.warning("%s call failed (%s); using fallback", target.provider, type(exc).__name__)
            return None
    return None
