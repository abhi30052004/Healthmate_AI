"""create medical chat tables

Revision ID: a1d2e3f4b5c6
Revises: 8c91a4f3b720
Create Date: 2026-10-28 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1d2e3f4b5c6'
down_revision: Union[str, Sequence[str], None] = '8c91a4f3b720'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to include medical chat conversations and messages."""
    op.create_table(
        'medical_chat_conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_medical_chat_conversations_owner_id'), 'medical_chat_conversations', ['owner_id'], unique=False)

    op.create_table(
        'medical_chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('medical_chat_conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('citations', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_medical_chat_messages_conversation_id'), 'medical_chat_messages', ['conversation_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_medical_chat_messages_conversation_id'), table_name='medical_chat_messages')
    op.drop_table('medical_chat_messages')
    op.drop_index(op.f('ix_medical_chat_conversations_owner_id'), table_name='medical_chat_conversations')
    op.drop_table('medical_chat_conversations')
