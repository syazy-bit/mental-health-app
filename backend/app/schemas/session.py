"""Pydantic schemas for anonymous sessions."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

# Languages the product targets (English, Hindi, Assamese). Full multilingual
# support is delivered in a later milestone; this validates input only.
SUPPORTED_LANGUAGES = {"en", "hi", "as"}


class SessionCreate(BaseModel):
    language: str = "en"

    @field_validator("language")
    @classmethod
    def normalize_and_validate_language(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language '{value}'. Supported: {sorted(SUPPORTED_LANGUAGES)}"
            )
        return normalized


class SessionResponse(BaseModel):
    id: uuid.UUID
    language: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)