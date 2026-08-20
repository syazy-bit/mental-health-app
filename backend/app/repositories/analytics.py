"""Aggregate data access for the M12 admin analytics endpoint.

Privacy: every query here operates on aggregate metadata only. This module
NEVER joins the booking domain to the wellbeing domain (no
bookings -> sessions -> screenings / safety_evaluations). That is a hard
architectural prohibition: booking records may carry voluntary student contact
information, and joining them to wellbeing data would deanonymize mental-health
records. Bookings are aggregated only by status, time, and their slot/counselor
(operational dimensions).

No analytics tables are created; all queries are on-demand SQL aggregation over
the existing application tables.
"""

from datetime import datetime

from sqlalchemy import case, distinct, func, select
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.counselor import Counselor
from app.models.counselor_slot import CounselorSlot
from app.models.safety_evaluation import SafetyEvaluation
from app.models.screening import Screening
from app.models.session import Session as SessionModel

# Booking statuses that count as "the slot was actually booked" for utilization.
_BOOKED_STATUSES = ("PENDING", "CONFIRMED", "COMPLETED")


class AnalyticsRepository:
    """Grouped aggregate queries over existing tables."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # --- Overview ---

    def count_sessions(self) -> int:
        return int(self.db.execute(select(func.count(SessionModel.id))).scalar() or 0)

    def count_screenings(self) -> int:
        return int(self.db.execute(select(func.count(Screening.id))).scalar() or 0)

    def count_safety_evaluations(self) -> int:
        return int(
            self.db.execute(select(func.count(SafetyEvaluation.id))).scalar() or 0
        )

    def count_bookings(self) -> int:
        return int(self.db.execute(select(func.count(Booking.id))).scalar() or 0)

    def count_active_counselors(self) -> int:
        return int(
            self.db.execute(
                select(func.count(Counselor.id)).where(Counselor.is_active.is_(True))
            ).scalar()
            or 0
        )

    def count_counselor_slots(self) -> int:
        return int(self.db.execute(select(func.count(CounselorSlot.id))).scalar() or 0)

    def booking_completed_cancelled_total(self) -> tuple[int, int, int]:
        """Return (completed, cancelled, total) booking counts via conditional
        aggregation (single pass, no rows loaded)."""
        row = self.db.execute(
            select(
                func.coalesce(
                    func.sum(case((Booking.status == "COMPLETED", 1), else_=0)), 0
                ),
                func.coalesce(
                    func.sum(case((Booking.status == "CANCELLED", 1), else_=0)), 0
                ),
                func.count(Booking.id),
            )
        ).one()
        return int(row[0]), int(row[1]), int(row[2])

    # --- Sessions ---

    def sessions_over_time(self, granularity: str, since: datetime) -> list[tuple[str, int]]:
        bucket = func.date_trunc(granularity, SessionModel.created_at)
        rows = self.db.execute(
            select(bucket, func.count(SessionModel.id))
            .where(SessionModel.created_at >= since)
            .group_by(bucket)
            .order_by(bucket)
        ).all()
        return [(row[0].isoformat(), int(row[1])) for row in rows]

    def session_language_distribution(self) -> list[tuple[str, int]]:
        rows = self.db.execute(
            select(SessionModel.language, func.count(SessionModel.id))
            .group_by(SessionModel.language)
            .order_by(func.count(SessionModel.id).desc())
        ).all()
        return [(row[0], int(row[1])) for row in rows]

    def total_messages(self) -> int:
        """Total safety evaluations persisted (one per chat message)."""
        return int(
            self.db.execute(select(func.count(SafetyEvaluation.id))).scalar() or 0
        )

    # --- Screenings ---

    def screenings_by_instrument(self) -> list[tuple[str, int]]:
        rows = self.db.execute(
            select(Screening.instrument, func.count(Screening.id))
            .group_by(Screening.instrument)
            .order_by(Screening.instrument)
        ).all()
        return [(row[0], int(row[1])) for row in rows]

    def screening_severity_distribution(self) -> list[tuple[str, str, int]]:
        rows = self.db.execute(
            select(Screening.instrument, Screening.severity, func.count(Screening.id))
            .group_by(Screening.instrument, Screening.severity)
            .order_by(Screening.instrument, Screening.severity)
        ).all()
        return [(row[0], row[1], int(row[2])) for row in rows]

    def safety_flag_counts(self) -> tuple[int, int]:
        """Return (safety_flagged_count, total_count) for screenings."""
        row = self.db.execute(
            select(
                func.coalesce(
                    func.sum(case((Screening.safety_flag.is_(True), 1), else_=0)), 0
                ),
                func.count(Screening.id),
            )
        ).one()
        return int(row[0]), int(row[1])

    # --- Safety ---

    def risk_level_distribution(self) -> list[tuple[str, int]]:
        rows = self.db.execute(
            select(SafetyEvaluation.risk_level, func.count(SafetyEvaluation.id))
            .group_by(SafetyEvaluation.risk_level)
            .order_by(SafetyEvaluation.risk_level)
        ).all()
        return [(row[0], int(row[1])) for row in rows]

    def risk_category_distribution(self) -> list[tuple[str, int]]:
        rows = self.db.execute(
            select(SafetyEvaluation.category, func.count(SafetyEvaluation.id))
            .group_by(SafetyEvaluation.category)
            .order_by(func.count(SafetyEvaluation.id).desc())
        ).all()
        return [(row[0], int(row[1])) for row in rows]

    def risk_trends(
        self, granularity: str, since: datetime
    ) -> list[tuple[str, str, int]]:
        bucket = func.date_trunc(granularity, SafetyEvaluation.created_at)
        rows = self.db.execute(
            select(bucket, SafetyEvaluation.risk_level, func.count(SafetyEvaluation.id))
            .where(SafetyEvaluation.created_at >= since)
            .group_by(bucket, SafetyEvaluation.risk_level)
            .order_by(bucket, SafetyEvaluation.risk_level)
        ).all()
        return [(row[0].isoformat(), row[1], int(row[2])) for row in rows]

    # --- Bookings (operational only; never joined to wellbeing tables) ---

    def bookings_by_status(self) -> list[tuple[str, int]]:
        rows = self.db.execute(
            select(Booking.status, func.count(Booking.id))
            .group_by(Booking.status)
            .order_by(Booking.status)
        ).all()
        return [(row[0], int(row[1])) for row in rows]

    def booking_funnel(self) -> dict[str, int]:
        """created = all bookings; confirmed = CONFIRMED or COMPLETED;
        completed = COMPLETED; cancelled = CANCELLED."""
        row = self.db.execute(
            select(
                func.count(Booking.id),
                func.coalesce(
                    func.sum(
                        case(
                            (Booking.status.in_(("CONFIRMED", "COMPLETED")), 1),
                            else_=0,
                        )
                    ),
                    0,
                ),
                func.coalesce(
                    func.sum(case((Booking.status == "COMPLETED", 1), else_=0)), 0
                ),
                func.coalesce(
                    func.sum(case((Booking.status == "CANCELLED", 1), else_=0)), 0
                ),
            )
        ).one()
        return {
            "created": int(row[0]),
            "confirmed": int(row[1]),
            "completed": int(row[2]),
            "cancelled": int(row[3]),
        }

    def booking_trends(self, granularity: str, since: datetime) -> list[tuple[str, int]]:
        bucket = func.date_trunc(granularity, Booking.created_at)
        rows = self.db.execute(
            select(bucket, func.count(Booking.id))
            .where(Booking.created_at >= since)
            .group_by(bucket)
            .order_by(bucket)
        ).all()
        return [(row[0].isoformat(), int(row[1])) for row in rows]

    # --- Counselors (operational only) ---

    def counselor_operational_metrics(self) -> list[dict]:
        """Per-counselor operational metrics.

        The query joins bookings only to their slot and the slot only to its
        counselor. It NEVER touches session/screening/safety data, so a student
        can never be associated with a counselor through this endpoint.

        booked_slots counts distinct slots carrying at least one active
        (PENDING/CONFIRMED/COMPLETED) booking; utilization is derived from it
        in the service layer.
        """
        rows = self.db.execute(
            select(
                Counselor.id.label("counselor_id"),
                Counselor.name.label("name"),
                Counselor.is_active.label("is_active"),
                func.count(distinct(CounselorSlot.id)).label("total_slots"),
                func.count(
                    distinct(
                        case(
                            (
                                Booking.id.isnot(None)
                                & Booking.status.in_(_BOOKED_STATUSES),
                                CounselorSlot.id,
                            ),
                            else_=None,
                        )
                    )
                ).label("booked_slots"),
                func.coalesce(
                    func.sum(case((Booking.status == "COMPLETED", 1), else_=0)), 0
                ).label("completed_bookings"),
                func.coalesce(
                    func.sum(case((Booking.status == "PENDING", 1), else_=0)), 0
                ).label("pending_bookings"),
                func.coalesce(
                    func.sum(case((Booking.status == "CANCELLED", 1), else_=0)), 0
                ).label("cancelled_bookings"),
            )
            .select_from(Counselor)
            .outerjoin(CounselorSlot, CounselorSlot.counselor_id == Counselor.id)
            .outerjoin(Booking, Booking.slot_id == CounselorSlot.id)
            .group_by(Counselor.id, Counselor.name, Counselor.is_active)
            .order_by(Counselor.name)
        ).all()
        return [
            {
                "counselor_id": row.counselor_id,
                "name": row.name,
                "is_active": row.is_active,
                "total_slots": int(row.total_slots),
                "booked_slots": int(row.booked_slots),
                "completed_bookings": int(row.completed_bookings),
                "pending_bookings": int(row.pending_bookings),
                "cancelled_bookings": int(row.cancelled_bookings),
            }
            for row in rows
        ]