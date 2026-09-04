"""Session endpoints: anonymous + identity-bound session creation and retrieval.

Phase 2B model (park-and-branch, no claim/transfer/backfill):
- POST without authentication -> anonymous session (user_id NULL), unchanged.
- POST with a valid student JWT -> account-owned session (user_id = JWT.sub).
- POST with a present-but-invalid Bearer credential -> 401 (never silently
  anonymous).
- GET on an anonymous session -> public (unchanged).
- GET on an owned session -> owner only (no auth -> 401, non-owner -> 404).
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.api.deps import get_optional_student
from app.core.db import get_db
from app.models.session import Session as SessionModel
from app.models.user import User as UserModel
from app.schemas.session import SessionCreate, SessionResponse
from app.services.session_ownership import require_session_access
from app.services.sessions import SessionService

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    db: DbSession = Depends(get_db),
    current_user: UserModel | None = Depends(get_optional_student),
) -> SessionModel:
    owner_id = current_user.id if current_user is not None else None
    return SessionService(db).create(payload.language, user_id=owner_id)


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: uuid.UUID,
    db: DbSession = Depends(get_db),
    current_user: UserModel | None = Depends(get_optional_student),
) -> SessionModel:
    session = SessionService(db).get(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return require_session_access(session, current_user)
