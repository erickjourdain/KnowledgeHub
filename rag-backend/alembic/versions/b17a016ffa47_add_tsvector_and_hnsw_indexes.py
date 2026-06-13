"""add_tsvector_and_hnsw_indexes

Revision ID: b17a016ffa47
Revises: 3f8c9d0e1a56
Create Date: 2026-06-12 07:35:46.934443

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b17a016ffa47'
down_revision: Union[str, Sequence[str], None] = '3f8c9d0e1a56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add chunk_text_search column as computed tsvector
    op.add_column(
        'document_chunks',
        sa.Column(
            'chunk_text_search',
            postgresql.TSVECTOR(),
            sa.Computed("to_tsvector('french', chunk_text)", persisted=True),
            nullable=True
        )
    )
    
    # Create GIN index on chunk_text_search
    op.create_index(
        'ix_document_chunks_chunk_text_search',
        'document_chunks',
        ['chunk_text_search'],
        unique=False,
        postgresql_using='gin'
    )
    
    # Create HNSW index on embedding
    op.create_index(
        'ix_document_chunks_embedding_hnsw',
        'document_chunks',
        ['embedding'],
        unique=False,
        postgresql_using='hnsw',
        postgresql_ops={'embedding': 'vector_cosine_ops'}
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_document_chunks_embedding_hnsw', table_name='document_chunks')
    op.drop_index('ix_document_chunks_chunk_text_search', table_name='document_chunks')
    op.drop_column('document_chunks', 'chunk_text_search')
