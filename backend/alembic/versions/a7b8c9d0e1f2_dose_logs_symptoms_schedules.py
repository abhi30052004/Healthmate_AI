"""medication schedules, dose logs, symptom diary, profile conditions

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-11-05 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Additive columns only: existing rows stay valid (NULL = as-needed / every day).
    op.add_column('care_medications', sa.Column('schedule_times', sa.JSON(), nullable=True))
    op.add_column('care_medications', sa.Column('schedule_days', sa.JSON(), nullable=True))
    op.add_column('family_profiles', sa.Column('conditions_summary', sa.Text(), nullable=True))

    op.create_table(
        'care_dose_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('family_profiles.id', ondelete='SET NULL'), nullable=True),
        sa.Column('medication_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('care_medications.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scheduled_date', sa.Date(), nullable=False),
        sa.Column('scheduled_time', sa.String(length=5), nullable=False),
        sa.Column('outcome', sa.String(length=20), nullable=False),
        sa.Column('snoozed_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('logged_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('medication_id', 'scheduled_date', 'scheduled_time', name='uq_dose_slot'),
    )
    op.create_index(op.f('ix_care_dose_logs_user_id'), 'care_dose_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_care_dose_logs_profile_id'), 'care_dose_logs', ['profile_id'], unique=False)
    op.create_index(op.f('ix_care_dose_logs_medication_id'), 'care_dose_logs', ['medication_id'], unique=False)
    op.create_index('ix_dose_logs_user_date', 'care_dose_logs', ['user_id', 'scheduled_date'], unique=False)

    op.create_table(
        'symptom_entries',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('family_profiles.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False, server_default='mild'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('include_in_visit_pack', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_symptom_entries_user_id'), 'symptom_entries', ['user_id'], unique=False)
    op.create_index(op.f('ix_symptom_entries_profile_id'), 'symptom_entries', ['profile_id'], unique=False)
    op.create_index('ix_symptoms_user_profile_time', 'symptom_entries', ['user_id', 'profile_id', 'occurred_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_symptoms_user_profile_time', table_name='symptom_entries')
    op.drop_index(op.f('ix_symptom_entries_profile_id'), table_name='symptom_entries')
    op.drop_index(op.f('ix_symptom_entries_user_id'), table_name='symptom_entries')
    op.drop_table('symptom_entries')

    op.drop_index('ix_dose_logs_user_date', table_name='care_dose_logs')
    op.drop_index(op.f('ix_care_dose_logs_medication_id'), table_name='care_dose_logs')
    op.drop_index(op.f('ix_care_dose_logs_profile_id'), table_name='care_dose_logs')
    op.drop_index(op.f('ix_care_dose_logs_user_id'), table_name='care_dose_logs')
    op.drop_table('care_dose_logs')

    op.drop_column('family_profiles', 'conditions_summary')
    op.drop_column('care_medications', 'schedule_days')
    op.drop_column('care_medications', 'schedule_times')
