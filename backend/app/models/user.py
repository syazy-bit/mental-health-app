"""Student account entity (Phase 1A foundation).

Privacy-by-design: stores only the minimum needed for optional accounts
(email credential, password hash, optional display name). No phone number,
student ID, date of birth, address, location, or social media information.

Email case-insensitivity is enforced at two layers:
1. Application layer: `email` is normalized (strip + lowercase) on assignment
   via `@validates`, so `User@example.com` is stored as `user@example.com`.
2. Database layer: a functional unique index on `lower(email)`
   (`uq_users_email_lower`) rejects case-variant duplicates even if a writer
   bypasses the ORM validator.

Soft delete: `deleted_at` marks withdrawn accounts. No global query filter is
added here (the codebase does not use that pattern); future authentication
code MUST explicitly reject rows where `deleted_at IS NOT NULL`.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, validates
from sqlalchemy.types import Uuid

from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    email: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    display_name: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    @validates("email")
    def _normalize_email(self, key: str, value: str) -> str:
        """Normalize email to lowercase + stripped form before persistence."""
        if not isinstance(value, str):
            raise ValueError("email must be a string")
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("email must not be empty")
        return normalized


# Case-insensitive uniqueness without requiring the citext extension.
# The ORM validator normalizes on write; this functional index is the backstop
# so case-variant duplicates are rejected even by writers that bypass the ORM.
# Defined after the class because expressions over `mapped_column` attributes
# cannot be referenced inside the class body.
Index("uq_users_email_lower", func.lower(User.email), unique=True)
