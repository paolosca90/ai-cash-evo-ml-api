#!/usr/bin/env python3
"""
BACKTEST WITH SIGNAL WEIGHTS
Compares trading performance with and without signal weight filtering
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
import pandas as pd
from datetime import datetime

load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_key:
    print("Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def load_signals_with_weights(dataset_type='testing', min_weight=0):
    """Load signals filtered by minimum weight"""
    
    result = supabase.table('ml_historical_candles') \
        .select('*') \
        .eq('dataset_type', dataset_type) \
        .eq('is_labeled', True) \
        .gte('signal_weight', min_weight) \
        .order('timestamp') \
        .execute()
    
    return pd.DataFrame(result.data) if result.data else pd.DataFrame()

def calculate_backtest_metrics(df: pd.DataFrame, position_weighted=False):
    """Calculate backtest metrics"""
    
    if len(df) == 0:
        return None
    
    # Simulate trades
    wins = 0
    losses = 0
    total_pips = 0
    total_trades = len(df)
    
    for _, trade in df.iterrows():
        outcome = trade['trade_outcome']
        win_pips = trade.get('win_pips', 0)
        loss_pips = trade.get('loss_pips', 0)
        multiplier = trade.get('position_multiplier', 1.0) if position_weighted else 1.0
        
        if outcome == 'WIN':
            wins += 1
            total_pips += win_pips * multiplier
        else:
            losses += 1
            total_pips -= loss_pips * multiplier
    
    win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
    avg_pips = total_pips / total_trades if total_trades > 0 else 0
    
    return {
        'total_trades': total_trades,
        'wins': wins,
        'losses': losses,
        'win_rate': win_rate,
        'total_pips': total_pips,
        'avg_pips_per_trade': avg_pips
    }

def main():
    print("BACKTEST WITH SIGNAL WEIGHTS")
    print("="*70)
    
    # Test different weight thresholds
    thresholds = [0, 40, 50, 60, 70, 80]
    
    results = []
    
    for threshold in thresholds:
        print(f"\nTesting with min_weight >= {threshold}...")
        
        df = load_signals_with_weights('testing', min_weight=threshold)
        
        if len(df) == 0:
            print(f"   No signals found with weight >= {threshold}")
            continue
        
        # Test without position weighting
        metrics_unweighted = calculate_backtest_metrics(df, position_weighted=False)
        
        # Test with position weighting
        metrics_weighted = calculate_backtest_metrics(df, position_weighted=True)
        
        results.append({
            'threshold': threshold,
            'unweighted': metrics_unweighted,
            'weighted': metrics_weighted
        })
        
        print(f"   Found {len(df):,} signals")
    
    # Display comparison table
    print(f"\n{'='*70}")
    print("BACKTEST RESULTS COMPARISON")
    print(f"{'='*70}")
    print(f"\n{'Strategy':<30} | Trades | Win% | Total Pips | Avg Pips")
    print(f"{'-'*70}")
    
    for result in results:
        threshold = result['threshold']
        
        # Unweighted
        u = result['unweighted']
        print(f"Min Weight {threshold} (unweighted) {'':<10} | {u['total_trades']:6} | "
              f"{u['win_rate']:4.1f} | {u['total_pips']:10.2f} | {u['avg_pips_per_trade']:8.2f}")
        
        # Weighted
        w = result['weighted']
        print(f"Min Weight {threshold} (pos-weighted) {'':<8} | {w['total_trades']:6} | "
              f"{w['win_rate']:4.1f} | {w['total_pips']:10.2f} | {w['avg_pips_per_trade']:8.2f}")
        print()
    
    print(f"{'='*70}")
    
    # Find best strategy
    best = max(results, key=lambda x: x['weighted']['total_pips'])
    print(f"\nBEST STRATEGY:")
    print(f"   Min Weight Threshold: {best['threshold']}")
    print(f"   Total Pips (weighted): {best['weighted']['total_pips']:.2f}")
    print(f"   Win Rate: {best['weighted']['win_rate']:.1f}%")
    print(f"   Trades: {best['weighted']['total_trades']}")
    print(f"{'='*70}")
    
    # Recommendation analysis
    print(f"\nRECOMMENDATION BREAKDOWN:")
    df_all = load_signals_with_weights('testing', min_weight=0)
    if len(df_all) > 0:
        rec_counts = df_all['signal_recommendation'].value_counts()
        rec_metrics = {}
        
        for rec in rec_counts.index:
            df_rec = df_all[df_all['signal_recommendation'] == rec]
            metrics = calculate_backtest_metrics(df_rec, position_weighted=True)
            rec_metrics[rec] = metrics
        
        print(f"\n{'Recommendation':<15} | Count | Win% | Avg Pips")
        print(f"{'-'*55}")
        for rec, metrics in rec_metrics.items():
            print(f"{rec:<15} | {metrics['total_trades']:5} | "
                  f"{metrics['win_rate']:4.1f} | {metrics['avg_pips_per_trade']:8.2f}")
    
    print(f"\n{'='*70}")

if __name__ == '__main__':
    main()
