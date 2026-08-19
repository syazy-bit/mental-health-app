"""Protected admin routes for the university counseling booking flow (M7).

All routes reuse the existing M8 JWT admin authentication (get_current_admin).

Privacy: admin booking responses include booking metadata only. They NEVER
expose session_id, chat history, screening answers/results, risk levels, or
safety evaluations, and never join wellbeing tables.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.db import get_db
from app.models.admin import Admin as AdminModel
from app.schemas.booking import (
    AdminBookingResponse,
    BookingStatusUpdate,
    CounselorCreate,
    CounselorResponse,
    CounselorSlotCreate,
    CounselorSlotResponse,
)
from app.services.booking import BookingService

router = APIRouter(prefix="/api/admin", tags=["admin-booking"])


def get_booking_service(db: Session = Depends(get_db)) -> BookingService:
    return BookingService(db)


@router.get("/bookings", response_model=list[AdminBookingResponse])
def list_bookings(
    status_filter: Optional[str] = None,
    booking_service: BookingService = Depends(get_booking_service),
    current_admin: AdminModel = Depends(get_current_admin),
) -> list:
    """List bookings. Optionally filter by status."""
    if status_filter is not None:
        if status_filter not in ("PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Invalid booking status filter",
            )
    return booking_service.list_bookings(status_filter)


@router.patch("/bookings/{booking_id}/status", response_model=AdminBookingResponse)
def update_booking_status(
    booking_id: uuid.UUID,
    payload: BookingStatusUpdate,
    booking_service: BookingService = Depends(get_booking_service),
    current_admin: AdminModel = Depends(get_current_admin),
):
    """Update a booking status (state machine enforced in the service)."""
    return booking_service.update_status(booking_id, payload)


@router.post(
    "/counselors",
    response_model=CounselorResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_counselor(
    payload: CounselorCreate,
    booking_service: BookingService = Depends(get_booking_service),
    current_admin: AdminModel = Depends(get_current_admin),
):
    """Create a university counseling staff profile."""
    return booking_service.create_counselor(payload)


@router.post(
    "/counselors/{counselor_id}/slots",
    response_model=CounselorSlotResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_counselor_slot(
    counselor_id: uuid.UUID,
    payload: CounselorSlotCreate,
    booking_service: BookingService = Depends(get_booking_service),
    current_admin: AdminModel = Depends(get_current_admin),
):
    """Add an availability slot for a counselor."""
    return booking_service.create_slot(counselor_id, payload)