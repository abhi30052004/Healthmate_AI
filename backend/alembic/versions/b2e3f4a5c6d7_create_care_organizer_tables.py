"""create care organizer tables

Revision ID: b2e3f4a5c6d7
Revises: a1d2e3f4b5c6
Create Date: 2026-10-28 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b2e3f4a5c6d7'
down_revision: Union[str, Sequence[str], None] = 'a1d2e3f4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to include medication records, appointments, and follow-up tasks."""
    # 1. Medications
    op.create_table(
        'care_medications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('medication_type', sa.String(length=100), nullable=True),
        sa.Column('strength', sa.String(length=100), nullable=True),
        sa.Column('dosage_instructions', sa.Text(), nullable=True),
        sa.Column('route', sa.String(length=100), nullable=True),
        sa.Column('frequency', sa.String(length=150), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('prescriber', sa.String(length=255), nullable=True),
        sa.Column('pharmacy', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('source_document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='active', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_care_medications_user_id'), 'care_medications', ['user_id'], unique=False)
    op.create_index(op.f('ix_care_medications_source_document_id'), 'care_medications', ['source_document_id'], unique=False)

    # 2. Appointments
    op.create_table(
        'care_appointments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('appointment_type', sa.String(length=100), nullable=True),
        sa.Column('provider_name', sa.String(length=255), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('timezone', sa.String(length=100), server_default='UTC', nullable=True),
        sa.Column('status', sa.String(length=50), server_default='scheduled', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('source_document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_care_appointments_user_id'), 'care_appointments', ['user_id'], unique=False)
    op.create_index(op.f('ix_care_appointments_source_document_id'), 'care_appointments', ['source_document_id'], unique=False)

    # 3. Follow-Up Tasks
    op.create_table(
        'care_follow_up_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('due_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='pending', nullable=False),
        sa.Column('priority', sa.String(length=50), server_default='medium', nullable=False),
        sa.Column('source_document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('appointment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('care_appointments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_care_follow_up_tasks_user_id'), 'care_follow_up_tasks', ['user_id'], unique=False)
    op.create_index(op.f('ix_care_follow_up_tasks_source_document_id'), 'care_follow_up_tasks', ['source_document_id'], unique=False)
    op.create_index(op.f('ix_care_follow_up_tasks_appointment_id'), 'care_follow_up_tasks', ['appointment_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_care_follow_up_tasks_appointment_id'), table_name='care_follow_up_tasks')
    op.drop_index(op.f('ix_care_follow_up_tasks_source_document_id'), table_name='care_follow_up_tasks')
    op.drop_index(op.f('ix_care_follow_up_tasks_user_id'), table_name='care_follow_up_tasks')
    op.drop_table('care_follow_up_tasks')

    op.drop_index(op.f('ix_care_appointments_source_document_id'), table_name='care_appointments')
    op.drop_index(op.f('ix_care_appointments_user_id'), table_name='care_appointments')
    op.drop_table('care_appointments')

    op.drop_index(op.f('ix_care_medications_source_document_id'), table_name='care_medications')
    op.drop_index(op.f('ix_care_medications_user_id'), table_name='care_medications')
    op.drop_table('care_medications')
