"""Counselor availability slot entity (M7).

Slots are stored in UTC (TIMESTAMPTZ) and constrained so that:
- ends_at is strictly after starts_at
- a slot may not exceed 4 hours
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


class CounselorSlot(Base):
    __tablename__ = "counselor_slots"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    counselor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("counselors.id", ondelete="CASCADE"),
        nullable=False,
    )
    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    ends_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    counselor: Mapped["Counselor"] = relationship(back_populates="slots")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="slot")

    __table_args__ = (
        Index("ix_counselor_slots_counselor_starts", "counselor_id", "starts_at"),
        Index("ix_counselor_slots_starts_at", "starts_at"),
        CheckConstraint(
            "ends_at > starts_at",
            name="ck_counselor_slots_end_after_start",
        ),
        CheckConstraint(
            "ends_at - starts_at <= interval '4 hours'",
            name="ck_counselor_slots_max_duration",
        ),
    )