#!/usr/bin/env python3
"""
BATCHED SQL ENRICHMENT
Processes signals in batches to avoid timeout
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
import time

load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_key:
    print("Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

# Step 1: Create function
create_function_sql = """
CREATE OR REPLACE FUNCTION calculate_signal_weight(
    p_label_confidence DECIMAL,
    p_rsi DECIMAL,
    p_adx DECIMAL
) RETURNS TABLE (
    weight DECIMAL,
    recommendation VARCHAR,
    multiplier DECIMAL
) AS $$
DECLARE
    v_ml_score DECIMAL;
    v_tech_score DECIMAL;
    v_total_weight DECIMAL;
    v_recommendation VARCHAR;
    v_multiplier DECIMAL;
BEGIN
    v_ml_score := COALESCE(p_label_confidence, 50);
    v_tech_score := 50;

    IF p_rsi IS NOT NULL THEN
        IF p_rsi < 30 OR p_rsi > 70 THEN
            v_tech_score := 80;
        ELSIF p_rsi < 40 OR p_rsi > 60 THEN
            v_tech_score := 65;
        ELSE
            v_tech_score := 45;
        END IF;
    END IF;

    IF p_adx IS NOT NULL AND p_adx > 25 THEN
        v_tech_score := v_tech_score + 15;
    END IF;

    v_tech_score := LEAST(v_tech_score, 100);
    v_total_weight := (v_ml_score * 0.5) + (v_tech_score * 0.5);

    IF v_total_weight >= 75 THEN
        v_recommendation := 'STRONG_BUY';
        v_multiplier := 1.5;
    ELSIF v_total_weight >= 60 THEN
        v_recommendation := 'BUY';
        v_multiplier := 1.0;
    ELSIF v_total_weight >= 40 THEN
        v_recommendation := 'WEAK';
        v_multiplier := 0.5;
    ELSE
        v_recommendation := 'AVOID';
        v_multiplier := 0.25;
    END IF;

    RETURN QUERY SELECT v_total_weight, v_recommendation, v_multiplier;
END;
$$ LANGUAGE plpgsql;
"""

# Batch update SQL template
batch_update_sql = """
WITH weight_calculations AS (
    SELECT
        id,
        (calculate_signal_weight(label_confidence, rsi, adx)).*
    FROM ml_historical_candles
    WHERE is_labeled = TRUE
      AND signal_weight IS NULL
    LIMIT {batch_size}
)
UPDATE ml_historical_candles m
SET
    signal_weight = w.weight,
    signal_recommendation = w.recommendation,
    position_multiplier = w.multiplier
FROM weight_calculations w
WHERE m.id = w.id;
"""

print("BATCHED SQL ENRICHMENT")
print("="*70)

# Create function
print("\n1. Creating SQL function...")
try:
    result = supabase.rpc('exec_sql', {'query': create_function_sql}).execute()
    print("   Function created successfully")
except Exception as e:
    print(f"   Function may already exist: {e}")

# Count remaining
print("\n2. Counting signals to process...")
total = supabase.table('ml_historical_candles') \
    .select('id', count='exact') \
    .eq('is_labeled', True) \
    .is_('signal_weight', 'null') \
    .execute()

remaining = total.count
print(f"   Total to process: {remaining:,}")

if remaining == 0:
    print("\n   All signals already processed!")
    sys.exit(0)

# Process in batches
batch_size = 10000
batch_num = 0
total_processed = 0
start_time = time.time()

print(f"\n3. Processing in batches of {batch_size:,}...")
print("-"*70)

while remaining > 0:
    batch_num += 1
    batch_start = time.time()

    try:
        # Execute batch
        sql = batch_update_sql.format(batch_size=batch_size)
        result = supabase.rpc('exec_sql', {'query': sql}).execute()

        # Count remaining
        check = supabase.table('ml_historical_candles') \
            .select('id', count='exact') \
            .eq('is_labeled', True) \
            .is_('signal_weight', 'null') \
            .execute()

        prev_remaining = remaining
        remaining = check.count
        processed_this_batch = prev_remaining - remaining
        total_processed += processed_this_batch

        batch_time = time.time() - batch_start
        elapsed = time.time() - start_time

        # Calculate ETA
        if total_processed > 0:
            rate = total_processed / elapsed
            eta_sec = remaining / rate if rate > 0 else 0
            eta_min = eta_sec / 60
        else:
            eta_min = 0

        progress = (total_processed / total.count) * 100

        print(f"Batch {batch_num:3}: "
              f"Processed {processed_this_batch:6,} | "
              f"Total {total_processed:7,}/{total.count:,} ({progress:5.1f}%) | "
              f"Remaining {remaining:7,} | "
              f"ETA {eta_min:5.1f} min")

        if remaining == 0:
            break

    except Exception as e:
        print(f"\nError in batch {batch_num}: {e}")
        print("Retrying with smaller batch size...")
        batch_size = max(1000, batch_size // 2)
        continue

elapsed = time.time() - start_time

print("-"*70)
print(f"\nENRICHMENT COMPLETE!")
print(f"Total processed: {total_processed:,}")
print(f"Total time: {elapsed/60:.1f} minutes")
print(f"Average speed: {total_processed/elapsed:.0f} signals/sec")

# Show distribution
print("\n" + "="*70)
print("WEIGHT DISTRIBUTION")
print("="*70)

for rec in ['STRONG_BUY', 'BUY', 'WEAK', 'AVOID']:
    rec_result = supabase.table('ml_historical_candles') \
        .select('id', count='exact') \
        .eq('signal_recommendation', rec) \
        .execute()

    if rec_result.count:
        pct = (rec_result.count / total.count) * 100 if total.count > 0 else 0
        print(f"{rec:12}: {rec_result.count:7,} ({pct:5.1f}%)")

print("="*70)
