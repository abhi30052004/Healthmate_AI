"""create family profiles table and associate health records
Revision ID: d4e5f6a7b8c9
Revises: c3f4e5d6a7b8
Create Date: 2026-10-29 10:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3f4e5d6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to include family_profiles table and profile_id foreign keys."""
    op.create_table(
        'family_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('relationship', sa.String(length=50), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('gender', sa.String(length=50), nullable=True),
        sa.Column('blood_type', sa.String(length=20), nullable=True),
        sa.Column('emergency_contact_name', sa.String(length=255), nullable=True),
        sa.Column('emergency_contact_phone', sa.String(length=50), nullable=True),
        sa.Column('allergies_summary', sa.Text(), nullable=True),
        sa.Column('avatar_color', sa.String(length=50), nullable=True),
        sa.Column('is_primary', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_dependent', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('consent_status', sa.String(length=50), server_default='authorized', nullable=False),
        sa.Column('consent_granted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('consent_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_family_profiles_owner_id'), 'family_profiles', ['owner_id'], unique=False)
    op.create_index('ix_family_profiles_owner_active', 'family_profiles', ['owner_id', 'is_active'], unique=False)

    # Add profile_id to documents
    op.add_column('documents', sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('family_profiles.id', ondelete='SET NULL'), nullable=True))
    op.create_index(op.f('ix_documents_profile_id'), 'documents', ['profile_id'], unique=False)

    # Add profile_id to care_medications
    op.add_column('care_medications', sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('family_profiles.id', ondelete='SET NULL'), nullable=True))
    op.create_index(op.f('ix_care_medications_profile_id'), 'care_medications', ['profile_id'], unique=False)

    # Add profile_id to care_appointments
    op.add_column('care_appointments', sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('family_profiles.id', ondelete='SET NULL'), nullable=True))
    op.create_index(op.f('ix_care_appointments_profile_id'), 'care_appointments', ['profile_id'], unique=False)

    # Add profile_id to care_follow_up_tasks
    op.add_column('care_follow_up_tasks', sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('family_profiles.id', ondelete='SET NULL'), nullable=True))
    op.create_index(op.f('ix_care_follow_up_tasks_profile_id'), 'care_follow_up_tasks', ['profile_id'], unique=False)

    # Add profile_id to reminders
    op.add_column('reminders', sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('family_profiles.id', ondelete='SET NULL'), nullable=True))
    op.create_index(op.f('ix_reminders_profile_id'), 'reminders', ['profile_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema to remove family_profiles and foreign key references."""
    op.drop_index(op.f('ix_reminders_profile_id'), table_name='reminders')
    op.drop_column('reminders', 'profile_id')

    op.drop_index(op.f('ix_care_follow_up_tasks_profile_id'), table_name='care_follow_up_tasks')
    op.drop_column('care_follow_up_tasks', 'profile_id')

    op.drop_index(op.f('ix_care_appointments_profile_id'), table_name='care_appointments')
    op.drop_column('care_appointments', 'profile_id')

    op.drop_index(op.f('ix_care_medications_profile_id'), table_name='care_medications')
    op.drop_column('care_medications', 'profile_id')

    op.drop_index(op.f('ix_documents_profile_id'), table_name='documents')
    op.drop_column('documents', 'profile_id')

    op.drop_index('ix_family_profiles_owner_active', table_name='family_profiles')
    op.drop_index(op.f('ix_family_profiles_owner_id'), table_name='family_profiles')
    op.drop_table('family_profiles')
