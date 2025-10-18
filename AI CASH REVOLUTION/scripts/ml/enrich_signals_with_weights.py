#!/usr/bin/env python3
"""
ENRICH SIGNALS WITH WEIGHTS
Adds calculated weights to existing ML signals in the database
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
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)
calculator = SignalWeightCalculator()

def get_multi_tf_signals(symbol: str, timestamp: str, current_tf: str) -> list:
    """Get signals from other timeframes for the same symbol/time"""
    # Query nearby signals on different timeframes
    result = supabase.table('ml_historical_candles') \
        .select('granularity, label, label_confidence') \
        .eq('symbol', symbol) \
        .eq('is_labeled', True) \
        .neq('granularity', current_tf) \
        .gte('timestamp', timestamp) \
        .limit(5) \
        .execute()
    
    return result.data if result.data else []

def enrich_signals_batch(batch_size=100, dataset_type='training'):
    """Enrich a batch of signals with weight calculations"""
    
    print(f"\n📊 Enriching {dataset_type} signals with weights...")
    
    # Get labeled signals without weights
    result = supabase.table('ml_historical_candles') \
        .select('*') \
        .eq('dataset_type', dataset_type) \
        .eq('is_labeled', True) \
        .limit(batch_size) \
        .execute()
    
    if not result.data:
        print("   ✅ No signals to enrich")
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
            
            if enriched_count % 10 == 0:
                print(f"   Enriched {enriched_count}/{len(signals)} signals...", end='\r', flush=True)
        
        except Exception as e:
            print(f"\n   ⚠️  Error enriching signal {signal['id']}: {e}")
            continue
    
    print(f"   ✅ Enriched {enriched_count} signals                    ")
    return enriched_count

def analyze_weight_distribution(dataset_type='training'):
    """Analyze the distribution of calculated weights"""
    
    print(f"\n📈 Analyzing weight distribution for {dataset_type}...")
    
    result = supabase.rpc('exec_sql', {
        'query': f"""
            SELECT 
                signal_recommendation,
                COUNT(*) as count,
                AVG(signal_weight) as avg_weight,
                MIN(signal_weight) as min_weight,
                MAX(signal_weight) as max_weight
            FROM ml_historical_candles
            WHERE dataset_type = '{dataset_type}'
              AND signal_weight IS NOT NULL
            GROUP BY signal_recommendation
            ORDER BY avg_weight DESC
        """
    }).execute()
    
    if result.data:
        print(f"\n{'='*70}")
        print(f"Recommendation | Count | Avg Weight | Min | Max")
        print(f"{'='*70}")
        for row in result.data:
            print(f"{row['signal_recommendation']:14} | {row['count']:5} | "
                  f"{row['avg_weight']:10.2f} | {row['min_weight']:3.0f} | {row['max_weight']:3.0f}")
        print(f"{'='*70}")

def main():
    print("🚀 SIGNAL WEIGHT ENRICHMENT")
    print("="*70)
    
    # Check if weight columns exist (they should be added to schema)
    print("\n⚠️  Note: Make sure these columns exist in ml_historical_candles:")
    print("   - signal_weight (DECIMAL)")
    print("   - signal_recommendation (VARCHAR)")
    print("   - position_multiplier (DECIMAL)")
    print("\n   Run the migration first if needed.")
    
    input("\nPress Enter to continue or Ctrl+C to abort...")
    
    # Enrich training signals
    print("\n" + "="*70)
    print("📊 TRAINING DATASET")
    print("="*70)
    total_training = 0
    while True:
        count = enrich_signals_batch(batch_size=100, dataset_type='training')
        total_training += count
        if count == 0:
            break
    
    # Enrich testing signals
    print("\n" + "="*70)
    print("📊 TESTING DATASET")
    print("="*70)
    total_testing = 0
    while True:
        count = enrich_signals_batch(batch_size=100, dataset_type='testing')
        total_testing += count
        if count == 0:
            break
    
    # Analyze distributions
    analyze_weight_distribution('training')
    analyze_weight_distribution('testing')
    
    print(f"\n{'='*70}")
    print("✅ ENRICHMENT COMPLETE!")
    print(f"{'='*70}")
    print(f"📊 Total signals enriched:")
    print(f"   Training: {total_training:,}")
    print(f"   Testing: {total_testing:,}")
    print(f"   Total: {total_training + total_testing:,}")
    print(f"{'='*70}")

if __name__ == '__main__':
    main()
