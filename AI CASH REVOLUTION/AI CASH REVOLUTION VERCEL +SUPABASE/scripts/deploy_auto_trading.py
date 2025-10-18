"""
Deploy Auto-Trading System to Supabase
Applies database migrations via REST API
"""

import os
import sys
from pathlib import Path
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    sys.exit(1)

# Migration files to apply
MIGRATIONS = [
    'supabase/migrations/20251009_add_weights_to_signal_performance.sql',
    'supabase/migrations/20251009_enable_auto_trading_with_weights.sql'
]

def execute_sql(sql: str, description: str):
    """Execute SQL via Supabase REST API"""
    print(f"\n{'='*70}")
    print(f"Executing: {description}")
    print('='*70)

    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json'
    }

    # Try alternative endpoint - direct SQL execution via PostgREST
    # Since we have service key, we can use the SQL editor endpoint
    url = f"{SUPABASE_URL}/rest/v1/"

    # Actually, let's use the pg client directly through psycopg2
    import psycopg2
    from urllib.parse import urlparse

    # Extract connection details from SUPABASE_URL
    # For Supabase, the direct database URL format is:
    # postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

    project_ref = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')

    # We'll use the REST API approach with a custom function
    # First, let's try using httpx to execute raw SQL through pg_net or similar

    print("SQL Preview (first 500 chars):")
    print(sql[:500])
    print("...")

    try:
        # Use Supabase SQL API if available
        # Otherwise we need database password which we might not have
        print("\nWARNING: Direct SQL execution via REST API requires database password")
        print("Please apply migrations manually via Supabase Dashboard > SQL Editor")
        print(f"\nMigration file: {description}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print("="*70)
    print("AUTO-TRADING SYSTEM DEPLOYMENT")
    print("="*70)
    print(f"Target: {SUPABASE_URL}")

    base_dir = Path(__file__).parent.parent

    for migration_file in MIGRATIONS:
        migration_path = base_dir / migration_file

        if not migration_path.exists():
            print(f"\nERROR: Migration file not found: {migration_path}")
            continue

        with open(migration_path, 'r', encoding='utf-8') as f:
            sql = f.read()

        description = migration_path.name

        # For now, just output the migration for manual application
        print(f"\n{'='*70}")
        print(f"Migration: {description}")
        print('='*70)
        print("\nPlease apply this migration manually via Supabase Dashboard:")
        print("1. Go to: https://supabase.com/dashboard/project/rvopmdflnecyrwrzhyfy/sql/new")
        print("2. Copy and paste the SQL from:")
        print(f"   {migration_path}")
        print("3. Click 'Run'")

    print("\n" + "="*70)
    print("DEPLOYMENT INSTRUCTIONS")
    print("="*70)
    print("\n1. APPLY MIGRATIONS (Manual - via Dashboard):")
    for migration_file in MIGRATIONS:
        print(f"   - {migration_file}")

    print("\n2. SET ENVIRONMENT VARIABLES (if not already set):")
    print("   Go to: https://supabase.com/dashboard/project/rvopmdflnecyrwrzhyfy/settings/functions")
    print("   Add these secrets:")
    print("   - OANDA_API_KEY")
    print("   - OANDA_ACCOUNT_ID")
    print("   - SUPABASE_URL (usually auto-set)")
    print("   - SUPABASE_SERVICE_ROLE_KEY (usually auto-set)")

    print("\n3. TEST THE SYSTEM:")
    print("   Run: python scripts/test_auto_trading.py")

    print("\n4. ENABLE AUTO-TRADING:")
    print("   Via SQL Editor:")
    print("   SELECT set_auto_trading_enabled(true);")

    print("\n5. MONITOR:")
    print("   SELECT * FROM auto_trading_dashboard;")
    print("   SELECT * FROM get_auto_trading_status();")

    print("\n" + "="*70)

if __name__ == '__main__':
    main()
