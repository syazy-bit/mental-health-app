"""Screening entity.

Privacy-by-design: this table stores only summary metrics (score, severity, safety flags).
No raw response arrays, individual item answers, or PII are stored.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Integer, ForeignKey, Index, CheckConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.core.db import Base


class Screening(Base):
    __tablename__ = "screenings"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    instrument: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
    )
    total_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    severity: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )
    safety_flag: Mapped[bool] = mapped_column(
        nullable=False,
        default=False,
    )
    item9_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        # Index for session history queries
        Index("ix_screenings_session_created", "session_id", "created_at"),
        # Index for instrument-based queries
        Index("ix_screenings_instrument", "instrument"),
        # Check constraints
        CheckConstraint(
            "instrument IN ('PHQ9', 'GAD7')",
            name="ck_screenings_instrument",
        ),
        CheckConstraint(
            "severity IN ('Minimal', 'Mild', 'Moderate', 'Moderately severe', 'Severe')",
            name="ck_screenings_severity",
        ),
        # PHQ-9 score range 0-27, GAD-7 score range 0-21
        CheckConstraint(
            "total_score >= 0 AND total_score <= 27",
            name="ck_screenings_total_score_range",
        ),
        # Item 9 score range 0-3 (nullable for GAD-7)
        CheckConstraint(
            "item9_score IS NULL OR (item9_score >= 0 AND item9_score <= 3)",
            name="ck_screenings_item9_score_range",
        ),
    )