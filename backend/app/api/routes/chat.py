"""Chat endpoint: processes student messages through the safety pipeline."""

import uuid
from collections import deque
from time import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session as DbSession

from app.core.db import get_db
from app.services.chat import ChatService
from app.services.chat_providers import create_provider_from_env
from app.safety.engine import SafetyEngine


router = APIRouter(prefix="/api/chat", tags=["chat"])

# M6: In-memory rate limiter (10 messages/minute/session)
# Using deque for sliding window
_rate_limit_windows: dict[uuid.UUID, deque[float]] = {}
RATE_LIMIT_MAX_REQUESTS = 10
RATE_LIMIT_WINDOW_SECONDS = 60


def _check_rate_limit(session_id: uuid.UUID) -> None:
    """Check rate limit for a session. Raises HTTPException if exceeded."""
    now = time()
    window = _rate_limit_windows.get(session_id)

    if window is None:
        window = deque()
        _rate_limit_windows[session_id] = window

    # Remove expired entries (older than 60 seconds)
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    while window and window[0] < cutoff:
        window.popleft()

    if len(window) >= RATE_LIMIT_MAX_REQUESTS:
        # Calculate retry-after seconds
        oldest = window[0]
        retry_after = int(oldest + RATE_LIMIT_WINDOW_SECONDS - now) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait before sending more messages.",
            headers={"Retry-After": str(retry_after)},
        )

    # Add current request
    window.append(now)


class ChatMessageRequest(BaseModel):
    session_id: uuid.UUID
    message: str = Field(..., min_length=1, max_length=2000)
    # M6: Optional conversation history (max 8 messages, 4 turns)
    # Format: [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
    history: Optional[list[dict]] = Field(default=None, max_length=8)


class ChatMessageResponse(BaseModel):
    session_id: uuid.UUID
    message_index: int
    risk_level: str
    category: str
    response: str
    is_crisis: bool
    language: str
    # M6: Provider metadata (only safe, useful fields)
    provider: Optional[str] = None
    model: Optional[str] = None


@router.post("/message", response_model=ChatMessageResponse, status_code=status.HTTP_200_OK)
async def send_message(
    request: Request,
    payload: ChatMessageRequest,
    db: DbSession = Depends(get_db),
) -> ChatMessageResponse:
    """Process a student message through the safety pipeline.

    Pipeline:
    1. Session validation (404 if not found)
    2. Input validation (length, non-empty)
    3. Rate limiting (10 messages/minute/session)
    4. Safety pre-check via SafetyEngine
    5. Risk decision (NORMAL/MODERATE/HIGH_RISK)
    6. Crisis response OR AI/fallback generation
    7. Output safety check
    8. Persist safety evaluation
    9. Return response

    Args:
        request: FastAPI request (for rate limiting)
        payload: Chat message request with optional history
        db: Database session

    Returns:
        Chat response with metadata
    """
    # Rate limiting (per session)
    _check_rate_limit(payload.session_id)

    chat_service = ChatService(
        db=db,
        safety_engine=SafetyEngine(),
        chat_provider=create_provider_from_env(),
    )

    try:
        result = await chat_service.process_message_async(
            session_id=payload.session_id,
            message=payload.message,
            history=payload.history,
        )
    except HTTPException:
        raise
    except Exception:
        # Unexpected error - don't leak internal details
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message",
        )

    return ChatMessageResponse(
        session_id=result.session_id,
        message_index=result.message_index,
        risk_level=result.risk_level,
        category=result.category,
        response=result.response,
        is_crisis=result.is_crisis,
        language=result.language,
        provider=result.provider,
        model=result.model,
    )