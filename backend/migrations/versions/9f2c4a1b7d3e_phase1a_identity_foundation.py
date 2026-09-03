"""phase 1a student account foundation (users, refresh tokens, ownership)

Revision ID: 9f2c4a1b7d3e
Revises: 6a03dfac38c3
Create Date: 2026-09-03

Phase 1A: minimum database foundation for optional student accounts.
- Creates `users` (email credential + password hash + optional display name,
  soft-delete timestamp). No other student PII.
- Creates `refresh_tokens` (stores only the token HASH, never the raw token).
- Adds nullable `user_id` (ON DELETE SET NULL) to `sessions`, `screenings`,
  and `bookings` so existing anonymous rows stay valid and anonymous.

Safe on existing databases: additive only, no data deletion, all new columns
nullable. Email case-insensitivity is enforced by a functional unique index
on `lower(email)` (no citext extension required).
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f2c4a1b7d3e'
down_revision: Union[str, None] = '6a03dfac38c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('email', sa.String(length=254), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=80), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    # Case-insensitive email uniqueness without the citext extension.
    op.create_index(
        'uq_users_email_lower',
        'users',
        [sa.text('lower(email)')],
        unique=True,
    )
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('token_hash', sa.String(length=128), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('replaced_by', sa.Uuid(), nullable=True),
        sa.Column('created_ip', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_agent', sa.String(length=512), nullable=True),
        sa.ForeignKeyConstraint(['replaced_by'], ['refresh_tokens.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash'),
    )
    op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'], unique=False)

    # Ownership columns: all nullable so anonymous rows remain valid.
    op.add_column('sessions', sa.Column('user_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(
        'fk_sessions_user_id_users',
        'sessions',
        'users',
        ['user_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_sessions_user_id', 'sessions', ['user_id'], unique=False)

    op.add_column('screenings', sa.Column('user_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(
        'fk_screenings_user_id_users',
        'screenings',
        'users',
        ['user_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_screenings_user_id', 'screenings', ['user_id'], unique=False)

    op.add_column('bookings', sa.Column('user_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(
        'fk_bookings_user_id_users',
        'bookings',
        'users',
        ['user_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_bookings_user_id', 'bookings', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_bookings_user_id', table_name='bookings')
    op.drop_constraint('fk_bookings_user_id_users', 'bookings', type_='foreignkey')
    op.drop_column('bookings', 'user_id')

    op.drop_index('ix_screenings_user_id', table_name='screenings')
    op.drop_constraint('fk_screenings_user_id_users', 'screenings', type_='foreignkey')
    op.drop_column('screenings', 'user_id')

    op.drop_index('ix_sessions_user_id', table_name='sessions')
    op.drop_constraint('fk_sessions_user_id_users', 'sessions', type_='foreignkey')
    op.drop_column('sessions', 'user_id')

    op.drop_index('ix_refresh_tokens_user_id', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')

    op.drop_index('uq_users_email_lower', table_name='users')
    op.drop_table('users')
