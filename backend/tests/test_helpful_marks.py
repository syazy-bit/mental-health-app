"""Helpful-marks backend tests (My Story → What Helped: current state).

Contract under test:
- Authenticated-only mark/list/remove on /api/helpful-marks; ownership
  exclusively from JWT.sub via get_current_user; no user_id parameter.
- tool_id validated against the fixed server-side registry; unknown ids,
  malformed bodies, and smuggled user_id rejected (422).
- One current row per (user_id, tool_id), enforced by the composite PK:
  re-marking updates marked_at, never duplicates. First mark 201,
  re-mark 200, remove 204 (idempotent), unknown/unowned remove 204.
- No event history, counts, scores, or derived data anywhere.
- Cross-account access never reveals ownership (uniform 404/204).

Follows moments conventions (client + db_session, per-test TRUNCATE
CASCADE cleanup). The mark throttle is reset per test here (conftest only
resets the login throttles).
"""

import uuid
from datetime import datetime, timedelta, timezone
import re

import pytest
from jose import jwt
from sqlalchemy import inspect as sa_inspect
from sqlalchemy import text as sa_text

from app.api.routes.helpful_marks import mark_throttle
from app.core.config import (
    STUDENT_AUTH_ALGORITHM,
    STUDENT_TOKEN_ISSUER,
    STUDENT_TOKEN_TYPE,
    settings,
)
from app.models.helpful_mark import HelpfulMark as HelpfulMarkModel
from app.models.user import User as UserModel
from app.tools import TOOL_IDS

PASSWORD = "correct-horse-12"
TOOL_A = "box_breathing"
TOOL_B = "sensory_grounding"


# --- Helpers ---


