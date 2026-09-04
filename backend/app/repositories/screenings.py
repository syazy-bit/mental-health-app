"""Data access for screenings.

Repository methods only stage changes. Transaction boundaries are owned by the service layer.
"""

import uuid
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.screening import Screening as ScreeningModel


class ScreeningRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        session_id: uuid.UUID,
        instrument: str,
        total_score: int,
        severity: str,
        safety_flag: bool,
        item9_score: int | None = None,
        user_id: uuid.UUID | None = None,
    ) -> ScreeningModel:
        # Phase 2B: user_id mirrors the owning session (server-derived).
        # Callers must never forward a client-supplied user_id here.
        screening = ScreeningModel(
            session_id=session_id,
            instrument=instrument,
            total_score=total_score,
            severity=severity,
            safety_flag=safety_flag,
            item9_score=item9_score,
            user_id=user_id,
        )
        self.db.add(screening)
        return screening

    def get_by_id(self, screening_id: uuid.UUID) -> Optional[ScreeningModel]:
        return self.db.get(ScreeningModel, screening_id)

    def get_by_session(
        self, session_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> list[ScreeningModel]:
        return list(
            self.db.execute(
                select(ScreeningModel)
                .where(ScreeningModel.session_id == session_id)
                .order_by(ScreeningModel.created_at.desc())
                .limit(limit)
                .offset(offset)
            ).scalars()
        )

    def get_latest_by_session(self, session_id: uuid.UUID) -> Optional[ScreeningModel]:
        """Get the most recent screening for a session (any instrument)."""
        return self.db.execute(
            select(ScreeningModel)
            .where(ScreeningModel.session_id == session_id)
            .order_by(ScreeningModel.created_at.desc())
        ).scalar_one_or_none()

    def get_latest_by_session_and_instrument(
        self, session_id: uuid.UUID, instrument: str
    ) -> Optional[ScreeningModel]:
        return self.db.execute(
            select(ScreeningModel)
            .where(
                ScreeningModel.session_id == session_id,
                ScreeningModel.instrument == instrument,
            )
            .order_by(ScreeningModel.created_at.desc())
        ).scalar_one_or_none()

    def list_by_user(
        self,
        user_id: uuid.UUID,
        instrument: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ScreeningModel]:
        """Owned screening history, newest first (Phase 3B).

        The `user_id` equality is the ownership boundary: anonymous rows
        (`user_id IS NULL`) can never match a real user UUID. Ordering is
        fixed server-side; callers cannot choose it.
        """
        stmt = (
            select(ScreeningModel)
            .where(ScreeningModel.user_id == user_id)
            .order_by(ScreeningModel.created_at.desc(), ScreeningModel.id.desc())
        )
        if instrument is not None:
            stmt = stmt.where(ScreeningModel.instrument == instrument)
        return list(
            self.db.execute(stmt.limit(limit).offset(offset)).scalars()
        )

    def count_by_user(
        self, user_id: uuid.UUID, instrument: str | None = None
    ) -> int:
        """Total owned screenings for pagination (same ownership filter)."""
        stmt = select(func.count()).where(ScreeningModel.user_id == user_id)
        if instrument is not None:
            stmt = stmt.where(ScreeningModel.instrument == instrument)
        return int(self.db.execute(stmt).scalar_one())

    def get_latest_by_user(
        self, user_id: uuid.UUID, instrument: str | None = None
    ) -> Optional[ScreeningModel]:
        """Most recent owned screening, optionally per instrument."""
        stmt = (
            select(ScreeningModel)
            .where(ScreeningModel.user_id == user_id)
            .order_by(ScreeningModel.created_at.desc(), ScreeningModel.id.desc())
            .limit(1)
        )
        if instrument is not None:
            stmt = stmt.where(ScreeningModel.instrument == instrument)
        return self.db.execute(stmt).scalar_one_or_none()