"""add normalized fields to observations

Revision ID: 8c91a4f3b720
Revises: 7b83d1c5a940
Create Date: 2026-10-28 12:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c91a4f3b720'
down_revision: Union[str, Sequence[str], None] = '7b83d1c5a940'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('document_observations', sa.Column('normalized_test_name', sa.String(length=255), nullable=True))
    op.add_column('document_observations', sa.Column('category', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_document_observations_normalized_test_name'), 'document_observations', ['normalized_test_name'], unique=False)
    op.create_index(op.f('ix_document_observations_category'), 'document_observations', ['category'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_document_observations_category'), table_name='document_observations')
    op.drop_index(op.f('ix_document_observations_normalized_test_name'), table_name='document_observations')
    op.drop_column('document_observations', 'category')
    op.drop_column('document_observations', 'normalized_test_name')
