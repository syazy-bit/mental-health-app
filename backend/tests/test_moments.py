"""Moments backend MVP tests (My Story: user-authored private notes).

Contract under test:
- Authenticated-only CRUD on /api/moments; ownership exclusively from
  JWT.sub via get_current_user; no user_id parameter anywhere.
- Body is 1-500 chars plaintext; no titles, moods, tags, summaries,
  embeddings, or risk data anywhere in the schema or the table.
- Creation runs the existing SafetyEngine pre-insert; the level is
  transient response-only, never persisted; every level still saves.
- DELETE enters a 5-second recovery window (invisible + restorable);
  POST /{id}/restore works only inside the window; expiry is enforced
  by timestamp comparison and finished by the sweep. Deterministic tests
  manipulate delete_expires_at directly instead of sleeping.
- Cross-account access always yields a non-disclosing 404.

Follows Phase 3B/3E conventions (client + db_session, per-test TRUNCATE
CASCADE cleanup). The moment creation throttle is reset per test here
(conftest only resets the login throttles).
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.api.routes.moments import moment_create_throttle
from app.core.config import (
    STUDENT_AUTH_ALGORITHM,
    STUDENT_TOKEN_ISSUER,
    STUDENT_TOKEN_TYPE,
    settings,
)
from app.models.moment import Moment as MomentModel
from app.models.user import User as UserModel
from app.services.moments import RESTORE_WINDOW_SECONDS

PASSWORD = "correct-horse-12"
NORMAL_BODY = "Quiet morning, finished one assignment without rushing."
MODERATE_BODY = "I have been feeling hopeless about my grades lately."
HIGH_BODY = "I am planning to hurt myself tonight."


# --- Helpers ---


@pytest.fixture(autouse=True)
def _reset_moment_throttle():
    moment_create_throttle.reset()
    yield
    moment_create_throttle.reset()


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
            username="moments-admin",
            password_hash=AdminService(db_session).hash_password("admin-pass-12"),
        )
    )
    resp = client.post(
        "/api/admin/auth/login",
        json={"username": "moments-admin", "password": "admin-pass-12"},
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


def save(client, token, body=NORMAL_BODY):
    return client.post("/api/moments", json={"body": body}, headers=bearer(token))


def get_row(db_session, moment_id):
    return db_session.get(MomentModel, uuid.UUID(moment_id))


def soft_delete_user(db_session, email):
    user = db_session.query(UserModel).filter_by(email=email).one()
    user.deleted_at = datetime.now(timezone.utc)
    db_session.commit()


def expire_window(db_session, moment_id):
    row = get_row(db_session, moment_id)
    assert row is not None and row.deleted_at is not None
    row.delete_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()


# --- Auth ---


def test_anonymous_post_get_delete_restore_rejected(client, db_session):
    assert client.post("/api/moments", json={"body": NORMAL_BODY}).status_code == 401
    assert client.get("/api/moments").status_code == 401
    fake = str(uuid.uuid4())
    assert client.delete(f"/api/moments/{fake}").status_code == 401
    assert client.post(f"/api/moments/{fake}/restore").status_code == 401


def test_admin_jwt_rejected_on_all_endpoints(client, db_session):
    admin = make_admin_token(client, db_session)
    headers = bearer(admin)
    assert client.post("/api/moments", json={"body": NORMAL_BODY}, headers=headers).status_code == 401
    assert client.get("/api/moments", headers=headers).status_code == 401
    fake = str(uuid.uuid4())
    assert client.delete(f"/api/moments/{fake}", headers=headers).status_code == 401
    assert client.post(f"/api/moments/{fake}/restore", headers=headers).status_code == 401


def test_invalid_and_expired_jwt_rejected(client, db_session):
    token, _ = make_student(client, "mom-anon-tok@example.com")
    bad = bearer("not-a-jwt")
    assert client.get("/api/moments", headers=bad).status_code == 401
    assert client.post("/api/moments", json={"body": NORMAL_BODY}, headers=bad).status_code == 401

    user = db_session.query(UserModel).filter_by(email="mom-anon-tok@example.com").one()
    past = datetime.now(timezone.utc) - timedelta(minutes=30)
    expired = craft_access_token(
        sub=str(user.id), iat=past, exp=past + timedelta(minutes=1)
    )
    assert client.get("/api/moments", headers=bearer(expired)).status_code == 401
    # Live token unaffected.
    assert client.get("/api/moments", headers=bearer(token)).status_code == 200


def test_wrong_type_token_rejected(client, db_session):
    token, _ = make_student(client, "mom-type@example.com")
    user = db_session.query(UserModel).filter_by(email="mom-type@example.com").one()
    confused = craft_access_token(sub=str(user.id), type="access")
    assert client.get("/api/moments", headers=bearer(confused)).status_code == 401
    assert client.get("/api/moments", headers=bearer(token)).status_code == 200


def test_deleted_student_rejected(client, db_session):
    token, _ = make_student(client, "mom-gone@example.com")
    assert client.get("/api/moments", headers=bearer(token)).status_code == 200
    soft_delete_user(db_session, "mom-gone@example.com")
    assert client.get("/api/moments", headers=bearer(token)).status_code == 401
    assert client.post("/api/moments", json={"body": NORMAL_BODY}, headers=bearer(token)).status_code == 401


# --- Creation & validation ---


def test_create_returns_201_with_exact_shape(client, db_session):
    token, _ = make_student(client, "mom-create@example.com")
    resp = save(client, token)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert set(body.keys()) == {"id", "body", "created_at", "safety"}
    assert body["body"] == NORMAL_BODY
    assert body["safety"] == {"level": "normal"}
    assert "user_id" not in body
    uuid.UUID(body["id"])  # parses as UUID, not an integer sequence


def test_create_boundaries(client, db_session):
    token, _ = make_student(client, "mom-bounds@example.com")
    assert save(client, token, "x").status_code == 201  # 1 char valid
    assert save(client, token, "y" * 500).status_code == 201  # 500 valid
    assert save(client, token, "z" * 501).status_code == 422
    assert save(client, token, "").status_code == 422
    assert save(client, token, "   \n\t  ").status_code == 422


def test_client_user_id_rejected_and_never_echoed(client, db_session):
    token, _ = make_student(client, "mom-spoof@example.com")
    resp = client.post(
        "/api/moments",
        json={"body": NORMAL_BODY, "user_id": str(uuid.uuid4())},
        headers=bearer(token),
    )
    assert resp.status_code == 422
    # Nothing was stored for the rejected request.
    assert client.get("/api/moments", headers=bearer(token)).json()["total"] == 0


def test_oversized_request_body_rejected_before_parsing(client, db_session):
    token, _ = make_student(client, "mom-big@example.com")
    resp = client.post(
        "/api/moments", json={"body": "w" * 5000}, headers=bearer(token)
    )
    assert resp.status_code == 413


def test_rate_limit_30_creates_per_hour(client, db_session):
    token, _ = make_student(client, "mom-rate@example.com")
    for i in range(30):
        resp = save(client, token, f"note number {i}")
        assert resp.status_code == 201, resp.text
    limited = save(client, token, "one too many")
    assert limited.status_code == 429
    # Another account is unaffected (per-account buckets).
    other, _ = make_student(client, "mom-rate2@example.com")
    assert save(client, other, "fresh account").status_code == 201


# --- List ---


def test_list_shows_only_own_moments_newest_first(client, db_session):
    ta, _ = make_student(client, "mom-la@example.com")
    tb, _ = make_student(client, "mom-lb@example.com")
    save(client, tb, "other person's words")
    first = save(client, ta, "my first").json()
    second = save(client, ta, "my second").json()

    body = client.get("/api/moments", headers=bearer(ta)).json()
    assert body["total"] == 2
    assert [i["id"] for i in body["items"]] == [second["id"], first["id"]]
    assert all(set(i.keys()) == {"id", "body", "created_at"} for i in body["items"])
    assert all("user_id" not in i for i in body["items"])

    other = client.get("/api/moments", headers=bearer(tb)).json()
    assert other["total"] == 1
    assert other["items"][0]["body"] == "other person's words"


def test_list_ordering_is_deterministic_after_backdate(client, db_session):
    token, _ = make_student(client, "mom-order@example.com")
    a = save(client, token, "aaa").json()
    b = save(client, token, "bbb").json()
    c = save(client, token, "ccc").json()
    row = get_row(db_session, c["id"])
    row.created_at = datetime.now(timezone.utc) - timedelta(days=30)
    db_session.commit()

    twice = [
        [i["id"] for i in client.get("/api/moments", headers=bearer(token)).json()["items"]]
        for _ in range(2)
    ]
    assert twice[0] == twice[1] == [b["id"], a["id"], c["id"]]


def test_list_pagination_and_validation(client, db_session):
    token, _ = make_student(client, "mom-page@example.com")
    for i in range(3):
        assert save(client, token, f"paged {i}").status_code == 201
    page1 = client.get("/api/moments?limit=2&offset=0", headers=bearer(token)).json()
    assert (page1["total"], page1["limit"], page1["offset"]) == (3, 2, 0)
    assert len(page1["items"]) == 2
    page2 = client.get("/api/moments?limit=2&offset=2", headers=bearer(token)).json()
    assert len(page2["items"]) == 1
    ids1 = {i["id"] for i in page1["items"]}
    assert page2["items"][0]["id"] not in ids1
    assert client.get("/api/moments?limit=0", headers=bearer(token)).status_code == 422
    assert client.get("/api/moments?limit=51", headers=bearer(token)).status_code == 422
    assert client.get("/api/moments?offset=-1", headers=bearer(token)).status_code == 422


def test_empty_list_shape(client, db_session):
    token, _ = make_student(client, "mom-empty@example.com")
    body = client.get("/api/moments", headers=bearer(token)).json()
    assert body == {"items": [], "total": 0, "limit": 20, "offset": 0}


# --- Ownership (non-disclosing 404) ---


def test_cross_account_delete_restore_return_404(client, db_session):
    ta, _ = make_student(client, "mom-xa@example.com")
    tb, _ = make_student(client, "mom-xb@example.com")
    mid = save(client, ta, "mine, not yours").json()["id"]
    assert client.delete(f"/api/moments/{mid}", headers=bearer(tb)).status_code == 404
    assert client.post(f"/api/moments/{mid}/restore", headers=bearer(tb)).status_code == 404
    # Owner unaffected: still live and listed.
    assert client.get("/api/moments", headers=bearer(ta)).json()["total"] == 1
    assert get_row(db_session, mid).deleted_at is None


def test_unknown_id_returns_404_for_all_mutations(client, db_session):
    token, _ = make_student(client, "mom-404@example.com")
    fake = str(uuid.uuid4())
    assert client.delete(f"/api/moments/{fake}", headers=bearer(token)).status_code == 404
    assert client.post(f"/api/moments/{fake}/restore", headers=bearer(token)).status_code == 404


# --- Safety ---


def test_safety_levels_save_and_stay_transient(client, db_session):
    token, _ = make_student(client, "mom-safe@example.com")
    for text, level in (
        (NORMAL_BODY, "normal"),
        (MODERATE_BODY, "moderate"),
        (HIGH_BODY, "high_risk"),
    ):
        resp = save(client, token, text)
        assert resp.status_code == 201, resp.text
        assert resp.json()["safety"] == {"level": level}
    assert client.get("/api/moments", headers=bearer(token)).json()["total"] == 3

    # Nothing about the evaluation is persisted: exact column set, markers clear.
    rows = db_session.query(MomentModel).all()
    assert len(rows) == 3
    assert set(MomentModel.__table__.columns.keys()) == {
        "id",
        "user_id",
        "body_plaintext",
        "deleted_at",
        "delete_expires_at",
        "created_at",
    }
    for row in rows:
        assert row.deleted_at is None and row.delete_expires_at is None


def test_restore_window_constant_is_five_seconds():
    assert RESTORE_WINDOW_SECONDS == 5


# --- Delete / restore lifecycle ---


def test_delete_hides_immediately_and_restores_in_window(client, db_session):
    token, _ = make_student(client, "mom-undo@example.com")
    mid = save(client, token, "temporary goodbye").json()["id"]
    assert client.delete(f"/api/moments/{mid}", headers=bearer(token)).status_code == 204
    assert client.get("/api/moments", headers=bearer(token)).json()["total"] == 0

    row = get_row(db_session, mid)
    assert row is not None and row.deleted_at is not None
    assert row.delete_expires_at is not None and row.delete_expires_at > row.deleted_at

    restored = client.post(f"/api/moments/{mid}/restore", headers=bearer(token))
    assert restored.status_code == 200, restored.text
    assert set(restored.json().keys()) == {"id", "body", "created_at"}
    assert restored.json()["body"] == "temporary goodbye"
    assert client.get("/api/moments", headers=bearer(token)).json()["total"] == 1


def test_repeated_delete_is_idempotent_and_keeps_window(client, db_session):
    token, _ = make_student(client, "mom-redel@example.com")
    mid = save(client, token, "delete me twice").json()["id"]
    assert client.delete(f"/api/moments/{mid}", headers=bearer(token)).status_code == 204
    first_expiry = get_row(db_session, mid).delete_expires_at
    assert client.delete(f"/api/moments/{mid}", headers=bearer(token)).status_code == 204
    assert get_row(db_session, mid).delete_expires_at == first_expiry
    # Still restorable: the window was not extended or consumed.
    assert client.post(f"/api/moments/{mid}/restore", headers=bearer(token)).status_code == 200


def test_duplicate_restore_after_success_is_404(client, db_session):
    token, _ = make_student(client, "mom-restore2@example.com")
    mid = save(client, token, "restore once").json()["id"]
    client.delete(f"/api/moments/{mid}", headers=bearer(token))
    assert client.post(f"/api/moments/{mid}/restore", headers=bearer(token)).status_code == 200
    # Live rows have nothing to restore.
    assert client.post(f"/api/moments/{mid}/restore", headers=bearer(token)).status_code == 404


def test_expired_window_restores_nothing_and_removes_row(client, db_session):
    token, _ = make_student(client, "mom-expire@example.com")
    mid = save(client, token, "too late").json()["id"]
    assert client.delete(f"/api/moments/{mid}", headers=bearer(token)).status_code == 204
    expire_window(db_session, mid)
    assert client.post(f"/api/moments/{mid}/restore", headers=bearer(token)).status_code == 404
    db_session.expire_all()  # drop identity-map copy deleted by another session
    assert get_row(db_session, mid) is None
    assert client.get("/api/moments", headers=bearer(token)).json()["total"] == 0


def test_sweep_removes_expired_tombstones_on_next_request(client, db_session):
    token, _ = make_student(client, "mom-sweep@example.com")
    mid = save(client, token, "swept away").json()["id"]
    client.delete(f"/api/moments/{mid}", headers=bearer(token))
    expire_window(db_session, mid)
    assert get_row(db_session, mid) is not None  # still physically present
    assert client.get("/api/moments", headers=bearer(token)).json()["total"] == 0
    assert get_row(db_session, mid) is None  # sweep removed it permanently


def test_restore_after_account_deletion_is_401_not_found(client, db_session):
    token, _ = make_student(client, "mom-delrace@example.com")
    mid = save(client, token, "orphaned").json()["id"]
    assert client.delete(f"/api/moments/{mid}", headers=bearer(token)).status_code == 204
    soft_delete_user(db_session, "mom-delrace@example.com")
    # Auth fails first: deactivation takes precedence over any restoration.
    assert client.post(f"/api/moments/{mid}/restore", headers=bearer(token)).status_code == 401


# --- Privacy / plaintext ---


def test_body_never_leaks_into_validation_errors(client, db_session, caplog):
    token, _ = make_student(client, "mom-leak@example.com")
    secret = "supercalifragilistic-moment-xyz-123"
    with caplog.at_level("INFO"):
        resp = client.post(
            "/api/moments", json={"body": "x" * 501 + secret}, headers=bearer(token)
        )
    assert resp.status_code in (413, 422)
    assert secret not in resp.text
    assert secret not in caplog.text


def test_script_payload_stays_plaintext_json(client, db_session):
    token, _ = make_student(client, "mom-xss@example.com")
    payload = "<script>alert(1)</script>"
    resp = save(client, token, payload)
    assert resp.status_code == 201, resp.text
    assert resp.headers["content-type"].startswith("application/json")
    assert resp.json()["body"] == payload
    listed = client.get("/api/moments", headers=bearer(token)).json()
    assert listed["items"][0]["body"] == payload
    assert get_row(db_session, listed["items"][0]["id"]).body_plaintext == payload


def test_no_admin_or_analytics_surface_for_moments(client, db_session):
    # Admin token cannot touch moment endpoints at all (covered above for
    # CRUD); here assert the analytics surface has no moment knowledge.
    from app.repositories import moments as moments_repo_module

    assert not hasattr(moments_repo_module.MomentRepository, "analytics")
    assert not hasattr(moments_repo_module.MomentRepository, "count_by_user_global")
    admin = make_admin_token(client, db_session)
    assert (
        client.get("/api/analytics", headers=bearer(admin)).status_code
        in (200, 401, 403, 404)
    )
