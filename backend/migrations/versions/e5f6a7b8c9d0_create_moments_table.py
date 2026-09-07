"""create moments table (My Story: user-authored private notes)

Revision ID: e5f6a7b8c9d0
Revises: c4e8a2f7b193
Create Date: 2026-09-07

Moments store only author words + ownership + timestamps. No mood, tags,
summaries, embeddings, or risk data. Deletion-window columns
(`deleted_at`, `delete_expires_at`) implement the 5-second Undo lifecycle;
expired tombstones are removed by the application sweep, never retained.
Additive only: new table, indexes, and check constraint. No data changes.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'c4e8a2f7b193'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'moments',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('body_plaintext', sa.Text(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delete_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('char_length(body_plaintext) BETWEEN 1 AND 500', name='ck_moments_body_length'),
    )
    op.create_index('ix_moments_user_created', 'moments', ['user_id', 'created_at'], unique=False)
    op.create_index(
        'ix_moments_expiry',
        'moments',
        ['delete_expires_at'],
        unique=False,
        postgresql_where=sa.text('delete_expires_at IS NOT NULL'),
    )


def downgrade() -> None:
    op.drop_index('ix_moments_expiry', table_name='moments')
    op.drop_index('ix_moments_user_created', table_name='moments')
    op.drop_table('moments')
