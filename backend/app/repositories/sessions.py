"""Data access for sessions."""

import uuid

from sqlalchemy.orm import Session

from app.models.session import Session as SessionModel


class SessionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, language: str) -> SessionModel:
        session = SessionModel(language=language)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_by_id(self, session_id: uuid.UUID) -> SessionModel | None:
        return self.db.get(SessionModel, session_id)