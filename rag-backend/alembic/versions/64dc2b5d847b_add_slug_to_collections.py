"""add_slug_to_collections

Revision ID: 64dc2b5d847b
Revises: 21a89eea47dc
Create Date: 2026-07-19 11:41:08.113412

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '64dc2b5d847b'
down_revision: Union[str, Sequence[str], None] = '21a89eea47dc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add column as nullable
    op.add_column('collections', sa.Column('slug', sa.String(length=100), nullable=True))
    
    # 2. Populate column
    from app.utils.slug import slugify
    connection = op.get_bind()
    metadata = sa.MetaData()
    collections_table = sa.Table(
        'collections',
        metadata,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String),
        sa.Column('slug', sa.String)
    )
    
    results = connection.execute(sa.select(collections_table.c.id, collections_table.c.name)).fetchall()
    for row in results:
        col_id, name = row
        slug = slugify(name)
        connection.execute(
            collections_table.update().where(collections_table.c.id == col_id).values(slug=slug)
        )
        
    # 3. Alter to nullable=False, unique=True, index=True
    op.alter_column('collections', 'slug', existing_type=sa.String(length=100), nullable=False)
    op.create_index(op.f('ix_collections_slug'), 'collections', ['slug'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_collections_slug'), table_name='collections')
    op.drop_column('collections', 'slug')
