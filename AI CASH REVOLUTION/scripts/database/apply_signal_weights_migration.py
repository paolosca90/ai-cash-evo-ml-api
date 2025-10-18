"""
Apply Signal Weights Migration to Supabase
==========================================

Adds signal_weight, signal_recommendation, and position_multiplier columns
to ml_historical_candles table.
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_SERVICE_ROLE_KEY')

if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("Missing environment variables")
    sys.exit(1)

print("APPLYING SIGNAL WEIGHTS MIGRATION")
print("="*70)

# Read the migration file
migration_file = 'supabase/migrations/20251008_add_signal_weights.sql'

try:
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql = f.read()

    print(f"Read migration file: {migration_file}")
    print(f"Size: {len(sql)} characters\n")

    # Try psycopg2 for direct connection
    try:
        import psycopg2
        from urllib.parse import urlparse

        # Parse Supabase URL to get connection string
        parsed = urlparse(SUPABASE_URL)
        project_id = parsed.hostname.split('.')[0]

        # Supabase connection string
        conn_string = f"postgresql://postgres.{project_id}:{SUPABASE_KEY}@{parsed.hostname}:5432/postgres"

        print("Connecting to Supabase PostgreSQL...")
        conn = psycopg2.connect(conn_string)
        conn.autocommit = True
        cursor = conn.cursor()

        print("Connected successfully\n")

        # Execute migration
        print("Executing migration...")
        cursor.execute(sql)

        print("Migration executed successfully\n")

        # Verify migration
        print("Verifying migration...")
        verify_sql = """
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'ml_historical_candles'
            AND column_name IN ('signal_weight', 'signal_recommendation', 'position_multiplier')
        ORDER BY column_name;
        """

        cursor.execute(verify_sql)
        columns = cursor.fetchall()

        if len(columns) == 3:
            print("All columns created successfully:")
            for col in columns:
                print(f"   - {col[0]} ({col[1]})")
        else:
            print(f"Expected 3 columns, found {len(columns)}")

        cursor.close()
        conn.close()

        print(f"\n{'='*70}")
        print("MIGRATION APPLIED SUCCESSFULLY")
        print(f"{'='*70}\n")

    except ImportError:
        print("psycopg2 not installed - showing manual instructions\n")
        raise Exception("psycopg2 required")

except FileNotFoundError:
    print(f"Migration file not found: {migration_file}")
    sys.exit(1)
except Exception as e:
    print(f"Automatic migration failed: {e}\n")
    print(f"{'='*70}")
    print(f"MANUAL MIGRATION INSTRUCTIONS")
    print(f"{'='*70}\n")
    print(f"1. Go to: https://app.supabase.com")
    print(f"2. Select your project: rvopmdflnecyrwrzhyfy")
    print(f"3. Click: SQL Editor → New Query")
    print(f"4. Copy and paste this SQL:\n")
    print("-"*70)
    with open(migration_file, 'r', encoding='utf-8') as f:
        print(f.read())
    print("-"*70)
    print(f"\n5. Click 'Run' (or press Ctrl+Enter)")
    print(f"6. You should see: 'Success. No rows returned'\n")
    print(f"{'='*70}\n")
    sys.exit(1)

print("NEXT STEPS:")
print("="*70)
print("1. Migration applied")
print("2. Run: python scripts/enrich_signals_with_weights.py")
print("3. Run: python scripts/backtest_with_weights.py")
print("="*70)
