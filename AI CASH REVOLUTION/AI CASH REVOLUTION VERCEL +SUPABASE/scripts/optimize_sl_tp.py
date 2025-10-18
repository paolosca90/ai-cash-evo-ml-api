"""
STOP LOSS & TAKE PROFIT OPTIMIZATION
Finds optimal SL/TP combination from real trade data
CONSTRAINT: All trades must close intraday (same day)
"""

import os
from pathlib import Path
import json
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from itertools import product
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
print("STOP LOSS & TAKE PROFIT OPTIMIZATION")
print("=" * 80)

# Load real closed trades
print("\n[*] Loading REAL closed OANDA trades...")
response = supabase.table('signal_performance')\
    .select('*')\
    .not_.is_('win', 'null')\
    .not_.is_('oanda_trade_closed_at', 'null')\
    .not_.is_('entry_price', 'null')\
    .not_.is_('stop_loss', 'null')\
    .not_.is_('take_profit', 'null')\
    .execute()

trades = response.data
print(f"[+] Found {len(trades)} closed trades")

if len(trades) < 100:
    print(f"\n[!] Need at least 100 closed trades for reliable optimization")
    print(f"[*] Current: {len(trades)} trades")
    print("\n[*] Using DEFAULT SL/TP:")
    print("   Stop Loss: 20 pips")
    print("   Take Profit: 40 pips")
    print("   Risk:Reward = 1:2")
    print("\n[*] Run this script after accumulating 100+ closed trades")
    exit(0)

# Convert to DataFrame
df = pd.DataFrame(trades)
df['created_at'] = pd.to_datetime(df['created_at'])
df['oanda_trade_closed_at'] = pd.to_datetime(df['oanda_trade_closed_at'])

# Calculate trade duration in hours
df['duration_hours'] = (df['oanda_trade_closed_at'] - df['created_at']).dt.total_seconds() / 3600

# Filter only INTRADAY trades (closed within 24 hours)
df_intraday = df[df['duration_hours'] <= 24].copy()

print(f"\n[*] Intraday trades: {len(df_intraday)}/{len(df)} ({len(df_intraday)/len(df)*100:.1f}%)")
print(f"[*] Average duration: {df_intraday['duration_hours'].mean():.1f} hours")

# Calculate actual pips movement for each trade
def calculate_pips(row):
    """Calculate pips based on symbol"""
    entry = row['entry_price']
    sl = row['stop_loss']
    tp = row['take_profit']

    symbol = row['symbol']

    # Pip multiplier based on symbol
    if symbol in ['EUR_USD', 'GBP_USD', 'AUD_USD', 'NZD_USD', 'USD_CAD']:
        multiplier = 10000
    elif symbol == 'USD_JPY':
        multiplier = 100
    elif symbol == 'XAU_USD':
        multiplier = 10
    else:
        multiplier = 10000

    sl_pips = abs(entry - sl) * multiplier
    tp_pips = abs(tp - entry) * multiplier

    return sl_pips, tp_pips

df_intraday['sl_pips'] = df_intraday.apply(lambda row: calculate_pips(row)[0], axis=1)
df_intraday['tp_pips'] = df_intraday.apply(lambda row: calculate_pips(row)[1], axis=1)

# Current SL/TP distribution
print(f"\n[*] Current SL/TP Distribution:")
print(f"   SL pips - Mean: {df_intraday['sl_pips'].mean():.1f}, Median: {df_intraday['sl_pips'].median():.1f}")
print(f"   TP pips - Mean: {df_intraday['tp_pips'].mean():.1f}, Median: {df_intraday['tp_pips'].median():.1f}")
print(f"   Risk:Reward - Mean: 1:{(df_intraday['tp_pips'] / df_intraday['sl_pips']).mean():.2f}")

# Test different SL/TP combinations
print("\n[*] Testing SL/TP combinations...")

# Define ranges (intraday friendly - not too wide)
sl_range = [10, 15, 20, 25, 30]  # pips
tp_range = [20, 30, 40, 50, 60]  # pips

results = []

print(f"\n{'SL':<6} {'TP':<6} {'R:R':<8} {'Trades':<10} {'Wins':<8} {'WR%':<8} {'Avg Dur':<10} {'Score':<10}")
print("-" * 85)

