"""Moment entity (My Story: user-authored private notes).

Privacy-by-design: a Moment is plaintext the student explicitly chose to
save. No mood, tags, summaries, embeddings, risk scores, or any derived
metadata are stored — only the author's words, ownership, and timestamps.

Deletion lifecycle (5-second Undo): DELETE marks the row with
`deleted_at` + `delete_expires_at` instead of removing it. Rows in the
window are invisible to reads and restorable; once the window lapses the
row is permanently removed by the sweep. See MomentService for the exact
semantics. Account removal cascades: deleting a users row removes its
moments, including rows inside the recovery window.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, CheckConstraint, func, text
from sqlalchemy import Text as TextType
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.core.db import Base


class Moment(Base):
    __tablename__ = "moments"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    # Owner. NOT NULL (moments are authenticated-only; anonymous content can
    # never become a moment). CASCADE so account removal deletes moments,
    # including rows inside the 5-second recovery window.
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    body_plaintext: Mapped[str] = mapped_column(
        TextType,
        nullable=False,
    )
    # Deletion-window markers. Both NULL = live. Both set = inside the
    # 5-second recovery window (invisible to reads, restorable). Cleanup
    # removes rows whose window has lapsed; restore is timestamp-gated so
    # an expired row can never come back even before the sweep runs.
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )
    delete_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    @property
    def body(self) -> str:
        """API-facing alias for the plaintext body (read-only)."""
        return self.body_plaintext

    __table_args__ = (
        # Owned timeline reads: WHERE user_id = ? ORDER BY created_at DESC.
        Index("ix_moments_user_created", "user_id", "created_at"),
        # Expiry sweep: only tombstones are indexed, live rows cost nothing.
        Index(
            "ix_moments_expiry",
            "delete_expires_at",
            postgresql_where=text("delete_expires_at IS NOT NULL"),
        ),
        # Body boundary enforced at the database layer as well as in the
        # API schema and service (1-500 characters; whitespace-only bodies
        # are rejected above this layer).
        CheckConstraint(
            "char_length(body_plaintext) BETWEEN 1 AND 500",
            name="ck_moments_body_length",
        ),
    )
