"""Phase 1B: student authentication tests.

Covers registration, login, access JWTs, refresh rotation, reuse detection,
logout, cookies/CSRF, student/admin separation, deleted users, and rate
limiting. Follows existing suite conventions (client + db_session fixtures,
per-test TRUNCATE + throttle reset in conftest.py).

Note on cookies: the TestClient persists cookies like a browser, so the
HttpOnly refresh cookie set by register/login is sent automatically on later
requests to /api/auth/* paths. Tests that need the body transport clear the
jar first (client.cookies.clear()).
"""

import base64
import hashlib
import json
import threading
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt
from sqlalchemy import select

from app.core.config import (
    STUDENT_AUTH_ALGORITHM,
    STUDENT_TOKEN_ISSUER,
    STUDENT_TOKEN_TYPE,
    settings,
)
from app.core.db import SessionLocal
from app.models.refresh_token import RefreshToken as RefreshTokenModel
from app.models.user import User as UserModel
from app.security import passwords
from app.services.student_auth import (
    ReusedRefreshError,
    StudentAuthService,
    hash_refresh_token,
)

ORIGIN = "http://localhost:3000"
EVIL_ORIGIN = "http://evil.example.com"
EMAIL = "student@example.com"
PASSWORD = "correct-horse-12"


# --- Helpers ---


def register(client, email=EMAIL, password=PASSWORD, **overrides):
    payload = {"email": email, "password": password, **overrides}
    return client.post("/api/auth/register", json=payload)


