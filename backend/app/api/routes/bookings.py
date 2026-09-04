"""Public booking routes: request an appointment, view, and cancel.

Anonymous-first: a booking can be created without a session or contact
details. Ownership is proven by matching session_id OR the unguessable
confirmation_code returned at creation time.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_optional_student
from app.core.db import get_db
from app.models.user import User as UserModel
from app.schemas.booking import (
    BookingCreate,
    BookingResponse,
    BookingStatusResponse,
)
from app.services.booking import BookingService

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def get_booking_service(db: Session = Depends(get_db)) -> BookingService:
    return BookingService(db)


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    booking_service: BookingService = Depends(get_booking_service),
    current_user: UserModel | None = Depends(get_optional_student),
):
    # Phase 2B: ownership is derived server-side (owning session or JWT).
    return booking_service.create_booking(payload, current_user=current_user)


@router.get("/status/{confirmation_code}", response_model=BookingStatusResponse)
def get_booking_status(
    confirmation_code: str,
    booking_service: BookingService = Depends(get_booking_service),
):
    """Minimal, public appointment-status lookup by confirmation code.

    Deliberately separate from GET /{booking_id}: it requires only the
    confirmation code (no booking id, no session) and returns only the status
    and appointment identity the student needs, never student contact data or
    internal identifiers. Unknown codes return 404.
    """
    return booking_service.get_status_by_confirmation_code(confirmation_code)


@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(
    booking_id: uuid.UUID,
    session_id: Optional[uuid.UUID] = None,
    code: Optional[str] = None,
    booking_service: BookingService = Depends(get_booking_service),
    current_user: UserModel | None = Depends(get_optional_student),
):
    """View a booking.

    Anonymous bookings: ownership requires the matching session_id (if the
    booking was linked to one) OR the booking's confirmation_code.
    Account-owned bookings: the authenticated owner is required (a booking
    or session identifier alone is not sufficient). Otherwise 404.
    """
    return booking_service.get_booking(
        booking_id, session_id, code, current_user=current_user
    )


@router.patch("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: uuid.UUID,
    session_id: Optional[uuid.UUID] = None,
    code: Optional[str] = None,
    booking_service: BookingService = Depends(get_booking_service),
    current_user: UserModel | None = Depends(get_optional_student),
):
    """Cancel a booking (only PENDING or CONFIRMED bookings)."""
    return booking_service.cancel_booking(
        booking_id, session_id, code, current_user=current_user
    )