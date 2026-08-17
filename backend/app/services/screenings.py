"""Business logic for screening submission and follow-up.

The service owns transaction boundaries and enforces validation.
Repositories do not commit - the service controls when to commit/rollback.
"""

import uuid
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from app.models.session import Session as SessionModel
from app.models.screening import Screening as ScreeningModel
from app.repositories.sessions import SessionRepository
from app.repositories.screenings import ScreeningRepository
from app.screening.instruments import (
    InstrumentID,
    ScreeningScoreResult,
    ScreeningSafetyState,
    FollowUpAction,
    ScreeningSafetyAssessment,
    get_instrument,
)
from app.services.screening_safety import ScreeningSafetyService


@dataclass(frozen=True)
class ScreeningResult:
    """Result of submitting a screening."""
    screening: ScreeningModel
    score_result: ScreeningScoreResult
    safety_assessment: ScreeningSafetyAssessment


class ScreeningService:
    """Service for screening operations.
    
    Owns transaction boundaries. Repositories only stage changes.
    """

    def __init__(self, db: Session) -> None:
        self.db = db
        self.session_repo = SessionRepository(db)
        self.screening_repo = ScreeningRepository(db)
        self.safety_service = ScreeningSafetyService(db)

    def submit_screening(
        self,
        session_id: uuid.UUID,
        instrument: InstrumentID,
        responses: list[int],
    ) -> ScreeningResult:
        """Submit a screening for a session.
        
        Validates session, instrument, responses, scores, assesses safety,
        persists, and commits.
        
        Args:
            session_id: Anonymous session UUID
            instrument: PHQ9 or GAD7
            responses: List of integer responses (0-3)
            
        Returns:
            ScreeningResult with persisted screening and assessments
            
        Raises:
            HTTPException: For validation errors (404, 400, 422)
        """
        from fastapi import HTTPException, status
        
        # 1. Validate session exists
        session = self.session_repo.get_by_id(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # 2. Get instrument and validate/score
        try:
            inst = get_instrument(instrument)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        try:
            score_result = inst.score(responses)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # 3. Assess safety (PHQ-9 Item 9 workflow)
        safety_assessment = self.safety_service.assess_initial_safety(
            instrument, score_result.item9_score
        )
        
        # 4. Persist screening
        screening = self.screening_repo.create(
            session_id=session_id,
            instrument=instrument.value,
            total_score=score_result.total_score,
            severity=score_result.severity,
            safety_flag=score_result.safety_flag,
            item9_score=score_result.item9_score,
        )
        
        # 5. Commit transaction
        try:
            self.db.commit()
            self.db.refresh(screening)
        except Exception:
            self.db.rollback()
            raise
        
        return ScreeningResult(
            screening=screening,
            score_result=score_result,
            safety_assessment=safety_assessment,
        )

    def submit_followup(
        self,
        session_id: uuid.UUID,
        screening_id: uuid.UUID,
        action: FollowUpAction,
    ) -> ScreeningSafetyAssessment:
        """Submit safety follow-up action for a PHQ-9 screening.
        
        Validates session, screening ownership, and processes follow-up.
        
        Args:
            session_id: Anonymous session UUID (must match screening)
            screening_id: Screening UUID
            action: ESCALATE_CRISIS or SUPPORTIVE_CARE
            
        Returns:
            Updated ScreeningSafetyAssessment
            
        Raises:
            HTTPException: For validation errors (404, 400, 422)
        """
        from fastapi import HTTPException, status
        
        # 1. Validate session exists
        session = self.session_repo.get_by_id(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # 2. Validate screening exists and belongs to session
        screening = self.screening_repo.get_by_id(screening_id)
        if screening is None:
            raise HTTPException(status_code=404, detail="Screening not found")
        if screening.session_id != session_id:
            raise HTTPException(status_code=400, detail="Screening does not belong to session")
        
        # 3. Process follow-up
        try:
            assessment = self.safety_service.process_followup(screening_id, action)
            self.db.commit()
            return assessment
        except ValueError as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=str(e))
        except Exception:
            self.db.rollback()
            raise