"""HelpfulMark entity (My Story → What Helped: current saved state only).

Privacy-by-design: a row records only that a student chose to remember a
tool as useful — a fixed registry id plus the latest mark time. No counts,
scores, ratings, notes, moods, embeddings, or derived metadata exist, so
effectiveness displays are uncomputable, not merely withheld.

Exactly one current row per (user_id, tool_id), enforced by the composite
primary key. Re-marking updates marked_at; removal hard-deletes the row.
There is no event history (deliberate: a timestamp list would be a
behavioral ledger without contextual value). Account removal cascades.
"""

from datetime import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid
from sqlalchemy import String as StringType

from app.core.db import Base
from app.tools import TOOL_IDS


def _tool_id_check_sql() -> str:
    # Keep in sync with app.tools.TOOL_IDS. Adding a tool requires a small
    # migration altering this constraint; removing an ID from the registry
    # does not invalidate existing rows (they remain valid history).
    quoted = ", ".join(f"'{tool_id}'" for tool_id in sorted(TOOL_IDS))
    return f"tool_id IN ({quoted})"


class HelpfulMark(Base):
    __tablename__ = "helpful_marks"

    # Owner. NOT NULL (marks are authenticated-only; anonymous content can
    # never become a mark). CASCADE so account removal deletes marks.
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tool_id: Mapped[str] = mapped_column(
        StringType(64),
        primary_key=True,
    )
    # Latest mark time. The only temporal fact stored: doubles as the Story
    # sort key. Re-marking overwrites it; no history is retained.
    marked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        # No separate user_id index: the composite PRIMARY KEY
        # (user_id, tool_id) already indexes the user_id prefix, which is
        # the only lookup shape this table serves (WHERE user_id = ?).
        # Per-user rows are bounded by the registry size, so the
        # ORDER BY marked_at sort is trivial. Verified via EXPLAIN.
        # Registry backstop at the database layer (API validation is the
        # primary gate; this makes unknown ids unrepresentable even on
        # direct writes).
        CheckConstraint(
            _tool_id_check_sql(),
            name="ck_helpful_marks_tool",
        ),
    )
