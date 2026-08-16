"""Pytest setup.

Resolves the base DATABASE_URL through the same mechanism the app uses
(python-dotenv loading backend/.env into the environment), provisions a
dedicated `mental_health_test` database, points the app at it, applies Alembic
migrations, and exposes the TestClient and a DB session fixture.

Cleanup truncates every table known to ORM metadata (CASCADE), so the strategy
keeps working as child tables and foreign keys are added.
"""

import os
from pathlib import Path

import pytest
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BACKEND_DIR = Path(__file__).resolve().parents[1]
TEST_DB_NAME = "mental_health_test"

load_dotenv(BACKEND_DIR / ".env", override=False)


def _resolve_base_database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not configured. Create backend/.env from "
            "backend/.env.example so tests can provision the test database."
        )
    return url


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


_BASE_URL = _resolve_base_database_url()
_TEST_URL = _ensure_test_database(_BASE_URL)
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
def _clean_tables(db_session):
    yield
    from app.core.db import Base

    for table in Base.metadata.sorted_tables:
        db_session.execute(text(f'TRUNCATE TABLE "{table.name}" CASCADE'))
    db_session.commit()