"""Phase 3B: owned screening history (My Check-ins foundation) tests.

Ownership rule: `WHERE screening.user_id = JWT.sub`, derived exclusively
from the verified token via `get_current_user`. No `user_id` parameter
exists on these endpoints. Anonymous rows (`user_id IS NULL`) can never
match. Follows Phase 2B test conventions (`client` + `db_session`,
per-test TRUNCATE CASCADE cleanup).
"""

import uuid
from datetime import datetime, timedelta, timezone

from app.models.screening import Screening as ScreeningModel
from app.models.user import User as UserModel

PASSWORD = "correct-horse-12"
GAD7_MILD = [1, 1, 1, 1, 1, 1, 1]
PHQ9_MINIMAL = [0, 0, 0, 0, 0, 0, 0, 0, 0]


# --- Helpers ---


def make_student(client, email):
    """Register a student; return (access_token, user_id)."""
    resp = client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200, me.text
    return token, me.json()["id"]


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def make_admin_token(client, db_session):
    from app.schemas.admin import AdminCreateInternal
    from app.services.admin import AdminService

    AdminService(db_session).create_admin(
        AdminCreateInternal(
            username="history-admin",
            password_hash=AdminService(db_session).hash_password("admin-pass-12"),
        )
    )
    resp = client.post(
        "/api/admin/auth/login",
        json={"username": "history-admin", "password": "admin-pass-12"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def owned_session(client, token):
    resp = client.post("/api/sessions", json={}, headers=bearer(token))
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def submit_owned(client, token, session_id, instrument="GAD7", responses=GAD7_MILD):
    resp = client.post(
        "/api/screenings",
        json={"session_id": session_id, "instrument": instrument, "responses": responses},
        headers=bearer(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def submit_anon(client, responses=GAD7_MILD, instrument="GAD7"):
    session_id = client.post("/api/sessions", json={}).json()["id"]
    resp = client.post(
        "/api/screenings",
        json={"session_id": session_id, "instrument": instrument, "responses": responses},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def backdate(db_session, screening_id, created_at):
    row = db_session.get(ScreeningModel, uuid.UUID(screening_id))
    row.created_at = created_at
    db_session.commit()


# --- Ownership & isolation ---


def test_user_sees_own_screenings_with_summary_fields(client, db_session):
    token, uid = make_student(client, "hist-a@example.com")
    s = owned_session(client, token)
    created = submit_owned(client, token, s)
    resp = client.get("/api/screenings/history", headers=bearer(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["limit"] == 20 and body["offset"] == 0
    (item,) = body["items"]
    assert item["id"] == created["id"]
    assert item["instrument"] == "GAD7"
    assert item["total_score"] == created["total_score"]
    assert item["severity"] == created["severity"]
    assert item["safety_flag"] is False
    assert item["item9_score"] is None  # GAD-7 has no Item 9
    assert item["created_at"]
    # Internal linkage and raw material must never leak.
    assert "session_id" not in item
    assert "responses" not in item
    assert "safety_info" not in item


def test_two_users_have_disjoint_histories(client, db_session):
    ta, _ = make_student(client, "hist-b1@example.com")
    tb, _ = make_student(client, "hist-b2@example.com")
    sa, sb = owned_session(client, ta), owned_session(client, tb)
    a1 = submit_owned(client, ta, sa)
    b1 = submit_owned(client, tb, sb, instrument="PHQ9", responses=PHQ9_MINIMAL)
    b2 = submit_owned(client, tb, sb)

    ha = client.get("/api/screenings/history", headers=bearer(ta)).json()
    hb = client.get("/api/screenings/history", headers=bearer(tb)).json()
    assert {i["id"] for i in ha["items"]} == {a1["id"]}
    assert {i["id"] for i in hb["items"]} == {b1["id"], b2["id"]}
    assert ha["total"] == 1 and hb["total"] == 2


def test_anonymous_screenings_never_appear_in_history(client, db_session):
    anon = submit_anon(client)
    token, _ = make_student(client, "hist-c@example.com")
    s = owned_session(client, token)
    owned = submit_owned(client, token, s)
    body = client.get("/api/screenings/history", headers=bearer(token)).json()
    ids = {i["id"] for i in body["items"]}
    assert anon["id"] not in ids
    assert ids == {owned["id"]}
    assert body["total"] == 1


def test_session_id_cannot_bypass_screening_ownership(client, db_session):
    ta, _ = make_student(client, "hist-d1@example.com")
    tb, _ = make_student(client, "hist-d2@example.com")
    sa = owned_session(client, ta)
    # Attacker submits against the victim's owned session -> rejected (Phase 2B gate).
    resp = client.post(
        "/api/screenings",
        json={"session_id": sa, "instrument": "GAD7", "responses": GAD7_MILD},
        headers=bearer(tb),
    )
    assert resp.status_code == 404
    assert client.get("/api/screenings/history", headers=bearer(tb)).json()["total"] == 0


# --- Authentication ---


def test_history_requires_authentication(client):
    assert client.get("/api/screenings/history").status_code == 401
    assert client.get("/api/screenings/history/latest").status_code == 401


def test_history_rejects_invalid_token(client):
    headers = {"Authorization": "Bearer not-a-real-token"}
    assert client.get("/api/screenings/history", headers=headers).status_code == 401
    assert client.get("/api/screenings/history/latest", headers=headers).status_code == 401


def test_history_rejects_admin_token(client, db_session):
    admin_token = make_admin_token(client, db_session)
    headers = {"Authorization": f"Bearer {admin_token}"}
    assert client.get("/api/screenings/history", headers=headers).status_code == 401
    assert client.get("/api/screenings/history/latest", headers=headers).status_code == 401


def test_history_rejects_deleted_user(client, db_session):
    token, _ = make_student(client, "hist-gone@example.com")
    s = owned_session(client, token)
    submit_owned(client, token, s)
    user = db_session.query(UserModel).filter_by(email="hist-gone@example.com").one()
    user.deleted_at = datetime.now(timezone.utc)
    db_session.commit()
    assert client.get("/api/screenings/history", headers=bearer(token)).status_code == 401
    assert client.get("/api/screenings/history/latest", headers=bearer(token)).status_code == 401


def test_client_user_id_query_param_cannot_change_ownership(client):
    ta, _ = make_student(client, "hist-e1@example.com")
    tb, _ = make_student(client, "hist-e2@example.com")
    other_id = client.get("/api/auth/me", headers=bearer(tb)).json()["id"]
    sa = owned_session(client, ta)
    mine = submit_owned(client, ta, sa)
    # Unknown query params are ignored; ownership still comes from the JWT.
    body = client.get(
        f"/api/screenings/history?user_id={other_id}", headers=bearer(ta)
    ).json()
    assert {i["id"] for i in body["items"]} == {mine["id"]}


# --- Pagination, filtering, ordering ---


def test_history_pagination_and_fixed_ordering(client, db_session):
    token, _ = make_student(client, "hist-f@example.com")
    s = owned_session(client, token)
    base = datetime.now(timezone.utc) - timedelta(days=10)
    ids = []
    for i in range(5):
        created = submit_owned(client, token, s)
        backdate(db_session, created["id"], base + timedelta(days=i))
        ids.append(created["id"])
    expected_desc = list(reversed(ids))

    page1 = client.get("/api/screenings/history?limit=2&offset=0", headers=bearer(token)).json()
    assert [i["id"] for i in page1["items"]] == expected_desc[:2]
    assert page1["total"] == 5 and page1["limit"] == 2 and page1["offset"] == 0

    page2 = client.get("/api/screenings/history?limit=2&offset=2", headers=bearer(token)).json()
    assert [i["id"] for i in page2["items"]] == expected_desc[2:4]

    page3 = client.get("/api/screenings/history?limit=2&offset=4", headers=bearer(token)).json()
    assert [i["id"] for i in page3["items"]] == expected_desc[4:]

    # Beyond the end: empty page, same total, nothing leaks.
    empty = client.get("/api/screenings/history?limit=2&offset=99", headers=bearer(token)).json()
    assert empty["items"] == [] and empty["total"] == 5


def test_history_pagination_cannot_reach_other_users_rows(client, db_session):
    ta, _ = make_student(client, "hist-g1@example.com")
    tb, _ = make_student(client, "hist-g2@example.com")
    sa, sb = owned_session(client, ta), owned_session(client, tb)
    mine = submit_owned(client, ta, sa)
    for _ in range(4):
        submit_owned(client, tb, sb)
    body = client.get("/api/screenings/history?limit=50&offset=0", headers=bearer(ta)).json()
    assert body["total"] == 1
    assert [i["id"] for i in body["items"]] == [mine["id"]]


def test_history_instrument_filter(client):
    token, _ = make_student(client, "hist-h@example.com")
    s = owned_session(client, token)
    gad = submit_owned(client, token, s)
    phq = submit_owned(client, token, s, instrument="PHQ9", responses=PHQ9_MINIMAL)
    gad_only = client.get("/api/screenings/history?instrument=GAD7", headers=bearer(token)).json()
    assert [i["id"] for i in gad_only["items"]] == [gad["id"]]
    phq_only = client.get("/api/screenings/history?instrument=PHQ9", headers=bearer(token)).json()
    assert [i["id"] for i in phq_only["items"]] == [phq["id"]]
    both = client.get("/api/screenings/history", headers=bearer(token)).json()
    assert both["total"] == 2


def test_history_rejects_invalid_parameters(client):
    token, _ = make_student(client, "hist-i@example.com")
    h = bearer(token)
    assert client.get("/api/screenings/history?instrument=XYZ", headers=h).status_code == 422
    assert client.get("/api/screenings/history?limit=0", headers=h).status_code == 422
    assert client.get("/api/screenings/history?limit=51", headers=h).status_code == 422
    assert client.get("/api/screenings/history?offset=-1", headers=h).status_code == 422
    assert client.get("/api/screenings/history/latest?instrument=XYZ", headers=h).status_code == 422


# --- Latest endpoint ---


def test_latest_returns_newest_owned_per_instrument(client, db_session):
    token, _ = make_student(client, "hist-j@example.com")
    s = owned_session(client, token)
    base = datetime.now(timezone.utc) - timedelta(days=5)
    old_gad = submit_owned(client, token, s)
    backdate(db_session, old_gad["id"], base)
    new_gad = submit_owned(client, token, s)
    backdate(db_session, new_gad["id"], base + timedelta(days=2))
    phq = submit_owned(client, token, s, instrument="PHQ9", responses=PHQ9_MINIMAL)
    backdate(db_session, phq["id"], base + timedelta(days=4))

    latest = client.get("/api/screenings/history/latest", headers=bearer(token)).json()
    assert latest["item"]["id"] == phq["id"]
    latest_gad = client.get("/api/screenings/history/latest?instrument=GAD7", headers=bearer(token)).json()
    assert latest_gad["item"]["id"] == new_gad["id"]
    assert "session_id" not in latest_gad["item"]


def test_latest_empty_history_returns_null_item(client):
    token, _ = make_student(client, "hist-k@example.com")
    body = client.get("/api/screenings/history/latest", headers=bearer(token)).json()
    assert body == {"item": None}
    empty = client.get("/api/screenings/history", headers=bearer(token)).json()
    assert empty == {"items": [], "total": 0, "limit": 20, "offset": 0}


# --- Anonymous regression ---


def test_anonymous_screening_submit_unchanged(client, db_session):
    created = submit_anon(client)
    assert created["session_id"]
    row = db_session.get(ScreeningModel, uuid.UUID(created["id"]))
    assert row is not None
    assert row.user_id is None
