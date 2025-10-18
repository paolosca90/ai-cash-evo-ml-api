"""
MONTHLY AUTO-RETRAIN
Runs on 1st of each month to re-optimize signal weights
Saves results to Supabase weight_optimization_history table
"""

import os
from pathlib import Path
import json
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from supabase import create_client

# Read .env
env_path = Path(".env")
env_vars = {}
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env_vars[key.strip()] = value.strip().strip('"')

SUPABASE_URL = env_vars.get('VITE_SUPABASE_URL')
SUPABASE_KEY = env_vars.get('VITE_SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 80)
print("MONTHLY WEIGHT OPTIMIZATION - AUTO RETRAIN")
print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)

# Load last 3 months of data
three_months_ago = datetime.now() - timedelta(days=90)

print(f"\n[*] Loading signals from last 3 months ({three_months_ago.date()})...")

response = supabase.table('ml_historical_candles')\
    .select('*')\
    .eq('is_labeled', True)\
    .not_.is_('label', 'null')\
    .not_.is_('trade_outcome', 'null')\
    .gte('created_at', three_months_ago.isoformat())\
    .order('timestamp', desc=False)\
    .execute()

signals = response.data
print(f"[+] Loaded {len(signals)} signals from last 3 months")

if len(signals) < 100:
    print("[-] Not enough data for optimization (need at least 100 signals)")
    print("[*] Using existing optimal threshold")
    exit(0)

# Convert to DataFrame
df = pd.DataFrame(signals)

print(f"\n[*] Date range: {df['created_at'].min()} to {df['created_at'].max()}")
print(f"[*] Symbols: {df['symbol'].nunique()} unique symbols")

# Test different thresholds
thresholds = [50, 55, 60, 65, 70, 75, 80, 85, 90, 92, 95]
results = []

print("\n[*] Testing thresholds...")
print(f"{'Threshold':<12} {'Trades':<10} {'Win Rate':<12} {'Avg Pips':<12} {'Sharpe':<10}")
print("-" * 70)

for threshold in thresholds:
    df_threshold = df[df['label_confidence'] >= threshold].copy()

    if len(df_threshold) < 10:
        continue

    # Calculate metrics
    wins = df_threshold[df_threshold['trade_outcome'] == 'WIN']
    total_trades = len(df_threshold)
    win_count = len(wins)
    win_rate = (win_count / total_trades) * 100 if total_trades > 0 else 0

    # Calculate pips
    pip_list = []
    for _, row in df_threshold.iterrows():
        if row['trade_outcome'] == 'WIN':
            pip_list.append(row.get('win_pips', 0) or 0)
        else:
            pip_list.append(-(row.get('loss_pips', 0) or 0))

    total_pips = sum(pip_list)
    avg_pips = total_pips / total_trades if total_trades > 0 else 0

    # Sharpe ratio
    sharpe = np.mean(pip_list) / np.std(pip_list) if len(pip_list) > 1 and np.std(pip_list) > 0 else 0

    # Profit factor
    gross_profit = sum(p for p in pip_list if p > 0)
    gross_loss = abs(sum(p for p in pip_list if p < 0))
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')

    # Max drawdown
    cumulative = np.cumsum(pip_list)
    running_max = np.maximum.accumulate(cumulative)
    drawdown = running_max - cumulative
    max_drawdown = np.max(drawdown) if len(drawdown) > 0 else 0

    # Composite score
    score = win_rate * 0.4 + avg_pips * 0.3 + sharpe * 5 + (min(profit_factor, 10) * 2)

    results.append({
        'threshold': threshold,
        'total_trades': total_trades,
        'win_rate': win_rate,
        'avg_pips': avg_pips,
        'total_pips': total_pips,
        'sharpe_ratio': sharpe,
        'profit_factor': profit_factor if profit_factor != float('inf') else 999,
        'max_drawdown': max_drawdown,
        'score': score
    })

    print(f"{threshold:<12} {total_trades:<10} {win_rate:<12.1f}% {avg_pips:<12.2f} {sharpe:<10.2f}")

# Find optimal
optimal = max(results, key=lambda x: x['score'])

