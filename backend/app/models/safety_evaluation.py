"""Safety evaluation entity.

Privacy-by-design: this table stores metadata only (risk assessment metadata).
No conversation content, raw phrases, text hashes, or PII are stored.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Integer, ForeignKey, UniqueConstraint, Index, CheckConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid
from sqlalchemy.dialects.postgresql import JSONB

from app.core.db import Base


class SafetyEvaluation(Base):
    __tablename__ = "safety_evaluations"

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
    message_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    risk_level: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )
    matched_patterns: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )
    classifier_sources: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )
    language: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationship back to session (optional, for convenience)
    session: Mapped["Session"] = relationship(back_populates="safety_evaluations")

    __table_args__ = (
        # Unique message index per session
        UniqueConstraint("session_id", "message_index", name="uq_safety_eval_session_idx"),
        # Indexes for common queries
        Index("ix_safety_eval_session_created", "session_id", "created_at"),
        Index("ix_safety_eval_risk_level", "risk_level"),
        Index("ix_safety_eval_category", "category"),
        # Check constraints
        CheckConstraint(
            "risk_level IN ('NORMAL', 'MODERATE', 'HIGH_RISK')",
            name="ck_safety_eval_risk_level",
        ),
    )


# Add back-reference to Session model (will be done in session.py update)
# Session.safety_evaluations = relationship("SafetyEvaluation", back_populates="session", cascade="all, delete-orphan", order_by="SafetyEvaluation.message_index")