"""Pydantic schemas for the university counseling booking flow (M7).

Privacy-by-design: booking responses NEVER include session_id, chat history,
screening answers/results, risk levels, or safety evaluations.
"""

import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# --- Counselors ---


class CounselorCreate(BaseModel):
    """Create a counselor (admin only)."""

    name: str = Field(..., min_length=1, max_length=120)
    title: str = Field(..., min_length=1, max_length=120)
    areas_of_support: list[str] = Field(default_factory=list, max_length=20)
    bio: Optional[str] = Field(default=None, max_length=2000)
    is_active: bool = True

    @field_validator("name", "title")
    @classmethod
    def _strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be empty")
        return value

    @field_validator("areas_of_support")
    @classmethod
    def _clean_areas(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item.strip()]
        return cleaned[:20]


class CounselorResponse(BaseModel):
    """Public counselor profile (student view)."""

    id: uuid.UUID
    name: str
    title: str
    areas_of_support: list[str]
    bio: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminCounselorResponse(CounselorResponse):
    """Counselor profile for the admin UI.

    Adds admin-only operational fields (is_active, timestamps). Still contains
    no student data of any kind.
    """

    is_active: bool
    created_at: datetime
    updated_at: datetime


class CounselorUpdate(BaseModel):
    """Update a counselor (admin only). All fields optional.

    Only the fields provided are changed. Empty name/title are rejected; an
    empty bio clears the bio.
    """

    name: Optional[str] = Field(default=None, max_length=120)
    title: Optional[str] = Field(default=None, max_length=120)
    areas_of_support: Optional[list[str]] = Field(default=None, max_length=20)
    bio: Optional[str] = Field(default=None, max_length=2000)
    is_active: Optional[bool] = None

    @field_validator("name", "title")
    @classmethod
    def _strip_required_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("must not be empty")
        return value

    @field_validator("areas_of_support")
    @classmethod
    def _clean_areas(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        if value is None:
            return None
        cleaned = [item.strip() for item in value if item.strip()]
        return cleaned[:20]

    @field_validator("bio")
    @classmethod
    def _strip_optional(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


# --- Counselor slots ---


class CounselorSlotCreate(BaseModel):
    """Create an availability slot (admin only).

    Times are UTC TIMESTAMPTZ. The service enforces that starts_at is in the
    future, ends_at > starts_at, and the slot is at most 4 hours long.
    """

    starts_at: datetime
    ends_at: datetime

    @field_validator("starts_at", "ends_at")
    @classmethod
    def _require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("must include timezone (UTC)")
        return value


class CounselorSlotResponse(BaseModel):
    """An availability slot (student view)."""

    id: uuid.UUID
    counselor_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminCounselorSlotResponse(BaseModel):
    """Admin view of a counselor availability slot (availability management).

    booking_status is "PENDING" or "CONFIRMED" when the slot holds an active
    booking, otherwise None. NEVER includes student name, contact, reason, or
    session_id.
    """

    id: uuid.UUID
    counselor_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    booking_status: Optional[str] = None


# --- Bookings ---


class BookingCreate(BaseModel):
    """Request an appointment (student, anonymous-first).

    All contact fields are optional. status is NOT accepted from the client
    (extra="forbid" rejects attempts to set it directly).
    """

    slot_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    student_name: Optional[str] = Field(default=None, max_length=120)
    contact_email: Optional[str] = Field(default=None, max_length=254)
    contact_phone: Optional[str] = Field(default=None, max_length=32)
    reason: Optional[str] = Field(default=None, max_length=2000)

    model_config = ConfigDict(extra="forbid")

    @field_validator("student_name", "contact_email", "contact_phone", "reason")
    @classmethod
    def _strip_optional(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("contact_email")
    @classmethod
    def _validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if not _EMAIL_RE.match(value):
            raise ValueError("must be a valid email address")
        return value


class BookingSlotInfo(BaseModel):
    """Slot summary embedded in booking responses."""

    id: uuid.UUID
    starts_at: datetime
    ends_at: datetime


class BookingCounselorInfo(BaseModel):
    """Counselor summary embedded in booking responses."""

    id: uuid.UUID
    name: str
    title: str


class BookingResponse(BaseModel):
    """Booking response (student view).

    Deliberately excludes session_id and any session content.
    """

    id: uuid.UUID
    confirmation_code: str
    status: str
    student_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    slot: BookingSlotInfo
    counselor: BookingCounselorInfo


class AdminBookingResponse(BookingResponse):
    """Booking response for the admin dashboard.

    Adds admin-facing fields but still NEVER exposes session_id or session
    content (chat, screening, safety).
    """

    slot_id: uuid.UUID
    admin_notes: Optional[str] = None


class BookingStatusUpdate(BaseModel):
    """Update a booking status (admin only).

    Valid transitions are enforced in the service layer (409 otherwise).
    """

    status: str = Field(..., pattern=r"^(PENDING|CONFIRMED|CANCELLED|COMPLETED)$")
    admin_notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("admin_notes")
    @classmethod
    def _strip_optional(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None