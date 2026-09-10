"""Owned helpful-marks service (My Story → What Helped: current state).

Ownership is derived exclusively from the verified `current_user` (JWT.sub
via `get_current_user`); there is no user_id parameter anywhere, so clients
can neither choose nor influence whose marks are read, written, or removed.

Semantics: one current row per (user_id, tool_id), enforced by the
composite primary key. Marking is an atomic upsert that refreshes
marked_at; removal is a hard delete. No history, counts, scores, or
derived data exist at any layer. No SafetyEngine contact: marking a
fixed-registry tool is a preference action, not user input or a signal.
"""

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.helpful_mark import HelpfulMark as HelpfulMarkModel
from app.models.user import User as UserModel
from app.repositories.helpful_marks import HelpfulMarkRepository


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class HelpfulMarkPage:
    """One page of owned helpful marks plus the total for pagination."""

    items: list[HelpfulMarkModel]
    total: int
    limit: int
    offset: int


@dataclass(frozen=True)
class MarkedResult:
    """Upsert outcome: the current row plus whether this call created it."""

    mark: HelpfulMarkModel
    created: bool


class HelpfulMarkService:
    """Serves the authenticated student's own helpful marks."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.mark_repo = HelpfulMarkRepository(db)

    def mark_tool(
        self, current_user: UserModel, tool_id: str
    ) -> MarkedResult:
        """Mark (or re-mark) a tool in one atomic statement."""
        mark, created = self.mark_repo.upsert(current_user.id, tool_id, _utcnow())
        self.db.commit()
        self.db.refresh(mark)
        return MarkedResult(mark=mark, created=created)

    def list_marks(
        self, current_user: UserModel, limit: int = 20, offset: int = 0
    ) -> HelpfulMarkPage:
        """Newest-first owned marks (fixed server-side ordering)."""
        items = self.mark_repo.list_by_user(current_user.id, limit=limit, offset=offset)
        total = self.mark_repo.count_by_user(current_user.id)
        return HelpfulMarkPage(items=items, total=total, limit=limit, offset=offset)

    def remove_mark(self, current_user: UserModel, tool_id: str) -> None:
        """Hard-delete one owned mark; absent rows are not an error."""
        self.mark_repo.delete_owned(current_user.id, tool_id)
        self.db.commit()
