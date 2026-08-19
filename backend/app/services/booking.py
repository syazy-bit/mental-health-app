"""Business logic for the university counseling booking flow (M7).

Owns all transaction boundaries for counselors, slots, and bookings.

Concurrency: booking creation locks the target slot row (SELECT ... FOR UPDATE)
so concurrent requests for the same slot serialize; the partial unique index on
active bookings is the authoritative backstop. Exactly one request succeeds and
the other gets a 409.

Privacy: booking responses and queries never touch chat, screening, or safety
evaluation tables.
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.booking import Booking as BookingModel
from app.models.counselor import Counselor as CounselorModel
from app.models.counselor_slot import CounselorSlot as CounselorSlotModel
from app.repositories.bookings import BookingRepository
from app.repositories.counselor_slots import CounselorSlotRepository
from app.repositories.counselors import CounselorRepository
from app.repositories.sessions import SessionRepository
from app.schemas.booking import (
    BookingCreate,
    BookingStatusUpdate,
    CounselorCreate,
    CounselorSlotCreate,
)

# Unambiguous alphabet (no 0/O, 1/I/L): 32 characters.
_CONFIRMATION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_CONFIRMATION_LENGTH = 8

_ACTIVE_BOOKING_STATUSES = ("PENDING", "CONFIRMED")


class BookingService:
    """Coordinates counselors, slots, and bookings."""

    VALID_TRANSITIONS: dict[str, set[str]] = {
        "PENDING": {"CONFIRMED", "CANCELLED"},
        "CONFIRMED": {"CANCELLED", "COMPLETED"},
        "CANCELLED": set(),
        "COMPLETED": set(),
    }

    def __init__(self, db: Session) -> None:
        self.db = db
        self.counselor_repo = CounselorRepository(db)
        self.slot_repo = CounselorSlotRepository(db)
        self.booking_repo = BookingRepository(db)
        self.session_repo = SessionRepository(db)

    # --- Confirmation codes ---

    def _generate_confirmation_code(self) -> str:
        return "".join(
            secrets.choice(_CONFIRMATION_ALPHABET)
            for _ in range(_CONFIRMATION_LENGTH)
        )

    def _generate_unique_confirmation_code(self) -> str:
        for _ in range(10):
            code = self._generate_confirmation_code()
            exists = self.db.execute(
                select(BookingModel).where(BookingModel.confirmation_code == code)
            ).scalar_one_or_none()
            if exists is None:
                return code
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate a unique confirmation code",
        )

    # --- Ownership / privacy ---

    @staticmethod
    def _owns(
        booking: BookingModel,
        session_id: Optional[uuid.UUID],
        confirmation_code: Optional[str],
    ) -> bool:
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

    # --- Counselors (admin) ---

    def create_counselor(self, data: CounselorCreate) -> CounselorModel:
        counselor = self.counselor_repo.create(
            name=data.name,
            title=data.title,
            areas_of_support=data.areas_of_support,
            bio=data.bio,
            is_active=data.is_active,
        )
        self.db.commit()
        self.db.refresh(counselor)
        return counselor

    def list_counselors(self, active_only: bool = True) -> list[CounselorModel]:
        if active_only:
            return self.counselor_repo.list_active()
        return self.counselor_repo.list_all()

    # --- Slots (admin) ---

    def create_slot(
        self,
        counselor_id: uuid.UUID,
        data: CounselorSlotCreate,
    ) -> CounselorSlotModel:
        counselor = self.counselor_repo.get_by_id(counselor_id)
        if counselor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Counselor not found",
            )
        if data.ends_at <= data.starts_at:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Slot end time must be after start time",
            )
        if (data.ends_at - data.starts_at) > timedelta(hours=4):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Slot cannot exceed 4 hours",
            )
        if data.starts_at <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Slot must be in the future",
            )
        slot = self.slot_repo.create(counselor_id, data.starts_at, data.ends_at)
        self.db.commit()
        self.db.refresh(slot)
        return slot

    def list_available_slots(self, counselor_id: uuid.UUID) -> list[CounselorSlotModel]:
        """Future slots for an active counselor that have no active booking."""
        counselor = self.counselor_repo.get_active_by_id(counselor_id)
        if counselor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Counselor not found",
            )
        return self.slot_repo.list_available_future_for_counselor(
            counselor_id,
            datetime.now(timezone.utc),
            _ACTIVE_BOOKING_STATUSES,
        )

    # --- Bookings (student) ---

    def create_booking(self, data: BookingCreate) -> BookingModel:
        # Validate session ownership reference if provided (optional, anonymous-first).
        if data.session_id is not None:
            session = self.session_repo.get_by_id(data.session_id)
            if session is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Session not found",
                )

        # Lock the slot row to serialize concurrent booking attempts for it.
        slot = self.slot_repo.get_by_id_for_update(data.slot_id)
        if slot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slot not found",
            )
        if slot.starts_at <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This appointment slot is no longer available",
            )

        existing = self.booking_repo.get_active_by_slot(slot.id)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This appointment slot has already been booked",
            )

        code = self._generate_unique_confirmation_code()
        booking = self.booking_repo.create(
            slot_id=slot.id,
            confirmation_code=code,
            session_id=data.session_id,
            student_name=data.student_name,
            contact_email=data.contact_email,
            contact_phone=data.contact_phone,
            reason=data.reason,
        )

        try:
            self.db.commit()
        except IntegrityError:
            # Partial unique index (slot active booking) - authoritative backstop.
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This appointment slot has already been booked",
            )

        self.db.refresh(booking)
        return booking

    def get_booking(
        self,
        booking_id: uuid.UUID,
        session_id: Optional[uuid.UUID] = None,
        confirmation_code: Optional[str] = None,
    ) -> BookingModel:
        booking = self.booking_repo.get_by_id(booking_id)
        if booking is None or not self._owns(booking, session_id, confirmation_code):
            # 404 (not 403) so booking existence is not revealed.
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found",
            )
        return booking

    def cancel_booking(
        self,
        booking_id: uuid.UUID,
        session_id: Optional[uuid.UUID] = None,
        confirmation_code: Optional[str] = None,
    ) -> BookingModel:
        booking = self.get_booking(booking_id, session_id, confirmation_code)
        if booking.status not in _ACTIVE_BOOKING_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot cancel a booking in {booking.status} status",
            )
        booking.status = "CANCELLED"
        self.db.commit()
        self.db.refresh(booking)
        return booking

    # --- Bookings (admin) ---

    def list_bookings(self, booking_status: Optional[str] = None) -> list[BookingModel]:
        return self.booking_repo.list_all(status=booking_status)

    def update_status(
        self,
        booking_id: uuid.UUID,
        data: BookingStatusUpdate,
    ) -> BookingModel:
        booking = self.booking_repo.get_by_id(booking_id)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found",
            )
        allowed = self.VALID_TRANSITIONS.get(booking.status, set())
        if data.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Cannot change booking status from {booking.status} "
                    f"to {data.status}"
                ),
            )
        booking.status = data.status
        if data.admin_notes is not None:
            booking.admin_notes = data.admin_notes
        self.db.commit()
        self.db.refresh(booking)
        return booking