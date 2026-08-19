"""Verify M7 migration upgrade and downgrade work correctly.

Mirrors verify_m8_migration.py: overrides DATABASE_URL to the test database
before invoking alembic, because migrations/env.py reads the URL from app
settings.
"""

import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parents[1]
TEST_DB_NAME = "mental_health_test"

load_dotenv(BACKEND_DIR / ".env", override=False)

BOOKING_TABLES = ("counselors", "counselor_slots", "bookings")


def main():
    url = os.environ.get("DATABASE_URL", "").strip()
    parsed = make_url(url)
    admin_url = parsed.set(database="postgres")
    engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": TEST_DB_NAME},
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{TEST_DB_NAME}"'))
    engine.dispose()

    test_url = parsed.set(database=TEST_DB_NAME).render_as_string(hide_password=False)
    os.environ["DATABASE_URL"] = test_url

    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))

    check = create_engine(test_url)

    def tables_exist(engine) -> bool:
        with engine.connect() as conn:
            return all(
                conn.execute(
                    text(
                        "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
                        "WHERE table_name = :name)"
                    ),
                    {"name": t},
                ).scalar()
                for t in BOOKING_TABLES
            )

    # Upgrade to head (includes M7 booking migration)
    command.upgrade(cfg, "head")
    assert tables_exist(check), "booking tables missing after upgrade"
    print("UPGRADE OK: counselors, counselor_slots, bookings exist")

    # Downgrade one step (the M7 booking migration)
    command.downgrade(cfg, "-1")
    assert not tables_exist(check), "booking tables still exist after downgrade"
    print("DOWNGRADE OK: booking tables removed")

    # Upgrade again back to head
    command.upgrade(cfg, "head")
    assert tables_exist(check), "booking tables missing after re-upgrade"
    print("RE-UPGRADE OK: booking tables recreated")

    check.dispose()
    print("ALL M7 MIGRATION CHECKS PASSED")


if __name__ == "__main__":
    main()