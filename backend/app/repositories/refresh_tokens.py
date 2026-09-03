"""Data access for student refresh tokens.

Repository methods only stage changes on the session. Transaction boundaries
(commit/rollback) are owned by the service layer.

Only token HASHES are ever passed in or out of this repository; the raw
opaque token never reaches the database layer.
"""

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken as RefreshTokenModel


class RefreshTokenRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
        created_ip: str | None = None,
        user_agent: str | None = None,
    ) -> RefreshTokenModel:
        token = RefreshTokenModel(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            created_ip=created_ip,
            user_agent=user_agent,
        )
        self.db.add(token)
        return token

    def get_by_hash(self, token_hash: str) -> RefreshTokenModel | None:
        stmt = select(RefreshTokenModel).where(
            RefreshTokenModel.token_hash == token_hash
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_hash_for_update(self, token_hash: str) -> RefreshTokenModel | None:
        """Fetch the token row with a write lock.

        Serializes concurrent refresh attempts for the same token so two
        simultaneous requests cannot both rotate it (exactly one wins; the
        loser observes the revoked+replaced row and is treated as reuse).
        """
        stmt = (
            select(RefreshTokenModel)
            .where(RefreshTokenModel.token_hash == token_hash)
            .with_for_update()
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_active_by_user(
        self, user_id: uuid.UUID, now: datetime
    ) -> list[RefreshTokenModel]:
        """All still-usable tokens for a user (unexpired, unrevoked)."""
        stmt = select(RefreshTokenModel).where(
            RefreshTokenModel.user_id == user_id,
            RefreshTokenModel.expires_at > now,
            RefreshTokenModel.revoked_at.is_(None),
        )
        return list(self.db.execute(stmt).scalars().all())
