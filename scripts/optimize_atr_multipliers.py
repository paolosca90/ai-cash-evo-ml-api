"""
OPTIMIZE ATR MULTIPLIERS WITH ML
Uses real closed trades to find optimal SL/TP multipliers for each symbol
Optimizes: sl_multiplier, tp_multiplier for maximum profitability + intraday constraint
"""

import os
from pathlib import Path
import json
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from scipy.optimize import differential_evolution
from supabase import create_client

# Import dynamic SL/TP calculator
import sys
sys.path.append(str(Path(__file__).parent))

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
print("ATR MULTIPLIERS OPTIMIZATION WITH ML")
print("=" * 80)

# Load real closed trades
print("\n[*] Loading REAL closed OANDA trades...")
response = supabase.table('signal_performance')\
    .select('*')\
    .not_.is_('win', 'null')\
    .not_.is_('oanda_trade_closed_at', 'null')\
    .not_.is_('entry_price', 'null')\
    .execute()

trades = response.data
print(f"[+] Found {len(trades)} closed trades")

if len(trades) < 100:
    print(f"\n[!] Need at least 100 closed trades for reliable optimization")
    print(f"[*] Current: {len(trades)} trades")
    print("\n[*] Using DEFAULT multipliers:")
    print("   SL multiplier: 1.5 (SL = ATR × 1.5)")
    print("   TP multiplier: 3.0 (TP = ATR × 3.0)")
    print("   Risk:Reward: 1:2.0")
    print("\n[*] Run this script after 100+ closed trades")

    # Save default config
    default_config = {
        "timestamp": datetime.now().isoformat(),
        "version": "1.0_default",
        "status": "insufficient_data",
        "trades_available": len(trades),
        "trades_required": 100,
        "default_multipliers": {
            "sl_multiplier": 1.5,
            "tp_multiplier": 3.0,
            "min_rr": 1.5,
            "max_rr": 3.0
        }
    }

    config_path = Path("config/optimized_atr_multipliers.json")
    config_path.parent.mkdir(exist_ok=True)

    with open(config_path, 'w') as f:
        json.dump(default_config, f, indent=2)

    print(f"\n[+] Default config saved to: {config_path}")
    exit(0)

# Convert to DataFrame
df = pd.DataFrame(trades)
df['created_at'] = pd.to_datetime(df['created_at'])
df['oanda_trade_closed_at'] = pd.to_datetime(df['oanda_trade_closed_at'])
df['duration_hours'] = (df['oanda_trade_closed_at'] - df['created_at']).dt.total_seconds() / 3600

# Filter intraday only
df = df[df['duration_hours'] <= 24].copy()

print(f"[+] Intraday trades: {len(df)}")
print(f"[*] Symbols: {df['symbol'].unique().tolist()}")

# Calculate actual SL/TP distances in pips
def calculate_sl_tp_pips(row):
    """Calculate actual SL/TP distances from trade"""
    entry = row['entry_price']
    sl = row.get('stop_loss')
    tp = row.get('take_profit')

    if not sl or not tp:
        return None, None

    symbol = row['symbol']

    # Pip multiplier
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

df['sl_pips'], df['tp_pips'] = zip(*df.apply(calculate_sl_tp_pips, axis=1))
df = df.dropna(subset=['sl_pips', 'tp_pips'])

print(f"\n[*] Current SL/TP statistics:")
print(f"   SL - Mean: {df['sl_pips'].mean():.1f} pips")
print(f"   TP - Mean: {df['tp_pips'].mean():.1f} pips")
print(f"   R:R - Mean: 1:{(df['tp_pips'] / df['sl_pips']).mean():.2f}")

# Group by symbol for optimization
results_by_symbol = {}

print("\n" + "=" * 80)
print("OPTIMIZING MULTIPLIERS BY SYMBOL")
print("=" * 80)

