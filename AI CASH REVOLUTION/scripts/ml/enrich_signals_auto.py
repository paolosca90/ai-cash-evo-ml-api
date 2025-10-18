#!/usr/bin/env python3
"""
AUTO ENRICH SIGNALS WITH WEIGHTS
Adds calculated weights to existing ML signals in the database (no prompts)
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
from calculate_signal_weights import SignalWeightCalculator
from datetime import datetime

load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_key:
    print("Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)
calculator = SignalWeightCalculator()

def get_multi_tf_signals(symbol: str, timestamp: str, current_tf: str) -> list:
    """Get signals from other timeframes for the same symbol/time"""
    try:
        result = supabase.table('ml_historical_candles') \
            .select('granularity, label, label_confidence') \
            .eq('symbol', symbol) \
            .eq('is_labeled', True) \
            .neq('granularity', current_tf) \
            .gte('timestamp', timestamp) \
            .limit(5) \
            .execute()

        return result.data if result.data else []
    except:
        return []

def enrich_signals_batch(batch_size=100, offset=0):
    """Enrich a batch of signals with weight calculations"""

    # Get labeled signals without weights
    result = supabase.table('ml_historical_candles') \
        .select('*') \
        .eq('is_labeled', True) \
        .is_('signal_weight', 'null') \
        .range(offset, offset + batch_size - 1) \
        .execute()

    if not result.data:
        return 0

    signals = result.data
    enriched_count = 0

    for signal in signals:
        try:
            # Get multi-timeframe signals
            mtf_signals = get_multi_tf_signals(
                signal['symbol'],
                signal['timestamp'],
                signal['granularity']
            )

            # Calculate weight
            weight_result = calculator.calculate_weight(
                ml_confidence=signal['label_confidence'],
                signal_direction=signal['label'],
                candle_data=signal,
                multi_tf_signals=mtf_signals,
                risk_metrics={}
            )

            # Update signal with weight data
            supabase.table('ml_historical_candles') \
                .update({
                    'signal_weight': weight_result['total_weight'],
                    'signal_recommendation': weight_result['recommendation'],
                    'position_multiplier': weight_result['position_size_multiplier']
                }) \
                .eq('id', signal['id']) \
                .execute()

            enriched_count += 1

        except Exception as e:
            print(f"Error enriching signal {signal.get('id', 'unknown')}: {e}")
            continue

    return enriched_count

def main():
    print("SIGNAL WEIGHT ENRICHMENT - AUTOMATIC MODE")
    print("="*70)

    # Count total signals to process
    total_result = supabase.table('ml_historical_candles') \
        .select('id', count='exact') \
        .eq('is_labeled', True) \
        .is_('signal_weight', 'null') \
        .execute()

    total_signals = total_result.count
    print(f"\nTotal signals to enrich: {total_signals}")

    if total_signals == 0:
        print("All signals already have weights!")
        return

    batch_size = 100
    total_enriched = 0
    offset = 0

    print(f"Processing in batches of {batch_size}...\n")

    while offset < total_signals:
        count = enrich_signals_batch(batch_size=batch_size, offset=offset)

        if count == 0:
            break

        total_enriched += count
        offset += batch_size

        progress = (offset / total_signals) * 100
        print(f"Progress: {total_enriched}/{total_signals} ({progress:.1f}%) - Batch {offset//batch_size} complete")

    print("\n" + "="*70)
    print(f"ENRICHMENT COMPLETE")
    print(f"Total signals enriched: {total_enriched}")
    print("="*70)

    # Show distribution
    print("\nWeight Distribution Analysis:")
    print("-"*70)

    dist_result = supabase.table('ml_historical_candles') \
        .select('signal_recommendation', count='exact') \
        .not_.is_('signal_weight', 'null') \
        .execute()

    if dist_result.count:
        print(f"Signals with weights: {dist_result.count}")

        # Get breakdown by recommendation
        for rec in ['STRONG_BUY', 'BUY', 'WEAK', 'AVOID']:
            rec_result = supabase.table('ml_historical_candles') \
                .select('id', count='exact') \
                .eq('signal_recommendation', rec) \
                .execute()

            if rec_result.count:
                pct = (rec_result.count / dist_result.count) * 100
                print(f"  {rec:12}: {rec_result.count:6} ({pct:.1f}%)")

if __name__ == '__main__':
    main()
