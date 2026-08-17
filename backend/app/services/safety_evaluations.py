"""Business logic for safety evaluations.

The service stages evaluations. Transaction boundaries are owned by the orchestration layer (ChatService).
"""

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.safety_evaluation import SafetyEvaluation as SafetyEvaluationModel
from app.repositories.safety_evaluations import SafetyEvaluationRepository


class SafetyEvaluationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SafetyEvaluationRepository(db)

    def create_evaluation(
        self,
        session_id: uuid.UUID,
        risk_level: str,
        category: str,
        matched_patterns: list[str],
        classifier_sources: list[str],
        language: str,
    ) -> "SafetyEvaluationModel":
        """Create a safety evaluation (stages only, does not commit).

        Message index calculation and locking are handled by the caller
        (ChatService) within a transaction that locks the session row.
        """
        from app.models.safety_evaluation import SafetyEvaluation as SafetyEvaluationModel

        # NOTE: This method no longer calculates message_index or locks.
        # The caller (ChatService) handles locking the session row and
        # calculating the next message_index within the same transaction.
        # This method is kept for API compatibility but should not be used
        # for new chat message processing.
        raise NotImplementedError(
            "Use ChatService._persist_evaluation_in_transaction for chat messages. "
            "This method is deprecated for message persistence."
        )

    def get_latest_message_index(self, session_id: uuid.UUID) -> int:
        """Get the highest message_index for a session, or 0 if none."""
        return self.repository.get_latest_message_index(session_id)