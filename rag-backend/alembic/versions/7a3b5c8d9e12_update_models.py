"""Update models: documents collection_id FK, remove collection_documents table

Revision ID: 7a3b5c8d9e12
Revises: 39fe29c6b2ab
Create Date: 2026-04-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7a3b5c8d9e12'
down_revision: Union[str, Sequence[str], None] = '39fe29c6b2ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Ajouter collection_id FK à documents (si pas déjà existant)
    # La colonne existe peut-être déjà, on vérifie
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'documents' AND column_name = 'collection_id'"
    ))
    if not result.fetchone():
        op.add_column('documents', sa.Column('collection_id', sa.Integer(), nullable=False, server_default='1'))

    # 2. Supprimer la table collection_documents (many-to-many)
    op.drop_table('collection_documents')

    # 3. Mettre à jour document_chunks: supprimer chunk_index et collection_id
    op.drop_column('document_chunks', 'chunk_index')
    op.drop_column('document_chunks', 'collection_id')

    # 4. Supprimer les colonnes non utilisées de documents (content, source)
    # Vérifier si elles existent
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'documents' AND column_name = 'content'"
    ))
    if result.fetchone():
        op.drop_column('documents', 'content')

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'documents' AND column_name = 'source'"
    ))
    if result.fetchone():
        op.drop_column('documents', 'source')


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Recréer collection_documents
    op.create_table('collection_documents',
        sa.Column('collection_id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['collection_id'], ['collections.id'], ),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.PrimaryKeyConstraint('collection_id', 'document_id')
    )

    # 2. Ajouter chunk_index et collection_id à document_chunks
    op.add_column('document_chunks', sa.Column('chunk_index', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('document_chunks', sa.Column('collection_id', sa.Integer(), nullable=True))

    # 3. Recréer content et source dans documents
    op.add_column('documents', sa.Column('content', sa.Text(), nullable=False, server_default=''))
    op.add_column('documents', sa.Column('source', sa.String(length=255), nullable=True))

    # 4. Supprimer collection_id de documents (optionnel -gardé pour compatibilité)
    # op.drop_column('documents', 'collection_id')