"""Data access for Moments.

Repository methods only stage changes, except the expiry sweep which issues
its own DELETE (tombstones only, no readable content). Transaction
boundaries are owned by the service layer.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.moment import Moment as MomentModel


class MomentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, user_id: uuid.UUID, body: str) -> MomentModel:
        # user_id is server-derived (JWT.sub). Callers must never forward a
        # client-supplied user_id here.
        moment = MomentModel(user_id=user_id, body_plaintext=body)
        self.db.add(moment)
        return moment

    def get_owned_for_update(
        self, user_id: uuid.UUID, moment_id: uuid.UUID
    ) -> Optional[MomentModel]:
        """Fetch one owned row with a write lock.

        The (id, user_id) conjunction is the ownership boundary: another
        user's row (or a missing row) yields None, and callers map that to
        an identical 404 so existence is never disclosed. FOR UPDATE
        serializes delete/restore/cleanup races on the same row.
        """
        stmt = (
            select(MomentModel)
            .where(
                MomentModel.id == moment_id,
                MomentModel.user_id == user_id,
            )
            .with_for_update()
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_live(
        self, user_id: uuid.UUID, limit: int = 20, offset: int = 0
    ) -> list[MomentModel]:
        """Owned live Moments, newest first.

        Rows inside the deletion window (`deleted_at IS NOT NULL`) are
        excluded: a deleted Moment disappears from the normal list
        immediately. Ordering is fixed server-side; callers cannot choose it.
        """
        stmt = (
            select(MomentModel)
            .where(
                MomentModel.user_id == user_id,
                MomentModel.deleted_at.is_(None),
            )
            .order_by(MomentModel.created_at.desc(), MomentModel.id.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars())

    def count_live(self, user_id: uuid.UUID) -> int:
        """Total owned live Moments for pagination (same live filter)."""
        stmt = (
            select(func.count())
            .select_from(MomentModel)
            .where(
                MomentModel.user_id == user_id,
                MomentModel.deleted_at.is_(None),
            )
        )
        return int(self.db.execute(stmt).scalar_one())

    def sweep_expired(self, now: datetime) -> int:
        """Permanently remove tombstones whose recovery window has lapsed.

        Global (all users): only rows with a lapsed `delete_expires_at`
        match, and those rows are unrestorable by timestamp rule regardless
        of when this runs, so the sweep cannot resurrect or extend anything.
        Returns the number of rows removed.
        """
        stmt = (
            MomentModel.__table__.delete().where(
                MomentModel.delete_expires_at.is_not(None),
                MomentModel.delete_expires_at <= now,
            )
        )
        result = self.db.execute(stmt)
        return int(result.rowcount or 0)