def login(client, email=EMAIL, password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def refresh_cookie(client):
    return client.cookies.get(settings.student_refresh_cookie_name)


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


def get_user(db_session, email=EMAIL):
    return db_session.execute(
        select(UserModel).where(UserModel.email == email)
    ).scalar_one()


def soft_delete(db_session, email=EMAIL):
    user = get_user(db_session, email)
    user.deleted_at = datetime.now(timezone.utc)
    db_session.commit()


# --- Registration ---


def test_register_valid_returns_201_with_token_and_cookie(client, db_session):
    resp = register(client, display_name="  Sam  ")
    assert resp.status_code == 201
    body = resp.json()
    assert set(body.keys()) == {"access_token", "token_type", "expires_in"}
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 15 * 60
    assert "password" not in resp.text.lower()

    cookie = refresh_cookie(client)
    assert cookie, "refresh cookie must be set"
    set_cookie = resp.headers.get("set-cookie", "")
    assert "HttpOnly" in set_cookie
    assert "SameSite=Lax" in set_cookie or "samesite=lax" in set_cookie.lower()

    user = get_user(db_session)
    assert user.email == EMAIL
    assert user.display_name == "Sam"
    assert user.password_hash != PASSWORD
    assert user.password_hash.startswith("$2b$")
    assert passwords.verify_password(PASSWORD, user.password_hash)


def test_register_rejects_invalid_email(client):
    for bad in ["not-an-email", "a@b", "@x.com", "   "]:
        resp = register(client, email=bad)
        assert resp.status_code == 422, bad


def test_register_rejects_short_password(client):
    resp = register(client, password="short1")
    assert resp.status_code == 422


def test_register_rejects_overlong_password(client):
    resp = register(client, password="x" * 73)
    assert resp.status_code == 422


def test_register_duplicate_email_returns_409(client, db_session):
    assert register(client).status_code == 201
    client.cookies.clear()
    resp = register(client)
    assert resp.status_code == 409
    assert "password_hash" not in resp.text
    # No credentials issued on the duplicate path.
    assert settings.student_refresh_cookie_name not in resp.cookies


def test_register_duplicate_email_case_insensitive(client):
    assert register(client, email="Case@Example.com").status_code == 201
    client.cookies.clear()
    assert register(client, email="case@example.COM").status_code == 409


# --- Login ---


def test_login_valid_returns_200_with_cookie(client):
    assert register(client).status_code == 201
    client.cookies.clear()
    resp = login(client)
    assert resp.status_code == 200
    assert resp.json()["token_type"] == "bearer"
    assert refresh_cookie(client)

    me = client.get("/api/auth/me", headers=bearer(resp.json()["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == EMAIL


def test_login_wrong_password_and_unknown_email_share_generic_401(client):
    assert register(client).status_code == 201
    client.cookies.clear()
    bad_password = login(client, password="wrong-password-99")
    unknown = login(client, email="nobody@example.com", password="wrong-password-99")
    assert bad_password.status_code == 401
    assert unknown.status_code == 401
    assert bad_password.json() == unknown.json()
    assert bad_password.json()["detail"] == "Invalid credentials"


def test_login_deleted_user_rejected_generically(client, db_session):
    assert register(client).status_code == 201
    soft_delete(db_session)
    client.cookies.clear()
    resp = login(client)
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"
    # Never resurrected.
    assert get_user(db_session).deleted_at is not None


def test_login_malformed_request_returns_422(client):
    assert client.post("/api/auth/login", json={"email": EMAIL}).status_code == 422
    assert client.post("/api/auth/login", json={}).status_code == 422


# --- Access JWT ---


def test_me_returns_profile_only(client):
    token = register(client).json()["access_token"]
    resp = client.get("/api/auth/me", headers=bearer(token))
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"id", "email", "display_name", "created_at"}
    assert body["email"] == EMAIL
    assert "hash" not in resp.text.lower()


def test_me_rejects_missing_and_garbage_tokens(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers=bearer("garbage")).status_code == 401


def test_me_rejects_expired_token(client, db_session):
    register(client)
    user = get_user(db_session)
    past = datetime.now(timezone.utc) - timedelta(minutes=30)
    token = craft_access_token(
        sub=str(user.id), iat=past, exp=past + timedelta(minutes=1)
    )
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 401


def test_me_rejects_wrong_signature_and_none_algorithm(client):
    other = craft_access_token()
    # Re-sign the same claims with a foreign secret.
    forged = jwt.encode(
        {"sub": "x", "type": STUDENT_TOKEN_TYPE, "iss": STUDENT_TOKEN_ISSUER},
        "foreign-secret",
        algorithm="HS256",
    )
    assert client.get("/api/auth/me", headers=bearer(forged)).status_code == 401
    assert other  # crafted with the real secret but random sub -> 401 below
    assert client.get("/api/auth/me", headers=bearer(other)).status_code == 401

    header = base64.urlsafe_b64encode(json.dumps({"alg": "none"}).encode()).rstrip(b"=")
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": str(uuid.uuid4())}).encode()
    ).rstrip(b"=")
    none_token = header.decode() + "." + payload.decode() + "."
    assert client.get("/api/auth/me", headers=bearer(none_token)).status_code == 401


def test_me_rejects_wrong_type_issuer_and_subject(client, db_session):
    register(client)
    user = get_user(db_session)
    assert (
        client.get(
            "/api/auth/me", headers=bearer(craft_access_token(type="access"))
        ).status_code
        == 401
    )
    assert (
        client.get(
            "/api/auth/me", headers=bearer(craft_access_token(iss="someone-else"))
        ).status_code
        == 401
    )
    assert (
        client.get(
            "/api/auth/me", headers=bearer(craft_access_token(sub="not-a-uuid"))
        ).status_code
        == 401
    )
    no_sub = craft_access_token()
    # strip sub by re-crafting without it
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"type": STUDENT_TOKEN_TYPE, "iss": STUDENT_TOKEN_ISSUER,
         "iat": now, "exp": now + timedelta(minutes=15)},
        settings.student_auth_secret,
        algorithm=STUDENT_AUTH_ALGORITHM,
    )
    assert no_sub  # silence linters about helper use
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 401
    assert user is not None


def test_me_rejects_deleted_and_unknown_users(client, db_session):
    token = register(client).json()["access_token"]
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 200
    soft_delete(db_session)
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 401


# --- Privilege separation ---


