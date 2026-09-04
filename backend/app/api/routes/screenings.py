"""Screening endpoints: submit screenings, safety follow-up, owned history."""

import uuid
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DbSession

from app.api.deps import get_current_user, get_optional_student
from app.core.db import get_db
from app.models.user import User as UserModel
from app.schemas.screening import (
    LatestScreeningResponse,
    ScreeningHistoryItem,
    ScreeningHistoryResponse,
    ScreeningRequest,
    ScreeningResponse,
    ScreeningFollowUpRequest,
    ScreeningFollowUpResponse,
    ScreeningSafetyInfo,
)
from app.screening.instruments import InstrumentID, FollowUpAction
from app.services.screenings import ScreeningService
from app.services.user_history import UserHistoryService


router = APIRouter(prefix="/api/screenings", tags=["screenings"])

HISTORY_MAX_LIMIT = 50
HISTORY_DEFAULT_LIMIT = 20


@router.get("/history", response_model=ScreeningHistoryResponse)
def screening_history(
    db: DbSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
    instrument: Annotated[Optional[Literal["PHQ9", "GAD7"]], Query()] = None,
    limit: Annotated[int, Query(ge=1, le=HISTORY_MAX_LIMIT)] = HISTORY_DEFAULT_LIMIT,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ScreeningHistoryResponse:
    """List the authenticated student's own screening summaries, newest first.

    Phase 3B (My Check-ins): ownership comes exclusively from the verified
    JWT (`get_current_user` rejects missing/invalid tokens, admin tokens,
    and soft-deleted users). The query filters `WHERE user_id = sub`, so
    anonymous rows and other users' rows can never appear. No `user_id`
    parameter exists; ordering is fixed server-side.
    """
    page = UserHistoryService(db).get_screening_history(
        current_user, instrument=instrument, limit=limit, offset=offset
    )
    return ScreeningHistoryResponse(
        items=[ScreeningHistoryItem.model_validate(s) for s in page.items],
        total=page.total,
        limit=page.limit,
        offset=page.offset,
    )


@router.get("/history/latest", response_model=LatestScreeningResponse)
def latest_screening(
    db: DbSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
    instrument: Annotated[Optional[Literal["PHQ9", "GAD7"]], Query()] = None,
) -> LatestScreeningResponse:
    """Most recent owned screening summary (null when history is empty)."""
    screening = UserHistoryService(db).get_latest_screening(
        current_user, instrument=instrument
    )
    return LatestScreeningResponse(
        item=ScreeningHistoryItem.model_validate(screening) if screening else None
    )


@router.post("", response_model=ScreeningResponse, status_code=status.HTTP_201_CREATED)
def submit_screening(
    payload: ScreeningRequest,
    db: DbSession = Depends(get_db),
    current_user: UserModel | None = Depends(get_optional_student),
) -> ScreeningResponse:
    """Submit a PHQ-9 or GAD-7 screening.

    Phase 2B: anonymous sessions keep public behavior; account-owned
    sessions require the authenticated owner. Ownership is server-derived.

    Validates:
    - Session exists (+ ownership gate)
    - Instrument supported (PHQ9, GAD7)
    - Exact item count (9 for PHQ-9, 7 for GAD-7)
    - Every response is integer 0-3
    
    Returns:
    - Screening summary (score, severity, safety flag)
    - For PHQ-9 Item 9 > 0: safety_info with guidance and resources
    """
    try:
        instrument = InstrumentID(payload.instrument)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported instrument: {payload.instrument}. Supported: PHQ9, GAD7"
        )
    
    service = ScreeningService(db)
    
    try:
        result = service.submit_screening(
            session_id=payload.session_id,
            instrument=instrument,
            responses=payload.responses,
            current_user=current_user,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process screening",
        )
    
    screening = result.screening
    safety_info = None
    
    if result.safety_assessment.requires_followup:
        safety_info = ScreeningSafetyInfo(
            safety_state=result.safety_assessment.safety_state.value,
            risk_level=result.safety_assessment.risk_level,
            requires_followup=result.safety_assessment.requires_followup,
            supportive_guidance=result.safety_assessment.supportive_guidance,
            safety_resources=result.safety_assessment.safety_resources,
        )
    
    return ScreeningResponse(
        id=screening.id,
        session_id=screening.session_id,
        instrument=screening.instrument,
        total_score=screening.total_score,
        severity=screening.severity,
        safety_flag=screening.safety_flag,
        item9_score=screening.item9_score,
        safety_info=safety_info,
        created_at=screening.created_at,
    )


@router.post(
    "/followup",
    response_model=ScreeningFollowUpResponse,
    status_code=status.HTTP_200_OK,
)
def submit_followup(
    payload: ScreeningFollowUpRequest,
    db: DbSession = Depends(get_db),
    current_user: UserModel | None = Depends(get_optional_student),
) -> ScreeningFollowUpResponse:
    """Submit safety follow-up action for PHQ-9 positive Item 9 screen.
    
    Actions:
    - ESCALATE_CRISIS: Student indicates current/imminent danger
      -> HIGH_RISK_AFTER_SAFETY_FOLLOWUP, HIGH_RISK, crisis pathway
    - SUPPORTIVE_CARE: Student chooses supportive resources
      -> remains POSITIVE_SAFETY_SCREEN, MODERATE, counseling pathway
    
    Only valid for PHQ-9 screenings with Item 9 > 0 (POSITIVE_SAFETY_SCREEN state).
    """
    try:
        action = FollowUpAction(payload.action)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action: {payload.action}. Supported: ESCALATE_CRISIS, SUPPORTIVE_CARE"
        )
    
    service = ScreeningService(db)
    
    try:
        assessment = service.submit_followup(
            session_id=payload.session_id,
            screening_id=payload.screening_id,
            action=action,
            current_user=current_user,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process follow-up",
        )
    
    return ScreeningFollowUpResponse(
        screening_id=payload.screening_id,
        action=payload.action,
        new_safety_state=assessment.safety_state.value,
        new_risk_level=assessment.risk_level,
        supportive_guidance=assessment.supportive_guidance,
        safety_resources=assessment.safety_resources,
    )