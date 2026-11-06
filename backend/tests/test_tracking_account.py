from datetime import date, datetime, timedelta, timezone

from fastapi.testclient import TestClient


def _profile(client: TestClient, headers) -> str:
    return client.get("/api/family-profiles", headers=headers).json()[0]["id"]


def _med(client, headers, pid, **over):
    body = {
        "name": "Metformin",
        "strength": "500 mg",
        "profile_id": pid,
        "schedule_times": ["20:00", "08:00", "08:00"],
        **over,
    }
    res = client.post("/api/care/medications", headers=headers, json=body)
    assert res.status_code == 201, res.text
    return res.json()


# ---------------------------------------------------------------- schedules + doses


def test_schedule_times_are_normalised_and_validated(client: TestClient, auth_headers):
    h = auth_headers["user_a"]
    pid = _profile(client, h)
    med = _med(client, h, pid)
    assert med["schedule_times"] == ["08:00", "20:00"]  # sorted, de-duplicated
    assert med["schedule_days"] == []

    bad = client.post("/api/care/medications", headers=h, json={"name": "X", "schedule_times": ["25:99"]})
    assert bad.status_code == 422
    bad = client.post("/api/care/medications", headers=h, json={"name": "X", "schedule_days": [9]})
    assert bad.status_code == 422


def test_daily_dose_slots_and_logging_lifecycle(client: TestClient, auth_headers):
    h = auth_headers["user_a"]
    pid = _profile(client, h)
    med = _med(client, h, pid)
    today = date.today().isoformat()

    slots = client.get(f"/api/care/doses?date={today}&profile_id={pid}", headers=h).json()
    assert [s["scheduled_time"] for s in slots] == ["08:00", "20:00"]
    assert all(s["outcome"] is None for s in slots)

    log = client.post(
        "/api/care/dose-logs",
        headers=h,
        json={"medication_id": med["id"], "scheduled_date": today, "scheduled_time": "08:00", "outcome": "taken"},
    )
    assert log.status_code == 200, log.text
    # idempotent per slot: changing the outcome updates the same row
    again = client.post(
        "/api/care/dose-logs",
        headers=h,
        json={"medication_id": med["id"], "scheduled_date": today, "scheduled_time": "08:00", "outcome": "skipped"},
    )
    assert again.json()["id"] == log.json()["id"]
    assert again.json()["outcome"] == "skipped"

    snooze = client.post(
        "/api/care/dose-logs",
        headers=h,
        json={
            "medication_id": med["id"],
            "scheduled_date": today,
            "scheduled_time": "20:00",
            "outcome": "snoozed",
            "snooze_minutes": 30,
        },
    ).json()
    assert snooze["snoozed_until"] is not None

    slots = client.get(f"/api/care/doses?date={today}&profile_id={pid}", headers=h).json()
    assert [s["outcome"] for s in slots] == ["skipped", "snoozed"]

    # undo
    assert client.delete(f"/api/care/dose-logs/{log.json()['id']}", headers=h).status_code == 204
    slots = client.get(f"/api/care/doses?date={today}&profile_id={pid}", headers=h).json()
    assert slots[0]["outcome"] is None


def test_dose_log_rejects_unscheduled_future_and_foreign(client: TestClient, auth_headers):
    h, hb = auth_headers["user_a"], auth_headers["user_b"]
    pid = _profile(client, h)
    med = _med(client, h, pid)
    today = date.today()
    base = {"medication_id": med["id"], "scheduled_date": today.isoformat(), "outcome": "taken"}

    assert client.post("/api/care/dose-logs", headers=h, json={**base, "scheduled_time": "13:00"}).status_code == 422
    future = (today + timedelta(days=5)).isoformat()
    assert (
        client.post("/api/care/dose-logs", headers=h, json={**base, "scheduled_date": future, "scheduled_time": "08:00"}).status_code
        == 422
    )
    # another user can neither log against nor see this medication
    assert client.post("/api/care/dose-logs", headers=hb, json={**base, "scheduled_time": "08:00"}).status_code == 404
    pid_b = _profile(client, hb)
    assert client.get(f"/api/care/doses?date={today.isoformat()}&profile_id={pid_b}", headers=hb).json() == []
    assert client.get(f"/api/care/doses?date={today.isoformat()}&profile_id={pid}", headers=hb).status_code == 404


def test_weekday_filter_and_date_bounds(client: TestClient, auth_headers):
    h = auth_headers["user_a"]
    pid = _profile(client, h)
    today = date.today()
    other_day = (today.weekday() + 1) % 7
    _med(client, h, pid, name="WeekdayOnly", schedule_times=["09:00"], schedule_days=[other_day])
    _med(client, h, pid, name="Expired", schedule_times=["09:00"], end_date=(today - timedelta(days=1)).isoformat())
    _med(client, h, pid, name="Paused", schedule_times=["09:00"], status="paused")
    _med(client, h, pid, name="Today", schedule_times=["10:00"], schedule_days=[today.weekday()])
    names = [s["medication_name"] for s in client.get(f"/api/care/doses?date={today.isoformat()}&profile_id={pid}", headers=h).json()]
    assert names == ["Today"]


