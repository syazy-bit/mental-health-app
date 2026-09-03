"""Student authentication routes (Phase 1B): register, login, refresh, logout, me."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.deps import (
    get_current_user,
    get_student_auth_service,
)
from app.api.rate_limit import LoginThrottle, get_student_throttle
from app.core.config import settings
from app.models.user import User as UserModel
from app.schemas.student_auth import (
    RefreshRequest,
    StudentLoginRequest,
    StudentRegisterRequest,
    StudentResponse,
    StudentTokenResponse,
)
from app.services.student_auth import (
    AuthPair,
    AuthenticationFailedError,
    EmailTakenError,
    ExpiredRefreshError,
    InvalidRefreshError,
    ReusedRefreshError,
    StudentAuthService,
)

router = APIRouter(prefix="/api/auth", tags=["student-auth"])

_GENERIC_LOGIN_FAILURE = "Invalid credentials"
_GENERIC_REFRESH_FAILURE = "Invalid or expired refresh token"


# --- Refresh-token cookie + CSRF ---


def _refresh_cookie_max_age() -> int:
    return settings.student_refresh_token_expire_days * 24 * 60 * 60


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    """Deliver the raw refresh token as an HttpOnly cookie.

    Secure is enabled in production (plain-HTTP deployments are development
    only). SameSite=Lax blocks top-level cross-site cookie sends for the
    state-changing refresh/logout POSTs in modern browsers; the Origin check
    below covers the remainder (see _require_cookie_csrf).
    """
    response.set_cookie(
        key=settings.student_refresh_cookie_name,
        value=raw_token,
        max_age=_refresh_cookie_max_age(),
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        path="/api/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.student_refresh_cookie_name,
        path="/api/auth",
        samesite="lax",
    )


def _cleared_refresh_cookie_header() -> str:
    """Render the cookie-clearing Set-Cookie value for exception paths.

    Mutations to the injected Response are discarded when a route raises
    HTTPException, so the 403 logout path must carry the clearing header on
    the exception itself.
    """
    tmp = Response()
    tmp.delete_cookie(
        key=settings.student_refresh_cookie_name,
        path="/api/auth",
        samesite="lax",
    )
    return tmp.headers["set-cookie"]


def _cookie_origin_allowed(request: Request) -> bool:
    """Check the request Origin/Referer against the configured CORS origins.

    SameSite=Lax alone is not a complete CSRF defense (older browsers,
    non-browser clients, and Lax bypasses), so cookie-transported refresh and
    logout additionally require a same-origin signal. A missing Origin AND
    missing Referer is rejected for cookie transport: legitimate browsers
    always send one of them on credentialed POSTs, while a bare cross-site
    form POST can be made to send neither.

    Header-transported (native/mobile) refresh is exempt: it requires
    knowledge of the raw token, which a cross-site attacker cannot read from
    the HttpOnly cookie, so CSRF does not apply to that transport.
    """
    allowed = {origin.rstrip("/") for origin in settings.cors_origins}
    origin = request.headers.get("origin")
    if origin is not None:
        return origin.rstrip("/") in allowed
    referer = request.headers.get("referer")
    if referer is not None:
        cleaned = referer.rstrip("/")
        return any(
            cleaned == base or cleaned.startswith(base + "/") for base in allowed
        )
    return False


def _extract_refresh_token(request: Request, body: RefreshRequest | None) -> tuple[str | None, bool]:
    """Return (raw_token, via_cookie) preferring the HttpOnly cookie."""
    cookie_token = request.cookies.get(settings.student_refresh_cookie_name)
    if cookie_token:
        return cookie_token, True
    if body is not None and body.refresh_token:
        return body.refresh_token, False
    return None, False


def _pair_response(pair: AuthPair, response: Response) -> StudentTokenResponse:
    """Attach the refresh cookie and shape the access-token body."""
    _set_refresh_cookie(response, pair.refresh_token)
    return StudentTokenResponse(
        access_token=pair.access_token,
        expires_in=pair.expires_in,
    )


def _throttle_exceeded(throttle: LoginThrottle) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Too many attempts. Please try again later.",
        headers={"Retry-After": str(throttle.lockout_seconds)},
    )


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


# --- Endpoints ---


@router.post(
    "/register",
    response_model=StudentTokenResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_409_CONFLICT: {
            "description": "An account may already exist for this email."
        },
        status.HTTP_429_TOO_MANY_REQUESTS: {
            "description": "Too many registration attempts from this IP."
        },
    },
)
def student_register(
    payload: StudentRegisterRequest,
    request: Request,
    response: Response,
    auth_service: StudentAuthService = Depends(get_student_auth_service),
    throttle: LoginThrottle = Depends(get_student_throttle),
) -> StudentTokenResponse:
    """Create a student account and issue its first credential set.

    Duplicate emails return 409 without distinguishing details beyond that
    (plus bcrypt dummy work to equalize timing). This status-code signal is
    an accepted, documented tradeoff for usability in a care setting: bulk
    enumeration remains impractical behind per-IP throttling and the absence
    of any bulk lookup API.
    """
    client_ip = _client_ip(request)
    if throttle.is_blocked("register", client_ip):
        raise _throttle_exceeded(throttle)

    try:
        pair = auth_service.register(
            email=payload.email,
            password=payload.password,
            display_name=payload.display_name,
            created_ip=client_ip,
            user_agent=request.headers.get("user-agent"),
        )
    except EmailTakenError:
        throttle.record_failure("register", client_ip)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    except ValueError as exc:
        # Password-policy violation (too short / over bcrypt's 72-byte cap).
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    return _pair_response(pair, response)


@router.post(
    "/login",
    response_model=StudentTokenResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_429_TOO_MANY_REQUESTS: {
            "description": "Too many recent failed login attempts."
        }
    },
)
def student_login(
    payload: StudentLoginRequest,
    request: Request,
    response: Response,
    auth_service: StudentAuthService = Depends(get_student_auth_service),
    throttle: LoginThrottle = Depends(get_student_throttle),
) -> StudentTokenResponse:
    """Authenticate with email + password.

    Unknown emails, wrong passwords, and deleted accounts all produce the
    same generic 401 so account existence and status are never revealed.
    """
    client_ip = _client_ip(request)
    if throttle.is_blocked(payload.email, client_ip):
        raise _throttle_exceeded(throttle)

    try:
        pair = auth_service.login(
            email=payload.email,
            password=payload.password,
            created_ip=client_ip,
            user_agent=request.headers.get("user-agent"),
        )
    except AuthenticationFailedError:
        throttle.record_failure(payload.email, client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_GENERIC_LOGIN_FAILURE,
            headers={"WWW-Authenticate": "Bearer"},
        )

    throttle.record_success(payload.email, client_ip)
    return _pair_response(pair, response)


@router.post(
    "/refresh",
    response_model=StudentTokenResponse,
    status_code=status.HTTP_200_OK,
)
def student_refresh(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    auth_service: StudentAuthService = Depends(get_student_auth_service),
    throttle: LoginThrottle = Depends(get_student_throttle),
) -> StudentTokenResponse:
    """Rotate the refresh token and issue a fresh credential set.

    Token source: HttpOnly cookie (web) or JSON body (native clients holding
    the raw token in secure storage). Cookie transport additionally requires
    a same-origin Origin/Referer signal (CSRF protection).
    """
    client_ip = _client_ip(request)
    raw_token, via_cookie = _extract_refresh_token(request, body)

    if raw_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_GENERIC_REFRESH_FAILURE,
        )
    if via_cookie and not _cookie_origin_allowed(request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Refresh request origin not allowed.",
        )
    if throttle.is_blocked("refresh", client_ip):
        raise _throttle_exceeded(throttle)

    try:
        pair = auth_service.refresh(
            raw_token,
            created_ip=client_ip,
            user_agent=request.headers.get("user-agent"),
        )
    except ReusedRefreshError:
        # Possible token theft: the family has been revoked. No credentials.
        throttle.record_failure("refresh", client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_GENERIC_REFRESH_FAILURE,
        )
    except (InvalidRefreshError, ExpiredRefreshError):
        throttle.record_failure("refresh", client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_GENERIC_REFRESH_FAILURE,
        )

    return _pair_response(pair, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def student_logout(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    auth_service: StudentAuthService = Depends(get_student_auth_service),
) -> None:
    """Revoke the presented refresh token and clear the cookie.

    Idempotent: unknown, already-revoked, or absent tokens still return 204
    so logout never reveals token validity. Cookie transport requires the
    same-origin signal (CSRF protection); the cookie is cleared regardless.
    """
    raw_token, via_cookie = _extract_refresh_token(request, body)
    if via_cookie and raw_token is not None and not _cookie_origin_allowed(request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Logout request origin not allowed.",
            headers={"Set-Cookie": _cleared_refresh_cookie_header()},
        )
    auth_service.logout(raw_token)
    _clear_refresh_cookie(response)
    return None


@router.get("/me", response_model=StudentResponse, status_code=status.HTTP_200_OK)
def get_current_student_info(
    current_user: UserModel = Depends(get_current_user),
) -> UserModel:
    """Return the authenticated student's profile.

    Profile only: never password hashes, token material, screenings,
    bookings, safety evaluations, or any wellbeing history.
    """
    # Belt-and-braces: the dependency already rejects deleted users, but /me
    # must never serve a withdrawn account even if wiring changes.
    if current_user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user
