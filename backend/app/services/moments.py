"""Owned-Moments service (My Story: user-authored private notes).

Ownership is derived exclusively from the verified `current_user` (JWT.sub
via `get_current_user`); there is no user_id parameter anywhere, so clients
can neither choose nor influence whose moments are read, written, deleted,
or restored.

Deletion lifecycle (5-second Undo), exact semantics:
- DELETE on a live row sets `deleted_at = now` and
  `delete_expires_at = now + 5s`. The row immediately disappears from
  reads and is restorable only while `now <= delete_expires_at`.
- DELETE on a row already inside its window is idempotent (same expiry,
  never extended) and returns the same outcome.
- RESTORE clears both markers iff the row is owned, still marked, and the
  window has not lapsed; otherwise 404. A live row has nothing to restore
  and also yields 404, so restore never signals anything beyond the window.
- Every entry point first sweeps lapsed tombstones, so permanent deletion
  is deterministic: past-expiry rows are physically removed and can never
  be restored even if the sweep had not yet run (the timestamp gate, not
  row absence, is what forbids restore).
- There is no scheduler in this architecture; the sweep runs on every
  moments request, so an expired tombstone lives at most until the next
  moments API call. Restore-after-expiry is timestamp-impossible from the
  moment the window lapses, so irrecoverability holds exactly at 5s even
  when physical removal lags.

Safety: creation runs the existing SafetyEngine on the body pre-insert.
The assessment level is returned transiently so the client can show the
right support UI. Nothing about the evaluation (category, patterns,
normalized text, metadata) is persisted, and the moment saves regardless
of level. No other operation evaluates anything.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.moment import Moment as MomentModel
from app.models.user import User as UserModel
from app.repositories.moments import MomentRepository
from app.safety.engine import SafetyEngine
from app.safety.models import RiskLevel

RESTORE_WINDOW_SECONDS = 5
MOMENT_MAX_LENGTH = 500

_LEVEL_BY_RISK = {
    RiskLevel.NORMAL: "normal",
    RiskLevel.MODERATE: "moderate",
    RiskLevel.HIGH_RISK: "high_risk",
}

NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Moment not found",
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class MomentPage:
    """One page of owned live Moments plus the total for pagination."""

    items: list[MomentModel]
    total: int
    limit: int
    offset: int


@dataclass(frozen=True)
class CreatedMoment:
    """A saved Moment plus its transient safety level (never persisted)."""

    moment: MomentModel
    safety_level: str


class MomentService:
    """Serves the authenticated student's own Moments."""

    def __init__(
        self, db: Session, safety_engine: SafetyEngine | None = None
    ) -> None:
        self.db = db
        self.moment_repo = MomentRepository(db)
        self.safety_engine = safety_engine or SafetyEngine()

    def create_moment(self, current_user: UserModel, body: str) -> CreatedMoment:
        """Validate, safety-evaluate (transient), persist, and return."""
        cleaned = body.strip() if isinstance(body, str) else ""
        if not cleaned:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Moment must contain text",
            )
        if len(body) > MOMENT_MAX_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Moment is too long",
            )
        # Existing authoritative classifier only. The save proceeds for
        # every level; the level only shapes the client's support UI.
        # (Length is pre-bounded far below the engine limit, so the
        # fail-fast ValueError path is unreachable here.)
        assessment = self.safety_engine.evaluate(body)
        level = _LEVEL_BY_RISK[assessment.level]

        moment = self.moment_repo.create(current_user.id, body)
        self.moment_repo.sweep_expired(_utcnow())
        self.db.commit()
        self.db.refresh(moment)
        return CreatedMoment(moment=moment, safety_level=level)

    def list_moments(
        self, current_user: UserModel, limit: int = 20, offset: int = 0
    ) -> MomentPage:
        """Newest-first owned live Moments (fixed server-side ordering)."""
        self.moment_repo.sweep_expired(_utcnow())
        items = self.moment_repo.list_live(current_user.id, limit=limit, offset=offset)
        total = self.moment_repo.count_live(current_user.id)
        # Read-only path: no commit needed, but committing is harmless and
        # finalizes the sweep in the same request. Keep symmetric commits.
        self.db.commit()
        return MomentPage(items=items, total=total, limit=limit, offset=offset)

    def delete_moment(self, current_user: UserModel, moment_id) -> None:
        """Enter the 5-second recovery window (idempotent)."""
        now = _utcnow()
        self.moment_repo.sweep_expired(now)
        # Finalize the sweep in its own transaction: without this commit,
        # a subsequent 404 exit would roll the sweep back on session close
        # and lapsed tombstones would linger.
        self.db.commit()
        row = self.moment_repo.get_owned_for_update(current_user.id, moment_id)
        if row is None:
            raise NOT_FOUND
        if row.deleted_at is None:
            row.deleted_at = now
            row.delete_expires_at = now + timedelta(seconds=RESTORE_WINDOW_SECONDS)
        elif row.delete_expires_at is not None and row.delete_expires_at <= now:
            # Window lapsed but the sweep had not yet removed this row
            # (e.g. concurrent requests): finish the deletion now.
            self.db.delete(row)
        # Inside-window repeats change nothing: same expiry, same outcome.
        self.db.commit()

    def restore_moment(self, current_user: UserModel, moment_id) -> MomentModel:
        """Restore a Moment inside its recovery window, else 404."""
        now = _utcnow()
        self.moment_repo.sweep_expired(now)
        # Finalize the sweep (see delete_moment) so lapsed tombstones do
        # not survive a 404 exit via session-close rollback.
        self.db.commit()
        row = self.moment_repo.get_owned_for_update(current_user.id, moment_id)
        if row is None:
            raise NOT_FOUND
        if row.deleted_at is None:
            # Live rows have nothing to restore.
            raise NOT_FOUND
        if row.delete_expires_at is None or row.delete_expires_at <= now:
            # Window lapsed (sweep raced us): finish deletion, report gone.
            self.db.delete(row)
            self.db.commit()
            raise NOT_FOUND
        row.deleted_at = None
        row.delete_expires_at = None
        self.db.commit()
        self.db.refresh(row)
        return row
