"""Data access for sessions.

Repository methods only stage changes on the session. Transaction boundaries
(commit/rollback) are owned by the service layer so multi-step operations can
be committed atomically.
"""

import uuid

from sqlalchemy.orm import Session

from app.models.session import Session as SessionModel


class SessionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self, language: str, user_id: uuid.UUID | None = None
    ) -> SessionModel:
        # Phase 2B: user_id is server-derived (JWT.sub or None). Callers must
        # never forward a client-supplied user_id here.
        session = SessionModel(language=language, user_id=user_id)
        self.db.add(session)
        return session

    def get_by_id(self, session_id: uuid.UUID) -> SessionModel | None:
        return self.db.get(SessionModel, session_id)