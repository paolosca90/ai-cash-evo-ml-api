"""
OPTIMIZE FROM REAL OANDA TRADES
Uses actual closed trades from signal_performance table
NO simulations - only REAL results
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
print("WEIGHT OPTIMIZATION FROM REAL TRADES")
print("=" * 80)

# Load REAL closed trades from signal_performance
print("\n[*] Loading REAL closed OANDA trades...")
response = supabase.table('signal_performance')\
    .select('*')\
    .not_.is_('win', 'null')\
    .not_.is_('oanda_trade_closed_at', 'null')\
    .not_.is_('confidence', 'null')\
    .order('created_at', desc=False)\
    .execute()

trades = response.data
print(f"[+] Found {len(trades)} closed OANDA trades")

if len(trades) < 50:
    print(f"\n[!] Not enough real trades ({len(trades)}/50 minimum)")
    print("[*] System needs to accumulate more real trades before optimization")
    print("[*] Recommendations:")
    print("   1. Enable auto-trading system")
    print("   2. Wait 1-2 weeks for trade accumulation")
    print("   3. Re-run optimization when you have 100+ closed trades")
    print("\n[*] Using DEFAULT threshold: 70 (conservative)")
    exit(0)

# Convert to DataFrame
df = pd.DataFrame(trades)

print(f"\n[*] Date range: {df['created_at'].min()} to {df['created_at'].max()}")
print(f"[*] Symbols: {df['symbol'].unique().tolist()}")

# Calculate actual results
df['actual_win'] = df['win'] == True
df['pips'] = 0.0  # We'll need to calculate this from entry/exit prices

# Outcome distribution
wins = df['actual_win'].sum()
losses = len(df) - wins
win_rate = (wins / len(df)) * 100

print(f"\n[*] REAL Performance:")
print(f"   Total trades: {len(df)}")
print(f"   Wins: {wins}")
print(f"   Losses: {losses}")
print(f"   Win Rate: {win_rate:.2f}%")

# Test different confidence thresholds
thresholds = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90]
results = []

print(f"\n{'Threshold':<12} {'Trades':<10} {'Wins':<8} {'Losses':<10} {'Win Rate':<12}")
print("-" * 70)

for threshold in thresholds:
    df_thresh = df[df['confidence'] >= threshold]

    if len(df_thresh) < 10:
        continue

    wins = df_thresh['actual_win'].sum()
    losses = len(df_thresh) - wins
    win_rate = (wins / len(df_thresh)) * 100 if len(df_thresh) > 0 else 0

    # Score: prioritize win rate and number of trades
    score = win_rate * 0.7 + (len(df_thresh) / len(df)) * 30

    results.append({
        'threshold': threshold,
        'trades': len(df_thresh),
        'wins': wins,
        'losses': losses,
        'win_rate': win_rate,
        'score': score
    })

    print(f"{threshold:<12} {len(df_thresh):<10} {wins:<8} {losses:<10} {win_rate:<12.1f}%")

if not results:
    print("\n[!] No valid thresholds found")
    print("[*] Using DEFAULT threshold: 70")
    exit(0)

# Find optimal
optimal = max(results, key=lambda x: x['score'])

print("\n" + "=" * 80)
print("REAL BACKTEST RESULTS")
print("=" * 80)

print(f"\n[+] Optimal Threshold: {optimal['threshold']}")
print(f"   Total Trades: {optimal['trades']}")
print(f"   Wins: {optimal['wins']}")
print(f"   Losses: {optimal['losses']}")
print(f"   Win Rate: {optimal['win_rate']:.2f}%")

# Validate win rate is realistic
if optimal['win_rate'] > 75:
    print(f"\n[!] WARNING: Win rate {optimal['win_rate']:.1f}% is very high")
    print("[*] Recommendations:")
    print("   - Collect more data (need 100+ trades)")
    print("   - Ensure diverse market conditions")
    print("   - Current sample might be lucky period")
elif optimal['win_rate'] < 35:
    print(f"\n[!] WARNING: Win rate {optimal['win_rate']:.1f}% is low")
    print("[*] System may need adjustment")
else:
    print(f"\n[+] Win rate {optimal['win_rate']:.1f}% is REALISTIC ✓")

# Save results
config = {
    "timestamp": datetime.now().isoformat(),
    "version": "4.0_real_trades",
    "source": "signal_performance_oanda_closed_trades",
    "optimal_threshold": float(optimal['threshold']),
    "performance": {
        "total_trades": int(optimal['trades']),
        "wins": int(optimal['wins']),
        "losses": int(optimal['losses']),
        "win_rate": float(optimal['win_rate']),
        "data_quality": "REAL_OANDA_TRADES"
    },
    "all_thresholds": [
        {
            'threshold': float(r['threshold']),
            'trades': int(r['trades']),
            'wins': int(r['wins']),
            'losses': int(r['losses']),
            'win_rate': float(r['win_rate'])
        }
        for r in results
    ],
    "warnings": []
}

if optimal['win_rate'] > 75:
    config['warnings'].append("High win rate - need more data for validation")
if len(trades) < 100:
    config['warnings'].append(f"Limited sample size: {len(trades)} trades (need 100+)")

config_path = Path("config/real_trades_optimization.json")
config_path.parent.mkdir(exist_ok=True)

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print(f"\n[+] Results saved to: {config_path}")

print("\n" + "=" * 80)
print("NEXT STEPS")
print("=" * 80)
print("1. Enable auto-trading to accumulate real trades")
print("2. Wait for 100+ closed trades")
print("3. Re-run this optimization monthly")
print("4. Use REAL data, not simulations!")
print("=" * 80)
