"""
Fix database schema by adding missing columns to users table
This script uses the same database connection as the application
"""
import asyncio
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine, Base
from app.db_models import User
from sqlalchemy import text, inspect


async def check_and_fix_schema():
    """Check database schema and add missing columns"""
    
    async with engine.begin() as conn:
        # Check if users table exists
        result = await conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        )
        table_exists = result.fetchone() is not None
        
        if not table_exists:
            print("Users table does not exist. Creating all tables...")
            await conn.run_sync(Base.metadata.create_all)
            print("[SUCCESS] All tables created with correct schema!")
            return
        
        # Get existing columns
        result = await conn.execute(text("PRAGMA table_info(users)"))
        columns = {row[1]: row for row in result.fetchall()}
        
        print(f"Existing columns in users table: {list(columns.keys())}")
        
        # Check which columns are missing
        missing_columns = []
        if "first_name" not in columns:
            missing_columns.append("first_name")
        if "last_name" not in columns:
            missing_columns.append("last_name")
        
        if not missing_columns:
            print("[OK] All required columns already exist!")
            return
        
        # Add missing columns
        for col_name in missing_columns:
            print(f"Adding {col_name} column...")
            await conn.execute(
                text(f"ALTER TABLE users ADD COLUMN {col_name} VARCHAR")
            )
            print(f"[OK] Added {col_name} column")
        
        print("\n[SUCCESS] Database schema migration completed!")
        
        # Verify the columns were added
        result = await conn.execute(text("PRAGMA table_info(users)"))
        columns_after = [row[1] for row in result.fetchall()]
        print(f"Columns after migration: {columns_after}")


if __name__ == "__main__":
    print("Checking and fixing database schema...")
    print("=" * 50)
    try:
        asyncio.run(check_and_fix_schema())
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

