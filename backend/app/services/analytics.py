"""Business logic for the M12 admin analytics dashboard.

Privacy rules enforced here:

1. Aggregate-only. The service never returns row-level student, booking,
   screening, or safety data.
2. Hard prohibition: analytics queries never join the booking domain to the
   wellbeing domain (no bookings -> sessions -> screenings / safety_evaluations).
3. Small-cell suppression (MIN_CELL_SIZE, currently 5): sensitive mental-health
   cells below the threshold are returned as count=None with suppressed=True so
   individuals cannot be re-identified. High-level operational totals and
   low-sensitivity volume buckets are not suppressed.

Provider/fallback usage is intentionally NOT reported: the chat provider used
for a response is not persisted in the application data (only the deterministic
safety classifier sources are stored on safety_evaluations.classifier_sources),
so any provider metric would be unreliable and would require modifying the AI
pipeline, which is out of scope for M12. See the API schema docstring.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.repositories.analytics import AnalyticsRepository
from app.schemas.analytics import (
    MIN_CELL_SIZE,
    AnalyticsResponse,
    BookingAnalytics,
    BookingFunnelStage,
    BookingStatusCell,
    CounselorAnalytics,
    InstrumentCount,
    LanguageCount,
    Overview,
    PeriodCount,
    RiskCategoryCell,
    RiskLevelCell,
    RiskTrendCell,
    SafetyAnalytics,
    ScreeningAnalytics,
    SessionAnalytics,
    SeverityCell,
    SuppressedRate,
)

# Supported time-series granularities (PostgreSQL date_trunc units).
GRANULARITIES = ("day", "week", "month")

# Default lookback window for trend series.
DEFAULT_LOOKBACK_DAYS = 30


class AnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = AnalyticsRepository(db)

    @staticmethod
    def _suppress(count: int) -> tuple[int | None, bool]:
        """Small-cell suppression for sensitive metrics.

        Returns (count, suppressed). Counts below MIN_CELL_SIZE are suppressed
        (None, True) to prevent re-identification.
        """
        if count < MIN_CELL_SIZE:
            return None, True
        return count, False

    def get_dashboard(
        self, granularity: str = "day", days: int = DEFAULT_LOOKBACK_DAYS
    ) -> AnalyticsResponse:
        repo = self.repository
        since = datetime.now(timezone.utc) - timedelta(days=days)

        # --- Overview ---
        completed, cancelled, total_bookings = repo.booking_completed_cancelled_total()
        completion_rate = round(completed / total_bookings, 4) if total_bookings else None
        cancellation_rate = round(cancelled / total_bookings, 4) if total_bookings else None

        total_sessions = repo.count_sessions()
        overview = Overview(
            total_sessions=total_sessions,
            total_screenings=repo.count_screenings(),
            total_safety_evaluations=repo.count_safety_evaluations(),
            total_bookings=total_bookings,
            active_counselors=repo.count_active_counselors(),
            total_counselor_slots=repo.count_counselor_slots(),
            booking_completion_rate=completion_rate,
            booking_cancellation_rate=cancellation_rate,
        )

        # --- Sessions ---
        total_messages = repo.total_messages()
        average_messages_per_session = (
            round(total_messages / total_sessions, 2) if total_sessions else None
        )
        sessions = SessionAnalytics(
            over_time=[
                PeriodCount(bucket=bucket, count=count)
                for bucket, count in repo.sessions_over_time(granularity, since)
            ],
            language_distribution=[
                LanguageCount(language=language, count=count)
                for language, count in repo.session_language_distribution()
            ],
            average_messages_per_session=average_messages_per_session,
        )

        # --- Screenings ---
        flagged_screenings, total_screenings = repo.safety_flag_counts()
        if total_screenings == 0:
            safety_flag_rate = SuppressedRate(value=None, suppressed=False)
        else:
            _, suppressed = self._suppress(flagged_screenings)
            safety_flag_rate = SuppressedRate(
                value=(
                    None
                    if suppressed
                    else round(flagged_screenings / total_screenings, 4)
                ),
                suppressed=suppressed,
            )

        severity_cells: list[SeverityCell] = []
        for instrument, severity, count in repo.screening_severity_distribution():
            suppressed_count, suppressed = self._suppress(count)
            severity_cells.append(
                SeverityCell(
                    instrument=instrument,
                    severity=severity,
                    count=suppressed_count,
                    suppressed=suppressed,
                )
            )
        screenings = ScreeningAnalytics(
            by_instrument=[
                InstrumentCount(instrument=instrument, count=count)
                for instrument, count in repo.screenings_by_instrument()
            ],
            severity_distribution=severity_cells,
            safety_flag_rate=safety_flag_rate,
        )

        # --- Safety ---
        risk_level_cells: list[RiskLevelCell] = []
        for level, count in repo.risk_level_distribution():
            # NORMAL/MODERATE are low-sensitivity volume buckets and are not
            # suppressed; HIGH_RISK is sensitive and suppressed below the
            # small-cell threshold.
            if level == "HIGH_RISK":
                suppressed_count, suppressed = self._suppress(count)
            else:
                suppressed_count, suppressed = count, False
            risk_level_cells.append(
                RiskLevelCell(
                    risk_level=level,
                    count=suppressed_count,
                    suppressed=suppressed,
                )
            )

        risk_category_cells: list[RiskCategoryCell] = []
        for category, count in repo.risk_category_distribution():
            suppressed_count, suppressed = self._suppress(count)
            risk_category_cells.append(
                RiskCategoryCell(
                    category=category,
                    count=suppressed_count,
                    suppressed=suppressed,
                )
            )

        risk_trend_cells: list[RiskTrendCell] = []
        for bucket, level, count in repo.risk_trends(granularity, since):
            suppressed_count, suppressed = self._suppress(count)
            risk_trend_cells.append(
                RiskTrendCell(
                    bucket=bucket,
                    risk_level=level,
                    count=suppressed_count,
                    suppressed=suppressed,
                )
            )
        safety = SafetyAnalytics(
            risk_level_distribution=risk_level_cells,
            risk_category_distribution=risk_category_cells,
            risk_trends=risk_trend_cells,
        )

        # --- Bookings (operational only) ---
        funnel = repo.booking_funnel()
        bookings = BookingAnalytics(
            by_status=[
                BookingStatusCell(status=status, count=count)
                for status, count in repo.bookings_by_status()
            ],
            funnel=[
                BookingFunnelStage(stage="created", count=funnel["created"]),
                BookingFunnelStage(stage="confirmed", count=funnel["confirmed"]),
                BookingFunnelStage(stage="completed", count=funnel["completed"]),
                BookingFunnelStage(stage="cancelled", count=funnel["cancelled"]),
            ],
            cancellation_rate=cancellation_rate,
            over_time=[
                PeriodCount(bucket=bucket, count=count)
                for bucket, count in repo.booking_trends(granularity, since)
            ],
        )

        # --- Counselors (operational only) ---
        counselors: list[CounselorAnalytics] = []
        for row in repo.counselor_operational_metrics():
            total_slots = row["total_slots"]
            utilization_rate = (
                round(row["booked_slots"] / total_slots, 4) if total_slots else None
            )
            counselors.append(
                CounselorAnalytics(
                    counselor_id=row["counselor_id"],
                    name=row["name"],
                    is_active=row["is_active"],
                    total_slots=total_slots,
                    booked_slots=row["booked_slots"],
                    completed_bookings=row["completed_bookings"],
                    pending_bookings=row["pending_bookings"],
                    cancelled_bookings=row["cancelled_bookings"],
                    utilization_rate=utilization_rate,
                )
            )

        return AnalyticsResponse(
            generated_at=datetime.now(timezone.utc),
            overview=overview,
            sessions=sessions,
            screenings=screenings,
            safety=safety,
            bookings=bookings,
            counselors=counselors,
        )