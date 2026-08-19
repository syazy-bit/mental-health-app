"""Data access for bookings.

Repository methods only stage changes. Transaction boundaries are owned by the
service layer.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking as BookingModel


class BookingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        slot_id: uuid.UUID,
        confirmation_code: str,
        session_id: uuid.UUID | None = None,
        student_name: str | None = None,
        contact_email: str | None = None,
        contact_phone: str | None = None,
        reason: str | None = None,
    ) -> BookingModel:
        booking = BookingModel(
            slot_id=slot_id,
            session_id=session_id,
            confirmation_code=confirmation_code,
            student_name=student_name,
            contact_email=contact_email,
            contact_phone=contact_phone,
            reason=reason,
            status="PENDING",
        )
        self.db.add(booking)
        return booking

    def get_by_id(self, booking_id: uuid.UUID) -> BookingModel | None:
        return self.db.get(BookingModel, booking_id)

    def get_by_confirmation_code(self, confirmation_code: str) -> BookingModel | None:
        """Look up a booking by its (stored, uppercase) confirmation code."""
        return self.db.execute(
            select(BookingModel).where(
                BookingModel.confirmation_code == confirmation_code
            )
        ).scalars().first()

    def get_active_by_slot(self, slot_id: uuid.UUID) -> BookingModel | None:
        """Any PENDING/CONFIRMED booking for a slot (fast 409 path)."""
        return self.db.execute(
            select(BookingModel).where(
                BookingModel.slot_id == slot_id,
                BookingModel.status.in_(("PENDING", "CONFIRMED")),
            )
        ).scalars().first()

    def list_all(
        self,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[BookingModel]:
        stmt = select(BookingModel)
        if status is not None:
            stmt = stmt.where(BookingModel.status == status)
        return list(
            self.db.execute(
                stmt.order_by(BookingModel.created_at.desc())
                .limit(limit)
                .offset(offset)
            ).scalars()
        )