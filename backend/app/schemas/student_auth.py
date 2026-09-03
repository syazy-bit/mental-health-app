"""Pydantic schemas for student authentication (Phase 1B)."""

import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Conservative email pattern (format check only; deliverability is not
# verified). Case-insensitive uniqueness is enforced by the Phase 1A
# lower(email) unique index; normalization here matches the User validator.
_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


def normalize_email(value: str) -> str:
    """Strip and lowercase an email address (mirrors User._normalize_email)."""
    if not isinstance(value, str):
        raise ValueError("email must be a string")
    normalized = value.strip().lower()
    if not normalized:
        raise ValueError("email must not be empty")
    if len(normalized) > 254:
        raise ValueError("email must be at most 254 characters")
    if not _EMAIL_RE.match(normalized):
        raise ValueError("email must be a valid email address")
    return normalized


class StudentRegisterRequest(BaseModel):
    """Request to create a student account."""

    email: str = Field(..., min_length=1, max_length=254)
    # Length floor/ceiling here are transport guards only: the real minimum
    # comes from settings.student_password_min_length (enforced in the
    # service) and bcrypt's 72-byte cap (enforced by the hasher, which
    # rejects rather than truncates).
    password: str = Field(..., min_length=1, max_length=128)
    display_name: Optional[str] = Field(default=None, max_length=80)

    _normalize_email = field_validator("email", mode="before")(normalize_email)

    @field_validator("display_name")
    @classmethod
    def _clean_display_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StudentLoginRequest(BaseModel):
    """Request to authenticate as a student."""

    email: str = Field(..., min_length=1, max_length=254)
    password: str = Field(..., min_length=1, max_length=128)

    _normalize_email = field_validator("email", mode="before")(normalize_email)


class StudentTokenResponse(BaseModel):
    """Response containing a student access token.

    The opaque refresh token is delivered separately as an HttpOnly cookie
    (web) and never appears in response bodies.
    """

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class StudentResponse(BaseModel):
    """Student profile (never includes password hash or token material)."""

    id: uuid.UUID
    email: str
    display_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RefreshRequest(BaseModel):
    """Alternative refresh-token transport for non-browser clients.

    Browsers use the HttpOnly cookie automatically; native/mobile clients,
    which hold the raw token in secure storage, send it here instead.
    """

    refresh_token: Optional[str] = Field(default=None, min_length=1, max_length=256)
