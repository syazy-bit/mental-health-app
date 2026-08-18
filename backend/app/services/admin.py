"""Business logic for admin authentication.

Handles password hashing/verification, JWT token creation, and admin authentication.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import bcrypt
from jose import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.admin import Admin as AdminModel
from app.repositories.admin import AdminRepository
from app.schemas.admin import AdminCreateInternal, AdminLoginRequest, AdminTokenResponse

# Dummy bcrypt hash used to equalize response timing when the username does not
# exist, so login timing cannot be used to enumerate valid admin usernames.
_DUMMY_BCRYPT_HASH = "$2b$12$Lo9KZ.WcgFw0IBDVVJozrufcNURKPXMsWpZhr6zdplKHYTRmDbpFS"

# bcrypt only uses the first 72 bytes of a password.
_BCRYPT_MAX_PASSWORD_BYTES = 72


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = AdminRepository(db)

    @staticmethod
    def _exceeds_bcrypt_limit(password: str) -> bool:
        """True if the UTF-8 encoded password is longer than 72 bytes."""
        return len(password.encode("utf-8")) > _BCRYPT_MAX_PASSWORD_BYTES

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt (salted, adaptive).

        Raises ValueError for passwords over bcrypt's 72-byte limit rather
        than silently truncating them.
        """
        if AdminService._exceeds_bcrypt_limit(password):
            raise ValueError(
                f"Password exceeds bcrypt's {_BCRYPT_MAX_PASSWORD_BYTES}-byte limit"
            )
        return bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify a password against its bcrypt hash.

        Rejects passwords over bcrypt's 72-byte limit (no silent truncation)
        and returns False for malformed hashes instead of raising.
        """
        if AdminService._exceeds_bcrypt_limit(password):
            return False
        try:
            return bcrypt.checkpw(
                password.encode("utf-8"), password_hash.encode("utf-8")
            )
        except ValueError:
            return False

    def create_admin(self, data: AdminCreateInternal) -> AdminModel:
        """Create a new admin (used by setup/seed scripts)."""
        admin = self.repository.create(data.username, data.password_hash)
        self.db.commit()
        self.db.refresh(admin)
        return admin

    def authenticate(self, login_data: AdminLoginRequest) -> Optional[AdminModel]:
        """Authenticate admin with username and password.

        Returns AdminModel if credentials are valid, None otherwise.
        Uses a dummy bcrypt verification for unknown usernames to prevent
        user enumeration through response-time differences.
        """
        admin = self.repository.get_by_username(login_data.username)
        if admin is None:
            # Equalize timing: run a bcrypt verification anyway.
            self.verify_password(login_data.password, _DUMMY_BCRYPT_HASH)
            return None

        # Verify password even for inactive admins to keep timing consistent
        # across account states and avoid leaking account status.
        password_ok = self.verify_password(login_data.password, admin.password_hash)

        if not admin.is_active:
            return None

        if not password_ok:
            return None

        return admin

    def create_access_token(self, admin: AdminModel) -> AdminTokenResponse:
        """Create a JWT access token for the admin."""
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.admin_auth_token_expire_minutes)
        to_encode = {
            "sub": str(admin.id),
            "username": admin.username,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access",
        }
        encoded_jwt = jwt.encode(
            to_encode,
            settings.admin_auth_secret,
            algorithm=settings.admin_auth_algorithm,
        )
        return AdminTokenResponse(
            access_token=encoded_jwt,
            token_type="bearer",
            expires_in=settings.admin_auth_token_expire_minutes * 60,
        )

    def get_admin_by_id(self, admin_id: str) -> Optional[AdminModel]:
        """Get admin by ID (from JWT sub claim)."""
        try:
            return self.repository.get_by_id(UUID(admin_id))
        except ValueError:
            return None