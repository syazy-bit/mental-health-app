"""create counselors slots bookings tables

Revision ID: 6a03dfac38c3
Revises: 7f8a9b2c1d4e
Create Date: 2026-08-19 17:11:54.494956

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6a03dfac38c3'
down_revision: Union[str, None] = '7f8a9b2c1d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'counselors',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('title', sa.String(length=120), nullable=False),
        sa.Column('areas_of_support', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('bio', sa.String(length=2000), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'counselor_slots',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('counselor_id', sa.Uuid(), nullable=False),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("ends_at - starts_at <= interval '4 hours'", name='ck_counselor_slots_max_duration'),
        sa.CheckConstraint('ends_at > starts_at', name='ck_counselor_slots_end_after_start'),
        sa.ForeignKeyConstraint(['counselor_id'], ['counselors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_counselor_slots_counselor_starts', 'counselor_slots', ['counselor_id', 'starts_at'], unique=False)
    op.create_index('ix_counselor_slots_starts_at', 'counselor_slots', ['starts_at'], unique=False)
    op.create_table(
        'bookings',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('slot_id', sa.Uuid(), nullable=False),
        sa.Column('session_id', sa.Uuid(), nullable=True),
        sa.Column('confirmation_code', sa.String(length=8), nullable=False),
        sa.Column('student_name', sa.String(length=120), nullable=True),
        sa.Column('contact_email', sa.String(length=254), nullable=True),
        sa.Column('contact_phone', sa.String(length=32), nullable=True),
        sa.Column('reason', sa.String(length=2000), nullable=True),
        sa.Column('status', sa.String(length=16), server_default='PENDING', nullable=False),
        sa.Column('admin_notes', sa.String(length=2000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')", name='ck_bookings_status'),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['slot_id'], ['counselor_slots.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('confirmation_code'),
    )
    op.create_index('ix_bookings_session_id', 'bookings', ['session_id'], unique=False)
    op.create_index('ix_bookings_status', 'bookings', ['status'], unique=False)
    op.create_index(
        'uq_bookings_active_slot',
        'bookings',
        ['slot_id'],
        unique=True,
        postgresql_where=sa.text("status IN ('PENDING','CONFIRMED')"),
    )


def downgrade() -> None:
    op.drop_index('uq_bookings_active_slot', table_name='bookings', postgresql_where=sa.text("status IN ('PENDING','CONFIRMED')"))
    op.drop_index('ix_bookings_status', table_name='bookings')
    op.drop_index('ix_bookings_session_id', table_name='bookings')
    op.drop_table('bookings')
    op.drop_index('ix_counselor_slots_starts_at', table_name='counselor_slots')
    op.drop_index('ix_counselor_slots_counselor_starts', table_name='counselor_slots')
    op.drop_table('counselor_slots')
    op.drop_table('counselors')