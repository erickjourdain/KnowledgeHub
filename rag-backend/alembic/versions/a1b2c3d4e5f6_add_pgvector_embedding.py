"""add_pgvector_embedding

Revision ID: a1b2c3d4e5f6
Revises: 451d22a2514c
Create Date: 2026-04-12 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '451d22a2514c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to use pgvector for embeddings."""
    # Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')

    # Convert embedding column from ARRAY to VECTOR(768)
    # PostgreSQL doesn't support direct casting from array to vector,
    # so we use a two-step approach with a temporary text column

    # Step 1: Add temporary vector column
    op.execute('''
        ALTER TABLE document_chunks
        ADD COLUMN embedding_new vector(768)
    ''')

    # Step 2: Copy data - convert array to vector by casting through text
    # The original array is stored as ARRAY(FLOAT), we cast to text then to vector
    op.execute('''
        UPDATE document_chunks
        SET embedding_new = embedding::text::vector
        WHERE embedding IS NOT NULL
    ''')

    # Step 3: Drop old column
    op.drop_column('document_chunks', 'embedding')

    # Step 4: Rename new column to original name
    op.execute('''
        ALTER TABLE document_chunks
        RENAME COLUMN embedding_new TO embedding
    ''')


def downgrade() -> None:
    """Downgrade schema back to array type."""
    # Convert back to array (ARRAY(FLOAT))

    # Step 1: Add temporary array column
    op.execute('''
        ALTER TABLE document_chunks
        ADD COLUMN embedding_old FLOAT[]
    ''')

    # Step 2: Copy data back
    op.execute('''
        UPDATE document_chunks
        SET embedding_old = embedding::float[]
        WHERE embedding IS NOT NULL
    ''')

    # Step 3: Drop vector column
    op.drop_column('document_chunks', 'embedding')

    # Step 4: Rename back
    op.execute('''
        ALTER TABLE document_chunks
        RENAME COLUMN embedding_old TO embedding
    ''')