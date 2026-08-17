"""create screenings table

Revision ID: 552ba90ff6e0
Revises: 13cda6c930c1
Create Date: 2026-08-17 14:48:57.793921

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '552ba90ff6e0'
down_revision: Union[str, None] = '13cda6c930c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'screenings',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('session_id', sa.Uuid(), nullable=False),
        sa.Column('instrument', sa.String(length=16), nullable=False),
        sa.Column('total_score', sa.Integer(), nullable=False),
        sa.Column('severity', sa.String(length=32), nullable=False),
        sa.Column('safety_flag', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('item9_score', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("instrument IN ('PHQ9', 'GAD7')", name='ck_screenings_instrument'),
        sa.CheckConstraint("severity IN ('Minimal', 'Mild', 'Moderate', 'Moderately severe', 'Severe')", name='ck_screenings_severity'),
        sa.CheckConstraint("total_score >= 0 AND total_score <= 27", name='ck_screenings_total_score_range'),
        sa.CheckConstraint("item9_score IS NULL OR (item9_score >= 0 AND item9_score <= 3)", name='ck_screenings_item9_score_range'),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_screenings_session_created', 'screenings', ['session_id', 'created_at'], unique=False)
    op.create_index('ix_screenings_instrument', 'screenings', ['instrument'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_screenings_instrument', table_name='screenings')
    op.drop_index('ix_screenings_session_created', table_name='screenings')
    op.drop_table('screenings')