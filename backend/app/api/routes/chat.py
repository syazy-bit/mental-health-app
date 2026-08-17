"""Chat endpoint: processes student messages through the safety pipeline."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session as DbSession

from app.core.db import get_db
from app.services.chat import ChatService
from app.services.chat_providers import DeterministicFallbackProvider
from app.safety.engine import SafetyEngine


router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessageRequest(BaseModel):
    session_id: uuid.UUID
    message: str = Field(..., min_length=1, max_length=2000)


class ChatMessageResponse(BaseModel):
    session_id: uuid.UUID
    message_index: int
    risk_level: str
    category: str
    response: str
    is_crisis: bool
    language: str


@router.post("/message", response_model=ChatMessageResponse, status_code=status.HTTP_200_OK)
def send_message(
    payload: ChatMessageRequest,
    db: DbSession = Depends(get_db),
) -> ChatMessageResponse:
    """Process a student message through the safety pipeline.

    Pipeline:
    1. Session validation (404 if not found)
    2. Input validation (length, non-empty)
    3. Safety pre-check via SafetyEngine
    4. Risk decision (NORMAL/MODERATE/HIGH_RISK)
    6. Crisis response OR fallback generation
    7. Output safety check
    7. Persist safety evaluation
    8. Return response
    """
    chat_service = ChatService(
        db=db,
        safety_engine=SafetyEngine(),
        chat_provider=DeterministicFallbackProvider(),
    )

    try:
        result = chat_service.process_message(
            session_id=payload.session_id,
            message=payload.message,
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
    )