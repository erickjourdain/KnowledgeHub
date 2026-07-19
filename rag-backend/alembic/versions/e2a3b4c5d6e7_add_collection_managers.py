"""add_collection_managers

Revision ID: e2a3b4c5d6e7
Revises: 6cb750cf7e8c
Create Date: 2026-07-19 11:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = '6cb750cf7e8c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create association table collection_managers
    op.create_table(
        'collection_managers',
        sa.Column('collection_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['collection_id'], ['collections.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('collection_id', 'user_id')
    )

    # Populate collection_managers with existing collection creators
    op.execute(
        "INSERT INTO collection_managers (collection_id, user_id) "
        "SELECT id, creator_id FROM collections"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('collection_managers')
