"""Create job_ingestion table

Revision ID: 2f8a9b0c1d34
Revises: 1a2b3c4d5e67
Create Date: 2026-04-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2f8a9b0c1d34'
down_revision: Union[str, Sequence[str], None] = '1a2b3c4d5e67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'job_ingestion',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('uuid', sa.String(length=36), nullable=True),
        sa.Column('collection_id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('result', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('error', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['collection_id'], ['collections.id'], ),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_job_ingestion_id'), 'job_ingestion', ['id'], unique=False)
    op.create_index(op.f('ix_job_ingestion_uuid'), 'job_ingestion', ['uuid'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_job_ingestion_uuid'), table_name='job_ingestion')
    op.drop_index(op.f('ix_job_ingestion_id'), table_name='job_ingestion')
    op.drop_table('job_ingestion')