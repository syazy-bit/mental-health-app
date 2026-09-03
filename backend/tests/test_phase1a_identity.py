"""Phase 1A: student account database foundation tests.

Covers ONLY the model/migration layer (users, refresh_tokens, user_id
ownership). No authentication behavior exists yet, so there are no
login/registration/token-rotation tests here.

Conventions follow the existing suite: `db_session` fixture with per-test
TRUNCATE CASCADE cleanup (see tests/conftest.py).
"""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.models.booking import Booking as BookingModel
from app.models.counselor import Counselor as CounselorModel
from app.models.counselor_slot import CounselorSlot as CounselorSlotModel
from app.models.refresh_token import RefreshToken as RefreshTokenModel
from app.models.screening import Screening as ScreeningModel
from app.models.session import Session as SessionModel
from app.models.user import User as UserModel


# --- Helpers ---


def make_user(db_session, email="student@example.com", **overrides):
    user = UserModel(
        email=email,
        password_hash=overrides.pop("password_hash", "hashed-placeholder"),
        **overrides,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def make_session(db_session, user_id=None, language="en"):
    session = SessionModel(language=language, user_id=user_id)
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


def make_screening(db_session, session_id, user_id=None):
    screening = ScreeningModel(
        session_id=session_id,
        instrument="PHQ9",
        total_score=5,
        severity="Mild",
        safety_flag=False,
        item9_score=0,
        user_id=user_id,
    )
    db_session.add(screening)
    db_session.commit()
    db_session.refresh(screening)
    return screening


def make_slot(db_session):
    counselor = CounselorModel(
        name="Dr. Test",
        title="Counselor",
        areas_of_support=["Stress"],
    )
    db_session.add(counselor)
    db_session.flush()
    now = datetime.now(timezone.utc)
    slot = CounselorSlotModel(
        counselor_id=counselor.id,
        starts_at=now + timedelta(days=1),
        ends_at=now + timedelta(days=1, hours=1),
    )
    db_session.add(slot)
    db_session.flush()
    return slot


def make_booking(db_session, slot_id, session_id=None, user_id=None):
    booking = BookingModel(
        slot_id=slot_id,
        session_id=session_id,
        confirmation_code=uuid.uuid4().hex[:8].upper(),
        user_id=user_id,
    )
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)
    return booking


