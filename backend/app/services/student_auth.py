"""Business logic for student authentication (Phase 1B).

Owns all transaction boundaries for users and refresh tokens. Repositories
only stage changes.

Credential flow:
- Access: short-lived JWT (`type=student_access`, dedicated secret) returned
  in the response body; the client keeps it in memory.
- Refresh: opaque random token. Only its SHA-256 hash is stored
  (`refresh_tokens.token_hash`); the raw value is delivered once via an
  HttpOnly cookie (web) and never persisted, logged, or returned.

Rotation: each refresh revokes the presented token (recording `replaced_by`)
and issues a successor. Presenting an already-rotated token is treated as
possible theft: the whole token family (all active tokens for the user) is
revoked and the caller must log in again.

Deleted users (`deleted_at IS NOT NULL`) are rejected on every path and are
never resurrected.
"""

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.refresh_token import RefreshToken as RefreshTokenModel
from app.models.user import User as UserModel
from app.repositories.refresh_tokens import RefreshTokenRepository
from app.repositories.users import UserRepository
from app.security import passwords
from app.security.tokens import create_student_access_token


class EmailTakenError(Exception):
    """Registration attempted with an already-registered email."""


class AuthenticationFailedError(Exception):
    """Login credentials invalid (generic; routes must not distinguish causes)."""


class InvalidRefreshError(Exception):
    """Refresh token unknown, revoked without replacement, or unusable."""


class ExpiredRefreshError(InvalidRefreshError):
    """Refresh token past its expiry."""


class ReusedRefreshError(Exception):
    """An already-rotated refresh token was presented (possible theft)."""


@dataclass
class AuthPair:
    """Freshly issued credential set (raw refresh included exactly once)."""

    user: UserModel
    access_token: str
    expires_in: int
    refresh_token: str


