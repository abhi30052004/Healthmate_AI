import httpx
import pytest

from app.core.config import Settings
from app.services import llm
from app.services.medical_chat import normalize_llm_text, validate_and_filter_citations
from app.schemas.chat import CitationItem


def _settings(**kw) -> Settings:
    base = dict(_env_file=None, llm_provider="auto", ai_enabled=True)
    base.update(kw)
    return Settings(**base)


def test_groq_key_is_read_from_the_misspelled_env_name(monkeypatch):
    monkeypatch.setenv("grok_api", "gsk_test")
    target = llm.resolve_llm_target(Settings(_env_file=None, llm_provider="auto"))
    assert target and target.provider == "groq" and target.model == "openai/gpt-oss-120b"


def test_provider_selection_and_disable_switches():
    assert llm.resolve_llm_target(_settings()) is None
    assert llm.resolve_llm_target(_settings(groq_api_key="k")).provider == "groq"
    assert llm.resolve_llm_target(_settings(openai_api_key="k")).provider == "openai"
    assert llm.resolve_llm_target(_settings(groq_api_key="k", openai_api_key="o", llm_provider="openai")).provider == "openai"
    assert llm.resolve_llm_target(_settings(groq_api_key="k", llm_provider="none")) is None
    assert llm.resolve_llm_target(_settings(groq_api_key="k", ai_enabled=False)) is None


@pytest.mark.anyio
async def test_complete_returns_text_and_none_on_failure(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test")
    from app.core.config import get_settings

    get_settings.cache_clear()
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.headers["authorization"] == "Bearer gsk_test"
        assert str(request.url).endswith("/chat/completions")
        if calls["n"] == 1:
            return httpx.Response(200, json={"choices": [{"message": {"content": "  hello  "}}]})
        return httpx.Response(401, json={"error": "bad key"})

    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        llm.httpx, "AsyncClient", lambda **kw: real_client(transport=httpx.MockTransport(handler), **{k: v for k, v in kw.items() if k != "verify"})
    )
    assert await llm.complete("sys", "hi") == "hello"
    assert await llm.complete("sys", "hi") is None  # provider error -> caller falls back
    get_settings.cache_clear()


def test_citation_cleanup_handles_groq_style_tags():
    ev = [CitationItem(citation_id=f"[S{i}]", document_id="d", document_title="t") for i in (1, 2)]
    text = "Hb is 13.2 g/dL 【S1】 and [**S2**], see [S1, S2]."
    cleaned = normalize_llm_text(text)
    assert " " not in cleaned and "【" not in cleaned
    assert cleaned.count("[S1]") == 2 and cleaned.count("[S2]") == 2
    _, cites = validate_and_filter_citations(text, ev)
    assert [c.citation_id for c in cites] == ["[S1]", "[S2]"]


def test_shared_view_includes_appointments(client, users, auth_headers, db_session):
    from datetime import datetime, timedelta, timezone

    from app.models.care import AppointmentRecord

    user_a, _ = users
    h = auth_headers["user_a"]
    profile = client.get("/api/family-profiles", headers=h).json()[0]
    db_session.add(
        AppointmentRecord(
            user_id=user_a.id,
            title="Diabetes review",
            provider_name="Dr. Rao",
            appointment_type="checkup",
            scheduled_at=datetime.now(timezone.utc) + timedelta(days=2),
        )
    )
    db_session.commit()
    created = client.post(
        "/api/doctor-sharing",
        headers=h,
        json={
            "profile_id": profile["id"],
            "doctor_name": "Dr. Rao",
            "shared_resources": {"include_appointments": True},
        },
    )
    assert created.status_code == 201, created.text
    view = client.get(f"/api/shared-health/{created.json()['access_token']}")
    assert view.status_code == 200, view.text
    assert view.json()["appointments"][0]["doctor_name"] == "Dr. Rao"
