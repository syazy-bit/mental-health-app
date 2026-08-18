"""Pydantic schemas for admin authentication."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AdminLoginRequest(BaseModel):
    """Request to authenticate as admin."""
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=128)


class AdminTokenResponse(BaseModel):
    """Response containing access token."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AdminResponse(BaseModel):
    """Admin response (excludes password hash)."""
    id: uuid.UUID
    username: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminCreateInternal(BaseModel):
    """Internal schema for creating admin (used by seed/setup scripts)."""
    username: str
    password_hash: str