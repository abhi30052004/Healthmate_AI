"""create doctor sharing sessions and audit logs tables
Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-10-29 11:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to include doctor_sharing_sessions and doctor_sharing_audit_logs."""
    op.create_table(
        'doctor_sharing_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('family_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('doctor_name', sa.String(length=255), nullable=False),
        sa.Column('doctor_email', sa.String(length=255), nullable=True),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='active', nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_accessed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('access_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('shared_resources', sa.JSON(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_doctor_sharing_sessions_owner_id'), 'doctor_sharing_sessions', ['owner_id'], unique=False)
    op.create_index(op.f('ix_doctor_sharing_sessions_profile_id'), 'doctor_sharing_sessions', ['profile_id'], unique=False)
    op.create_index(op.f('ix_doctor_sharing_sessions_token_hash'), 'doctor_sharing_sessions', ['token_hash'], unique=True)
    op.create_index(op.f('ix_doctor_sharing_sessions_expires_at'), 'doctor_sharing_sessions', ['expires_at'], unique=False)
    op.create_index('ix_doctor_sharing_owner_status', 'doctor_sharing_sessions', ['owner_id', 'status'], unique=False)
    op.create_index('ix_doctor_sharing_profile_status', 'doctor_sharing_sessions', ['profile_id', 'status'], unique=False)

    op.create_table(
        'doctor_sharing_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('doctor_sharing_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('resource_id', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('details', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_doctor_sharing_audit_logs_session_id'), 'doctor_sharing_audit_logs', ['session_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema to remove doctor sharing tables."""
    op.drop_index(op.f('ix_doctor_sharing_audit_logs_session_id'), table_name='doctor_sharing_audit_logs')
    op.drop_table('doctor_sharing_audit_logs')

    op.drop_index('ix_doctor_sharing_profile_status', table_name='doctor_sharing_sessions')
    op.drop_index('ix_doctor_sharing_owner_status', table_name='doctor_sharing_sessions')
    op.drop_index(op.f('ix_doctor_sharing_sessions_expires_at'), table_name='doctor_sharing_sessions')
    op.drop_index(op.f('ix_doctor_sharing_sessions_token_hash'), table_name='doctor_sharing_sessions')
    op.drop_index(op.f('ix_doctor_sharing_sessions_profile_id'), table_name='doctor_sharing_sessions')
    op.drop_index(op.f('ix_doctor_sharing_sessions_owner_id'), table_name='doctor_sharing_sessions')
    op.drop_table('doctor_sharing_sessions')