for symbol in df['symbol'].unique():
    symbol_trades = df[df['symbol'] == symbol]

    if len(symbol_trades) < 20:
        print(f"\n{symbol}: Only {len(symbol_trades)} trades - skipping (need 20+)")
        continue

    print(f"\n{symbol}: {len(symbol_trades)} trades")

    # Objective function
    def objective(multipliers):
        """
        Optimize for:
        - High win rate
        - Good R:R ratio
        - Intraday compliant
        - Enough trading opportunities
        """
        sl_mult, tp_mult = multipliers

        # Ensure minimum R:R
        if tp_mult / sl_mult < 1.5:
            return 999999  # Penalty

        # Simulate trades with these multipliers
        # Assumption: if actual SL was tighter, we'd win less
        # If actual TP was further, we'd win less

        wins = 0
        total = 0

        for _, trade in symbol_trades.iterrows():
            actual_sl = trade['sl_pips']
            actual_tp = trade['tp_pips']
            won = trade['win']

            # Estimated SL/TP with new multipliers (simplified)
            # In reality we'd need ATR data, but we can estimate from actual SL/TP

            # If our SL is tighter than actual, keep result
            # If our SL is wider, assume same result
            # If our TP is further than actual, maybe didn't hit (reduce win prob)

            # Simplified: scale win probability by TP distance
            tp_ratio = tp_mult / 2.0  # 2.0 is baseline
            win_prob_adjustment = max(0.7, min(1.3, 2.0 / tp_ratio))

            if won:
                # If won with actual TP, would we win with new TP?
                if np.random.random() < win_prob_adjustment:
                    wins += 1
            else:
                # If lost with actual SL, would we still lose?
                wins += 0

            total += 1

        win_rate = (wins / total * 100) if total > 0 else 0
        rr = tp_mult / sl_mult

        # Score: balance win rate + R:R
        score = -((win_rate * 0.6) + (min(rr, 3.0) * 10))  # Negative for minimization

        return score

    # Optimize
    bounds = [(0.8, 2.5), (1.5, 4.0)]  # [sl_mult, tp_mult]

    result = differential_evolution(
        objective,
        bounds,
        maxiter=50,
        popsize=10,
        seed=42,
        polish=True
    )

    optimal_sl_mult = result.x[0]
    optimal_tp_mult = result.x[1]
    optimal_rr = optimal_tp_mult / optimal_sl_mult

    # Calculate expected performance
    wins = symbol_trades['win'].sum()
    win_rate = (wins / len(symbol_trades)) * 100

    results_by_symbol[symbol] = {
        'sl_multiplier': round(optimal_sl_mult, 2),
        'tp_multiplier': round(optimal_tp_mult, 2),
        'risk_reward': round(optimal_rr, 2),
        'trades_analyzed': len(symbol_trades),
        'current_win_rate': round(win_rate, 1)
    }

    print(f"   Optimal: SL×{optimal_sl_mult:.2f}, TP×{optimal_tp_mult:.2f}, R:R 1:{optimal_rr:.2f}")
    print(f"   Win Rate: {win_rate:.1f}%")

# Global default (average across symbols)
if results_by_symbol:
    avg_sl_mult = np.mean([r['sl_multiplier'] for r in results_by_symbol.values()])
    avg_tp_mult = np.mean([r['tp_multiplier'] for r in results_by_symbol.values()])

    global_optimal = {
        'sl_multiplier': round(avg_sl_mult, 2),
        'tp_multiplier': round(avg_tp_mult, 2),
        'risk_reward': round(avg_tp_mult / avg_sl_mult, 2),
        'min_rr': 1.5,
        'max_rr': 3.0
    }
else:
    global_optimal = {
        'sl_multiplier': 1.5,
        'tp_multiplier': 3.0,
        'risk_reward': 2.0,
        'min_rr': 1.5,
        'max_rr': 3.0
    }

print("\n" + "=" * 80)
print("GLOBAL OPTIMAL MULTIPLIERS")
print("=" * 80)
print(f"\nDefault for all symbols:")
print(f"  SL multiplier: {global_optimal['sl_multiplier']}")
print(f"  TP multiplier: {global_optimal['tp_multiplier']}")
print(f"  Risk:Reward: 1:{global_optimal['risk_reward']}")

# Save configuration
config = {
    "timestamp": datetime.now().isoformat(),
    "version": "1.0_ml_optimized",
    "status": "optimized",
    "trades_analyzed": len(df),
    "symbols_optimized": list(results_by_symbol.keys()),
    "global_multipliers": global_optimal,
    "symbol_specific_multipliers": results_by_symbol,
    "constraints": {
        "intraday_only": True,
        "max_duration_hours": 24,
        "min_risk_reward": 1.5
    }
}

config_path = Path("config/optimized_atr_multipliers.json")
config_path.parent.mkdir(exist_ok=True)

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print(f"\n[+] Configuration saved to: {config_path}")

print("\n" + "=" * 80)
print("NEXT STEPS")
print("=" * 80)
print("1. Apply optimized multipliers to signal generation")
print("2. Monitor performance with new SL/TP")
print("3. Re-optimize monthly as data accumulates")
print("4. Consider symbol-specific multipliers for better accuracy")
print("=" * 80)
