"""uppercase_collection_names

Revision ID: 21a89eea47dc
Revises: e2a3b4c5d6e7
Create Date: 2026-07-19 11:33:21.849479

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '21a89eea47dc'
down_revision: Union[str, Sequence[str], None] = 'e2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("UPDATE collections SET name = UPPER(name)")


def downgrade() -> None:
    """Downgrade schema."""
    pass
