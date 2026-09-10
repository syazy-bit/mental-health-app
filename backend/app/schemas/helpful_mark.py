"""Pydantic schemas for What Helped (owned helpful marks)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.tools import TOOL_IDS


class HelpfulMarkRequest(BaseModel):
    """Request to mark a tool as helpful. Registry id only."""

    # extra="forbid" so a smuggled user_id (or any metadata) is rejected
    # (422), mirroring the moment/screening schemas. Ownership is
    # server-derived from the JWT.
    model_config = ConfigDict(extra="forbid")

    tool_id: str = Field(min_length=1, max_length=64)

    @field_validator("tool_id")
    @classmethod
    def validate_known_tool(cls, v: str) -> str:
        if v not in TOOL_IDS:
            raise ValueError("Unknown tool")
        return v


class HelpfulMarkResponse(BaseModel):
    """One owned helpful mark: registry id plus latest mark time."""

    tool_id: str
    marked_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HelpfulMarkListResponse(BaseModel):
    """Paginated owned helpful marks, newest first (fixed ordering)."""

    items: list[HelpfulMarkResponse]
    total: int
    limit: int
    offset: int
