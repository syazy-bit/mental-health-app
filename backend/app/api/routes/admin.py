"""Protected admin routes: dashboard, stats, and admin management."""

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.db import get_db
from app.models.admin import Admin as AdminModel
from app.models.session import Session as SessionModel
from app.models.screening import Screening as ScreeningModel
from app.models.safety_evaluation import SafetyEvaluation as SafetyEvaluationModel

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard", status_code=status.HTTP_200_OK)
def admin_dashboard(
    db: Session = Depends(get_db),
    current_admin: AdminModel = Depends(get_current_admin),
) -> dict:
    """Admin dashboard with system statistics.

    Protected route - requires admin authentication.
    Returns aggregate statistics (no PII).
    """
    total_sessions = db.execute(select(func.count(SessionModel.id))).scalar() or 0
    total_screenings = db.execute(select(func.count(ScreeningModel.id))).scalar() or 0
    total_safety_evals = db.execute(select(func.count(SafetyEvaluationModel.id))).scalar() or 0

    # Screening breakdown by instrument
    phq9_count = db.execute(
        select(func.count(ScreeningModel.id)).where(ScreeningModel.instrument == "PHQ9")
    ).scalar() or 0
    gad7_count = db.execute(
        select(func.count(ScreeningModel.id)).where(ScreeningModel.instrument == "GAD7")
    ).scalar() or 0

    # Safety flag counts
    safety_flag_count = db.execute(
        select(func.count(ScreeningModel.id)).where(ScreeningModel.safety_flag == True)
    ).scalar() or 0

    # Risk level breakdown
    risk_normal = db.execute(
        select(func.count(SafetyEvaluationModel.id)).where(SafetyEvaluationModel.risk_level == "NORMAL")
    ).scalar() or 0
    risk_moderate = db.execute(
        select(func.count(SafetyEvaluationModel.id)).where(SafetyEvaluationModel.risk_level == "MODERATE")
    ).scalar() or 0
    risk_high = db.execute(
        select(func.count(SafetyEvaluationModel.id)).where(SafetyEvaluationModel.risk_level == "HIGH_RISK")
    ).scalar() or 0

    return {
        "admin": current_admin.username,
        "statistics": {
            "total_sessions": total_sessions,
            "total_screenings": total_screenings,
            "total_safety_evaluations": total_safety_evals,
            "screenings_by_instrument": {
                "PHQ9": phq9_count,
                "GAD7": gad7_count,
            },
            "safety_flagged_screenings": safety_flag_count,
            "risk_level_distribution": {
                "NORMAL": risk_normal,
                "MODERATE": risk_moderate,
                "HIGH_RISK": risk_high,
            },
        },
    }


@router.get("/admins", status_code=status.HTTP_200_OK)
def list_admins(
    db: Session = Depends(get_db),
    current_admin: AdminModel = Depends(get_current_admin),
) -> dict:
    """List all admins (excluding password hashes).

    Protected route - requires admin authentication.
    """
    admins = db.execute(select(AdminModel)).scalars().all()
    return {
        "admins": [
            {
                "id": str(admin.id),
                "username": admin.username,
                "is_active": admin.is_active,
                "created_at": admin.created_at.isoformat(),
                "updated_at": admin.updated_at.isoformat(),
            }
            for admin in admins
        ]
    }