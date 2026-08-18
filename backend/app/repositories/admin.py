"""Data access for admins.

Repository methods only stage changes on the session. Transaction boundaries
(commit/rollback) are owned by the service layer.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admin import Admin as AdminModel


class AdminRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, username: str, password_hash: str) -> AdminModel:
        admin = AdminModel(username=username, password_hash=password_hash)
        self.db.add(admin)
        return admin

    def get_by_id(self, admin_id: uuid.UUID) -> AdminModel | None:
        return self.db.get(AdminModel, admin_id)

    def get_by_username(self, username: str) -> AdminModel | None:
        stmt = select(AdminModel).where(AdminModel.username == username)
        return self.db.execute(stmt).scalar_one_or_none()