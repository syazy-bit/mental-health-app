"""Business logic for anonymous sessions."""

import uuid

from sqlalchemy.orm import Session

from app.models.session import Session as SessionModel
from app.repositories.sessions import SessionRepository


class SessionService:
    def __init__(self, db: Session) -> None:
        self.repository = SessionRepository(db)

    def create(self, language: str) -> SessionModel:
        return self.repository.create(language)

    def get(self, session_id: uuid.UUID) -> SessionModel | None:
        return self.repository.get_by_id(session_id)