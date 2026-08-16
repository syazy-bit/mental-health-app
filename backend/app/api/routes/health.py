"""Health endpoint. Verifies the API is running and, if configured, the database reachable."""

from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.core.db import engine

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health() -> dict:
    db_status = "not_configured"
    if engine is not None:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            db_status = "connected"
        except Exception:
            db_status = "unavailable"

    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }