"""create_job_query_kb

Revision ID: 7f9a8b7c1d45
Revises: 6bd270638a43
Create Date: 2026-04-13 18:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7f9a8b7c1d45'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'job_query_kb',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('uuid', sa.String(length=36), nullable=False),
        sa.Column('collection_id', sa.Integer(), nullable=False),
        sa.Column('query', sa.String(), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('result', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('error', sa.String(), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(), nullable=False),
        sa.ForeignKeyConstraint(['collection_id'], ['collections.id'], ),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('uuid')
    )
    op.create_index('ix_job_query_kb_id', 'job_query_kb', ['id'])
    op.create_index('ix_job_query_kb_uuid', 'job_query_kb', ['uuid'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_job_query_kb_uuid', table_name='job_query_kb')
    op.drop_index('ix_job_query_kb_id', table_name='job_query_kb')
    op.drop_table('job_query_kb')