def hash_refresh_token(raw_token: str) -> str:
    """Deterministic SHA-256 hex digest used for refresh-token lookup/storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_refresh_token() -> str:
    """Cryptographically random opaque refresh token (256 bits of entropy)."""
    return secrets.token_urlsafe(32)


class StudentAuthService:
    """Coordinates student registration, login, refresh, logout, and lookup."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.refresh_tokens = RefreshTokenRepository(db)

    # --- internal helpers ---

    @staticmethod
    def _validate_password_policy(password: str) -> None:
        """Enforce the API-boundary password policy (length only).

        Raises ValueError with a user-facing message. The bcrypt 72-byte cap
        is enforced separately by the hasher, which also raises ValueError.
        """
        if len(password) < settings.student_password_min_length:
            raise ValueError(
                "Password must be at least "
                f"{settings.student_password_min_length} characters."
            )

    def _issue_pair(
        self,
        user: UserModel,
        created_ip: str | None,
        user_agent: str | None,
    ) -> AuthPair:
        """Mint and persist a new access + refresh credential set.

        Must be called inside the caller's transaction (committed by caller).
        The raw refresh token appears here and in the route response only.
        """
        access_token, expires_in = create_student_access_token(user.id)
        raw_refresh = generate_refresh_token()
        self.refresh_tokens.create(
            user_id=user.id,
            token_hash=hash_refresh_token(raw_refresh),
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.student_refresh_token_expire_days),
            created_ip=created_ip,
            user_agent=user_agent,
        )
        return AuthPair(
            user=user,
            access_token=access_token,
            expires_in=expires_in,
            refresh_token=raw_refresh,
        )

    def _revoke_family(self, user_id: UUID, now: datetime) -> None:
        """Revoke every still-active refresh token belonging to a user.

        Used on reuse detection: the whole chain is considered compromised,
        so the attacker gains nothing from any other stolen token and the
        legitimate user must authenticate again.
        """
        for token in self.refresh_tokens.list_active_by_user(user_id, now):
            token.revoked_at = now

    # --- public API ---

    def register(
        self,
        email: str,
        password: str,
        display_name: str | None,
        created_ip: str | None = None,
        user_agent: str | None = None,
    ) -> AuthPair:
        """Create a student account and issue its first credential set.

        Raises ValueError for password-policy violations, EmailTakenError if
        the email is already registered. Only genuine bcrypt output is ever
        persisted as `password_hash`.
        """
        self._validate_password_policy(password)

        existing = self.users.get_by_email(email)
        if existing is not None:
            # Equalize timing with the success path's bcrypt hash.
            passwords.dummy_verify(password)
            raise EmailTakenError()

        password_hash = passwords.hash_password(password)
        # Defensive: never persist an empty/placeholder hash even if a future
        # caller bypasses the hasher above.
        if not password_hash or len(password_hash) < 20:
            raise ValueError("Could not create secure credentials.")

        user = self.users.create(
            email=email, password_hash=password_hash, display_name=display_name
        )
        try:
            # Flush so the client-side UUID default materializes before the
            # refresh-token row references user.id.
            self.db.flush()
            pair = self._issue_pair(user, created_ip, user_agent)
            self.db.commit()
        except IntegrityError:
            # Lost a race with a concurrent registration for the same email.
            self.db.rollback()
            raise EmailTakenError()
        self.db.refresh(user)
        return pair

    def login(
        self,
        email: str,
        password: str,
        created_ip: str | None = None,
        user_agent: str | None = None,
    ) -> AuthPair:
        """Authenticate with email + password.

        Raises AuthenticationFailedError for unknown emails, wrong passwords,
        and deleted accounts alike (routes map this to one generic 401 so
        account existence and status are never revealed).
        """
        user = self.users.get_by_email(email)
        if user is None or user.deleted_at is not None:
            passwords.dummy_verify(password)
            raise AuthenticationFailedError()

        if not passwords.verify_password(password, user.password_hash):
            raise AuthenticationFailedError()

        pair = self._issue_pair(user, created_ip, user_agent)
        self.db.commit()
        self.db.refresh(user)
        return pair

    def refresh(
        self,
        raw_token: str,
        created_ip: str | None = None,
        user_agent: str | None = None,
    ) -> AuthPair:
        """Rotate a refresh token, returning a fresh credential set.

        The presented token row is locked (SELECT ... FOR UPDATE) so two
        simultaneous refreshes cannot both succeed: exactly one wins and the
        loser observes the revoked+replaced row, which is treated as reuse.

        Raises InvalidRefreshError (unknown / logged-out token),
        ExpiredRefreshError, or ReusedRefreshError (rotated token presented:
        the whole family is revoked first).
        """
        now = datetime.now(timezone.utc)
        try:
            token = self.refresh_tokens.get_by_hash_for_update(
                hash_refresh_token(raw_token)
            )
            if token is None:
                self.db.rollback()
                raise InvalidRefreshError()

            user = self.users.get_by_id(token.user_id)
            if user is None or user.deleted_at is not None:
                self.db.rollback()
                raise InvalidRefreshError()

            if token.revoked_at is not None:
                if token.replaced_by is not None:
                    # Possible theft: kill the whole family, then fail.
                    self._revoke_family(user.id, now)
                    self.db.commit()
                    raise ReusedRefreshError()
                self.db.rollback()
                raise InvalidRefreshError()

            if token.expires_at <= now:
                self.db.rollback()
                raise ExpiredRefreshError()

            token.revoked_at = now
            pair = self._issue_pair(user, created_ip, user_agent)
            self.db.flush()
            # Record the rotation chain for reuse detection and audit.
            successor = self.refresh_tokens.get_by_hash(
                hash_refresh_token(pair.refresh_token)
            )
            assert successor is not None
            token.replaced_by = successor.id
            self.db.commit()
        except (InvalidRefreshError, ReusedRefreshError):
            raise
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(user)
        return pair

    def logout(self, raw_token: str | None) -> None:
        """Revoke a refresh token. Safe to call with unknown/already-revoked
        tokens (idempotent): logout must never reveal token validity."""
        if not raw_token:
            return
        token: RefreshTokenModel | None = self.refresh_tokens.get_by_hash(
            hash_refresh_token(raw_token)
        )
        if token is None or token.revoked_at is not None:
            return
        token.revoked_at = datetime.now(timezone.utc)
        self.db.commit()

    def get_active_user(self, user_id: UUID) -> UserModel | None:
        """Return the user only if it exists and is not soft-deleted.

        Single choke point for `/me`, `get_current_user`, and any future
        authenticated dependency: deleted accounts can never authenticate.
        """
        user = self.users.get_by_id(user_id)
        if user is None or user.deleted_at is not None:
            return None
        return user
