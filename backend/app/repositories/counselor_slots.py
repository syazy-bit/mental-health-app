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

    def list_overlapping(
        self,
        counselor_id: uuid.UUID,
        starts_at: datetime,
        ends_at: datetime,
    ) -> list[CounselorSlotModel]:
        """Existing slots for a counselor that overlap the given range.

        Overlap is a strict time-range intersection (back-to-back slots are
        allowed). Includes any slot still ongoing or future relative to the new
        range, regardless of its booking status.
        """
        return list(
            self.db.execute(
                select(CounselorSlotModel)
                .where(
                    CounselorSlotModel.counselor_id == counselor_id,
                    CounselorSlotModel.starts_at < ends_at,
                    CounselorSlotModel.ends_at > starts_at,
                )
                .order_by(CounselorSlotModel.starts_at)
            ).scalars()
        )

    def get_booking_statuses(
        self,
        slot_ids: list[uuid.UUID],
    ) -> dict[uuid.UUID, str]:
        """Map slot_id -> active booking status for the given slots.

        Only PENDING/CONFIRMED bookings count as active. Slots with a
        CANCELLED/COMPLETED booking (or none) are omitted from the map.
        """
        if not slot_ids:
            return {}
        from app.models.booking import Booking as BookingModel

        rows = self.db.execute(
            select(BookingModel.slot_id, BookingModel.status).where(
                BookingModel.slot_id.in_(slot_ids),
                BookingModel.status.in_(("PENDING", "CONFIRMED")),
            )
        ).all()
        return {slot_id: status for slot_id, status in rows}

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