def test_adherence_counts_past_missed_but_not_pending_today(client: TestClient, auth_headers):
    h = auth_headers["user_a"]
    pid = _profile(client, h)
    med = _med(client, h, pid, schedule_times=["08:00"])
    today = date.today()
    yesterday = today - timedelta(days=1)
    client.post(
        "/api/care/dose-logs",
        headers=h,
        json={"medication_id": med["id"], "scheduled_date": yesterday.isoformat(), "scheduled_time": "08:00", "outcome": "taken"},
    )
    summary = client.get(f"/api/care/adherence?days=3&today={today.isoformat()}&profile_id={pid}", headers=h).json()
    assert summary["expected"] == 3
    assert summary["taken"] == 1
    # day-before-yesterday was never logged -> missed; today is still pending -> not missed
    assert summary["missed"] == 1
    assert summary["taken_percent"] == 50  # 1 taken of 2 doses that were already due


# ---------------------------------------------------------------- symptoms


def test_symptom_crud_scoping_and_validation(client: TestClient, auth_headers):
    h, hb = auth_headers["user_a"], auth_headers["user_b"]
    pid = _profile(client, h)
    now = datetime.now(timezone.utc)

    res = client.post(
        "/api/symptoms",
        headers=h,
        json={"title": " Morning dizziness ", "severity": "mild", "occurred_at": now.isoformat(), "profile_id": pid},
    )
    assert res.status_code == 201, res.text
    sid = res.json()["id"]
    assert res.json()["title"] == "Morning dizziness"
    assert res.json()["include_in_visit_pack"] is True

    future = (now + timedelta(days=2)).isoformat()
    assert client.post("/api/symptoms", headers=h, json={"title": "x", "occurred_at": future}).status_code == 422
    assert client.post("/api/symptoms", headers=h, json={"title": "  ", "occurred_at": now.isoformat()}).status_code == 422
    assert (
        client.post("/api/symptoms", headers=h, json={"title": "x", "severity": "dire", "occurred_at": now.isoformat()}).status_code
        == 422
    )

    upd = client.patch(f"/api/symptoms/{sid}", headers=h, json={"include_in_visit_pack": False, "severity": "moderate"})
    assert upd.json()["include_in_visit_pack"] is False and upd.json()["severity"] == "moderate"

    assert len(client.get(f"/api/symptoms?profile_id={pid}", headers=h).json()) == 1
    # isolation
    assert client.patch(f"/api/symptoms/{sid}", headers=hb, json={"severity": "mild"}).status_code == 404
    assert client.delete(f"/api/symptoms/{sid}", headers=hb).status_code == 404
    assert client.get(f"/api/symptoms?profile_id={pid}", headers=hb).status_code == 404

    assert client.delete(f"/api/symptoms/{sid}", headers=h).status_code == 204
    assert client.get(f"/api/symptoms?profile_id={pid}", headers=h).json() == []


# ---------------------------------------------------------------- profile conditions + account


def test_profile_conditions_summary_round_trip(client: TestClient, auth_headers):
    h = auth_headers["user_a"]
    pid = _profile(client, h)
    res = client.patch(
        f"/api/family-profiles/{pid}",
        headers=h,
        json={"conditions_summary": "Type 2 diabetes", "allergies_summary": "Penicillin", "blood_type": "O+"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["conditions_summary"] == "Type 2 diabetes"


def test_account_rename_export_and_delete(client: TestClient, auth_headers, users, db_session):
    h = auth_headers["user_a"]
    pid = _profile(client, h)
    client.post(
        "/api/documents/manual-entry",
        headers=h,
        json={"profile_id": pid, "entry_date": "2026-03-03", "observations": [{"test_name": "Hb", "value": "13"}]},
    )
    _med(client, h, pid)
    client.post(
        "/api/symptoms",
        headers=h,
        json={"title": "Cough", "occurred_at": datetime.now(timezone.utc).isoformat(), "profile_id": pid},
    )

    assert client.patch("/api/account", headers=h, json={"name": "  New Name "}).json()["name"] == "New Name"
    assert client.patch("/api/account", headers=h, json={"name": "   "}).status_code == 422

    export = client.get("/api/account/export", headers=h)
    assert export.status_code == 200
    assert export.headers["cache-control"] == "no-store"
    data = export.json()
    assert data["account"]["email"] == "patient_a@healthmate.ai"
    assert len(data["documents"]) == 1 and len(data["documents"][0]["observations"]) == 1
    assert len(data["medications"]) == 1 and len(data["symptoms"]) == 1
    text = export.text
    assert "hashed_password" not in text and "storage_key" not in text  # secrets never exported

    assert client.post("/api/account/delete", headers=h, json={"password": "wrong-password"}).status_code == 403
    assert client.post("/api/account/delete", headers=h, json={"password": "PatientAlphaPass123!"}).status_code == 204
    assert client.get("/api/auth/me", headers=h).status_code == 401  # account is gone

    # the other user's data is untouched
    hb = auth_headers["user_b"]
    assert client.get("/api/auth/me", headers=hb).status_code == 200
    from app.models.tracking import SymptomEntry

    assert db_session.query(SymptomEntry).count() == 0