print("\n" + "=" * 80)
print("OPTIMIZATION COMPLETE")
print("=" * 80)

print(f"\n[+] Optimal Threshold: {optimal['threshold']}")
print(f"   Total Trades: {optimal['total_trades']}")
print(f"   Win Rate: {optimal['win_rate']:.2f}%")
print(f"   Avg Pips: {optimal['avg_pips']:.2f}")
print(f"   Sharpe Ratio: {optimal['sharpe_ratio']:.3f}")
print(f"   Profit Factor: {optimal['profit_factor']:.2f}")
print(f"   Max Drawdown: {optimal['max_drawdown']:.2f} pips")

# BUY/SELL breakdown
df_opt = df[df['label_confidence'] >= optimal['threshold']]
buy_signals = df_opt[df_opt['label'] == 'BUY']
sell_signals = df_opt[df_opt['label'] == 'SELL']

buy_stats = {'count': 0, 'winrate': 0.0, 'avg_pips': 0.0}
sell_stats = {'count': 0, 'winrate': 0.0, 'avg_pips': 0.0}

if len(buy_signals) > 0:
    buy_wins = len(buy_signals[buy_signals['trade_outcome'] == 'WIN'])
    buy_stats = {
        'count': len(buy_signals),
        'winrate': (buy_wins / len(buy_signals)) * 100,
        'avg_pips': sum(
            row.get('win_pips', 0) if row['trade_outcome'] == 'WIN'
            else -(row.get('loss_pips', 0) or 0)
            for _, row in buy_signals.iterrows()
        ) / len(buy_signals)
    }
    print(f"\n[*] BUY: {buy_stats['count']} trades, {buy_stats['winrate']:.1f}% WR, {buy_stats['avg_pips']:.2f} pips")

if len(sell_signals) > 0:
    sell_wins = len(sell_signals[sell_signals['trade_outcome'] == 'WIN'])
    sell_stats = {
        'count': len(sell_signals),
        'winrate': (sell_wins / len(sell_signals)) * 100,
        'avg_pips': sum(
            row.get('win_pips', 0) if row['trade_outcome'] == 'WIN'
            else -(row.get('loss_pips', 0) or 0)
            for _, row in sell_signals.iterrows()
        ) / len(sell_signals)
    }
    print(f"[*] SELL: {sell_stats['count']} trades, {sell_stats['winrate']:.1f}% WR, {sell_stats['avg_pips']:.2f} pips")

# Save to database
print("\n[*] Saving to database...")

# Deactivate previous optimizations
supabase.table('weight_optimization_history')\
    .update({'active': False})\
    .eq('active', True)\
    .execute()

# Insert new optimization
record = {
    'timestamp': datetime.now().isoformat(),
    'optimal_threshold': float(optimal['threshold']),
    'performance_winrate': float(optimal['win_rate']),
    'performance_avg_pips': float(optimal['avg_pips']),
    'qualified_signals': int(optimal['total_trades']),
    'total_signals': int(len(df)),
    'buy_count': int(buy_stats['count']),
    'buy_winrate': float(buy_stats['winrate']),
    'buy_avg_pips': float(buy_stats['avg_pips']),
    'sell_count': int(sell_stats['count']),
    'sell_winrate': float(sell_stats['winrate']),
    'sell_avg_pips': float(sell_stats['avg_pips']),
    'all_thresholds': [
        {
            'threshold': float(r['threshold']),
            'total_trades': int(r['total_trades']),
            'win_rate': float(r['win_rate']),
            'avg_pips': float(r['avg_pips']),
            'sharpe_ratio': float(r['sharpe_ratio']),
            'profit_factor': float(r['profit_factor'])
        }
        for r in results
    ],
    'active': True
}

result = supabase.table('weight_optimization_history').insert(record).execute()

print("[+] Saved to weight_optimization_history")

# Verify
current_threshold = supabase.rpc('get_optimal_threshold').execute()
print(f"\n[+] Current active threshold: {current_threshold.data}")

print("\n[*] Next retrain: 1st of next month")
print("=" * 80)
