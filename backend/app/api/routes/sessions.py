"""Session endpoints: anonymous session creation and retrieval."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.core.db import get_db
from app.models.session import Session as SessionModel
from app.schemas.session import SessionCreate, SessionResponse
from app.services.sessions import SessionService

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, db: DbSession = Depends(get_db)) -> SessionModel:
    return SessionService(db).create(payload.language)


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: uuid.UUID, db: DbSession = Depends(get_db)) -> SessionModel:
    session = SessionService(db).get(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return session