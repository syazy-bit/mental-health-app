"""Pydantic schemas for anonymous sessions."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.languages import normalize_language


class SessionCreate(BaseModel):
    language: str = "en"

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: str) -> str:
        return normalize_language(value)


class SessionResponse(BaseModel):
    id: uuid.UUID
    language: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)