"""Read-only owned-history service (Phase 3B: My Check-ins foundation).

Returns screening summaries belonging to the authenticated user. Ownership
is derived exclusively from the verified `current_user` (JWT.sub via
`get_current_user`); there is no user_id parameter anywhere, so clients
can neither choose nor influence whose history is read. Anonymous rows
(`user_id IS NULL`) are excluded by the repository equality filter.

Read-only: no commits, no mutations, no joins to bookings or safety
tables, no raw answers (which are never stored).
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.screening import Screening as ScreeningModel
from app.models.user import User as UserModel
from app.repositories.screenings import ScreeningRepository


@dataclass(frozen=True)
class ScreeningHistoryPage:
    """One page of owned screening history plus the total for pagination."""

    items: list[ScreeningModel]
    total: int
    limit: int
    offset: int


class UserHistoryService:
    """Serves the authenticated student's own screening history."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.screening_repo = ScreeningRepository(db)

    def get_screening_history(
        self,
        current_user: UserModel,
        instrument: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> ScreeningHistoryPage:
        """Newest-first owned summaries (fixed server-side ordering)."""
        items = self.screening_repo.list_by_user(
            current_user.id, instrument=instrument, limit=limit, offset=offset
        )
        total = self.screening_repo.count_by_user(
            current_user.id, instrument=instrument
        )
        return ScreeningHistoryPage(
            items=items, total=total, limit=limit, offset=offset
        )

    def get_latest_screening(
        self, current_user: UserModel, instrument: str | None = None
    ) -> ScreeningModel | None:
        """Most recent owned screening, optionally per instrument."""
        return self.screening_repo.get_latest_by_user(
            current_user.id, instrument=instrument
        )
