"""Appointment booking entity (M7).

Privacy-by-design:
- Stores only optional student contact information (name, email, phone)
  voluntarily provided by the student.
- session_id is optional and stored as ownership metadata only. Booking
  responses NEVER expose session content (chat history, screening answers,
  safety evaluations).
- confirmation_code is a cryptographically random, unguessable value used to
  retrieve/cancel a booking without a session.

Double-booking protection:
- A partial unique index allows at most one PENDING/CONFIRMED booking per slot.
- Combined with a SELECT ... FOR UPDATE on the slot row during creation, so
  concurrent same-slot requests resolve to exactly one success and one 409.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.core.db import Base


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    slot_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("counselor_slots.id", ondelete="RESTRICT"),
        nullable=False,
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("sessions.id", ondelete="SET NULL"),
        nullable=True,
    )
    confirmation_code: Mapped[str] = mapped_column(
        String(8),
        nullable=False,
        unique=True,
    )
    student_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="PENDING",
        server_default="PENDING",
    )
    admin_notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    slot: Mapped["CounselorSlot"] = relationship(back_populates="bookings")

    @property
    def counselor(self) -> "Counselor":
        """Convenience accessor so API responses can embed counselor info."""
        return self.slot.counselor

    __table_args__ = (
        Index("ix_bookings_session_id", "session_id"),
        Index("ix_bookings_status", "status"),
        # Partial unique index: at most one active (PENDING/CONFIRMED) booking
        # per slot. CANCELLED/COMPLETED bookings do not block new bookings.
        Index(
            "uq_bookings_active_slot",
            "slot_id",
            unique=True,
            postgresql_where=text("status IN ('PENDING','CONFIRMED')"),
        ),
        CheckConstraint(
            "status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')",
            name="ck_bookings_status",
        ),
    )