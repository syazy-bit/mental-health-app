"""Centralized ownership enforcement for identity-bound sessions (Phase 2B).

Single source of truth for the rule:

    anonymous session (user_id IS NULL) -> pre-existing public/anonymous rules
    owned session (user_id IS NOT NULL) -> authenticated owner only

All session-scoped routes/services MUST gate through these helpers so a bare
``load_session()`` can never silently authorize account-owned data. Ownership
is always derived server-side from the verified JWT (``current_user``) and the
stored ``sessions.user_id`` row. Client-supplied ``user_id`` values are never
consulted here and must never reach these helpers.

Privacy rules:
- A session UUID alone authorizes ONLY anonymous sessions, never owned ones.
- Authenticated non-owners receive 404 (not 403) so owned-session existence
  is never revealed to another user.
- Missing authentication against an owned session is 401 (the caller must
  authenticate first).
- No helper here ever mutates ownership: there is no claim/transfer/merge
  path. Old anonymous rows stay anonymous.
"""

import uuid
from typing import Optional

from fastapi import HTTPException, status

from app.models.booking import Booking as BookingModel
from app.models.session import Session as SessionModel
from app.models.user import User as UserModel


def authentication_required() -> HTTPException:
    """401 for owned data requested without (valid) student authentication."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_session_access(
    session: SessionModel | None,
    current_user: UserModel | None,
    *,
    missing_detail: str = "Session not found",
) -> SessionModel:
    """Gate access to a session row.

    - Unknown session -> 404.
    - Anonymous session (user_id IS NULL) -> allowed for anyone (existing
      public behavior; any authentication is ignored for ownership).
    - Owned session without authentication -> 401.
    - Owned session with a non-owner -> 404 (no existence oracle).
    - Owned session with its owner -> allowed.
    """
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=missing_detail,
        )
    if session.user_id is None:
        return session
    if current_user is None:
        raise authentication_required()
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=missing_detail,
        )
    return session


def anonymous_booking_owns(
    booking: BookingModel,
    session_id: Optional[uuid.UUID],
    confirmation_code: Optional[str],
) -> bool:
    """Pre-existing anonymous ownership rule (session match OR code match).

    Applies ONLY to bookings with ``user_id IS NULL``. Owned bookings must
    never reach this check (see :func:`require_booking_access`).
    """
    if (
        booking.session_id is not None
        and session_id is not None
        and booking.session_id == session_id
    ):
        return True
    if confirmation_code is not None and confirmation_code.upper() == (
        booking.confirmation_code or ""
    ).upper():
        return True
    return False


def require_booking_access(
    booking: BookingModel | None,
    current_user: UserModel | None,
    session_id: Optional[uuid.UUID] = None,
    confirmation_code: Optional[str] = None,
) -> BookingModel:
    """Gate access to a booking row.

    - Unknown booking -> 404.
    - Owned booking (user_id IS NOT NULL) -> authenticated owner only
      (no auth -> 401, non-owner -> 404). A booking/session identifier
      alone is NOT sufficient for owned data (R4).
    - Anonymous booking (user_id IS NULL) -> pre-existing session/code
      ownership rule, authentication (if any) is ignored.
    """
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )
    if booking.user_id is not None:
        if current_user is None:
            raise authentication_required()
        if booking.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found",
            )
        return booking
    if anonymous_booking_owns(booking, session_id, confirmation_code):
        return booking
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Booking not found",
    )
