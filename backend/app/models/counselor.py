"""Counselor entity for the university counseling booking flow (M7).

Privacy-by-design: counselors are university-configured staff entries managed
by the existing admin role. The table stores public-facing profile information
only (name, title, areas of support, bio). No student data is stored here.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.core.db import Base


class Counselor(Base):
    __tablename__ = "counselors"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    areas_of_support: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )
    bio: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
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

    # Relationship to slots (cascade so deleting a counselor removes their slots)
    slots: Mapped[list["CounselorSlot"]] = relationship(
        back_populates="counselor",
        cascade="all, delete-orphan",
        order_by="CounselorSlot.starts_at",
    )