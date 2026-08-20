"""Chat service orchestrating the complete message processing pipeline.

This service coordinates:
1. Session validation
2. Input validation
3. Safety pre-check (M3 SafetyEngine - authoritative)
4. Risk decision (HIGH_RISK bypasses LLM entirely)
5. Crisis response OR AI/fallback generation
6. Output safety check (defense in depth)
7. Persistence (with session-level locking for message_index)

M6: process_message_async() is the primary path used by the async FastAPI route
and awaits the (async) chat provider safely. process_message() remains as a
synchronous bridge for tests and non-async callers; it must not be called from
a running event loop.
"""

import asyncio
import inspect
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

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
    AIProvider,
    DeterministicFallbackProvider,
    ChatResponse,
    ProviderError,
    create_provider_from_env,
)
from app.services.output_safety import OutputSafetyCheck
from app.services.prompts import get_screening_context_summary
from app.repositories.screenings import ScreeningRepository


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
    # M6: Provider metadata (only safe, useful fields)
    provider: str = "deterministic_fallback"
    model: Optional[str] = None


class ChatService:
    """Orchestrates the complete chat message processing pipeline."""

    # M6: Max history messages (4 turns = 8 messages)
    MAX_HISTORY_MESSAGES = 8

    # M10: Defense in depth - a provider response longer than this is treated
    # as invalid (runaway/verbose output) and swapped for the safe fallback.
    MAX_RESPONSE_LENGTH = 2000

    def __init__(
        self,
        db: Session,
        safety_engine: SafetyEngine | None = None,
        chat_provider: AIProvider | None = None,
    ) -> None:
        self.db = db
        self.safety_engine = safety_engine or SafetyEngine()
        self.chat_provider = chat_provider or create_provider_from_env()
        self.output_safety = OutputSafetyCheck()

        # Repositories
        self.session_repo = SessionRepository(db)
        self.safety_eval_repo = SafetyEvaluationRepository(db)
        self.screening_repo = ScreeningRepository(db)

    def process_message(
        self,
        session_id: uuid.UUID,
        message: str,
        history: Optional[list[dict]] = None,
    ) -> ChatResult:
        """Process a student message synchronously.

        Synchronous bridge for tests and non-async callers. It runs the async
        pipeline on a fresh event loop and MUST NOT be called from a running
        event loop (e.g. from an async FastAPI route) - use
        process_message_async() there instead.
        """
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            # No running loop - safe to drive a fresh one.
            return asyncio.run(
                self.process_message_async(
                    session_id=session_id,
                    message=message,
                    history=history,
                )
            )
        raise RuntimeError(
            "ChatService.process_message() cannot be called from a running "
            "event loop; use 'await chat_service.process_message_async(...)'"
        )

    async def process_message_async(
        self,
        session_id: uuid.UUID,
        message: str,
        history: Optional[list[dict]] = None,
    ) -> ChatResult:
        """Process a student message through the complete safety pipeline.

        Async entry point used by the FastAPI route. Awaits async chat
        providers (e.g. OllamaProvider) safely; sync providers are handled
        transparently.

        Pipeline:
        1. Validate session exists
        2. Validate message (length, non-empty)
        3. Safety pre-check (M3 SafetyEngine - authoritative)
        4. Risk decision (HIGH_RISK bypasses LLM entirely)
        5. Crisis response OR AI/fallback generation
        6. Output safety check (defense in depth)
        7. Persist safety evaluation (with session-level lock for message_index)
        8. Return response

        Args:
            session_id: The anonymous session UUID
            message: The student's message
            history: Optional conversation history (max 8 messages, 4 turns)
                     Format: [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]

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

        # Validate history if provided
        if history is not None:
            history = self._validate_and_limit_history(history)

        language = session.language

        # 3. Safety pre-check (M3 SafetyEngine - AUTHORITATIVE)
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
            # HIGH_RISK: Crisis pathway - NO LLM provider invoked
            crisis_response = select_crisis_response(assessment, language)
            response_text = crisis_response.message
            response_metadata = {"provider": "crisis", "category": assessment.category.value}
            provider_name = "crisis"
            model_name = None
        else:
            # NORMAL / MODERATE: AI provider (with fallback on error)
            try:
                # Get screening context (privacy-transformed)
                screening_context = self._get_screening_context(session_id)

                # Call provider with backward compatibility:
                # Try new signature first (with history, screening_context),
                # fall back to old signature (message, assessment, language)
                # for legacy providers. Handle both async and sync providers.
                try:
                    candidate = self.chat_provider.generate_response(
                        message=message,
                        assessment=assessment,
                        language=language,
                        history=history,
                        screening_context=screening_context,
                    )
                except TypeError:
                    # Legacy provider with old 3-parameter signature
                    candidate = self.chat_provider.generate_response(
                        message, assessment, language
                    )
                if inspect.isawaitable(candidate):
                    chat_response = await candidate
                else:
                    chat_response = candidate
                response_text = chat_response.text

                # M10: Provider output validation boundary. The pipeline must
                # not trust arbitrary provider output. Empty/whitespace or
                # runaway (> MAX_RESPONSE_LENGTH) text is treated as a provider
                # failure and flows into the existing safe fallback path.
                if not response_text or not response_text.strip():
                    raise ProviderError("Empty provider response")
                if len(response_text) > self.MAX_RESPONSE_LENGTH:
                    raise ProviderError("Provider response exceeds maximum length")

                response_metadata = chat_response.metadata or {}
                provider_name = response_metadata.get("provider", "unknown")
                model_name = response_metadata.get("model")
            except ProviderError:
                # Provider error (connection, timeout, malformed) - use safe fallback
                response_text = OutputSafetyCheck.get_safe_fallback(assessment.level.value, language)
                response_metadata = {"provider": "safe_fallback", "error": "provider_failure"}
                provider_name = "safe_fallback"
                model_name = None

        # 6. Output safety check (defense in depth) - REJECT entire response if unsafe
        is_safe, reason = self.output_safety.check(response_text, assessment.level.value)
        if not is_safe:
            # Output safety check failed - use safe fallback (REJECT, don't sanitize)
            response_text = OutputSafetyCheck.get_safe_fallback(assessment.level.value, language)
            response_metadata = {"provider": "safe_fallback", "error": "output_safety_failed"}
            provider_name = "safe_fallback"
            model_name = None

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
            provider=provider_name,
            model=model_name,
        )

    def _validate_and_limit_history(self, history: list[dict]) -> list[dict]:
        """Validate and limit history to MAX_HISTORY_MESSAGES.

        Args:
            history: Raw history from request

        Returns:
            Validated and limited history (max 8 messages)
        """
        if not isinstance(history, list):
            return []

        valid_messages = []
        for msg in history:
            if not isinstance(msg, dict):
                continue
            role = msg.get("role")
            content = msg.get("content")
            if role in ("user", "assistant") and isinstance(content, str) and content.strip():
                valid_messages.append({"role": role, "content": content.strip()})

        # Limit to last MAX_HISTORY_MESSAGES messages
        return valid_messages[-self.MAX_HISTORY_MESSAGES:]

    def _get_screening_context(self, session_id: uuid.UUID) -> Optional[dict]:
        """Get privacy-transformed screening context for the session.

        Only returns derived summary (total_score, severity), NEVER raw item answers.

        Args:
            session_id: The session UUID

        Returns:
            Privacy-transformed screening context or None
        """
        try:
            # Get latest screening for this session
            screening = self.screening_repo.get_latest_by_session(session_id)
            if screening:
                return get_screening_context_summary({
                    "instrument": screening.instrument,
                    "total_score": screening.total_score,
                    "severity": screening.severity,
                })
        except Exception:
            # Screening lookup failure should not break chat - return None
            pass
        return None

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