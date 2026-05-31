"""Add modele column to collections

Revision ID: 1a2b3c4d5e67
Revises: 9d5e6f8a1b24
Create Date: 2026-04-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '1a2b3c4d5e67'
down_revision: Union[str, Sequence[str], None] = '9d5e6f8a1b24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('collections', sa.Column('modele', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('collections', 'modele')