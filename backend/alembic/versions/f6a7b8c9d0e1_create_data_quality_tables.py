"""create duplicate candidates and data quality audit logs tables
Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-10-29 12:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to include duplicate_candidates, data_quality_audit_logs, and archiving columns."""
    # 1. Add archiving fields to documents
    op.add_column('documents', sa.Column('is_archived', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('documents', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('documents', sa.Column('duplicate_of_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True))
    op.create_index(op.f('ix_documents_is_archived'), 'documents', ['is_archived'], unique=False)

    # 2. Add archiving fields to document_observations
    op.add_column('document_observations', sa.Column('is_archived', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('document_observations', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('document_observations', sa.Column('duplicate_of_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('document_observations.id', ondelete='SET NULL'), nullable=True))
    op.create_index(op.f('ix_document_observations_is_archived'), 'document_observations', ['is_archived'], unique=False)

    # 3. Create duplicate_candidates table
    op.create_table(
        'duplicate_candidates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('family_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('record_type', sa.String(length=30), nullable=False),
        sa.Column('primary_record_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('secondary_record_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('match_reasons', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(length=30), server_default='pending', nullable=False),
        sa.Column('retained_record_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('archived_record_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('resolution_action', sa.String(length=50), nullable=True),
        sa.Column('decision_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('user_id', 'record_type', 'primary_record_id', 'secondary_record_id', name='uq_dup_pair'),
    )
    op.create_index(op.f('ix_duplicate_candidates_user_id'), 'duplicate_candidates', ['user_id'], unique=False)
    op.create_index(op.f('ix_duplicate_candidates_profile_id'), 'duplicate_candidates', ['profile_id'], unique=False)
    op.create_index(op.f('ix_duplicate_candidates_record_type'), 'duplicate_candidates', ['record_type'], unique=False)
    op.create_index(op.f('ix_duplicate_candidates_status'), 'duplicate_candidates', ['status'], unique=False)
    op.create_index(op.f('ix_duplicate_candidates_primary_record_id'), 'duplicate_candidates', ['primary_record_id'], unique=False)
    op.create_index(op.f('ix_duplicate_candidates_secondary_record_id'), 'duplicate_candidates', ['secondary_record_id'], unique=False)
    op.create_index('ix_dup_user_profile_type_status', 'duplicate_candidates', ['user_id', 'profile_id', 'record_type', 'status'], unique=False)

    # 4. Create data_quality_audit_logs table
    op.create_table(
        'data_quality_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('duplicate_candidates.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('record_type', sa.String(length=30), nullable=False),
        sa.Column('retained_record_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('archived_record_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('details', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_data_quality_audit_logs_user_id'), 'data_quality_audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_data_quality_audit_logs_candidate_id'), 'data_quality_audit_logs', ['candidate_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema to remove data quality tables and archiving columns."""
    op.drop_index(op.f('ix_data_quality_audit_logs_candidate_id'), table_name='data_quality_audit_logs')
    op.drop_index(op.f('ix_data_quality_audit_logs_user_id'), table_name='data_quality_audit_logs')
    op.drop_table('data_quality_audit_logs')

    op.drop_index('ix_dup_user_profile_type_status', table_name='duplicate_candidates')
    op.drop_index(op.f('ix_duplicate_candidates_secondary_record_id'), table_name='duplicate_candidates')
    op.drop_index(op.f('ix_duplicate_candidates_primary_record_id'), table_name='duplicate_candidates')
    op.drop_index(op.f('ix_duplicate_candidates_status'), table_name='duplicate_candidates')
    op.drop_index(op.f('ix_duplicate_candidates_record_type'), table_name='duplicate_candidates')
    op.drop_index(op.f('ix_duplicate_candidates_profile_id'), table_name='duplicate_candidates')
    op.drop_index(op.f('ix_duplicate_candidates_user_id'), table_name='duplicate_candidates')
    op.drop_table('duplicate_candidates')

    op.drop_index(op.f('ix_document_observations_is_archived'), table_name='document_observations')
    op.drop_column('document_observations', 'duplicate_of_id')
    op.drop_column('document_observations', 'archived_at')
    op.drop_column('document_observations', 'is_archived')

    op.drop_index(op.f('ix_documents_is_archived'), table_name='documents')
    op.drop_column('documents', 'duplicate_of_id')
    op.drop_column('documents', 'archived_at')
    op.drop_column('documents', 'is_archived')
