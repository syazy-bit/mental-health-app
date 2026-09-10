"""Data access for helpful marks.

Repository methods stage changes except where noted; transaction boundaries
are owned by the service layer. The composite primary key (user_id,
tool_id) is the entire duplicate invariant — no application-level
existence check precedes a write.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import column, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.helpful_mark import HelpfulMark as HelpfulMarkModel


class HelpfulMarkRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def upsert(
        self, user_id: uuid.UUID, tool_id: str, now: datetime
    ) -> tuple[HelpfulMarkModel, bool]:
        """Insert or refresh one row atomically; return (row, inserted).

        A single INSERT ... ON CONFLICT statement: concurrent duplicate
        POSTs converge to one row with the latest timestamp. `inserted` is
        derived from xmax (0 on insert) so callers can answer 201 vs 200.
        """
        stmt = (
            pg_insert(HelpfulMarkModel)
            .values(user_id=user_id, tool_id=tool_id, marked_at=now)
            .on_conflict_do_update(
                index_elements=["user_id", "tool_id"],
                set_={"marked_at": now},
            )
            # xmax = 0 is true only for freshly inserted tuples, so the
            # caller can answer 201 (first mark) vs 200 (re-mark) from the
            # same atomic statement.
            .returning(HelpfulMarkModel, (column("xmax") == 0).label("inserted"))
        )
        row, inserted = self.db.execute(stmt).one()
        return row, bool(inserted)

    def list_by_user(
        self, user_id: uuid.UUID, limit: int = 20, offset: int = 0
    ) -> list[HelpfulMarkModel]:
        """Owned marks, newest first (fixed server-side ordering)."""
        stmt = (
            select(HelpfulMarkModel)
            .where(HelpfulMarkModel.user_id == user_id)
            .order_by(HelpfulMarkModel.marked_at.desc(), HelpfulMarkModel.tool_id.asc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars())

    def count_by_user(self, user_id: uuid.UUID) -> int:
        """Total owned marks for pagination (same ownership filter)."""
        stmt = (
            select(func.count())
            .select_from(HelpfulMarkModel)
            .where(HelpfulMarkModel.user_id == user_id)
        )
        return int(self.db.execute(stmt).scalar_one())

    def delete_owned(self, user_id: uuid.UUID, tool_id: str) -> bool:
        """Hard-delete one owned row; True if a row existed.

        Callers report 204 either way (a never-marked tool is not an
        error, and absence must not distinguish unknown from unowned).
        """
        stmt = (
            HelpfulMarkModel.__table__.delete().where(
                HelpfulMarkModel.user_id == user_id,
                HelpfulMarkModel.tool_id == tool_id,
            )
        )
        result = self.db.execute(stmt)
        return bool(result.rowcount)

    def get_owned(
        self, user_id: uuid.UUID, tool_id: str
    ) -> Optional[HelpfulMarkModel]:
        """Fetch one owned row (used by tests/diagnostics, not hot paths)."""
        stmt = select(HelpfulMarkModel).where(
            HelpfulMarkModel.user_id == user_id,
            HelpfulMarkModel.tool_id == tool_id,
        )
        return self.db.execute(stmt).scalar_one_or_none()
