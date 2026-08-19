"""Data access for counselors.

Repository methods only stage changes. Transaction boundaries are owned by the
service layer.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.counselor import Counselor as CounselorModel


class CounselorRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        name: str,
        title: str,
        areas_of_support: list[str],
        bio: str | None = None,
        is_active: bool = True,
    ) -> CounselorModel:
        counselor = CounselorModel(
            name=name,
            title=title,
            areas_of_support=areas_of_support,
            bio=bio,
            is_active=is_active,
        )
        self.db.add(counselor)
        return counselor

    def get_by_id(self, counselor_id: uuid.UUID) -> CounselorModel | None:
        return self.db.get(CounselorModel, counselor_id)

    def get_active_by_id(self, counselor_id: uuid.UUID) -> CounselorModel | None:
        return self.db.execute(
            select(CounselorModel).where(
                CounselorModel.id == counselor_id,
                CounselorModel.is_active.is_(True),
            )
        ).scalar_one_or_none()

    def list_active(self) -> list[CounselorModel]:
        return list(
            self.db.execute(
                select(CounselorModel)
                .where(CounselorModel.is_active.is_(True))
                .order_by(CounselorModel.name)
            ).scalars()
        )

    def list_all(self) -> list[CounselorModel]:
        return list(
            self.db.execute(
                select(CounselorModel).order_by(CounselorModel.name)
            ).scalars()
        )