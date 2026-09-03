"""Authentication dependencies for FastAPI routes."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import ADMIN_AUTH_ALGORITHM, settings
from app.core.db import get_db
from app.models.admin import Admin as AdminModel
from app.models.user import User as UserModel
from app.services.admin import AdminService
from app.services.student_auth import StudentAuthService
from app.security.tokens import StudentTokenError, decode_student_access_token


security = HTTPBearer(auto_error=False)


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """Dependency to get AdminService instance."""
    return AdminService(db)


def get_student_auth_service(db: Session = Depends(get_db)) -> StudentAuthService:
    """Dependency to get StudentAuthService instance."""
    return StudentAuthService(db)


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    admin_service: AdminService = Depends(get_admin_service),
) -> AdminModel:
    """Extract and validate JWT token, return authenticated admin.

    Raises HTTPException 401 if:
    - No Authorization header
    - Invalid token format
    - Expired token
    - Invalid signature
    - Admin not found
    - Admin inactive
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.admin_auth_secret,
            # Hard-pinned: only HS256 is accepted for verification. The
            # accepted algorithm is deliberately NOT configurable.
            algorithms=[ADMIN_AUTH_ALGORITHM],
        )
        admin_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")

        if admin_id is None or token_type != "access":
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    admin = admin_service.get_admin_by_id(admin_id)
    if admin is None or not admin.is_active:
        raise credentials_exception

    return admin


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    auth_service: StudentAuthService = Depends(get_student_auth_service),
) -> UserModel:
    """Extract and validate a student access JWT, return the authenticated user.

    Accepts ONLY tokens minted for students (`type=student_access`, student
    secret, student issuer): admin tokens and foreign JWTs are rejected by
    decode_student_access_token before any database access.

    Raises HTTPException 401 if:
    - No Authorization header
    - Invalid token format / signature / algorithm
    - Expired token
    - Wrong token type or issuer
    - User not found
    - User soft-deleted (deleted_at IS NOT NULL)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    try:
        user_id = decode_student_access_token(credentials.credentials)
    except StudentTokenError:
        raise credentials_exception

    user = auth_service.get_active_user(user_id)
    if user is None:
        raise credentials_exception

    return user