for sl, tp in product(sl_range, tp_range):
    # Risk:Reward ratio
    rr = tp / sl

    # Skip if R:R is too low (less than 1.5:1)
    if rr < 1.5:
        continue

    # Simulate this SL/TP on historical trades
    # (In realtà dovremmo simulare sul price action, ma per ora usiamo approssimazione)

    # Filter trades that would qualify with this SL/TP
    # Assumption: trade with current SL/TP can be scaled
    scale_sl = sl / df_intraday['sl_pips'].mean()
    scale_tp = tp / df_intraday['tp_pips'].mean()

    # Estimate wins based on TP distance
    # Closer TP = higher win rate, but lower R:R
    # This is a simplified model - real data will be more accurate

    # Use actual win rate and adjust for TP distance
    current_wr = df_intraday['win'].sum() / len(df_intraday) * 100

    # Simplified adjustment: smaller TP = higher WR
    tp_factor = 40 / tp  # 40 is our baseline
    estimated_wr = min(current_wr * (1 + (tp_factor - 1) * 0.2), 90)

    # Estimate average duration (smaller SL/TP = faster close)
    avg_duration = df_intraday['duration_hours'].mean() * (sl + tp) / 60

    # Ensure intraday (max 20 hours)
    if avg_duration > 20:
        continue

    # Composite score
    # Prioritize: Win Rate (40%) + R:R (30%) + Duration (20%) + Trade Count (10%)
    score = (
        estimated_wr * 0.4 +
        min(rr * 10, 30) * 0.3 +
        (20 - min(avg_duration, 20)) * 0.2 +
        10  # Base score for having enough trades
    )

    results.append({
        'sl': sl,
        'tp': tp,
        'rr': rr,
        'estimated_wr': estimated_wr,
        'avg_duration': avg_duration,
        'score': score
    })

    print(f"{sl:<6} {tp:<6} 1:{rr:<6.1f} {len(df_intraday):<10} {int(estimated_wr * len(df_intraday) / 100):<8} {estimated_wr:<8.1f} {avg_duration:<10.1f}h {score:<10.1f}")

if not results:
    print("\n[!] No valid SL/TP combinations found")
    exit(1)

# Find optimal
optimal = max(results, key=lambda x: x['score'])

print("\n" + "=" * 80)
print("OPTIMAL SL/TP CONFIGURATION")
print("=" * 80)

print(f"\n[+] Optimal SL/TP:")
print(f"   Stop Loss: {optimal['sl']} pips")
print(f"   Take Profit: {optimal['tp']} pips")
print(f"   Risk:Reward: 1:{optimal['rr']:.2f}")
print(f"   Estimated Win Rate: {optimal['estimated_wr']:.1f}%")
print(f"   Avg Duration: {optimal['avg_duration']:.1f} hours")
print(f"   Intraday: ✓ (< 24h)")

# Compare with default
print(f"\n[*] Comparison with Default (SL=20, TP=40):")
default = next((r for r in results if r['sl'] == 20 and r['tp'] == 40), None)
if default:
    print(f"   Default Score: {default['score']:.1f}")
    print(f"   Optimal Score: {optimal['score']:.1f}")
    print(f"   Improvement: {optimal['score'] - default['score']:.1f} points")

# Save configuration
config = {
    "timestamp": datetime.now().isoformat(),
    "version": "1.0_sl_tp_optimization",
    "optimal_sl_tp": {
        "stop_loss_pips": int(optimal['sl']),
        "take_profit_pips": int(optimal['tp']),
        "risk_reward_ratio": round(optimal['rr'], 2),
        "estimated_win_rate": round(optimal['estimated_wr'], 1),
        "avg_duration_hours": round(optimal['avg_duration'], 1),
        "intraday_compliant": optimal['avg_duration'] <= 24
    },
    "constraints": {
        "max_duration_hours": 24,
        "min_risk_reward": 1.5,
        "intraday_only": True
    },
    "tested_combinations": len(results),
    "data_source": {
        "total_trades": len(trades),
        "intraday_trades": len(df_intraday),
        "date_range": {
            "from": str(df['created_at'].min()),
            "to": str(df['created_at'].max())
        }
    },
    "all_combinations": [
        {
            'sl': int(r['sl']),
            'tp': int(r['tp']),
            'rr': round(r['rr'], 2),
            'estimated_wr': round(r['estimated_wr'], 1),
            'avg_duration': round(r['avg_duration'], 1),
            'score': round(r['score'], 1)
        }
        for r in sorted(results, key=lambda x: x['score'], reverse=True)[:10]  # Top 10
    ]
}

config_path = Path("config/optimal_sl_tp.json")
config_path.parent.mkdir(exist_ok=True)

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print(f"\n[+] Configuration saved to: {config_path}")

print("\n" + "=" * 80)
print("NEXT STEPS")
print("=" * 80)
print("1. Apply optimal SL/TP to signal generation")
print("2. Monitor performance with new SL/TP")
print("3. Re-optimize monthly with more data")
print("4. Compare actual vs estimated win rate")
print("=" * 80)
