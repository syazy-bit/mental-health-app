"""Seed demo counselors and slots for the M7 booking flow.

IMPORTANT: The counselor profiles created here are DEMO/CONFIGURABLE PLACEHOLDER
profiles. They are NOT real university employees and must be replaced with the
actual university counseling team before production use.

Run from the backend directory:
    .venv\\Scripts\\python.exe scripts\\seed_booking_demo.py

Idempotent: existing demo counselors are detected by name and left untouched.
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.models.counselor import Counselor as CounselorModel
from app.schemas.booking import CounselorCreate, CounselorSlotCreate
from app.services.booking import BookingService

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

# Demo/configurable staff profiles - NOT real university employees.
DEMO_COUNSELORS = [
    {
        "name": "Demo Counselor 1",
        "title": "Staff Counselor (Demo)",
        "areas_of_support": [
            "Academic stress",
            "Anxiety",
            "Sleep difficulties",
            "Adjustment to university life",
        ],
        "bio": "Demo profile. Replace with a real member of the university "
        "counseling team before going live.",
    },
    {
        "name": "Demo Counselor 2",
        "title": "Staff Counselor (Demo)",
        "areas_of_support": [
            "Depression",
            "Grief and loss",
            "Relationship concerns",
            "Self-esteem",
        ],
        "bio": "Demo profile. Replace with a real member of the university "
        "counseling team before going live.",
    },
    {
        "name": "Demo Counselor 3",
        "title": "Wellness Advisor (Demo)",
        "areas_of_support": [
            "Stress management",
            "Mindfulness",
            "Work-life balance",
            "Goal setting",
        ],
        "bio": "Demo profile. Replace with a real member of the university "
        "wellness team before going live.",
    },
]

# Demo slots are generated for the next 5 weekdays, one slot per counselor.
SLOTS_PER_COUNSELOR = 5
SLOT_HOUR = 14  # 2 PM local-equivalent time (stored as UTC)
SLOT_DURATION_HOURS = 1


def seed() -> None:
    db: Session = SessionLocal()
    service = BookingService(db)
    now = datetime.now(timezone.utc)
    created_slots = 0
    try:
        for profile in DEMO_COUNSELORS:
            existing = db.execute(
                select(CounselorModel).where(
                    CounselorModel.name == profile["name"]
                )
            ).scalar_one_or_none()
            if existing is None:
                counselor = service.create_counselor(CounselorCreate(**profile))
                print(f"Created demo counselor: {counselor.name} ({counselor.id})")
            else:
                counselor = existing
                print(f"Demo counselor already exists: {counselor.name}")

            for i in range(SLOTS_PER_COUNSELOR):
                day = now + timedelta(days=1 + i)
                start = day.replace(hour=SLOT_HOUR, minute=0, second=0, microsecond=0)
                end = start + timedelta(hours=SLOT_DURATION_HOURS)
                try:
                    service.create_slot(
                        counselor.id,
                        CounselorSlotCreate(starts_at=start, ends_at=end),
                    )
                    created_slots += 1
                except Exception as exc:  # noqa: BLE001 - skip conflicts
                    print(f"  Skipped slot {start.isoformat()}: {exc}")
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print(f"Seed complete. Created {len(DEMO_COUNSELORS)} demo counselor "
          f"profiles and {created_slots} demo slots.")


if __name__ == "__main__":
    if not os.environ.get("DATABASE_URL"):
        print("DATABASE_URL is not set. Copy backend/.env.example to .env first.")
        sys.exit(1)
    seed()