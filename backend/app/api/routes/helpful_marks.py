"""Helpful-mark endpoints: mark, list, and remove owned What Helped items."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session as DbSession

from app.api.deps import get_current_user
from app.api.routes.moments import MomentCreateThrottle
from app.core.db import get_db
from app.models.user import User as UserModel
from app.schemas.helpful_mark import (
    HelpfulMarkListResponse,
    HelpfulMarkRequest,
    HelpfulMarkResponse,
)
from app.services.helpful_marks import HelpfulMarkService

router = APIRouter(prefix="/api/helpful-marks", tags=["helpful-marks"])

HELPFUL_MARKS_MAX_LIMIT = 50
HELPFUL_MARKS_DEFAULT_LIMIT = 20
MARK_MAX_PER_HOUR = 60
MARK_WINDOW_SECONDS = 3600
# Route-scoped body cap: a mark request is one short registry id plus
# envelope; anything larger is rejected before parsing. No global limit
# is changed. (Pydantic also bounds tool_id, but only after parsing.)
MAX_REQUEST_BYTES = 1024


mark_throttle = MomentCreateThrottle(
    max_creates=MARK_MAX_PER_HOUR,
    window_seconds=MARK_WINDOW_SECONDS,
)


def _enforce_body_cap(request: Request) -> None:
    """Reject oversized payloads before parsing (route dependency).

    Same pattern as the moments body cap: FastAPI validates the request
    body before the endpoint function runs, so this must run as a
    dependency to fire first. No global limit is changed.
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
    response_model=HelpfulMarkResponse,
    dependencies=[Depends(_enforce_body_cap)],
)
def mark_tool(
    payload: HelpfulMarkRequest,
    response: Response,
    db: DbSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> HelpfulMarkResponse:
    """Mark a tool as helpful (or re-mark it, refreshing its timestamp).

    Ownership comes exclusively from the verified JWT; no `user_id`
    parameter exists. Unknown tool ids are rejected (422) against the
    fixed server-side registry. First mark answers 201, re-mark answers
    200 with the same current-state shape. No SafetyEngine contact:
    marking a registry tool is a preference action, not a signal.
    """
    if mark_throttle.is_blocked(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Slow down — please try again later",
        )
    result = HelpfulMarkService(db).mark_tool(current_user, payload.tool_id)
    mark_throttle.record_create(current_user.id)
    response.status_code = (
        status.HTTP_201_CREATED if result.created else status.HTTP_200_OK
    )
    return HelpfulMarkResponse.model_validate(result.mark)


@router.get("", response_model=HelpfulMarkListResponse)
def list_marks(
    db: DbSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
    limit: Annotated[int, Query(ge=1, le=HELPFUL_MARKS_MAX_LIMIT)] = HELPFUL_MARKS_DEFAULT_LIMIT,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> HelpfulMarkListResponse:
    """List the authenticated student's own helpful marks, newest first.

    Ownership comes exclusively from the verified JWT. Items carry
    registry ids only; names and descriptions resolve client-side.
    """
    page = HelpfulMarkService(db).list_marks(current_user, limit=limit, offset=offset)
    return HelpfulMarkListResponse(
        items=[HelpfulMarkResponse.model_validate(m) for m in page.items],
        total=page.total,
        limit=page.limit,
        offset=page.offset,
    )


@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_mark(
    tool_id: str,
    db: DbSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> None:
    """Remove one owned helpful mark (hard delete, idempotent).

    Unknown tool ids, never-marked tools, and other users' rows all yield
    the same 204: absence is not an error and reveals nothing (tool ids
    are public registry values, so there is no existence oracle here).
    Re-marking afterwards simply re-inserts.
    """
    HelpfulMarkService(db).remove_mark(current_user, tool_id)
    return None


# Re-exported for tests (reset between cases, mirroring the moments
# throttle resets). Not part of the API contract.
__all__ = ["router", "mark_throttle"]
