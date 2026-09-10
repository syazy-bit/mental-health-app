"""create helpful_marks table (My Story: What Helped current state)

Revision ID: f7a8b9c0d1e2
Revises: e5f6a7b8c9d0
Create Date: 2026-09-09

helpful_marks stores only current saved state: one row per
(user_id, tool_id) with the latest mark time. No event history, counts,
scores, or derived data — effectiveness displays are unrepresentable.
Re-marking overwrites marked_at; removal hard-deletes the row. Account
removal cascades. Additive only: new table, index, and check constraint.
No data changes.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Keep in sync with app.tools.TOOL_IDS. Adding a tool requires a small
# migration altering ck_helpful_marks_tool; removing an ID from the
# registry does not invalidate existing rows.
TOOL_ID_CHECK = (
    "tool_id IN ('box_breathing', 'grounding_hunt', 'sensory_grounding', 'study_reset')"
)


def upgrade() -> None:
    op.create_table(
        'helpful_marks',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tool_id', sa.String(length=64), nullable=False),
        sa.Column('marked_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'tool_id'),
        sa.CheckConstraint(TOOL_ID_CHECK, name='ck_helpful_marks_tool'),
    )
    # No separate user_id index: PRIMARY KEY (user_id, tool_id) already
    # indexes the user_id prefix, the only lookup shape (verified EXPLAIN:
    # index scan on the pkey plus trivial sort over registry-bounded rows).


def downgrade() -> None:
    op.drop_table('helpful_marks')
