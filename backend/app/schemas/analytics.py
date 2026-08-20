"""Pydantic schemas for the M12 admin analytics endpoint.

Privacy design:
- The dashboard payload is aggregate-only. It never contains row-level
  students, bookings, screenings, safety evaluations, session IDs, booking IDs,
  or any identifier that could be joined back to a student.
- Sensitive mental-health cells (risk categories, screening severity, high-risk
  counts, risk trends) use `count=None` with `suppressed=True` when the
  underlying count is below the small-cell threshold, so individual students
  cannot be re-identified.

Provider/fallback usage is intentionally absent: the chat provider used for a
response is not persisted in the application data (only the deterministic
safety classifier sources are stored on `safety_evaluations`), so a reliable
provider metric would require modifying the AI pipeline. Reported as a
limitation instead.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel

# Smallest count that may be disclosed for sensitive mental-health metrics.
# Any sensitive cell with count < MIN_CELL_SIZE is suppressed (null + flag).
MIN_CELL_SIZE = 5


class PeriodCount(BaseModel):
    """Count for a single time bucket (ISO 8601 timestamp)."""

    bucket: str
    count: int


class LanguageCount(BaseModel):
    """Session count grouped by session language."""

    language: str
    count: int


class InstrumentCount(BaseModel):
    """Screening count grouped by instrument."""

    instrument: str
    count: int


class SeverityCell(BaseModel):
    """Screening count for one (instrument, severity) pair.

    Suppressed when the cell is below MIN_CELL_SIZE: `count` is null and
    `suppressed` is true.
    """

    instrument: str
    severity: str
    count: int | None
    suppressed: bool


class RiskLevelCell(BaseModel):
    """Safety-evaluation count grouped by risk level.

    HIGH_RISK is sensitive and suppressed below MIN_CELL_SIZE. NORMAL/MODERATE
    are low-sensitivity volume buckets and are returned as-is.
    """

    risk_level: str
    count: int | None
    suppressed: bool


class RiskCategoryCell(BaseModel):
    """Safety-evaluation count grouped by risk category.

    Suppressed below MIN_CELL_SIZE.
    """

    category: str
    count: int | None
    suppressed: bool


class RiskTrendCell(BaseModel):
    """Safety-evaluation count for one (time bucket, risk level) pair.

    Suppressed below MIN_CELL_SIZE.
    """

    bucket: str
    risk_level: str
    count: int | None
    suppressed: bool


class BookingStatusCell(BaseModel):
    """Booking count grouped by status (operational, not suppressed)."""

    status: str
    count: int


class BookingFunnelStage(BaseModel):
    """One stage of the booking funnel."""

    stage: str
    count: int


class SuppressedRate(BaseModel):
    """A ratio whose sensitive numerator may be suppressed.

    `value` is null when the numerator count is below MIN_CELL_SIZE
    (`suppressed` is then true).
    """

    value: float | None
    suppressed: bool


class Overview(BaseModel):
    """Headline service-usage totals (operational, never suppressed)."""

    total_sessions: int
    total_screenings: int
    total_safety_evaluations: int
    total_bookings: int
    active_counselors: int
    total_counselor_slots: int
    booking_completion_rate: float | None
    booking_cancellation_rate: float | None


class SessionAnalytics(BaseModel):
    """Session usage metrics (aggregate, no session-level data)."""

    over_time: list[PeriodCount]
    language_distribution: list[LanguageCount]
    average_messages_per_session: float | None


class ScreeningAnalytics(BaseModel):
    """Screening summary metrics (summary scores only, no item answers)."""

    by_instrument: list[InstrumentCount]
    severity_distribution: list[SeverityCell]
    safety_flag_rate: SuppressedRate


class SafetyAnalytics(BaseModel):
    """Safety-evaluation aggregate metrics (metadata only, no risk history)."""

    risk_level_distribution: list[RiskLevelCell]
    risk_category_distribution: list[RiskCategoryCell]
    risk_trends: list[RiskTrendCell]


class BookingAnalytics(BaseModel):
    """Booking operational metrics. Never joined to wellbeing data."""

    by_status: list[BookingStatusCell]
    funnel: list[BookingFunnelStage]
    cancellation_rate: float | None
    over_time: list[PeriodCount]


class CounselorAnalytics(BaseModel):
    """Per-counselor operational metrics.

    Strictly operational (slots -> bookings -> statuses). Never combined with
    student wellbeing information of any kind.
    """

    counselor_id: uuid.UUID
    name: str
    is_active: bool
    total_slots: int
    booked_slots: int
    completed_bookings: int
    pending_bookings: int
    cancelled_bookings: int
    utilization_rate: float | None


class AnalyticsResponse(BaseModel):
    """Complete admin analytics dashboard payload."""

    generated_at: datetime
    overview: Overview
    sessions: SessionAnalytics
    screenings: ScreeningAnalytics
    safety: SafetyAnalytics
    bookings: BookingAnalytics
    counselors: list[CounselorAnalytics]