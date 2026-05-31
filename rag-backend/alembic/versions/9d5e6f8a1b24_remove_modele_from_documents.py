"""Remove modele column from documents

Revision ID: 9d5e6f8a1b24
Revises: 8c4d6e7f0a13
Create Date: 2026-04-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '9d5e6f8a1b24'
down_revision: Union[str, Sequence[str], None] = '8c4d6e7f0a13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('documents', 'modele')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('documents', sa.Column('modele', sa.String(length=100), nullable=True))