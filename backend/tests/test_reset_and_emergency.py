from datetime import datetime, timedelta, timezone

import pytest

from app.models.password_reset import PasswordResetToken

EMAIL = "patient_a@healthmate.ai"
OLD_PW = "PatientAlphaPass123!"
NEW_PW = "BrandNewPass456!"


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    from app.core import rate_limit

    for lim in (rate_limit.password_reset_limiter, rate_limit.password_reset_confirm_limiter, rate_limit.emergency_card_limiter):
        lim._access_log.clear()
    yield


@pytest.fixture(name="sent")
def fixture_sent(monkeypatch):
    """Capture reset emails instead of sending them."""
    box: list[tuple[str, str]] = []
    monkeypatch.setattr("app.api.routes.auth.send_reset_email", lambda email, name, token: box.append((email, token)))
    return box


def _login(client, password):
    return client.post("/api/auth/login", json={"email": EMAIL, "password": password})


def test_forgot_password_does_not_reveal_whether_email_exists(client, users, sent):
    known = client.post("/api/auth/forgot-password", json={"email": EMAIL})
    unknown = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    assert [e for e, _ in sent] == [EMAIL]  # only the real account gets mail


def test_reset_password_full_flow_and_single_use(client, users, sent):
    client.post("/api/auth/forgot-password", json={"email": EMAIL})
    token = sent[0][1]

    weak = client.post("/api/auth/reset-password", json={"token": token, "new_password": "short"})
    assert weak.status_code == 422

    ok = client.post("/api/auth/reset-password", json={"token": token, "new_password": NEW_PW})
    assert ok.status_code == 200
    assert _login(client, NEW_PW).status_code == 200
    assert _login(client, OLD_PW).status_code == 401

    reuse = client.post("/api/auth/reset-password", json={"token": token, "new_password": "Another789!pass"})
    assert reuse.status_code == 400
    assert client.post("/api/auth/reset-password", json={"token": "garbage", "new_password": NEW_PW}).status_code == 400


def test_new_request_voids_older_link_and_expired_links_fail(client, users, sent, db_session):
    client.post("/api/auth/forgot-password", json={"email": EMAIL})
    client.post("/api/auth/forgot-password", json={"email": EMAIL})
    first, second = sent[0][1], sent[1][1]
    assert client.post("/api/auth/reset-password", json={"token": first, "new_password": NEW_PW}).status_code == 400

    for rec in db_session.query(PasswordResetToken).filter(PasswordResetToken.used_at.is_(None)):
        rec.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session.commit()
    assert client.post("/api/auth/reset-password", json={"token": second, "new_password": NEW_PW}).status_code == 400
    assert _login(client, OLD_PW).status_code == 200  # password untouched


def test_reset_email_contains_link_to_web_app(monkeypatch):
    from app.services import password_reset

    captured = {}

    def fake_send(**kw):
        captured.update(kw)
        return {"status": "sent", "channel": "email", "error": None}

    monkeypatch.setattr(password_reset, "send_email_notification", fake_send)
    password_reset.send_reset_email("a@b.com", "Asha", "TOKEN123")
    assert "/reset-password?token=TOKEN123" in captured["body_text"]
    assert captured["include_reminder_footer"] is False


# ---------------------------------------------------------------- emergency card

def _primary(client, headers):
    return client.get("/api/family-profiles", headers=headers).json()[0]


def test_emergency_card_qr_lifecycle(client, users, auth_headers):
    h = auth_headers["user_a"]
    pid = _primary(client, h)["id"]
    client.patch(
        f"/api/family-profiles/{pid}",
        headers=h,
        json={"blood_type": "O+", "allergies_summary": "Penicillin", "conditions_summary": "Asthma",
              "emergency_contact_name": "Ravi", "emergency_contact_phone": "+91 99999 00000"},
    )

    assert client.get(f"/api/family-profiles/{pid}/emergency-link", headers=h).json() == {"enabled": False, "token": None}

    on = client.post(f"/api/family-profiles/{pid}/emergency-link", headers=h).json()
    assert on["enabled"] and len(on["token"]) >= 40
    again = client.post(f"/api/family-profiles/{pid}/emergency-link", headers=h).json()
    assert again["token"] == on["token"]  # idempotent: printed QR stays valid

    public = client.get(f"/api/emergency/{on['token']}")  # no auth header
    assert public.status_code == 200
    body = public.json()
    assert body["blood_type"] == "O+" and body["allergies"] == "Penicillin" and body["emergency_contact_name"] == "Ravi"
    assert not {"id", "owner_id", "date_of_birth", "email"} & set(body)
    assert public.headers["cache-control"] == "no-store"
    assert "noindex" in public.headers["x-robots-tag"]

    rotated = client.post(f"/api/family-profiles/{pid}/emergency-link?rotate=true", headers=h).json()
    assert rotated["token"] != on["token"]
    assert client.get(f"/api/emergency/{on['token']}").status_code == 404
    assert client.get(f"/api/emergency/{rotated['token']}").status_code == 200

    off = client.delete(f"/api/family-profiles/{pid}/emergency-link", headers=h).json()
    assert off == {"enabled": False, "token": None}
    assert client.get(f"/api/emergency/{rotated['token']}").status_code == 404


def test_emergency_card_is_owner_only_and_rejects_bad_tokens(client, users, auth_headers):
    pid = _primary(client, auth_headers["user_a"])["id"]
    other = auth_headers["user_b"]
    assert client.post(f"/api/family-profiles/{pid}/emergency-link", headers=other).status_code == 404
    assert client.get(f"/api/family-profiles/{pid}/emergency-link", headers=other).status_code == 404
    assert client.delete(f"/api/family-profiles/{pid}/emergency-link", headers=other).status_code == 404
    assert client.post(f"/api/family-profiles/{pid}/emergency-link").status_code in (401, 403)
    assert client.get("/api/emergency/short").status_code == 404
    assert client.get("/api/emergency/" + "x" * 43).status_code == 404
