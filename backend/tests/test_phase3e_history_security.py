"""Phase 3E: security regression tests for owned screening history.

Covers boundaries the Phase 3B suite left implicit:

- expired access tokens are rejected on BOTH history endpoints (the
  endpoints must use the strict `get_current_user` choke point, never a
  weaker dependency);
- `GET /history/latest` is per-user isolated (the Phase 3B suite proved
  isolation for the list endpoint only);
- token type confusion is rejected at the history boundary (a JWT signed
  with the student secret but carrying the admin `type` claim must fail).

Follows Phase 3B test conventions (`client` + `db_session`, per-test
TRUNCATE CASCADE cleanup in conftest.py).
"""

import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core.config import (
    STUDENT_AUTH_ALGORITHM,
    STUDENT_TOKEN_ISSUER,
    STUDENT_TOKEN_TYPE,
    settings,
)

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


# --- Expiry boundary ---


def test_history_and_latest_reject_expired_token(client, db_session):
    token, _ = make_student(client, "hist3e-exp@example.com")
    s = owned_session(client, token)
    created = submit_owned(client, token, s)
    assert created["id"]

    # Re-mint the same subject with an already-elapsed window.
    from app.models.user import User as UserModel

    user = db_session.query(UserModel).filter_by(email="hist3e-exp@example.com").one()
    past = datetime.now(timezone.utc) - timedelta(minutes=30)
    expired = craft_access_token(
        sub=str(user.id), iat=past, exp=past + timedelta(minutes=1)
    )
    assert client.get("/api/screenings/history", headers=bearer(expired)).status_code == 401
    assert (
        client.get("/api/screenings/history/latest", headers=bearer(expired)).status_code
        == 401
    )
    # The live token still works: expiry rejection is about the token, not the user.
    assert client.get("/api/screenings/history", headers=bearer(token)).status_code == 200


# --- Latest-endpoint account isolation ---


def test_latest_is_isolated_per_user(client, db_session):
    ta, _ = make_student(client, "hist3e-la@example.com")
    tb, _ = make_student(client, "hist3e-lb@example.com")
    sa, sb = owned_session(client, ta), owned_session(client, tb)
    a1 = submit_owned(client, ta, sa)
    b1 = submit_owned(client, tb, sb, instrument="PHQ9", responses=PHQ9_MINIMAL)

    la = client.get("/api/screenings/history/latest", headers=bearer(ta)).json()
    lb = client.get("/api/screenings/history/latest", headers=bearer(tb)).json()
    assert la["item"]["id"] == a1["id"]
    assert lb["item"]["id"] == b1["id"]
    assert la["item"]["id"] != lb["item"]["id"]

    la_gad = client.get(
        "/api/screenings/history/latest?instrument=GAD7", headers=bearer(tb)
    ).json()
    assert la_gad == {"item": None}


# --- Type-confusion boundary ---


def test_history_rejects_wrong_type_token(client, db_session):
    token, _ = make_student(client, "hist3e-type@example.com")
    s = owned_session(client, token)
    submit_owned(client, token, s)

    # Correct secret and live window, but the admin `type` claim.
    from app.models.user import User as UserModel

    user = db_session.query(UserModel).filter_by(email="hist3e-type@example.com").one()
    confused = craft_access_token(sub=str(user.id), type="access")
    assert client.get("/api/screenings/history", headers=bearer(confused)).status_code == 401
    assert (
        client.get("/api/screenings/history/latest", headers=bearer(confused)).status_code
        == 401
    )
