"""add sign metadata columns

Revision ID: 7a6b6abc5bae
Revises: 787ee3d4b76c
Create Date: 2026-02-17 22:01:29.947535

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a6b6abc5bae'
down_revision: Union[str, Sequence[str], None] = '787ee3d4b76c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "sign_dictionary",
        sa.Column("asset_path", sa.String(), nullable=True)
    )
    op.add_column(
        "sign_dictionary",
        sa.Column(
            "is_fallback",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false")
        )
    )
    op.add_column(
        "sign_dictionary",
        sa.Column(
            "source",
            sa.String(),
            nullable=False,
            server_default="filesystem"
        )
    )
    op.add_column(
        "sign_dictionary",
        sa.Column("metadata", sa.JSON(), nullable=True, server_default=sa.text("'{}'::jsonb"))
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("sign_dictionary", "metadata")
    op.drop_column("sign_dictionary", "source")
    op.drop_column("sign_dictionary", "is_fallback")
    op.drop_column("sign_dictionary", "asset_path")
