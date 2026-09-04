"""phase 3b screening history index (owned timeline reads)

Revision ID: c4e8a2f7b193
Revises: 9f2c4a1b7d3e
Create Date: 2026-09-05

Phase 3B: composite index for per-user screening history reads
(`WHERE user_id = ? ORDER BY created_at DESC`; PostgreSQL scans the
b-tree backward for DESC ordering, so ascending columns suffice).
Additive only: no table changes, no data changes, no backfill.
Anonymous rows (`user_id IS NULL`) are unaffected.
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c4e8a2f7b193'
down_revision: Union[str, None] = '9f2c4a1b7d3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        'ix_screenings_user_created',
        'screenings',
        ['user_id', 'created_at'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_screenings_user_created', table_name='screenings')
