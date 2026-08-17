"""Pydantic schemas for safety evaluations."""

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class SafetyEvaluationBase(BaseModel):
    risk_level: Annotated[str, Field(pattern=r"^(NORMAL|MODERATE|HIGH_RISK)$")]
    category: str
    matched_patterns: list[str] = Field(default_factory=list)
    classifier_sources: list[str] = Field(default_factory=list)
    language: str


class SafetyEvaluationCreate(SafetyEvaluationBase):
    session_id: uuid.UUID
    message_index: int


class SafetyEvaluationResponse(SafetyEvaluationBase):
    id: uuid.UUID
    session_id: uuid.UUID
    message_index: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Internal schema for persistence (used by service layer)
class SafetyEvaluationCreateInternal(BaseModel):
    session_id: uuid.UUID
    message_index: int
    risk_level: str
    category: str
    matched_patterns: list[str] = []
    classifier_sources: list[str] = []
    language: str