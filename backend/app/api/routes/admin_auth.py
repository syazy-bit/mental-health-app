"""Admin authentication routes: login and token validation."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_admin_service, get_current_admin
from app.core.db import get_db
from app.schemas.admin import AdminLoginRequest, AdminTokenResponse, AdminResponse
from app.services.admin import AdminService
from app.models.admin import Admin as AdminModel

router = APIRouter(prefix="/api/admin/auth", tags=["admin-auth"])


@router.post("/login", response_model=AdminTokenResponse, status_code=status.HTTP_200_OK)
def admin_login(
    payload: AdminLoginRequest,
    admin_service: AdminService = Depends(get_admin_service),
) -> AdminTokenResponse:
    """Authenticate admin and return access token.

    - Verifies username/password against stored hash
    - Returns JWT access token on success
    - Generic error message to prevent user enumeration
    - Never returns password or password hash
    """
    admin = admin_service.authenticate(payload)
    if admin is None:
        # Generic error to prevent user enumeration
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return admin_service.create_access_token(admin)


@router.get("/me", response_model=AdminResponse, status_code=status.HTTP_200_OK)
def get_current_admin_info(
    current_admin: AdminModel = Depends(get_current_admin),
) -> AdminModel:
    """Get current authenticated admin info.

    Protected route - requires valid JWT token.
    Returns admin info (excludes password hash).
    """
    return current_admin