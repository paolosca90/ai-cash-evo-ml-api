#!/usr/bin/env python3
"""
ULTRA-FAST SIGNAL ENRICHMENT
=============================
Optimized version with:
- Large batch processing (5000 records)
- Batch updates (no individual queries)
- Simplified MTF (skip for speed)
- In-memory calculations
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
from calculate_signal_weights import SignalWeightCalculator
from datetime import datetime
import time

load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_key:
    print("Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)
calculator = SignalWeightCalculator()

def enrich_batch_ultra_fast(batch_size=5000, offset=0):
    """
    Ultra-fast batch enrichment:
    1. Fetch large batch
    2. Calculate all weights in memory
    3. Batch update all at once
    """

    # Fetch batch
    result = supabase.table('ml_historical_candles') \
        .select('id, symbol, granularity, timestamp, label, label_confidence, rsi, adx, ema12, ema21, open, high, low, close, volume') \
        .eq('is_labeled', True) \
        .is_('signal_weight', 'null') \
        .range(offset, offset + batch_size - 1) \
        .execute()

    if not result.data or len(result.data) == 0:
        return 0

    signals = result.data

    # Calculate weights in memory (fast)
    updates = []
    for signal in signals:
        try:
            # Calculate weight WITHOUT MTF (for speed)
            # MTF can be added later if needed
            weight_result = calculator.calculate_weight(
                ml_confidence=signal.get('label_confidence', 50),
                signal_direction=signal.get('label', 'BUY'),
                candle_data=signal,
                multi_tf_signals=[],  # Skip MTF for speed
                risk_metrics={}
            )

            updates.append({
                'id': signal['id'],
                'signal_weight': weight_result['total_weight'],
                'signal_recommendation': weight_result['recommendation'],
                'position_multiplier': weight_result['position_size_multiplier']
            })

        except Exception as e:
            print(f"Error calculating weight for signal {signal['id']}: {e}")
            continue

    # Batch update (MUCH faster than individual updates)
    if updates:
        # Split into chunks of 1000 for upsert
        chunk_size = 1000
        for i in range(0, len(updates), chunk_size):
            chunk = updates[i:i+chunk_size]

            # Use upsert for batch update
            try:
                supabase.table('ml_historical_candles').upsert(chunk).execute()
            except Exception as e:
                # If batch fails, try individual updates
                print(f"Batch update failed, trying individually: {e}")
                for update in chunk:
                    try:
                        supabase.table('ml_historical_candles') \
                            .update({
                                'signal_weight': update['signal_weight'],
                                'signal_recommendation': update['signal_recommendation'],
                                'position_multiplier': update['position_multiplier']
                            }) \
                            .eq('id', update['id']) \
                            .execute()
                    except:
                        continue

    return len(updates)

def main():
    print("ULTRA-FAST SIGNAL ENRICHMENT")
    print("="*70)
    print("Optimizations:")
    print("  - Batch size: 5000")
    print("  - Batch updates (1000 per upsert)")
    print("  - MTF signals: SKIPPED (for speed)")
    print("  - In-memory calculations")
    print("="*70)

    # Count total
    total_result = supabase.table('ml_historical_candles') \
        .select('id', count='exact') \
        .eq('is_labeled', True) \
        .is_('signal_weight', 'null') \
        .execute()

    total_signals = total_result.count
    print(f"\nTotal signals to enrich: {total_signals:,}")

    if total_signals == 0:
        print("All signals already enriched!")
        return

    batch_size = 5000
    total_enriched = 0
    offset = 0
    start_time = time.time()

    print(f"\nProcessing in batches of {batch_size}...\n")

    while offset < total_signals:
        batch_start = time.time()

        count = enrich_batch_ultra_fast(batch_size=batch_size, offset=offset)

        if count == 0:
            break

        total_enriched += count
        offset += batch_size

        # Calculate stats
        batch_time = time.time() - batch_start
        elapsed = time.time() - start_time
        progress = (total_enriched / total_signals) * 100

        # Estimate remaining time
        if total_enriched > 0:
            rate = total_enriched / elapsed
            remaining = (total_signals - total_enriched) / rate if rate > 0 else 0
            eta_min = remaining / 60
        else:
            eta_min = 0

        print(f"Batch {offset//batch_size:4}: "
              f"{total_enriched:7,}/{total_signals:,} ({progress:5.1f}%) | "
              f"Speed: {count/batch_time:6.0f} sig/sec | "
              f"ETA: {eta_min:5.1f} min")

    elapsed = time.time() - start_time

    print("\n" + "="*70)
    print("ENRICHMENT COMPLETE")
    print("="*70)
    print(f"Total enriched: {total_enriched:,}")
    print(f"Total time: {elapsed/60:.1f} minutes")
    print(f"Average speed: {total_enriched/elapsed:.0f} signals/sec")
    print("="*70)

    # Show distribution
    print("\nWeight Distribution:")
    print("-"*70)

    for rec in ['STRONG_BUY', 'BUY', 'WEAK', 'AVOID']:
        rec_result = supabase.table('ml_historical_candles') \
            .select('id', count='exact') \
            .eq('signal_recommendation', rec) \
            .execute()

        if rec_result.count:
            pct = (rec_result.count / total_signals) * 100
            print(f"  {rec:12}: {rec_result.count:7,} ({pct:5.1f}%)")

    print("-"*70)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        print("Progress has been saved. Re-run to continue.")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
