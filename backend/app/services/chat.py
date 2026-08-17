"""Chat service orchestrating the complete message processing pipeline.

This service coordinates:
1. Session validation
2. Input validation
3. Safety pre-check
4. Risk decision
5. Crisis response OR fallback generation
6. Output safety check
7. Persistence (with session-level locking for message_index)
"""

import time
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.languages import normalize_language
from app.models.session import Session as SessionModel
from app.models.safety_evaluation import SafetyEvaluation as SafetyEvaluationModel
from app.repositories.sessions import SessionRepository
from app.repositories.safety_evaluations import SafetyEvaluationRepository
from app.safety.engine import SafetyEngine
from app.safety.crisis import select_crisis_response, CrisisResponse
from app.services.chat_providers import (
    ChatResponseProvider,
    DeterministicFallbackProvider,
    ChatResponse,
    ProviderError,
)
from app.services.output_safety import OutputSafetyCheck


@dataclass(frozen=True)
class ChatResult:
    """Result of processing a chat message."""

    session_id: uuid.UUID
    message_index: int
    risk_level: str
    category: str
    response: str
    is_crisis: bool
    language: str
    processing_time_ms: int


class ChatService:
    """Orchestrates the complete chat message processing pipeline."""

    def __init__(
        self,
        db: Session,
        safety_engine: SafetyEngine | None = None,
        chat_provider: ChatResponseProvider | None = None,
    ) -> None:
        self.db = db
        self.safety_engine = safety_engine or SafetyEngine()
        self.chat_provider = chat_provider or DeterministicFallbackProvider()
        self.output_safety = OutputSafetyCheck()

        # Repositories
        self.session_repo = SessionRepository(db)
        self.safety_eval_repo = SafetyEvaluationRepository(db)

    def process_message(
        self,
        session_id: uuid.UUID,
        message: str,
    ) -> ChatResult:
        """Process a student message through the complete safety pipeline.

        Pipeline:
        1. Validate session exists
        2. Validate message (length, non-empty)
        3. Safety pre-check
        4. Risk decision
        5. Crisis response OR fallback generation
        6. Output safety check
        7. Persist safety evaluation (with session-level lock for message_index)
        8. Return response

        Args:
            session_id: The anonymous session UUID
            message: The student's message

        Returns:
            ChatResult with the response and metadata

        Raises:
            HTTPException: For validation errors (404, 400, etc.)
        """
        start_time = time.perf_counter()

        # 1. Session validation (outside transaction for fast 404)
        session = self.session_repo.get_by_id(session_id)
        if session is None:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=404, detail="Session not found")

        # 2. Input validation
        if not message or not message.strip():
            from fastapi import HTTPException, status
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        # Enforce max length at service boundary too (defense in depth)
        from app.safety.engine import MAX_INPUT_LENGTH
        if len(message) > MAX_INPUT_LENGTH:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=400,
                detail=f"Message exceeds maximum length of {MAX_INPUT_LENGTH} characters",
            )

        language = session.language

        # 3. Safety pre-check
        try:
            assessment = self.safety_engine.evaluate(message)
        except ValueError as e:
            # Input length exceeded (should be caught above, but defensive)
            from fastapi import HTTPException, status
            raise HTTPException(status_code=400, detail=str(e))

        # 4. Risk decision
        is_crisis = assessment.level == "HIGH_RISK"

        # 5. Generate response based on risk level
        if is_crisis:
            # HIGH_RISK: Crisis pathway - NO fallback provider
            crisis_response = select_crisis_response(assessment, language)
            response_text = crisis_response.message
            response_metadata = {"provider": "crisis", "category": assessment.category.value}
        else:
            # NORMAL / MODERATE: Fallback provider
            try:
                chat_response = self.chat_provider.generate_response(
                    message=message,
                    assessment=assessment,
                    language=language,
                )
                response_text = chat_response.text
                response_metadata = chat_response.metadata or {}
            except ProviderError:
                # Provider error - use safe fallback
                response_text = OutputSafetyCheck.get_safe_fallback(assessment.level.value, language)
                response_metadata = {"provider": "safe_fallback", "error": "provider_failure"}

        # 6. Output safety check (defense in depth)
        is_safe, reason = self.output_safety.check(response_text, assessment.level.value)
        if not is_safe:
            # Output safety check failed - use safe fallback
            response_text = OutputSafetyCheck.get_safe_fallback(assessment.level.value, language)
            response_metadata = {"provider": "safe_fallback", "error": "output_safety_failed"}

        # 7. Persist safety evaluation WITHIN a transaction that locks the session row
        # This serializes messages for the same session (including first message)
        message_index = self._persist_evaluation_in_transaction(
            session_id=session_id,
            assessment=assessment,
            language=language,
        )

        # 8. Return result with actual persisted message_index
        processing_time_ms = int((time.perf_counter() - start_time) * 1000)

        return ChatResult(
            session_id=session_id,
            message_index=message_index,
            risk_level=assessment.level.value,
            category=assessment.category.value,
            response=response_text,
            is_crisis=is_crisis,
            language=language,
            processing_time_ms=processing_time_ms,
        )

    def _persist_evaluation_in_transaction(
        self,
        session_id: uuid.UUID,
        assessment,
        language: str,
    ) -> int:
        """Persist the safety evaluation within a transaction that locks the session row.

        Uses SELECT sessions WHERE id = :session_id FOR UPDATE to serialize
        all messages for the same session, including the first message.

        Returns the assigned message_index.

        The transaction is committed here at the ChatService boundary.
        On any exception, the transaction is rolled back.
        """
        from app.models.safety_evaluation import SafetyEvaluation as SafetyEvaluationModel

        try:
            # Lock the session row to serialize concurrent messages for this session
            session = self.db.execute(
                select(SessionModel)
                .where(SessionModel.id == session_id)
                .with_for_update()
            ).scalar_one()

            # Read the latest message_index for this session (within the same transaction)
            latest = self.db.execute(
                select(SafetyEvaluationModel)
                .where(SafetyEvaluationModel.session_id == session_id)
                .order_by(SafetyEvaluationModel.message_index.desc())
                .limit(1)
            ).scalar_one_or_none()

            message_index = (latest.message_index + 1) if latest else 1

            # Stage the evaluation (repository does NOT commit)
            eval = SafetyEvaluationModel(
                session_id=session_id,
                message_index=message_index,
                risk_level=assessment.level.value,
                category=assessment.category.value,
                matched_patterns=list(assessment.matched_patterns),
                classifier_sources=list(assessment.classifier_sources),
                language=language,
            )
            self.db.add(eval)

            # Flush to assign ID and validate unique constraint within the transaction
            self.db.flush()

            # Explicitly commit at the ChatService transaction boundary
            self.db.commit()

            return message_index
        except Exception:
            # Rollback on any exception to ensure no partial evaluation is persisted
            self.db.rollback()
            raise