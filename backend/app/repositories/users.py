"""Data access for student users.

Repository methods only stage changes on the session. Transaction boundaries
(commit/rollback) are owned by the service layer.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User as UserModel


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self, email: str, password_hash: str, display_name: str | None
    ) -> UserModel:
        user = UserModel(
            email=email, password_hash=password_hash, display_name=display_name
        )
        self.db.add(user)
        return user

    def get_by_id(self, user_id: uuid.UUID) -> UserModel | None:
        return self.db.get(UserModel, user_id)

    def get_by_email(self, email: str) -> UserModel | None:
        """Look up by normalized (lowercased) email to match stored form."""
        stmt = select(UserModel).where(UserModel.email == email.strip().lower())
        return self.db.execute(stmt).scalar_one_or_none()
