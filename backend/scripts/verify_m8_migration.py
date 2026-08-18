"""Verify M8 admin migration upgrade and downgrade work correctly.

Mirrors conftest.py: overrides DATABASE_URL env var to the test database
before invoking alembic, because migrations/env.py reads the URL from
app settings.
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

    def admins_table_exists(engine) -> bool:
        with engine.connect() as conn:
            return conn.execute(
                text(
                    "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
                    "WHERE table_name = 'admins')"
                )
            ).scalar()

    check = create_engine(test_url)

    # Upgrade to head (includes M8 admin migration)
    command.upgrade(cfg, "head")
    assert admins_table_exists(check), "admins table missing after upgrade"
    print("UPGRADE OK: admins table exists")

    # Downgrade one step (the M8 admin migration)
    command.downgrade(cfg, "-1")
    assert not admins_table_exists(check), "admins table still exists after downgrade"
    print("DOWNGRADE OK: admins table removed")

    # Upgrade again back to head
    command.upgrade(cfg, "head")
    assert admins_table_exists(check), "admins table missing after re-upgrade"
    print("RE-UPGRADE OK: admins table recreated")

    check.dispose()
    print("ALL MIGRATION CHECKS PASSED")


if __name__ == "__main__":
    main()