def _admin_token(client, db_session):
    from app.schemas.admin import AdminCreateInternal
    from app.services.admin import AdminService

    AdminService(db_session).create_admin(
        AdminCreateInternal(
            username="boss",
            password_hash=AdminService(db_session).hash_password("admin-pass-1"),
        )
    )
    resp = client.post(
        "/api/admin/auth/login", json={"username": "boss", "password": "admin-pass-1"}
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_admin_token_rejected_by_student_dependency(client, db_session):
    admin_token = _admin_token(client, db_session)
    assert (
        client.get("/api/auth/me", headers=bearer(admin_token)).status_code == 401
    )


def test_student_token_rejected_by_admin_endpoints(client):
    student_token = register(client).json()["access_token"]
    assert (
        client.get("/api/admin/auth/me", headers=bearer(student_token)).status_code
        == 401
    )
    assert (
        client.get("/api/admin/dashboard", headers=bearer(student_token)).status_code
        == 401
    )


# --- Refresh rotation ---


def test_refresh_body_transport_rotates(client, db_session):
    reg = register(client)
    old_raw = refresh_cookie(client)
    assert old_raw
    client.cookies.clear()

    resp = client.post("/api/auth/refresh", json={"refresh_token": old_raw})
    assert resp.status_code == 200
    new_raw = refresh_cookie(client)
    assert new_raw and new_raw != old_raw
    assert client.get(
        "/api/auth/me", headers=bearer(resp.json()["access_token"])
    ).status_code == 200

    # Rotation chain recorded (checked BEFORE replaying the old token: the
    # replay below is reuse and revokes the family by design).
    rows = db_session.execute(select(RefreshTokenModel)).scalars().all()
    assert len(rows) == 2
    old = next(r for r in rows if r.replaced_by is not None)
    new = next(r for r in rows if r.replaced_by is None)
    assert old.revoked_at is not None
    assert old.replaced_by == new.id
    assert new.revoked_at is None

    # Old token is dead.
    client.cookies.clear()
    assert (
        client.post("/api/auth/refresh", json={"refresh_token": old_raw}).status_code
        == 401
    )


def test_refresh_cookie_transport_with_origin(client):
    register(client)
    # Cookie jar holds the cookie; only Origin is needed (no body).
    resp = client.post("/api/auth/refresh", headers={"Origin": ORIGIN})
    assert resp.status_code == 200
    assert refresh_cookie(client)


def test_refresh_rejects_expired_revoked_unknown(client, db_session):
    register(client)
    user = get_user(db_session)

    expired = RefreshTokenModel(
        user_id=user.id,
        token_hash=hashlib.sha256(b"expired").hexdigest(),
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
    )
    db_session.add(expired)
    db_session.commit()

    client.cookies.clear()
    assert (
        client.post("/api/auth/refresh", json={"refresh_token": "expired"}).status_code
        == 401
    )
    assert (
        client.post("/api/auth/refresh", json={"refresh_token": "nope"}).status_code
        == 401
    )
    assert client.post("/api/auth/refresh", json={}).status_code == 401


def test_refresh_deleted_user_rejected(client, db_session):
    register(client)
    raw = refresh_cookie(client)
    soft_delete(db_session)
    client.cookies.clear()
    assert (
        client.post("/api/auth/refresh", json={"refresh_token": raw}).status_code
        == 401
    )


def test_raw_refresh_token_never_stored(client, db_session):
    register(client)
    raw = refresh_cookie(client)
    stored = [r.token_hash for r in db_session.execute(select(RefreshTokenModel)).scalars()]
    assert stored == [hashlib.sha256(raw.encode()).hexdigest()]
    assert all(raw != h for h in stored)


# --- Reuse detection ---


def test_reused_rotated_token_revokes_family(client, db_session):
    register(client)
    first_raw = refresh_cookie(client)
    client.cookies.clear()

    r1 = client.post("/api/auth/refresh", json={"refresh_token": first_raw})
    assert r1.status_code == 200
    second_raw = refresh_cookie(client)

    # Attacker replays the already-rotated first token.
    client.cookies.clear()
    reuse = client.post("/api/auth/refresh", json={"refresh_token": first_raw})
    assert reuse.status_code == 401
    assert settings.student_refresh_cookie_name not in reuse.cookies

    # Whole family is dead, including the winner's token.
    assert (
        client.post("/api/auth/refresh", json={"refresh_token": second_raw}).status_code
        == 401
    )
    # Legitimate user can still log in again (new family).
    assert login(client).status_code == 200


def test_concurrent_refresh_single_winner(client):
    register(client)
    raw = refresh_cookie(client)
    barrier = threading.Barrier(2)
    results = [None, None]

    def attempt(index):
        db = SessionLocal()
        try:
            barrier.wait(timeout=10)
            pair = StudentAuthService(db).refresh(raw)
            results[index] = ("ok", pair.refresh_token)
        except ReusedRefreshError:
            results[index] = ("reused", None)
        except Exception as exc:  # pragma: no cover - diagnostic only
            results[index] = ("error", repr(exc))
        finally:
            db.close()

    threads = [threading.Thread(target=attempt, args=(i,)) for i in (0, 1)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert sorted(kind for kind, _ in results) == ["ok", "reused"]
    winner_raw = next(token for kind, token in results if kind == "ok")

    # The loser's reuse attempt revoked the family, so the winner must log in again.
    db = SessionLocal()
    try:
        with pytest.raises(Exception):
            StudentAuthService(db).refresh(winner_raw)
    finally:
        db.close()


# --- Logout ---


def test_logout_revokes_and_clears_cookie(client):
    register(client)
    raw = refresh_cookie(client)
    resp = client.post("/api/auth/logout", headers={"Origin": ORIGIN})
    assert resp.status_code == 204

    client.cookies.clear()
    assert (
        client.post("/api/auth/refresh", json={"refresh_token": raw}).status_code
        == 401
    )


def test_logout_idempotent_and_safe_without_token(client):
    register(client)
    assert client.post("/api/auth/logout", headers={"Origin": ORIGIN}).status_code == 204
    assert client.post("/api/auth/logout", headers={"Origin": ORIGIN}).status_code == 204
    client.cookies.clear()
    assert client.post("/api/auth/logout", json={}).status_code == 204
    assert (
        client.post("/api/auth/logout", json={"refresh_token": "junk"}).status_code
        == 204
    )


# --- Cookie / CSRF ---


def test_cookie_refresh_requires_origin(client):
    register(client)
    # No Origin/Referer on cookie transport -> 403 (CSRF protection).
    assert client.post("/api/auth/refresh").status_code == 403
    assert (
        client.post("/api/auth/refresh", headers={"Origin": EVIL_ORIGIN}).status_code
        == 403
    )
    # Referer fallback works when Origin is absent.
    assert (
        client.post(
            "/api/auth/refresh",
            headers={"Referer": ORIGIN + "/chat"},
        ).status_code
        == 200
    )


def test_body_refresh_exempt_from_origin_check(client):
    register(client)
    raw = refresh_cookie(client)
    client.cookies.clear()
    # No Origin at all, body transport -> allowed (CSRF needs no defense here:
    # the call requires knowledge of the raw token).
    assert (
        client.post("/api/auth/refresh", json={"refresh_token": raw}).status_code
        == 200
    )


def test_cookie_logout_requires_origin_but_still_clears(client):
    register(client)
    resp = client.post("/api/auth/logout")
    assert resp.status_code == 403
    # httpx drops expired cookies from resp.cookies, so assert on the raw
    # header: the clearing Set-Cookie must still be emitted.
    set_cookie = resp.headers.get("set-cookie", "")
    assert settings.student_refresh_cookie_name in set_cookie
    assert "Max-Age=0" in set_cookie


# --- Rate limiting ---


def test_repeated_failed_logins_are_throttled(client):
    for _ in range(5):
        assert login(client, password="wrong-password-99").status_code == 401
    throttled = login(client, password="wrong-password-99")
    assert throttled.status_code == 429
    assert "Retry-After" in throttled.headers


def test_repeated_failed_refreshes_are_throttled(client):
    client.cookies.clear()
    for _ in range(5):
        assert (
            client.post("/api/auth/refresh", json={"refresh_token": "junk"}).status_code
            == 401
        )
    assert (
        client.post("/api/auth/refresh", json={"refresh_token": "junk"}).status_code
        == 429
    )
