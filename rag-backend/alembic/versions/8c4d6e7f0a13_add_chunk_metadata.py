"""Add chunk metadata columns to document_chunks

Revision ID: 8c4d6e7f0a13
Revises: 7a3b5c8d9e12
Create Date: 2026-04-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8c4d6e7f0a13'
down_revision: Union[str, Sequence[str], None] = '7a3b5c8d9e12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Ajouter les colonnes de métadonnées pour la structure du document
    op.add_column('document_chunks', sa.Column('chapter', sa.String(length=512), nullable=True))
    op.add_column('document_chunks', sa.Column('section', sa.String(length=512), nullable=True))
    op.add_column('document_chunks', sa.Column('subsection', sa.String(length=512), nullable=True))
    op.add_column('document_chunks', sa.Column('page', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('document_chunks', 'page')
    op.drop_column('document_chunks', 'subsection')
    op.drop_column('document_chunks', 'section')
    op.drop_column('document_chunks', 'chapter')