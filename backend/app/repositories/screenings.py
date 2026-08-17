"""Data access for screenings.

Repository methods only stage changes. Transaction boundaries are owned by the service layer.
"""

import uuid
from typing import Optional

from sqlalchemy import select
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
    ) -> ScreeningModel:
        screening = ScreeningModel(
            session_id=session_id,
            instrument=instrument,
            total_score=total_score,
            severity=severity,
            safety_flag=safety_flag,
            item9_score=item9_score,
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