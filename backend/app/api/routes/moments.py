"""Moment endpoints: save, list, delete (5s Undo), and restore owned Moments."""

import threading
import time
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session as DbSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User as UserModel
from app.schemas.moment import (
    MomentCreateRequest,
    MomentCreateResponse,
    MomentListResponse,
    MomentResponse,
    MomentSafety,
)
from app.services.moments import MomentService

router = APIRouter(prefix="/api/moments", tags=["moments"])

MOMENTS_MAX_LIMIT = 50
MOMENTS_DEFAULT_LIMIT = 20
CREATE_MAX_PER_HOUR = 30
CREATE_WINDOW_SECONDS = 3600
# Route-scoped body cap: a 500-char JSON body plus envelope fits easily;
# anything larger is rejected before parsing. No global limit is changed.
MAX_REQUEST_BYTES = 4096


class MomentCreateThrottle:
    """Fixed-window per-account creation counter.

    Same posture as the existing login throttles (in-memory,
    single-process; documented limitation, resettable for tests): abuse
    friction, not a security boundary. Ownership checks, not this counter,
    enforce isolation.
    """

    def __init__(self, max_creates: int, window_seconds: int) -> None:
        self.max_creates = max_creates
        self.window_seconds = window_seconds
        self._records: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def is_blocked(self, user_id: uuid.UUID) -> bool:
        now = time.monotonic()
        key = str(user_id)
        with self._lock:
            record = self._records.get(key)
            if record is None:
                return False
            start, count = record
            if now - start > self.window_seconds:
                del self._records[key]
                return False
            return count >= self.max_creates

    def record_create(self, user_id: uuid.UUID) -> None:
        now = time.monotonic()
        key = str(user_id)
        with self._lock:
            record = self._records.get(key)
            if record is None or now - record[0] > self.window_seconds:
                self._records[key] = [now, 1]
            else:
                record[1] += 1

    def reset(self) -> None:
        """Clear all counters (used by tests between cases)."""
        with self._lock:
            self._records.clear()


moment_create_throttle = MomentCreateThrottle(
    max_creates=CREATE_MAX_PER_HOUR,
    window_seconds=CREATE_WINDOW_SECONDS,
)


def _enforce_body_cap(request: Request) -> None:
    """Route-scoped body cap, evaluated before parsing (as a dependency).

    FastAPI validates the request body before the endpoint function runs,
    so an in-endpoint check would never fire first. As a route dependency
    this rejects oversized payloads without parsing them. No global limit
    is changed.
    """
    content_length = request.headers.get("content-length")
    if content_length is not None and content_length.isdigit():
        if int(content_length) > MAX_REQUEST_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Request body is too large",
            )


@router.post(
    "",
    response_model=MomentCreateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_enforce_body_cap)],
)
def create_moment(
    payload: MomentCreateRequest,
    db: DbSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> MomentCreateResponse:
    """Save a Moment the student explicitly chose to remember.

    Ownership comes exclusively from the verified JWT; no `user_id`
    parameter exists. The existing SafetyEngine evaluates the body
    pre-insert and its level is returned transiently (never persisted).
    The Moment saves for every safety level.
    """
    if moment_create_throttle.is_blocked(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Slow down — please try again later",
        )
    created = MomentService(db).create_moment(current_user, payload.body)
    moment_create_throttle.record_create(current_user.id)
    return MomentCreateResponse(
        id=created.moment.id,
        body=created.moment.body_plaintext,
        created_at=created.moment.created_at,
        safety=MomentSafety(level=created.safety_level),  # type: ignore[arg-type]
    )


@router.get("", response_model=MomentListResponse)
def list_moments(
    db: DbSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
    limit: Annotated[int, Query(ge=1, le=MOMENTS_MAX_LIMIT)] = MOMENTS_DEFAULT_LIMIT,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> MomentListResponse:
    """List the authenticated student's own live Moments, newest first.

    Rows inside the deletion window never appear here. Ownership comes
    exclusively from the verified JWT.
    """
    page = MomentService(db).list_moments(current_user, limit=limit, offset=offset)
    return MomentListResponse(
        items=[MomentResponse.model_validate(m) for m in page.items],
        total=page.total,
        limit=page.limit,
        offset=page.offset,
    )


@router.delete("/{moment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_moment(
    moment_id: uuid.UUID,
    db: DbSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> None:
    """Enter the 5-second recovery window (idempotent).

    The Moment immediately disappears from reads. Restorable via
    POST /{id}/restore until the window lapses, then permanently gone.
    Unknown or unowned ids yield an identical 404.
    """
    MomentService(db).delete_moment(current_user, moment_id)
    return None


@router.post("/{moment_id}/restore", response_model=MomentResponse)
def restore_moment(
    moment_id: uuid.UUID,
    db: DbSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> MomentResponse:
    """Restore a Moment inside its 5-second recovery window.

    Succeeds only for owned rows still inside the window; anything else —
    unknown id, another user's row, live row, or lapsed window — yields an
    identical 404 and can never bring content back.
    """
    moment = MomentService(db).restore_moment(current_user, moment_id)
    return MomentResponse.model_validate(moment)


def _strip_input(obj):
    """Recursively drop `input` keys (submitted Moment text) from error payloads."""
    if isinstance(obj, dict):
        return {k: _strip_input(v) for k, v in obj.items() if k != "input"}
    if isinstance(obj, list):
        return [_strip_input(v) for v in obj]
    return obj


async def moments_validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """422 handler that never echoes submitted Moment text.

    Scoped by path: only /api/moments errors are sanitized (Pydantic
    includes the rejected `input` verbatim by default); every other route
    delegates to FastAPI's default handler, so no existing error contract
    changes.
    """
    if request.url.path.startswith("/api/moments"):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=jsonable_encoder({"detail": _strip_input(exc.errors())}),
        )
    return await request_validation_exception_handler(request, exc)


# Re-exported for tests and app wiring (reset between cases, mirroring
# conftest's throttle resets). Not part of the API contract.
__all__ = ["router", "moment_create_throttle", "moments_validation_handler"]
