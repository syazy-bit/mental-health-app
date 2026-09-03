"""Centralized student access-token (JWT) handling (Phase 1B).

Token identity (all required, all verified on decode):
- `sub`: student user UUID
- `type`: must equal STUDENT_TOKEN_TYPE ("student_access")
- `iss`: must equal STUDENT_TOKEN_ISSUER
- `iat` / `exp`: issued-at and short expiry (default 15 minutes)

Separation from admin tokens is enforced twice: the signing secret differs
(STUDENT vs ADMIN secret) AND the `type` claim differs ("student_access" vs
"access"). Verification pins HS256 via STUDENT_AUTH_ALGORITHM so deployment
configuration can never weaken it (same rationale as the admin constant).

No personal information is placed in claims: only the user UUID, which is a
random identifier, plus standard metadata.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt

from app.core.config import (
    STUDENT_AUTH_ALGORITHM,
    STUDENT_TOKEN_ISSUER,
    STUDENT_TOKEN_TYPE,
    settings,
)


class StudentTokenError(Exception):
    """Raised when a student access token fails validation for any reason."""


def create_student_access_token(user_id: UUID) -> tuple[str, int]:
    """Mint a short-lived student access JWT.

    Returns (token, expires_in_seconds). The caller is responsible for
    delivering the token (response body; the client keeps it in memory).
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.student_access_token_expire_minutes)
    encoded = jwt.encode(
        {
            "sub": str(user_id),
            "type": STUDENT_TOKEN_TYPE,
            "iss": STUDENT_TOKEN_ISSUER,
            "iat": now,
            "exp": expire,
        },
        settings.student_auth_secret,
        algorithm=STUDENT_AUTH_ALGORITHM,
    )
    return encoded, settings.student_access_token_expire_minutes * 60


def decode_student_access_token(token: str) -> UUID:
    """Verify a student access token and return the user UUID.

    Raises StudentTokenError on: bad signature, wrong algorithm, expiry,
    wrong/missing `type`, wrong/missing `iss`, or missing/unparseable `sub`.
    In particular, admin tokens (different secret AND different `type`) and
    tokens with `alg=none` are always rejected.
    """
    try:
        payload = jwt.decode(
            token,
            settings.student_auth_secret,
            algorithms=[STUDENT_AUTH_ALGORITHM],
            issuer=STUDENT_TOKEN_ISSUER,
        )
    except JWTError as exc:
        raise StudentTokenError("Invalid or expired token") from exc

    if payload.get("type") != STUDENT_TOKEN_TYPE:
        raise StudentTokenError("Unexpected token type")

    sub = payload.get("sub")
    if not sub:
        raise StudentTokenError("Token is missing its subject")
    try:
        return UUID(str(sub))
    except ValueError as exc:
        raise StudentTokenError("Token subject is not a valid user id") from exc