@pytest.fixture(autouse=True)
def _reset_mark_throttle():
    mark_throttle.reset()
    yield
    mark_throttle.reset()


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
            username="marks-admin",
            password_hash=AdminService(db_session).hash_password("admin-pass-12"),
        )
    )
    resp = client.post(
        "/api/admin/auth/login",
        json={"username": "marks-admin", "password": "admin-pass-12"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def craft_access_token(**claims):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(uuid.uuid4()),
        "type": STUDENT_TOKEN_TYPE,
        "iss": STUDENT_TOKEN_ISSUER,
        "iat": now,
        "exp": now + timedelta(minutes=15),
    }
    payload.update(claims)
    return jwt.encode(
        payload, settings.student_auth_secret, algorithm=STUDENT_AUTH_ALGORITHM
    )


def mark(client, token, tool_id=TOOL_A):
    return client.post(
        "/api/helpful-marks", json={"tool_id": tool_id}, headers=bearer(token)
    )


def soft_delete_user(db_session, email):
    user = db_session.query(UserModel).filter_by(email=email).one()
    user.deleted_at = datetime.now(timezone.utc)
    db_session.commit()


def rows_for(db_session, user_id):
    return (
        db_session.query(HelpfulMarkModel)
        .filter_by(user_id=uuid.UUID(user_id))
        .all()
    )


# --- Auth matrix ---


def test_anonymous_post_get_delete_rejected(client, db_session):
    assert client.post("/api/helpful-marks", json={"tool_id": TOOL_A}).status_code == 401
    assert client.get("/api/helpful-marks").status_code == 401
    assert client.delete(f"/api/helpful-marks/{TOOL_A}").status_code == 401


def test_admin_jwt_rejected_on_all_endpoints(client, db_session):
    admin = make_admin_token(client, db_session)
    headers = bearer(admin)
    assert client.post("/api/helpful-marks", json={"tool_id": TOOL_A}, headers=headers).status_code == 401
    assert client.get("/api/helpful-marks", headers=headers).status_code == 401
    assert client.delete(f"/api/helpful-marks/{TOOL_A}", headers=headers).status_code == 401


def test_invalid_and_expired_jwt_rejected(client, db_session):
    token, _ = make_student(client, "marks-tok@example.com")
    bad = bearer("not-a-jwt")
    assert client.get("/api/helpful-marks", headers=bad).status_code == 401
    assert client.post("/api/helpful-marks", json={"tool_id": TOOL_A}, headers=bad).status_code == 401

    user = db_session.query(UserModel).filter_by(email="marks-tok@example.com").one()
    past = datetime.now(timezone.utc) - timedelta(minutes=30)
    expired = craft_access_token(
        sub=str(user.id), iat=past, exp=past + timedelta(minutes=1)
    )
    assert client.get("/api/helpful-marks", headers=bearer(expired)).status_code == 401
    # Live token unaffected.
    assert client.get("/api/helpful-marks", headers=bearer(token)).status_code == 200


def test_wrong_type_token_rejected(client, db_session):
    token, _ = make_student(client, "marks-type@example.com")
    user = db_session.query(UserModel).filter_by(email="marks-type@example.com").one()
    confused = craft_access_token(sub=str(user.id), type="access")
    assert client.get("/api/helpful-marks", headers=bearer(confused)).status_code == 401
    assert client.get("/api/helpful-marks", headers=bearer(token)).status_code == 200


def test_deleted_student_rejected(client, db_session):
    token, _ = make_student(client, "marks-gone@example.com")
    assert client.get("/api/helpful-marks", headers=bearer(token)).status_code == 200
    soft_delete_user(db_session, "marks-gone@example.com")
    assert client.get("/api/helpful-marks", headers=bearer(token)).status_code == 401
    assert client.post("/api/helpful-marks", json={"tool_id": TOOL_A}, headers=bearer(token)).status_code == 401
    assert client.delete(f"/api/helpful-marks/{TOOL_A}", headers=bearer(token)).status_code == 401


# --- Validation ---


def test_unknown_tool_id_rejected(client, db_session):
    token, _ = make_student(client, "marks-unknown@example.com")
    assert mark(client, token, "nap_time").status_code == 422
    assert mark(client, token, "Box Breathing").status_code == 422
    assert mark(client, token, "").status_code == 422
    # Nothing was stored for rejected requests.
    assert client.get("/api/helpful-marks", headers=bearer(token)).json()["total"] == 0


def test_malformed_bodies_rejected(client, db_session):
    token, _ = make_student(client, "marks-malformed@example.com")
    headers = bearer(token)
    assert client.post("/api/helpful-marks", json={}, headers=headers).status_code == 422
    assert client.post("/api/helpful-marks", json={"tool_id": 42}, headers=headers).status_code == 422
    assert client.post("/api/helpful-marks", json={"tool_id": None}, headers=headers).status_code == 422
    assert client.get("/api/helpful-marks", headers=headers).json()["total"] == 0


def test_client_user_id_rejected(client, db_session):
    token, uid = make_student(client, "marks-spoof@example.com")
    resp = client.post(
        "/api/helpful-marks",
        json={"tool_id": TOOL_A, "user_id": uid},
        headers=bearer(token),
    )
    assert resp.status_code == 422
    resp = client.post(
        "/api/helpful-marks",
        json={"tool_id": TOOL_A, "user_id": str(uuid.uuid4())},
        headers=bearer(token),
    )
    assert resp.status_code == 422
    assert client.get("/api/helpful-marks", headers=bearer(token)).json()["total"] == 0


def test_oversized_request_body_rejected_before_parsing(client, db_session):
    token, _ = make_student(client, "marks-big@example.com")
    resp = client.post(
        "/api/helpful-marks",
        json={"tool_id": "x" * 2000},
        headers=bearer(token),
    )
    assert resp.status_code == 413


def test_rate_limit_60_marks_per_hour(client, db_session):
    token, _ = make_student(client, "marks-rate@example.com")
    # Distinct tools cycle through the 4-id registry; re-marks refresh.
    tools = sorted(TOOL_IDS)
    for i in range(60):
        resp = mark(client, token, tools[i % len(tools)])
        assert resp.status_code in (200, 201), resp.text
    limited = mark(client, token, tools[0])
    assert limited.status_code == 429
    # Another account is unaffected (per-account buckets).
    other, _ = make_student(client, "marks-rate2@example.com")
    assert mark(client, other, tools[0]).status_code == 201


# --- Marking semantics ---


def test_first_mark_creates_one_row_201(client, db_session):
    token, uid = make_student(client, "marks-first@example.com")
    resp = mark(client, token, TOOL_A)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert set(body.keys()) == {"tool_id", "marked_at"}
    assert body["tool_id"] == TOOL_A
    assert "user_id" not in body
    rows = rows_for(db_session, uid)
    assert len(rows) == 1
    assert rows[0].tool_id == TOOL_A
    assert rows[0].user_id == uuid.UUID(uid)


def test_remark_updates_timestamp_without_duplicate_200(client, db_session):
    token, uid = make_student(client, "marks-remark@example.com")
    first = mark(client, token, TOOL_A)
    assert first.status_code == 201
    first_at = first.json()["marked_at"]
    second = mark(client, token, TOOL_A)
    assert second.status_code == 200, second.text
    assert set(second.json().keys()) == {"tool_id", "marked_at"}
    assert second.json()["marked_at"] >= first_at
    rows = rows_for(db_session, uid)
    assert len(rows) == 1
    assert rows[0].marked_at.isoformat() == second.json()["marked_at"]


def test_repeated_marks_never_duplicate(client, db_session):
    token, uid = make_student(client, "marks-repeat@example.com")
    for _ in range(5):
        resp = mark(client, token, TOOL_B)
        assert resp.status_code in (200, 201)
    assert len(rows_for(db_session, uid)) == 1


def test_two_users_mark_same_tool_independently(client, db_session):
    ta, ua = make_student(client, "marks-i1@example.com")
    tb, ub = make_student(client, "marks-i2@example.com")
    assert mark(client, ta, TOOL_A).status_code == 201
    assert mark(client, tb, TOOL_A).status_code == 201
    assert len(rows_for(db_session, ua)) == 1
    assert len(rows_for(db_session, ub)) == 1
    assert client.get("/api/helpful-marks", headers=bearer(ta)).json()["total"] == 1
    assert client.get("/api/helpful-marks", headers=bearer(tb)).json()["total"] == 1


def test_concurrent_duplicate_posts_converge_to_one_row(client, db_session):
    import threading

    token, uid = make_student(client, "marks-race@example.com")
    statuses: list[int] = []
    lock = threading.Lock()

    def attempt():
        resp = mark(client, token, TOOL_A)
        with lock:
            statuses.append(resp.status_code)

    threads = [threading.Thread(target=attempt) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(statuses).count(201) == 1
    assert all(s in (200, 201) for s in statuses)
    assert len(rows_for(db_session, uid)) == 1


# --- List ---


def test_list_only_owner_newest_first(client, db_session):
    ta, _ = make_student(client, "marks-la@example.com")
    tb, _ = make_student(client, "marks-lb@example.com")
    assert mark(client, tb, TOOL_B).status_code == 201
    assert mark(client, ta, TOOL_A).status_code == 201
    # Re-mark A later via a second tool then A again to order by marked_at.
    assert mark(client, ta, TOOL_B).status_code == 201

    body = client.get("/api/helpful-marks", headers=bearer(ta)).json()
    assert body["total"] == 2
    assert body["limit"] == 20 and body["offset"] == 0
    assert [i["tool_id"] for i in body["items"]] == [TOOL_B, TOOL_A]
    assert all(set(i.keys()) == {"tool_id", "marked_at"} for i in body["items"])
    assert all("user_id" not in i for i in body["items"])

    other = client.get("/api/helpful-marks", headers=bearer(tb)).json()
    assert other["total"] == 1
    assert other["items"][0]["tool_id"] == TOOL_B


def test_list_pagination_and_validation(client, db_session):
    token, _ = make_student(client, "marks-page@example.com")
    for tool_id in sorted(TOOL_IDS):
        assert mark(client, token, tool_id).status_code == 201
    page1 = client.get("/api/helpful-marks?limit=2&offset=0", headers=bearer(token)).json()
    assert (page1["total"], page1["limit"], page1["offset"]) == (4, 2, 0)
    assert len(page1["items"]) == 2
    page2 = client.get("/api/helpful-marks?limit=2&offset=2", headers=bearer(token)).json()
    assert len(page2["items"]) == 2
    ids1 = {i["tool_id"] for i in page1["items"]}
    assert all(i["tool_id"] not in ids1 for i in page2["items"])
    assert client.get("/api/helpful-marks?limit=0", headers=bearer(token)).status_code == 422
    assert client.get("/api/helpful-marks?limit=51", headers=bearer(token)).status_code == 422
    assert client.get("/api/helpful-marks?offset=-1", headers=bearer(token)).status_code == 422


def test_empty_list_shape(client, db_session):
    token, _ = make_student(client, "marks-empty@example.com")
    body = client.get("/api/helpful-marks", headers=bearer(token)).json()
    assert body == {"items": [], "total": 0, "limit": 20, "offset": 0}


# --- Remove ---


def test_remove_owned_item_204_and_removes(client, db_session):
    token, uid = make_student(client, "marks-rm@example.com")
    assert mark(client, token, TOOL_A).status_code == 201
    resp = client.delete(f"/api/helpful-marks/{TOOL_A}", headers=bearer(token))
    assert resp.status_code == 204, resp.text
    assert resp.content == b""
    assert client.get("/api/helpful-marks", headers=bearer(token)).json()["total"] == 0
    assert rows_for(db_session, uid) == []


def test_repeat_remove_deterministic_204(client, db_session):
    token, _ = make_student(client, "marks-rm2@example.com")
    assert mark(client, token, TOOL_A).status_code == 201
    assert client.delete(f"/api/helpful-marks/{TOOL_A}", headers=bearer(token)).status_code == 204
    assert client.delete(f"/api/helpful-marks/{TOOL_A}", headers=bearer(token)).status_code == 204
    assert client.delete("/api/helpful-marks/never_marked_tool", headers=bearer(token)).status_code == 204


def test_cross_account_remove_reveals_nothing(client, db_session):
    ta, ua = make_student(client, "marks-xa@example.com")
    tb, _ = make_student(client, "marks-xb@example.com")
    assert mark(client, ta, TOOL_A).status_code == 201
    # Attacker gets the same 204 whether or not the row exists.
    assert client.delete(f"/api/helpful-marks/{TOOL_A}", headers=bearer(tb)).status_code == 204
    assert client.delete("/api/helpful-marks/no_such_tool_xyz", headers=bearer(tb)).status_code == 204
    # Owner unaffected: still marked and listed.
    assert client.get("/api/helpful-marks", headers=bearer(ta)).json()["total"] == 1
    assert len(rows_for(db_session, ua)) == 1


def test_remove_then_remark_works(client, db_session):
    token, uid = make_student(client, "marks-cycle@example.com")
    assert mark(client, token, TOOL_A).status_code == 201
    assert client.delete(f"/api/helpful-marks/{TOOL_A}", headers=bearer(token)).status_code == 204
    assert mark(client, token, TOOL_A).status_code == 201
    assert len(rows_for(db_session, uid)) == 1


# --- Account lifecycle ---


def test_hard_delete_cascades_marks(client, db_session):
    from app.models.user import User as UserModel

    token, uid = make_student(client, "marks-cascade@example.com")
    assert mark(client, token, TOOL_A).status_code == 201
    assert mark(client, token, TOOL_B).status_code == 201
    assert len(rows_for(db_session, uid)) == 2
    user = db_session.query(UserModel).filter_by(email="marks-cascade@example.com").one()
    db_session.delete(user)
    db_session.commit()
    remaining = (
        db_session.query(HelpfulMarkModel)
        .filter_by(user_id=uuid.UUID(uid))
        .all()
    )
    assert remaining == []


def test_soft_deleted_user_cannot_act_but_rows_persist_for_hard_delete(client, db_session):
    token, uid = make_student(client, "marks-soft@example.com")
    assert mark(client, token, TOOL_A).status_code == 201
    soft_delete_user(db_session, "marks-soft@example.com")
    assert client.get("/api/helpful-marks", headers=bearer(token)).status_code == 401
    # Row still present (withdrawal blocks access; physical removal happens
    # if the account row is ever hard-deleted, per CASCADE).
    assert len(rows_for(db_session, uid)) == 1


# --- Privacy ---


def test_no_sensitive_content_in_errors_or_logs(client, db_session, caplog):
    token, _ = make_student(client, "marks-leak@example.com")
    secret_tool = "secret_tool_xyz_123"
    with caplog.at_level("INFO"):
        resp = client.post(
            "/api/helpful-marks", json={"tool_id": secret_tool}, headers=bearer(token)
        )
    assert resp.status_code == 422
    assert secret_tool not in resp.text
    assert secret_tool not in caplog.text


# --- Schema guard ---


def test_exact_column_set(client, db_session):
    """Fail if the table gains count/score/history/timestamp columns."""
    cols = {c.name for c in sa_inspect(HelpfulMarkModel).columns}
    assert cols == {"user_id", "tool_id", "marked_at"}


# --- Registry ---


def test_registry_matches_production_tools():
    """Every markable tool keeps a stable id; unknown ids are rejected."""
    assert TOOL_IDS == frozenset(
        {"box_breathing", "sensory_grounding", "study_reset", "grounding_hunt"}
    )
    for tool_id in sorted(TOOL_IDS):
        assert isinstance(tool_id, str) and tool_id == tool_id.strip().lower()
        assert " " not in tool_id


def test_registry_matches_database_check_constraint(client, db_session):
    """Fail if app.tools.TOOL_IDS drifts from the live CHECK constraint.

    Catches both directions with exact set equality (not subset):
    A. registry gains a tool without a CHECK migration — Pydantic would
       accept it while PostgreSQL rejects it (500 on mark);
    B. CHECK names a tool the registry dropped — dead ids the API can
       neither accept consistently nor explain.
    """
    definition = db_session.execute(
        sa_text(
            "SELECT pg_get_constraintdef(oid) FROM pg_constraint "
            "WHERE conrelid='helpful_marks'::regclass "
            "AND conname='ck_helpful_marks_tool'"
        )
    ).scalar_one()
    db_ids = set(re.findall(r"'([a-z0-9_]+)'", definition))
    assert db_ids == set(TOOL_IDS), (
        f"registry/check drift: app={sorted(TOOL_IDS)} db={sorted(db_ids)}"
    )
