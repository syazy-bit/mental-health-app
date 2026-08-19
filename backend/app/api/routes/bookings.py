"""Public booking routes: request an appointment, view, and cancel.

Anonymous-first: a booking can be created without a session or contact
details. Ownership is proven by matching session_id OR the unguessable
confirmation_code returned at creation time.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.booking import BookingCreate, BookingResponse
from app.services.booking import BookingService

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def get_booking_service(db: Session = Depends(get_db)) -> BookingService:
    return BookingService(db)


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    booking_service: BookingService = Depends(get_booking_service),
):
    return booking_service.create_booking(payload)


@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(
    booking_id: uuid.UUID,
    session_id: Optional[uuid.UUID] = None,
    code: Optional[str] = None,
    booking_service: BookingService = Depends(get_booking_service),
):
    """View a booking.

    Ownership requires the matching session_id (if the booking was linked to
    one) OR the booking's confirmation_code. Otherwise 404.
    """
    return booking_service.get_booking(booking_id, session_id, code)


@router.patch("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: uuid.UUID,
    session_id: Optional[uuid.UUID] = None,
    code: Optional[str] = None,
    booking_service: BookingService = Depends(get_booking_service),
):
    """Cancel a booking (only PENDING or CONFIRMED bookings)."""
    return booking_service.cancel_booking(booking_id, session_id, code)