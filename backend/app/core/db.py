"""SQLAlchemy engine, session factory, and declarative base."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True) if settings.database_url else None

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False) if engine else None


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db():
    """FastAPI dependency that yields a database session."""
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured. Copy .env.example to .env and set it.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()