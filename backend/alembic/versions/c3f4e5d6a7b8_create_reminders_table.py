"""create reminders table

Revision ID: c3f4e5d6a7b8
Revises: b2e3f4a5c6d7
Create Date: 2026-10-28 19:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c3f4e5d6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2e3f4a5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to include reminders table."""
    op.create_table(
        'reminders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), server_default='general', nullable=False),
        sa.Column('due_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('timezone', sa.String(length=100), server_default='UTC', nullable=False),
        sa.Column('frequency', sa.String(length=50), server_default='once', nullable=False),
        sa.Column('medication_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('care_medications.id', ondelete='SET NULL'), nullable=True),
        sa.Column('appointment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('care_appointments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('care_follow_up_tasks.id', ondelete='SET NULL'), nullable=True),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('delivery_status', sa.String(length=50), server_default='pending', nullable=False),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivery_error', sa.Text(), nullable=True),
        sa.Column('send_email', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_acknowledged', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_dismissed', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('dismissed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_reminders_user_id'), 'reminders', ['user_id'], unique=False)
    op.create_index(op.f('ix_reminders_due_at'), 'reminders', ['due_at'], unique=False)
    op.create_index('ix_reminders_user_due', 'reminders', ['user_id', 'due_at'], unique=False)
    op.create_index('ix_reminders_status_due', 'reminders', ['delivery_status', 'is_enabled', 'due_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema to drop reminders table."""
    op.drop_index('ix_reminders_status_due', table_name='reminders')
    op.drop_index('ix_reminders_user_due', table_name='reminders')
    op.drop_index(op.f('ix_reminders_due_at'), table_name='reminders')
    op.drop_index(op.f('ix_reminders_user_id'), table_name='reminders')
    op.drop_table('reminders')