def make_refresh_token(db_session, user_id, raw="raw-opaque-token"):
    token = RefreshTokenModel(
        user_id=user_id,
        token_hash=hashlib.sha256(raw.encode()).hexdigest(),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db_session.add(token)
    db_session.commit()
    db_session.refresh(token)
    return token


# --- User model ---


def test_user_create_defaults(db_session):
    user = make_user(db_session)
    assert user.id is not None
    assert user.email == "student@example.com"
    assert user.display_name is None
    assert user.deleted_at is None
    assert user.created_at is not None
    assert user.updated_at is not None


def test_user_email_normalized_on_write(db_session):
    user = make_user(db_session, email="  Student@Example.COM  ")
    assert user.email == "student@example.com"


def test_user_email_uniqueness_exact(db_session):
    make_user(db_session, email="dup@example.com")
    with pytest.raises(IntegrityError):
        make_user(db_session, email="dup@example.com")
    db_session.rollback()


def test_user_email_uniqueness_case_insensitive(db_session):
    make_user(db_session, email="Case@Example.com")
    with pytest.raises(IntegrityError):
        make_user(db_session, email="case@example.COM")
    db_session.rollback()


def test_user_email_uniqueness_enforced_by_database_not_just_orm(db_session):
    """Bypass the ORM validator with raw SQL; the lower(email) index must still reject."""
    db_session.execute(
        text("INSERT INTO users (email, password_hash) VALUES (:email, :hash)"),
        {"email": "RawCase@Example.com", "hash": "x"},
    )
    db_session.commit()
    with pytest.raises(IntegrityError):
        make_user(db_session, email="rawcase@example.COM")
    db_session.rollback()


def test_user_rejects_empty_email(db_session):
    with pytest.raises(ValueError):
        make_user(db_session, email="   ")
    db_session.rollback()


# --- Anonymous rows stay anonymous ---


def test_anonymous_session_user_id_null(db_session):
    session = make_session(db_session)
    assert session.user_id is None


def test_anonymous_screening_user_id_null(db_session):
    session = make_session(db_session)
    screening = make_screening(db_session, session.id)
    assert screening.user_id is None


def test_anonymous_booking_user_id_null(db_session):
    slot = make_slot(db_session)
    session = make_session(db_session)
    booking = make_booking(db_session, slot.id, session_id=session.id)
    assert booking.user_id is None
    assert booking.session_id == session.id


# --- Ownership ---


def test_user_owns_multiple_sessions(db_session):
    user = make_user(db_session)
    s1 = make_session(db_session, user_id=user.id)
    s2 = make_session(db_session, user_id=user.id)
    assert s1.user_id == user.id
    assert s2.user_id == user.id
    assert s1.id != s2.id


def test_user_owns_multiple_screenings(db_session):
    user = make_user(db_session)
    session = make_session(db_session, user_id=user.id)
    sc1 = make_screening(db_session, session.id, user_id=user.id)
    sc2 = make_screening(db_session, session.id, user_id=user.id)
    assert sc1.user_id == user.id == sc2.user_id


def test_user_owns_multiple_bookings(db_session):
    user = make_user(db_session)
    slot = make_slot(db_session)
    slot2 = CounselorSlotModel(
        counselor_id=slot.counselor_id,
        starts_at=slot.starts_at + timedelta(days=1),
        ends_at=slot.ends_at + timedelta(days=1),
    )
    db_session.add(slot2)
    db_session.flush()
    b1 = make_booking(db_session, slot.id, user_id=user.id)
    b2 = make_booking(db_session, slot2.id, user_id=user.id)
    assert b1.user_id == user.id == b2.user_id


# --- Refresh tokens ---


def test_refresh_token_stores_hash_never_raw(db_session):
    user = make_user(db_session)
    raw = "super-secret-opaque-token"
    token = make_refresh_token(db_session, user.id, raw=raw)
    assert token.token_hash == hashlib.sha256(raw.encode()).hexdigest()
    assert token.token_hash != raw
    assert raw not in str(token.__dict__)
    assert token.revoked_at is None
    assert token.replaced_by is None


def test_refresh_token_hash_unique(db_session):
    user = make_user(db_session)
    make_refresh_token(db_session, user.id, raw="same-token")
    with pytest.raises(IntegrityError):
        make_refresh_token(db_session, user.id, raw="same-token")
    db_session.rollback()


# --- Delete behavior ---


def test_delete_user_sets_owned_user_id_null(db_session):
    user = make_user(db_session)
    session = make_session(db_session, user_id=user.id)
    make_screening(db_session, session.id, user_id=user.id)
    slot = make_slot(db_session)
    make_booking(db_session, slot.id, user_id=user.id)

    db_session.delete(user)
    db_session.commit()

    db_session.expire_all()
    assert db_session.get(SessionModel, session.id).user_id is None
    assert (
        db_session.query(ScreeningModel)
        .filter_by(session_id=session.id)
        .one()
        .user_id
        is None
    )
    assert db_session.query(BookingModel).one().user_id is None


def test_delete_user_cascades_refresh_tokens(db_session):
    user = make_user(db_session)
    token = make_refresh_token(db_session, user.id)
    token_id = token.id

    db_session.delete(user)
    db_session.commit()

    assert db_session.get(RefreshTokenModel, token_id) is None


def test_soft_deleted_user_row_retained_with_fks_intact(db_session):
    user = make_user(db_session)
    session = make_session(db_session, user_id=user.id)
    user.deleted_at = datetime.now(timezone.utc)
    db_session.commit()

    db_session.expire_all()
    reloaded = db_session.get(UserModel, user.id)
    assert reloaded.deleted_at is not None
    # Ownership linkage is preserved; future auth MUST reject deleted users.
    assert db_session.get(SessionModel, session.id).user_id == user.id
