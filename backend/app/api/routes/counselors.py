"""Public counselor routes: meet the team and available appointment times."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.booking import CounselorResponse, CounselorSlotResponse
from app.services.booking import BookingService

router = APIRouter(prefix="/api/counselors", tags=["counselors"])


def get_booking_service(db: Session = Depends(get_db)) -> BookingService:
    return BookingService(db)


@router.get("", response_model=list[CounselorResponse])
def list_counselors(
    booking_service: BookingService = Depends(get_booking_service),
) -> list:
    """List active university counseling staff."""
    return booking_service.list_counselors(active_only=True)


@router.get("/{counselor_id}/slots", response_model=list[CounselorSlotResponse])
def list_counselor_slots(
    counselor_id: uuid.UUID,
    booking_service: BookingService = Depends(get_booking_service),
) -> list:
    """List future available appointment times for a counselor.

    Returns 404 if the counselor does not exist or is not active.
    """
    return booking_service.list_available_slots(counselor_id)