from datetime import date, timedelta

from fastapi.testclient import TestClient


def _profile_id(client: TestClient, headers) -> str:
    res = client.get("/api/family-profiles", headers=headers)
    assert res.status_code == 200
    return res.json()[0]["id"]


def test_manual_entry_creates_verified_record_visible_in_timeline(client: TestClient, auth_headers):
    h = auth_headers["user_a"]
    pid = _profile_id(client, h)
    res = client.post(
        "/api/documents/manual-entry",
        headers=h,
        json={
            "profile_id": pid,
            "entry_type": "lab",
            "entry_date": "2026-10-14",
            "entry_time": "08:30:00",
            "source_label": "Home test",
            "observations": [
                {"test_name": "HbA1c", "value": "6.8", "unit": "%", "reference_range": "4.0 - 5.6"},
                {"test_name": "Fasting Glucose", "value": "118", "unit": "mg/dL"},
            ],
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["is_verified"] is True
    assert body["document_date"] == "2026-10-14"
    assert body["profile_id"] == pid
    assert len(body["observations"]) == 2
    hba1c = next(o for o in body["observations"] if o["test_name"] == "HbA1c")
    assert hba1c["numeric_value"] == 6.8
    assert hba1c["is_reviewed"] is True
    assert hba1c["flag"] == "HIGH"  # derived only because a reference range was supplied

    listed = client.get(f"/api/documents?profile_id={pid}", headers=h).json()
    assert [d["id"] for d in listed] == [body["id"]]


def test_manual_entry_rejects_future_date_and_empty_observations(client: TestClient, auth_headers):
    h = auth_headers["user_a"]
    future = (date.today() + timedelta(days=30)).isoformat()
    res = client.post(
        "/api/documents/manual-entry",
        headers=h,
        json={"entry_date": future, "observations": [{"test_name": "HbA1c", "value": "6"}]},
    )
    assert res.status_code == 422
    res = client.post(
        "/api/documents/manual-entry",
        headers=h,
        json={"entry_date": "2026-01-01", "observations": []},
    )
    assert res.status_code == 422
    res = client.post(
        "/api/documents/manual-entry",
        headers=h,
        json={"entry_date": "2026-01-01", "observations": [{"test_name": "  ", "value": "1"}]},
    )
    assert res.status_code == 422


def test_manual_entry_requires_auth_and_profile_ownership(client: TestClient, auth_headers):
    payload = {"entry_date": "2026-01-01", "observations": [{"test_name": "Hb", "value": "13"}]}
    assert client.post("/api/documents/manual-entry", json=payload).status_code == 401

    other_pid = _profile_id(client, auth_headers["user_b"])
    res = client.post(
        "/api/documents/manual-entry",
        headers=auth_headers["user_a"],
        json={**payload, "profile_id": other_pid},
    )
    assert res.status_code == 404  # another user's profile is indistinguishable from missing


def test_add_and_reject_observation_and_delete_manual_document(client: TestClient, auth_headers):
    h = auth_headers["user_a"]
    created = client.post(
        "/api/documents/manual-entry",
        headers=h,
        json={"entry_date": "2026-02-02", "observations": [{"test_name": "Hb", "value": "13.1", "unit": "g/dL"}]},
    ).json()
    doc_id = created["id"]

    added = client.post(
        f"/api/documents/{doc_id}/observations",
        headers=h,
        json={"test_name": "Creatinine", "value": "0.9", "unit": "mg/dL"},
    )
    assert added.status_code == 201
    obs_id = added.json()["id"]
    assert len(client.get(f"/api/documents/{doc_id}/observations", headers=h).json()) == 2

    # another user cannot touch it
    assert (
        client.delete(f"/api/documents/{doc_id}/observations/{obs_id}", headers=auth_headers["user_b"]).status_code
        == 404
    )
    assert client.delete(f"/api/documents/{doc_id}/observations/{obs_id}", headers=h).status_code == 204
    assert len(client.get(f"/api/documents/{doc_id}/observations", headers=h).json()) == 1

    # manual documents have no file on disk but must still be deletable
    assert client.delete(f"/api/documents/{doc_id}", headers=h).status_code == 204
    assert client.get(f"/api/documents/{doc_id}", headers=h).status_code == 404


def test_token_refresh_issues_new_valid_token(client: TestClient, auth_headers):
    h = auth_headers["user_a"]
    res = client.post("/api/auth/refresh", headers=h)
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"] and body["expires_in"] > 0
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert client.post("/api/auth/refresh").status_code == 401
