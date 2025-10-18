"""
Show Current Enrichment Statistics
===================================
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

supabase: Client = create_client(supabase_url, supabase_key)

print("="*70)
print("CURRENT ENRICHMENT STATISTICS")
print("="*70)

# Overall progress
total = supabase.table('ml_historical_candles').select('id', count='exact').execute()
with_weights = supabase.table('ml_historical_candles').select('id', count='exact').not_.is_('signal_weight', 'null').execute()

enriched = with_weights.count if with_weights.count else 0
progress = (enriched / total.count) * 100 if total.count > 0 else 0

print(f"\nOverall Progress:")
print(f"  Total signals:     {total.count:,}")
print(f"  Enriched:          {enriched:,} ({progress:.1f}%)")
print(f"  Remaining:         {total.count - enriched:,}")

# Distribution by recommendation
print("\n" + "-"*70)
print("Weight Distribution:")
print("-"*70)

for rec in ['STRONG_BUY', 'BUY', 'WEAK', 'AVOID']:
    rec_result = supabase.table('ml_historical_candles') \
        .select('signal_weight', count='exact') \
        .eq('signal_recommendation', rec) \
        .execute()

    if rec_result.count and rec_result.count > 0:
        pct = (rec_result.count / enriched) * 100 if enriched > 0 else 0

        # Get average weight
        avg_result = supabase.table('ml_historical_candles') \
            .select('signal_weight') \
            .eq('signal_recommendation', rec) \
            .limit(1000) \
            .execute()

        if avg_result.data:
            weights = [r['signal_weight'] for r in avg_result.data if r['signal_weight']]
            avg_weight = sum(weights) / len(weights) if weights else 0
        else:
            avg_weight = 0

        print(f"{rec:12}: {rec_result.count:7,} ({pct:5.1f}%) | Avg weight: {avg_weight:.1f}")

print("-"*70)

# Sample of high-weight signals
print("\nTop 5 Signals by Weight:")
print("-"*70)

top_signals = supabase.table('ml_historical_candles') \
    .select('symbol, granularity, signal_weight, signal_recommendation, label_confidence') \
    .not_.is_('signal_weight', 'null') \
    .order('signal_weight', desc=True) \
    .limit(5) \
    .execute()

if top_signals.data:
    for i, sig in enumerate(top_signals.data, 1):
        print(f"{i}. {sig['symbol']:7} {sig['granularity']:3} | "
              f"Weight: {sig['signal_weight']:5.1f} | "
              f"Rec: {sig['signal_recommendation']:11} | "
              f"ML Conf: {sig['label_confidence']:.1f}%")

print("="*70)
