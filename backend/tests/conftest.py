"""Pytest setup.

Creates a dedicated `mental_health_test` PostgreSQL database (never the dev
database), points the app at it via DATABASE_URL, applies Alembic migrations,
and exposes the TestClient and a DB session fixture.
"""

import os
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[1]
TEST_DB_NAME = "mental_health_test"


def _read_dev_database_url() -> str:
    env_file = BACKEND_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("DATABASE_URL=") and not line.startswith("#"):
                return line.split("=", 1)[1].strip()
    return os.environ.get("DATABASE_URL", "")


def _ensure_test_database(url: str) -> str:
    from sqlalchemy.engine import make_url

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
    return parsed.set(database=TEST_DB_NAME).render_as_string(hide_password=False)


def _run_migrations(url: str) -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    command.upgrade(cfg, "head")


_DEV_URL = _read_dev_database_url()
if not _DEV_URL:
    raise RuntimeError(
        "DATABASE_URL is not configured. Create backend/.env from backend/.env.example "
        "so tests can provision the test database."
    )

_TEST_URL = _ensure_test_database(_DEV_URL)
os.environ["DATABASE_URL"] = _TEST_URL
_run_migrations(_TEST_URL)


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_session():
    from app.core.db import SessionLocal

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _clean_sessions(db_session):
    yield
    db_session.execute(text("DELETE FROM sessions"))
    db_session.commit()