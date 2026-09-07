"""Pydantic schemas for Moments (My Story: user-authored private notes)."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

MOMENT_MAX_LENGTH = 500


class MomentCreateRequest(BaseModel):
    """Request to save a Moment. Plaintext body only."""

    # extra="forbid" so a smuggled user_id (or any metadata) is rejected (422),
    # mirroring the screening schemas. Ownership is server-derived from the JWT.
    model_config = ConfigDict(extra="forbid")

    body: str = Field(min_length=1, max_length=MOMENT_MAX_LENGTH)

    @field_validator("body")
    @classmethod
    def validate_body_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Moment must contain text")
        return v


class MomentSafety(BaseModel):
    """Transient safety signal for a creation response.

    Computed from the existing SafetyEngine at save time and returned only
    so the client can show the right support UI. Never persisted.
    Exposes no rule names, keywords, categories, or scores.
    """

    level: Literal["normal", "moderate", "high_risk"]


class MomentResponse(BaseModel):
    """One owned Moment (list items and restore responses)."""

    id: uuid.UUID
    body: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MomentCreateResponse(BaseModel):
    """Response after saving a Moment (201)."""

    id: uuid.UUID
    body: str
    created_at: datetime
    safety: MomentSafety

    model_config = ConfigDict(from_attributes=True)


class MomentListResponse(BaseModel):
    """Paginated owned Moments, newest first (fixed ordering)."""

    items: list[MomentResponse]
    total: int
    limit: int
    offset: int
