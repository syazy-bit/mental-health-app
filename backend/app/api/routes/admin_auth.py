"""Admin authentication routes: login and token validation."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_admin_service, get_current_admin
from app.api.rate_limit import LoginThrottle, get_login_throttle
from app.core.db import get_db
from app.schemas.admin import AdminLoginRequest, AdminTokenResponse, AdminResponse
from app.services.admin import AdminService
from app.models.admin import Admin as AdminModel

router = APIRouter(prefix="/api/admin/auth", tags=["admin-auth"])


@router.post(
    "/login",
    response_model=AdminTokenResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_429_TOO_MANY_REQUESTS: {
            "description": "Too many recent failed login attempts from this "
            "username/IP. Retry after the lockout window.",
        }
    },
)
def admin_login(
    payload: AdminLoginRequest,
    request: Request,
    admin_service: AdminService = Depends(get_admin_service),
    throttle: LoginThrottle = Depends(get_login_throttle),
) -> AdminTokenResponse:
    """Authenticate admin and return access token.

    - Verifies username/password against stored hash
    - Returns JWT access token on success
    - Generic error message to prevent user enumeration
    - Throttles repeated failed attempts per (username, IP) and per IP
    - Never returns password or password hash
    """
    client_ip = request.client.host if request.client else "unknown"

    if throttle.is_blocked(payload.username, client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
            headers={"Retry-After": str(throttle.lockout_seconds)},
        )

    admin = admin_service.authenticate(payload)
    if admin is None:
        throttle.record_failure(payload.username, client_ip)
        # Generic error to prevent user enumeration
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    throttle.record_success(payload.username, client_ip)
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