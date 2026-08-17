"""Data access for safety evaluations.

Repository methods only stage changes. Transaction boundaries are owned by the service layer.
"""

import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.safety_evaluation import SafetyEvaluation as SafetyEvaluationModel


class SafetyEvaluationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        session_id: uuid.UUID,
        message_index: int,
        risk_level: str,
        category: str,
        matched_patterns: list[str],
        classifier_sources: list[str],
        language: str,
    ) -> "SafetyEvaluationModel":
        from app.models.safety_evaluation import SafetyEvaluation as SafetyEvaluationModel

        eval = SafetyEvaluationModel(
            session_id=session_id,
            message_index=message_index,
            risk_level=risk_level,
            category=category,
            matched_patterns=matched_patterns,
            classifier_sources=classifier_sources,
            language=language,
        )
        self.db.add(eval)
        return eval

    def get_by_session_and_index(
        self, session_id: uuid.UUID, message_index: int
    ) -> Optional["SafetyEvaluationModel"]:
        from app.models.safety_evaluation import SafetyEvaluation as SafetyEvaluationModel

        return self.db.execute(
            select(SafetyEvaluationModel).where(
                SafetyEvaluationModel.session_id == session_id,
                SafetyEvaluationModel.message_index == message_index,
            )
        ).scalar_one_or_none()

    def get_latest_message_index(self, session_id: uuid.UUID) -> int:
        """Get the highest message_index for a session, or 0 if none."""
        result = self.db.execute(
            select(func.max(SafetyEvaluationModel.message_index)).where(
                SafetyEvaluationModel.session_id == session_id
            )
        ).scalar()
        return result or 0

    def get_by_session(
        self, session_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> list["SafetyEvaluationModel"]:
        from app.models.safety_evaluation import SafetyEvaluation as SafetyEvaluationModel

        return list(
            self.db.execute(
                select(SafetyEvaluationModel)
                .where(SafetyEvaluationModel.session_id == session_id)
                .order_by(SafetyEvaluationModel.message_index)
                .limit(limit)
                .offset(offset)
            ).scalars()
        )