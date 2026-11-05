"""add ocr fields and observations table

Revision ID: 7b83d1c5a940
Revises: 4a760f5e93ae
Create Date: 2026-10-28 11:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b83d1c5a940'
down_revision: Union[str, Sequence[str], None] = '4a760f5e93ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('documents', sa.Column('ocr_applied', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('documents', sa.Column('patient_name', sa.String(length=255), nullable=True))
    op.add_column('documents', sa.Column('document_date', sa.String(length=50), nullable=True))
    op.add_column('documents', sa.Column('lab_name', sa.String(length=255), nullable=True))

    op.create_table(
        'document_observations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('document_id', sa.UUID(), nullable=False),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.Column('test_name', sa.String(length=255), nullable=False),
        sa.Column('value', sa.String(length=100), nullable=False),
        sa.Column('numeric_value', sa.Float(), nullable=True),
        sa.Column('unit', sa.String(length=50), nullable=True),
        sa.Column('reference_range', sa.String(length=100), nullable=True),
        sa.Column('flag', sa.String(length=20), nullable=True),
        sa.Column('source_page', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('source_text', sa.Text(), nullable=False),
        sa.Column('is_low_confidence', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_reviewed', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_document_observations_document_id'), 'document_observations', ['document_id'], unique=False)
    op.create_index(op.f('ix_document_observations_owner_id'), 'document_observations', ['owner_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_document_observations_owner_id'), table_name='document_observations')
    op.drop_index(op.f('ix_document_observations_document_id'), table_name='document_observations')
    op.drop_table('document_observations')
    op.drop_column('documents', 'lab_name')
    op.drop_column('documents', 'document_date')
    op.drop_column('documents', 'patient_name')
    op.drop_column('documents', 'ocr_applied')
