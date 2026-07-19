"""add_slug_to_users

Revision ID: fb25709752a4
Revises: 64dc2b5d847b
Create Date: 2026-07-19 11:53:58.232569

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fb25709752a4'
down_revision: Union[str, Sequence[str], None] = '64dc2b5d847b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add column as nullable
    op.add_column('users', sa.Column('slug', sa.String(length=100), nullable=True))
    
    # 2. Populate column
    from app.utils.slug import slugify
    connection = op.get_bind()
    metadata = sa.MetaData()
    users_table = sa.Table(
        'users',
        metadata,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('username', sa.String),
        sa.Column('slug', sa.String)
    )
    
    results = connection.execute(sa.select(users_table.c.id, users_table.c.username)).fetchall()
    for row in results:
        user_id, username = row
        slug = slugify(username)
        connection.execute(
            users_table.update().where(users_table.c.id == user_id).values(slug=slug)
        )
        
    # 3. Alter to nullable=False, unique=True, index=True
    op.alter_column('users', 'slug', existing_type=sa.String(length=100), nullable=False)
    op.create_index(op.f('ix_users_slug'), 'users', ['slug'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_users_slug'), table_name='users')
    op.drop_column('users', 'slug')
