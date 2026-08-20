"""Protected admin analytics routes (M12).

Single aggregate dashboard endpoint. Admin-only via the existing
get_current_admin JWT dependency. Returns pre-aggregated numbers only — never
row-level student, booking, screening, or safety data, and never joins the
booking domain to the wellbeing domain. There is no student-facing analytics
endpoint.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.db import get_db
from app.models.admin import Admin as AdminModel
from app.schemas.analytics import AnalyticsResponse
from app.services.analytics import GRANULARITIES, AnalyticsService

router = APIRouter(prefix="/api/admin", tags=["admin-analytics"])


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(db)


@router.get("/analytics", response_model=AnalyticsResponse, status_code=status.HTTP_200_OK)
def admin_analytics(
    granularity: str = Query(
        default="day",
        description="Time-series granularity: day, week, or month.",
    ),
    days: int = Query(
        default=30,
        ge=1,
        le=3650,
        description="Lookback window (in days) for time-series trends.",
    ),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_admin: AdminModel = Depends(get_current_admin),
) -> AnalyticsResponse:
    """Aggregate admin analytics dashboard (admin only, no student data)."""
    if granularity not in GRANULARITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"Invalid granularity '{granularity}'. "
                f"Supported: {', '.join(GRANULARITIES)}"
            ),
        )
    return analytics_service.get_dashboard(granularity=granularity, days=days)