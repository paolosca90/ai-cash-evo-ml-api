#!/usr/bin/env python3
"""
Keep only selected symbols: EURUSD, USDCAD, USDJPY, XAUUSD
Remove: GBPUSD, AUDUSD, NZDUSD
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_key:
    print("❌ Missing Supabase credentials in .env")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

KEEP_SYMBOLS = ['EURUSD', 'USDCAD', 'USDJPY', 'XAUUSD']
REMOVE_SYMBOLS = ['GBPUSD', 'AUDUSD', 'NZDUSD']

def main():
    print("🔧 OPTIMIZING DATASET FOR FASTER LABELING")
    print("="*70)
    print(f"✅ Keeping: {', '.join(KEEP_SYMBOLS)}")
    print(f"🗑️  Removing: {', '.join(REMOVE_SYMBOLS)}")
    print("="*70)
    print()
    
    # Check current counts
    total_count = 0
    remove_count = 0
    
    print("📊 Current distribution:")
    for symbol in KEEP_SYMBOLS + REMOVE_SYMBOLS:
        result = supabase.table('ml_historical_candles') \
            .select('id', count='exact') \
            .eq('symbol', symbol) \
            .execute()
        count = result.count if hasattr(result, 'count') else len(result.data)
        total_count += count
        
        if symbol in REMOVE_SYMBOLS:
            remove_count += count
            print(f"   🗑️  {symbol}: {count:,} (will be removed)")
        else:
            print(f"   ✅ {symbol}: {count:,} (keep)")
    
    print(f"\n📊 Total: {total_count:,}")
    print(f"🗑️  To remove: {remove_count:,}")
    print(f"✅ Will remain: {total_count - remove_count:,}")
    
    if remove_count == 0:
        print("\n✅ No data to remove!")
        return
    
    # Confirm
    print(f"\n⚠️  This will DELETE {remove_count:,} candles")
    response = input("Continue? (y/N): ")
    if response.lower() != 'y':
        print("Cancelled.")
        return
    
    # Delete unwanted symbols in batches
    print()
    for symbol in REMOVE_SYMBOLS:
        print(f"🗑️  Removing {symbol}...")
        
        # Delete in batches to avoid timeout
        batch_size = 5000
        deleted_total = 0
        
        while True:
            # Get batch of IDs to delete
            result = supabase.table('ml_historical_candles') \
                .select('id') \
                .eq('symbol', symbol) \
                .limit(batch_size) \
                .execute()
            
            if not result.data:
                break
            
            # Delete this batch
            ids_to_delete = [row['id'] for row in result.data]
            for candle_id in ids_to_delete:
                supabase.table('ml_historical_candles') \
                    .delete() \
                    .eq('id', candle_id) \
                    .execute()
            
            deleted_total += len(ids_to_delete)
            print(f"   Deleted {deleted_total:,} candles...", end='\r', flush=True)
        
        print(f"   ✅ Deleted {deleted_total:,} candles")
    
    
    print("\n✅ Dataset optimized!")
    
    # Show final count
    result = supabase.table('ml_historical_candles') \
        .select('id', count='exact') \
        .execute()
    remaining = result.count if hasattr(result, 'count') else len(result.data)
    
    print(f"\n📊 Final count: {remaining:,} candles")
    
    # Show unlabeled count
    result = supabase.table('ml_historical_candles') \
        .select('id', count='exact') \
        .eq('is_labeled', False) \
        .execute()
    unlabeled = result.count if hasattr(result, 'count') else len(result.data)
    
    print(f"🏷️  Unlabeled: {unlabeled:,}")
    
    # Estimate labeling time (based on ~7 candles/sec from previous test)
    estimated_minutes = unlabeled / 7 / 60
    print(f"⏱️  Estimated labeling time: ~{estimated_minutes:.0f} minutes")
    
    print("\n✅ Ready for labeling!")
    print("Run: python scripts/label_on_supabase_incremental.py --dataset all")

if __name__ == '__main__':
    main()
