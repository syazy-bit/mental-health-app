"""Business logic for anonymous sessions.

The service owns transaction boundaries and enforces language validation
(same rules as the API schema, applied at the domain layer too).
"""

import uuid

from sqlalchemy.orm import Session

from app.core.languages import normalize_language
from app.models.session import Session as SessionModel
from app.repositories.sessions import SessionRepository


class SessionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SessionRepository(db)

    def create(self, language: str) -> SessionModel:
        normalized = normalize_language(language)
        session = self.repository.create(normalized)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get(self, session_id: uuid.UUID) -> SessionModel | None:
        return self.repository.get_by_id(session_id)