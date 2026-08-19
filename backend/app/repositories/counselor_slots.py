"""Data access for counselor availability slots.

Repository methods only stage changes. Transaction boundaries are owned by the
service layer.
"""

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.counselor_slot import CounselorSlot as CounselorSlotModel


class CounselorSlotRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        counselor_id: uuid.UUID,
        starts_at: datetime,
        ends_at: datetime,
    ) -> CounselorSlotModel:
        slot = CounselorSlotModel(
            counselor_id=counselor_id,
            starts_at=starts_at,
            ends_at=ends_at,
        )
        self.db.add(slot)
        return slot

    def get_by_id(self, slot_id: uuid.UUID) -> CounselorSlotModel | None:
        return self.db.get(CounselorSlotModel, slot_id)

    def get_by_id_for_update(self, slot_id: uuid.UUID) -> CounselorSlotModel | None:
        """Fetch a slot while locking the row (SELECT ... FOR UPDATE).

        Used during booking creation to serialize concurrent requests for the
        same slot so exactly one succeeds.
        """
        return self.db.execute(
            select(CounselorSlotModel)
            .where(CounselorSlotModel.id == slot_id)
            .with_for_update()
        ).scalar_one_or_none()

    def list_future_for_counselor(
        self,
        counselor_id: uuid.UUID,
        now: datetime,
    ) -> list[CounselorSlotModel]:
        return list(
            self.db.execute(
                select(CounselorSlotModel)
                .where(
                    CounselorSlotModel.counselor_id == counselor_id,
                    CounselorSlotModel.starts_at > now,
                )
                .order_by(CounselorSlotModel.starts_at)
            ).scalars()
        )

    def list_available_future_for_counselor(
        self,
        counselor_id: uuid.UUID,
        now: datetime,
        active_statuses: tuple[str, ...],
    ) -> list[CounselorSlotModel]:
        """Future slots for a counselor that have no active booking."""
        from app.models.booking import Booking as BookingModel

        return list(
            self.db.execute(
                select(CounselorSlotModel)
                .outerjoin(
                    BookingModel,
                    (BookingModel.slot_id == CounselorSlotModel.id)
                    & BookingModel.status.in_(active_statuses),
                )
                .where(
                    CounselorSlotModel.counselor_id == counselor_id,
                    CounselorSlotModel.starts_at > now,
                    BookingModel.id.is_(None),
                )
                .order_by(CounselorSlotModel.starts_at)
            ).scalars()
        )