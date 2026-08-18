"""Authentication dependencies for FastAPI routes."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models.admin import Admin as AdminModel
from app.services.admin import AdminService


security = HTTPBearer(auto_error=False)


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """Dependency to get AdminService instance."""
    return AdminService(db)


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
            algorithms=[settings.admin_auth_algorithm],
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