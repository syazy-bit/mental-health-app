"""Pydantic schemas for screening API."""

import uuid
from datetime import datetime
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ScreeningRequest(BaseModel):
    """Request to submit a screening."""
    session_id: uuid.UUID
    instrument: Annotated[Literal["PHQ9", "GAD7"], Field(description="Screening instrument")]
    responses: Annotated[list[int], Field(min_length=1, description="Item responses (0-3)")]

    @field_validator("responses")
    @classmethod
    def validate_responses_not_empty(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("Responses cannot be empty")
        return v


class ScreeningSafetyInfo(BaseModel):
    """Safety information for positive Item 9 screens."""
    safety_state: str
    risk_level: str
    requires_followup: bool
    supportive_guidance: str
    safety_resources: list[str]


class ScreeningResponse(BaseModel):
    """Response after submitting a screening."""
    id: uuid.UUID
    session_id: uuid.UUID
    instrument: str
    total_score: int
    severity: str
    safety_flag: bool
    item9_score: Optional[int] = None
    safety_info: Optional[ScreeningSafetyInfo] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScreeningFollowUpRequest(BaseModel):
    """Request to submit safety follow-up action."""
    session_id: uuid.UUID
    screening_id: uuid.UUID
    action: Annotated[Literal["ESCALATE_CRISIS", "SUPPORTIVE_CARE"], Field(description="Follow-up action")]


class ScreeningFollowUpResponse(BaseModel):
    """Response after safety follow-up."""
    screening_id: uuid.UUID
    action: str
    new_safety_state: str
    new_risk_level: str
    supportive_guidance: str
    safety_resources: list[str]

    model_config = ConfigDict(from_attributes=True)


# Internal schema for persistence (used by service layer)
class ScreeningCreateInternal(BaseModel):
    session_id: uuid.UUID
    instrument: str
    total_score: int
    severity: str
    safety_flag: bool
    item9_score: Optional[int] = None