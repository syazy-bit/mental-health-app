"""Phase 2B: identity-bound session infrastructure tests.

Approved model (park-and-branch, NO claim/transfer/merge/backfill):
- Anonymous session A (user_id NULL) stays anonymous forever.
- After authentication, new activity belongs to account-owned session B
  (user_id = JWT.sub), created lazily via authenticated POST /api/sessions.
- Ownership is derived server-side from the verified JWT + stored rows.
  Client-supplied user_id is rejected or ignored everywhere.

Conventions: `client` + `db_session` fixtures with per-test TRUNCATE CASCADE
cleanup (see tests/conftest.py). Tests assert behavioral security properties
(status codes, DB ownership columns, absence of ownership leakage), not
implementation details.
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.models.booking import Booking as BookingModel
from app.models.screening import Screening as ScreeningModel
from app.models.session import Session as SessionModel
from app.models.user import User as UserModel
from app.services.admin import AdminService
from app.schemas.admin import AdminCreateInternal

PASSWORD = "correct-horse-12"


# --- Helpers ---


def register(client, email, password=PASSWORD, **overrides):
    payload = {"email": email, "password": password, **overrides}
    return client.post("/api/auth/register", json=payload)


def make_student(client, email):
    """Register a student; return (access_token, user_id)."""
    resp = register(client, email)
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    # Resolve the user id from the authenticated /me endpoint.
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200, me.text
    return token, me.json()["id"]


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def make_admin_token(client, db_session, username="admin2b"):
    AdminService(db_session).create_admin(
        AdminCreateInternal(
            username=username,
            password_hash=AdminService(db_session).hash_password("admin-pass-12"),
        )
    )
    resp = client.post(
        "/api/admin/auth/login",
        json={"username": username, "password": "admin-pass-12"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def make_counselor_and_slot(client, admin_token, hours_offset=1):
    now = datetime.now(timezone.utc)
    starts = (now + timedelta(days=1, hours=hours_offset)).isoformat()
    ends = (now + timedelta(days=1, hours=hours_offset + 1)).isoformat()
    counselor = client.post(
        "/api/admin/counselors",
        json={
            "name": "Dr. Test",
            "title": "Counselor",
            "areas_of_support": ["Stress"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert counselor.status_code == 201, counselor.text
    slot = client.post(
        f"/api/admin/counselors/{counselor.json()['id']}/slots",
        json={"starts_at": starts, "ends_at": ends},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert slot.status_code == 201, slot.text
    return slot.json()["id"]


def get_session_row(db_session, session_id):
    return db_session.get(SessionModel, uuid.UUID(session_id))


# --- SESSION CREATION ---


def test_anonymous_session_creation_stays_null(client, db_session):
    resp = client.post("/api/sessions", json={"language": "en"})
    assert resp.status_code == 201
    row = get_session_row(db_session, resp.json()["id"])
    assert row is not None
    assert row.user_id is None


def test_authenticated_session_creation_stamps_jwt_sub(client, db_session):
    token, user_id = make_student(client, "owner2b@example.com")
    resp = client.post("/api/sessions", json={"language": "hi"}, headers=bearer(token))
    assert resp.status_code == 201
    row = get_session_row(db_session, resp.json()["id"])
    assert row is not None
    assert str(row.user_id) == user_id


def test_invalid_bearer_on_create_is_rejected_not_anonymized(client, db_session):
    before = db_session.execute(select(SessionModel)).scalars().all()
    resp = client.post(
        "/api/sessions",
        json={"language": "en"},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert resp.status_code == 401
    after = db_session.execute(select(SessionModel)).scalars().all()
    assert len(after) == len(before)


def test_client_user_id_on_create_is_rejected(client, db_session):
    victim = str(uuid.uuid4())
    resp = client.post(
        "/api/sessions", json={"language": "en", "user_id": victim}
    )
    assert resp.status_code == 422


def test_client_user_id_on_authed_create_is_rejected(client):
    token, _ = make_student(client, "spoof2b@example.com")
    resp = client.post(
        "/api/sessions",
        json={"language": "en", "user_id": str(uuid.uuid4())},
        headers=bearer(token),
    )
    assert resp.status_code == 422


# --- SESSION ACCESS ---


def test_anonymous_session_publicly_accessible(client):
    created = client.post("/api/sessions", json={"language": "en"}).json()
    assert client.get(f"/api/sessions/{created['id']}").status_code == 200


def test_owner_can_access_owned_session(client):
    token, _ = make_student(client, "sessowner@example.com")
    created = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    ).json()
    resp = client.get(f"/api/sessions/{created['id']}", headers=bearer(token))
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


def test_non_owner_gets_404_without_leak(client):
    token_a, _ = make_student(client, "a2b@example.com")
    token_b, _ = make_student(client, "b2b@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token_a)
    ).json()
    resp = client.get(f"/api/sessions/{owned['id']}", headers=bearer(token_b))
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Session not found"


def test_unauthenticated_owned_session_access_gets_401(client):
    token, _ = make_student(client, "priv2b@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    ).json()
    resp = client.get(f"/api/sessions/{owned['id']}")
    assert resp.status_code == 401


# --- NO BACKFILL ---


def test_old_anonymous_session_remains_null_after_register(client, db_session):
    anon = client.post("/api/sessions", json={"language": "en"}).json()
    make_student(client, "fresh2b@example.com")
    # Still publicly accessible as anonymous, and still unowned in the DB.
    assert client.get(f"/api/sessions/{anon['id']}").status_code == 200
    assert get_session_row(db_session, anon["id"]).user_id is None


def test_old_anonymous_screening_remains_null_after_register(client, db_session):
    anon = client.post("/api/sessions", json={"language": "en"}).json()
    resp = client.post(
        "/api/screenings",
        json={
            "session_id": anon["id"],
            "instrument": "GAD7",
            "responses": [1, 1, 1, 1, 1, 1, 1],
        },
    )
    assert resp.status_code == 201
    screening_id = resp.json()["id"]
    make_student(client, "freshscr2b@example.com")
    row = db_session.get(ScreeningModel, uuid.UUID(screening_id))
    assert row.user_id is None


def test_old_anonymous_booking_remains_null_after_register(client, db_session):
    admin_token = make_admin_token(client, db_session)
    slot_id = make_counselor_and_slot(client, admin_token)
    anon = client.post("/api/sessions", json={"language": "en"}).json()
    booking = client.post(
        "/api/bookings", json={"slot_id": slot_id, "session_id": anon["id"]}
    )
    assert booking.status_code == 201
    booking_id = booking.json()["id"]
    make_student(client, "freshbook2b@example.com")
    row = db_session.get(BookingModel, uuid.UUID(booking_id))
    assert row.user_id is None


# --- SCREENINGS ---


def test_owned_session_screening_stamps_owner(client, db_session):
    token, user_id = make_student(client, "scrowner@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    ).json()
    resp = client.post(
        "/api/screenings",
        json={
            "session_id": owned["id"],
            "instrument": "GAD7",
            "responses": [2, 2, 2, 2, 2, 2, 2],
        },
        headers=bearer(token),
    )
    assert resp.status_code == 201
    row = db_session.get(ScreeningModel, uuid.UUID(resp.json()["id"]))
    assert str(row.user_id) == user_id


def test_anonymous_session_screening_stays_null(client, db_session):
    anon = client.post("/api/sessions", json={"language": "en"}).json()
    resp = client.post(
        "/api/screenings",
        json={
            "session_id": anon["id"],
            "instrument": "GAD7",
            "responses": [0, 0, 0, 0, 0, 0, 0],
        },
    )
    assert resp.status_code == 201
    row = db_session.get(ScreeningModel, uuid.UUID(resp.json()["id"]))
    assert row.user_id is None


def test_authenticated_user_may_use_anonymous_session_without_linking(client, db_session):
    """Coexistence: auth on an anonymous session is ignored for ownership."""
    token, _ = make_student(client, "coexist2b@example.com")
    anon = client.post("/api/sessions", json={"language": "en"}).json()
    resp = client.post(
        "/api/screenings",
        json={
            "session_id": anon["id"],
            "instrument": "GAD7",
            "responses": [1, 0, 1, 0, 1, 0, 1],
        },
        headers=bearer(token),
    )
    assert resp.status_code == 201
    row = db_session.get(ScreeningModel, uuid.UUID(resp.json()["id"]))
    assert row.user_id is None
    assert get_session_row(db_session, anon["id"]).user_id is None


def test_cross_user_screening_creation_rejected(client, db_session):
    token_a, _ = make_student(client, "repeating-a@example.com")
    token_b, _ = make_student(client, "repeating-b@example.com")
    owned_b = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token_b)
    ).json()
    before = db_session.execute(select(ScreeningModel)).scalars().all()
    resp = client.post(
        "/api/screenings",
        json={
            "session_id": owned_b["id"],
            "instrument": "GAD7",
            "responses": [1, 1, 1, 1, 1, 1, 1],
        },
        headers=bearer(token_a),
    )
    assert resp.status_code == 404
    after = db_session.execute(select(ScreeningModel)).scalars().all()
    assert len(after) == len(before)


def test_unauthenticated_screening_on_owned_session_rejected(client):
    token, _ = make_student(client, "scrgate@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    ).json()
    resp = client.post(
        "/api/screenings",
        json={
            "session_id": owned["id"],
            "instrument": "GAD7",
            "responses": [1, 1, 1, 1, 1, 1, 1],
        },
    )
    assert resp.status_code == 401


def test_screening_user_id_spoofing_rejected(client):
    anon = client.post("/api/sessions", json={"language": "en"}).json()
    resp = client.post(
        "/api/screenings",
        json={
            "session_id": anon["id"],
            "instrument": "GAD7",
            "responses": [1, 1, 1, 1, 1, 1, 1],
            "user_id": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == 422


def test_cross_user_followup_rejected(client):
    token_a, _ = make_student(client, "fola@example.com")
    token_b, _ = make_student(client, "folb@example.com")
    owned_b = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token_b)
    ).json()
    screening = client.post(
        "/api/screenings",
        json={
            "session_id": owned_b["id"],
            "instrument": "PHQ9",
            "responses": [0, 0, 0, 0, 0, 0, 0, 0, 2],
        },
        headers=bearer(token_b),
    )
    assert screening.status_code == 201
    resp = client.post(
        "/api/screenings/followup",
        json={
            "session_id": owned_b["id"],
            "screening_id": screening.json()["id"],
            "action": "SUPPORTIVE_CARE",
        },
        headers=bearer(token_a),
    )
    assert resp.status_code == 404


def test_owner_followup_allowed(client):
    token, _ = make_student(client, "folowner@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    ).json()
    screening = client.post(
        "/api/screenings",
        json={
            "session_id": owned["id"],
            "instrument": "PHQ9",
            "responses": [0, 0, 0, 0, 0, 0, 0, 0, 2],
        },
        headers=bearer(token),
    )
    assert screening.status_code == 201
    resp = client.post(
        "/api/screenings/followup",
        json={
            "session_id": owned["id"],
            "screening_id": screening.json()["id"],
            "action": "SUPPORTIVE_CARE",
        },
        headers=bearer(token),
    )
    assert resp.status_code == 200


# --- CHAT ---


def test_chat_on_owned_session_by_owner_allowed(client):
    token, _ = make_student(client, "chatowner@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    ).json()
    resp = client.post(
        "/api/chat/message",
        json={"session_id": owned["id"], "message": "I feel stressed about exams"},
        headers=bearer(token),
    )
    assert resp.status_code == 200
    assert resp.json()["session_id"] == owned["id"]


def test_chat_on_owned_session_by_non_owner_rejected(client):
    token_a, _ = make_student(client, "chata@example.com")
    token_b, _ = make_student(client, "chatb@example.com")
    owned_b = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token_b)
    ).json()
    resp = client.post(
        "/api/chat/message",
        json={"session_id": owned_b["id"], "message": "hello"},
        headers=bearer(token_a),
    )
    assert resp.status_code == 404


def test_chat_on_owned_session_unauthenticated_rejected(client):
    token, _ = make_student(client, "chatgate@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    ).json()
    resp = client.post(
        "/api/chat/message",
        json={"session_id": owned["id"], "message": "hello"},
    )
    assert resp.status_code == 401


def test_chat_user_id_spoofing_rejected(client):
    anon = client.post("/api/sessions", json={"language": "en"}).json()
    resp = client.post(
        "/api/chat/message",
        json={
            "session_id": anon["id"],
            "message": "hello",
            "user_id": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == 422


def test_invalid_bearer_on_chat_is_rejected_not_anonymized(client):
    anon = client.post("/api/sessions", json={"language": "en"}).json()
    resp = client.post(
        "/api/chat/message",
        json={"session_id": anon["id"], "message": "hello"},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert resp.status_code == 401


# --- BOOKINGS ---


def test_owned_session_booking_stamps_owner(client, db_session):
    admin_token = make_admin_token(client, db_session)
    slot_id = make_counselor_and_slot(client, admin_token)
    token, user_id = make_student(client, "bookowner@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    ).json()
    resp = client.post(
        "/api/bookings",
        json={"slot_id": slot_id, "session_id": owned["id"]},
        headers=bearer(token),
    )
    assert resp.status_code == 201, resp.text
    row = db_session.get(BookingModel, uuid.UUID(resp.json()["id"]))
    assert str(row.user_id) == user_id


def test_sessionless_authenticated_booking_stamps_jwt_sub(client, db_session):
    admin_token = make_admin_token(client, db_session)
    slot_id = make_counselor_and_slot(client, admin_token)
    token, user_id = make_student(client, "sessless@example.com")
    resp = client.post(
        "/api/bookings", json={"slot_id": slot_id}, headers=bearer(token)
    )
    assert resp.status_code == 201, resp.text
    row = db_session.get(BookingModel, uuid.UUID(resp.json()["id"]))
    assert str(row.user_id) == user_id
    assert row.session_id is None


def test_anonymous_booking_remains_anonymous(client, db_session):
    admin_token = make_admin_token(client, db_session)
    slot_id = make_counselor_and_slot(client, admin_token)
    resp = client.post("/api/bookings", json={"slot_id": slot_id})
    assert resp.status_code == 201
    row = db_session.get(BookingModel, uuid.UUID(resp.json()["id"]))
    assert row.user_id is None


def test_cross_user_booking_creation_on_owned_session_rejected(client, db_session):
    admin_token = make_admin_token(client, db_session)
    slot_id = make_counselor_and_slot(client, admin_token)
    token_a, _ = make_student(client, "booka@example.com")
    token_b, _ = make_student(client, "bookb@example.com")
    owned_b = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token_b)
    ).json()
    resp = client.post(
        "/api/bookings",
        json={"slot_id": slot_id, "session_id": owned_b["id"]},
        headers=bearer(token_a),
    )
    assert resp.status_code == 404


def test_owner_can_get_owned_booking_with_auth_only(client, db_session):
    admin_token = make_admin_token(client, db_session)
    slot_id = make_counselor_and_slot(client, admin_token)
    token, _ = make_student(client, "bookget@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    ).json()
    booking = client.post(
        "/api/bookings",
        json={"slot_id": slot_id, "session_id": owned["id"]},
        headers=bearer(token),
    ).json()
    resp = client.get(f"/api/bookings/{booking['id']}", headers=bearer(token))
    assert resp.status_code == 200


def test_non_owner_cannot_get_owned_booking_even_with_code(client, db_session):
    admin_token = make_admin_token(client, db_session)
    slot_id = make_counselor_and_slot(client, admin_token)
    token_a, _ = make_student(client, "bookc@example.com")
    token_b, _ = make_student(client, "bookd@example.com")
    owned_a = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token_a)
    ).json()
    booking = client.post(
        "/api/bookings",
        json={"slot_id": slot_id, "session_id": owned_a["id"]},
        headers=bearer(token_a),
    ).json()
    # Correct code + correct session, but wrong user -> 404, no leak.
    resp = client.get(
        f"/api/bookings/{booking['id']}",
        params={
            "session_id": owned_a["id"],
            "code": booking["confirmation_code"],
        },
        headers=bearer(token_b),
    )
    assert resp.status_code == 404


def test_anonymous_identifier_cannot_access_owned_booking(client, db_session):
    admin_token = make_admin_token(client, db_session)
    slot_id = make_counselor_and_slot(client, admin_token)
    token, _ = make_student(client, "booke@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    ).json()
    booking = client.post(
        "/api/bookings",
        json={"slot_id": slot_id, "session_id": owned["id"]},
        headers=bearer(token),
    ).json()
    # Correct code but no authentication -> 401.
    resp = client.get(
        f"/api/bookings/{booking['id']}",
        params={"code": booking["confirmation_code"]},
    )
    assert resp.status_code == 401
    # Correct owned session_id but no authentication -> 401.
    resp = client.get(
        f"/api/bookings/{booking['id']}",
        params={"session_id": owned["id"]},
    )
    assert resp.status_code == 401


def test_non_owner_cannot_cancel_owned_booking(client, db_session):
    admin_token = make_admin_token(client, db_session)
    slot_id = make_counselor_and_slot(client, admin_token, hours_offset=2)
    token_a, _ = make_student(client, "bookf@example.com")
    token_b, _ = make_student(client, "bookg@example.com")
    owned_a = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token_a)
    ).json()
    booking = client.post(
        "/api/bookings",
        json={"slot_id": slot_id, "session_id": owned_a["id"]},
        headers=bearer(token_a),
    ).json()
    resp = client.patch(
        f"/api/bookings/{booking['id']}/cancel",
        params={"code": booking["confirmation_code"]},
        headers=bearer(token_b),
    )
    assert resp.status_code == 404
    # Owner cancel still works.
    resp = client.patch(
        f"/api/bookings/{booking['id']}/cancel", headers=bearer(token_a)
    )
    assert resp.status_code == 200


def test_booking_user_id_spoofing_rejected(client, db_session):
    admin_token = make_admin_token(client, db_session)
    slot_id = make_counselor_and_slot(client, admin_token)
    resp = client.post(
        "/api/bookings",
        json={"slot_id": slot_id, "user_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 422


def test_anonymous_booking_ownership_unchanged(client, db_session):
    """Legacy session/code ownership keeps working for anonymous bookings."""
    admin_token = make_admin_token(client, db_session)
    slot_id = make_counselor_and_slot(client, admin_token)
    anon = client.post("/api/sessions", json={"language": "en"}).json()
    booking = client.post(
        "/api/bookings", json={"slot_id": slot_id, "session_id": anon["id"]}
    ).json()
    assert (
        client.get(
            f"/api/bookings/{booking['id']}",
            params={"code": booking["confirmation_code"]},
        ).status_code
        == 200
    )
    assert (
        client.get(
            f"/api/bookings/{booking['id']}",
            params={"session_id": anon["id"]},
        ).status_code
        == 200
    )
    assert client.get(f"/api/bookings/{booking['id']}").status_code == 404


def test_unauthenticated_booking_create_on_owned_session_rejected(client, db_session):
    admin_token = make_admin_token(client, db_session)
    slot_id = make_counselor_and_slot(client, admin_token)
    token, _ = make_student(client, "bookgate@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    ).json()
    resp = client.post(
        "/api/bookings", json={"slot_id": slot_id, "session_id": owned["id"]}
    )
    assert resp.status_code == 401


def test_followup_user_id_spoofing_rejected(client):
    anon = client.post("/api/sessions", json={"language": "en"}).json()
    screening = client.post(
        "/api/screenings",
        json={
            "session_id": anon["id"],
            "instrument": "PHQ9",
            "responses": [0, 0, 0, 0, 0, 0, 0, 0, 2],
        },
    )
    assert screening.status_code == 201
    resp = client.post(
        "/api/screenings/followup",
        json={
            "session_id": anon["id"],
            "screening_id": screening.json()["id"],
            "action": "SUPPORTIVE_CARE",
            "user_id": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == 422


# --- DELETED USERS ---


def test_deleted_student_cannot_access_owned_session(client, db_session):
    token, _ = make_student(client, "doomed@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    ).json()
    user = db_session.execute(
        select(UserModel).where(UserModel.email == "doomed@example.com")
    ).scalar_one()
    user.deleted_at = datetime.now(timezone.utc)
    db_session.commit()
    # Ownership linkage is preserved but access is denied.
    assert get_session_row(db_session, owned["id"]).user_id == user.id
    assert (
        client.get(f"/api/sessions/{owned['id']}", headers=bearer(token)).status_code
        == 401
    )
    assert (
        client.post(
            "/api/chat/message",
            json={"session_id": owned["id"], "message": "hello"},
            headers=bearer(token),
        ).status_code
        == 401
    )


def test_deleted_student_token_cannot_create_owned_session(client, db_session):
    token, _ = make_student(client, "doomed2@example.com")
    user = db_session.execute(
        select(UserModel).where(UserModel.email == "doomed2@example.com")
    ).scalar_one()
    user.deleted_at = datetime.now(timezone.utc)
    db_session.commit()
    resp = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token)
    )
    assert resp.status_code == 401


# --- TOKEN ISOLATION ---


def test_admin_token_cannot_access_student_owned_session(client, db_session):
    student_token, _ = make_student(client, "stud2b@example.com")
    owned = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(student_token)
    ).json()
    admin_token = make_admin_token(client, db_session, username="isolation-admin")
    assert (
        client.get(
            f"/api/sessions/{owned['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/sessions",
            json={"language": "en"},
            headers={"Authorization": f"Bearer {admin_token}"},
        ).status_code
        == 401
    )


def test_student_token_cannot_use_admin_endpoints(client, db_session):
    student_token, _ = make_student(client, "studiso@example.com")
    resp = client.get(
        "/api/admin/analytics", headers=bearer(student_token)
    )
    assert resp.status_code in (401, 403, 404)


# --- IDOR MATRIX ---


def test_full_a_b_ownership_matrix(client):
    token_a, _ = make_student(client, "matrixa@example.com")
    token_b, _ = make_student(client, "matrixb@example.com")
    sess_a = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token_a)
    ).json()
    sess_b = client.post(
        "/api/sessions", json={"language": "en"}, headers=bearer(token_b)
    ).json()
    assert sess_a["id"] != sess_b["id"]
    # A cannot GET B; B cannot GET A.
    assert (
        client.get(f"/api/sessions/{sess_b['id']}", headers=bearer(token_a)).status_code
        == 404
    )
    assert (
        client.get(f"/api/sessions/{sess_a['id']}", headers=bearer(token_b)).status_code
        == 404
    )
    # Anonymous cannot access either.
    assert client.get(f"/api/sessions/{sess_a['id']}").status_code == 401
    assert client.get(f"/api/sessions/{sess_b['id']}").status_code == 401
    # Owners retain access.
    assert (
        client.get(f"/api/sessions/{sess_a['id']}", headers=bearer(token_a)).status_code
        == 200
    )
    assert (
        client.get(f"/api/sessions/{sess_b['id']}", headers=bearer(token_b)).status_code
        == 200
    )
