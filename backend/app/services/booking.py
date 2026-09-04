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
from app.models.user import User as UserModel
from app.repositories.bookings import BookingRepository
from app.repositories.counselor_slots import CounselorSlotRepository
from app.repositories.counselors import CounselorRepository
from app.repositories.sessions import SessionRepository
from app.services.session_ownership import (
    anonymous_booking_owns,
    require_booking_access,
    require_session_access,
)
from app.schemas.booking import (
    AdminCounselorSlotResponse,
    BookingCreate,
    BookingStatusResponse,
    BookingStatusUpdate,
    CounselorCreate,
    CounselorSlotCreate,
    CounselorUpdate,
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
        # Pre-existing anonymous ownership rule, centralized in
        # session_ownership (kept here for backward compatibility).
        return anonymous_booking_owns(booking, session_id, confirmation_code)

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
        # Lock the counselor row so concurrent slot creation for the same
        # counselor serializes and the overlap check below is authoritative.
        counselor = self.counselor_repo.get_by_id_for_update(counselor_id)
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
        overlapping = self.slot_repo.list_overlapping(
            counselor_id, data.starts_at, data.ends_at
        )
        if overlapping:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Slot overlaps an existing availability slot for this counselor",
            )
        slot = self.slot_repo.create(counselor_id, data.starts_at, data.ends_at)
        self.db.commit()
        self.db.refresh(slot)
        return slot

    def update_counselor(
        self,
        counselor_id: uuid.UUID,
        data: CounselorUpdate,
    ) -> CounselorModel:
        """Update a counselor profile / activation state (admin only)."""
        counselor = self.counselor_repo.get_by_id(counselor_id)
        if counselor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Counselor not found",
            )
        # model_fields_set distinguishes "field not provided" from "field
        # provided as empty/None" (e.g. bio="" clears the bio).
        if "name" in data.model_fields_set:
            counselor.name = data.name
        if "title" in data.model_fields_set:
            counselor.title = data.title
        if "areas_of_support" in data.model_fields_set:
            counselor.areas_of_support = data.areas_of_support
        if "bio" in data.model_fields_set:
            counselor.bio = data.bio
        if "is_active" in data.model_fields_set:
            counselor.is_active = data.is_active
        self.db.commit()
        self.db.refresh(counselor)
        return counselor

    def list_admin_slots(self, counselor_id: uuid.UUID) -> list[AdminCounselorSlotResponse]:
        """All future slots for a counselor with active booking status (admin).

        Privacy: returns slot metadata and booking status only. Never includes
        student name, contact, reason, or session_id.
        """
        counselor = self.counselor_repo.get_by_id(counselor_id)
        if counselor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Counselor not found",
            )
        slots = self.slot_repo.list_future_for_counselor(
            counselor_id,
            datetime.now(timezone.utc),
        )
        statuses = self.slot_repo.get_booking_statuses([s.id for s in slots])
        return [
            AdminCounselorSlotResponse(
                id=slot.id,
                counselor_id=slot.counselor_id,
                starts_at=slot.starts_at,
                ends_at=slot.ends_at,
                booking_status=statuses.get(slot.id),
            )
            for slot in slots
        ]

    def delete_slot(self, counselor_id: uuid.UUID, slot_id: uuid.UUID) -> None:
        """Delete an unused, not-yet-started slot (admin only).

        Booked or already-started slots cannot be deleted.
        """
        counselor = self.counselor_repo.get_by_id(counselor_id)
        if counselor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Counselor not found",
            )
        slot = self.slot_repo.get_by_id_for_update(slot_id)
        if slot is None or slot.counselor_id != counselor_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slot not found",
            )
        if slot.starts_at <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Cannot delete a slot that has already started",
            )
        active = self.booking_repo.get_active_by_slot(slot.id)
        if active is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete a slot with an active booking",
            )
        self.db.delete(slot)
        self.db.commit()

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

    def create_booking(
        self, data: BookingCreate, current_user: UserModel | None = None
    ) -> BookingModel:
        """Create a booking, deriving ownership server-side (Phase 2B).

        - Booking references a session: ``booking.user_id`` mirrors the
          owning session (NULL for anonymous). Owned sessions require the
          authenticated owner; a session identifier alone is not enough.
        - Authenticated request without a session (R3): ``booking.user_id``
          is stamped from the verified JWT.
        - Anonymous request without a session: ``booking.user_id`` stays NULL.
        """
        # Validate session ownership reference if provided (optional, anonymous-first).
        booking_owner_id: Optional[uuid.UUID] = (
            current_user.id if current_user is not None else None
        )
        if data.session_id is not None:
            session = self.session_repo.get_by_id(data.session_id)
            if session is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Session not found",
                )
            # Owned sessions require the authenticated owner (401/404);
            # anonymous sessions keep existing public behavior.
            require_session_access(session, current_user)
            booking_owner_id = session.user_id

        # Lock the slot row to serialize concurrent booking attempts for it.
        slot = self.slot_repo.get_by_id_for_update(data.slot_id)
        if slot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slot not found",
            )
        # The backend remains authoritative: a deactivated counselor's slots are
        # not bookable even if the student already knows the slot_id. The public
        # listing already hides them; this closes the direct-booking path.
        if slot.counselor is None or not slot.counselor.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This appointment slot is no longer available",
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
            user_id=booking_owner_id,
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

    def get_status_by_confirmation_code(
        self, confirmation_code: str
    ) -> BookingStatusResponse:
        """Minimal, public appointment-status lookup by confirmation code.

        Returns only the appointment identity + status needed by the student
        (confirmation code, counselor name, slot window, status). Never returns
        booking id, student contact fields, reason, admin_notes, or session_id.

        The code is normalized (trimmed, uppercased) and matched exactly against
        the stored uppercase code. Any code that does not match returns 404 so
        booking existence is never revealed.
        """
        normalized = confirmation_code.strip().upper()
        booking = self.booking_repo.get_by_confirmation_code(normalized)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found",
            )
        return BookingStatusResponse(
            confirmation_code=booking.confirmation_code,
            status=booking.status,
            counselor_name=booking.slot.counselor.name,
            starts_at=booking.slot.starts_at,
            ends_at=booking.slot.ends_at,
        )

    def get_booking(
        self,
        booking_id: uuid.UUID,
        session_id: Optional[uuid.UUID] = None,
        confirmation_code: Optional[str] = None,
        current_user: UserModel | None = None,
    ) -> BookingModel:
        """View a booking.

        Phase 2B: owned bookings require the authenticated owner (a
        booking/session identifier alone is NOT sufficient, R4). Anonymous
        bookings keep the pre-existing session/code ownership rule.
        Unknown bookings are 404 (not 403) so existence is not revealed.
        """
        booking = self.booking_repo.get_by_id(booking_id)
        return require_booking_access(
            booking, current_user, session_id, confirmation_code
        )

    def cancel_booking(
        self,
        booking_id: uuid.UUID,
        session_id: Optional[uuid.UUID] = None,
        confirmation_code: Optional[str] = None,
        current_user: UserModel | None = None,
    ) -> BookingModel:
        booking = self.get_booking(
            booking_id, session_id, confirmation_code, current_user
        )
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

    def get_admin_booking(self, booking_id: uuid.UUID) -> BookingModel:
        """Fetch a single booking for the admin UI (404 if unknown)."""
        booking = self.booking_repo.get_by_id(booking_id)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found",
            )
        return booking

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