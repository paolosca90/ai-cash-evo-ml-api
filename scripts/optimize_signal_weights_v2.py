"""
SIGNAL WEIGHT OPTIMIZATION v2
Ottimizza i pesi dei componenti del segnale basandosi sui risultati storici
Componenti: RSI, EMA Trend, ADX Strength, ATR Volatility, Market Regime
"""

import os
from pathlib import Path
import json
from datetime import datetime
import numpy as np
from scipy.optimize import differential_evolution
from supabase import create_client, Client

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

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 70)
print("SIGNAL WEIGHT OPTIMIZATION v2")
print("=" * 70)

# Load historical signals with complete data
print("\n[*] Loading historical labeled signals...")
response = supabase.table('ml_historical_candles')\
    .select('id,symbol,label,trade_outcome,win_pips,loss_pips,label_confidence,close')\
    .eq('is_labeled', True)\
    .not_.is_('label', 'null')\
    .not_.is_('trade_outcome', 'null')\
    .not_.is_('label_confidence', 'null')\
    .limit(50000)\
    .execute()

signals = response.data
print(f"[+] Loaded {len(signals)} historical signals")

if len(signals) < 100:
    print("[-] Not enough historical data")
    exit(1)

# Prepare data
print("\n[*] Analyzing signal outcomes...")

data = []
for signal in signals:
    outcome = signal.get('trade_outcome')
    win = 1 if outcome == 'WIN' else 0

    win_pips = signal.get('win_pips', 0) or 0
    loss_pips = signal.get('loss_pips', 0) or 0
    pips = win_pips if win else -loss_pips

    # Use label_confidence as proxy for signal quality (0-100)
    confidence = float(signal.get('label_confidence', 50))

    # Simple scoring based on label confidence
    # High confidence = strong signal
    score_base = confidence

    data.append({
        'confidence': confidence,
        'win': win,
        'pips': pips,
        'label': signal.get('label'),
        'score': score_base
    })

print(f"[+] Analyzed {len(data)} signals")

# Group by confidence ranges to find optimal threshold
thresholds = np.arange(50, 95, 5)
results = []

print("\n[*] Testing different confidence thresholds:")
print(f"{'Threshold':<12} {'Signals':<10} {'Win Rate':<12} {'Avg Pips':<12} {'Total Pips':<12}")
print("-" * 70)

for threshold in thresholds:
    qualified = [d for d in data if d['confidence'] >= threshold]

    if len(qualified) < 10:
        continue

    wins = sum(1 for s in qualified if s['win'] == 1)
    winrate = (wins / len(qualified)) * 100
    avg_pips = sum(s['pips'] for s in qualified) / len(qualified)
    total_pips = sum(s['pips'] for s in qualified)

    print(f"{threshold:<12.0f} {len(qualified):<10} {winrate:<12.1f}% {avg_pips:<12.2f} {total_pips:<12.1f}")

    results.append({
        'threshold': float(threshold),
        'signals': int(len(qualified)),
        'winrate': float(winrate),
        'avg_pips': float(avg_pips),
        'total_pips': float(total_pips),
        'score': float(winrate * 0.6 + avg_pips * 0.4)  # Combined score
    })

# Find optimal threshold
best = max(results, key=lambda x: x['score'])

print("\n" + "=" * 70)
print("OPTIMIZATION RESULTS")
print("=" * 70)

print(f"\n[+] Optimal Threshold: {best['threshold']:.0f}")
print(f"   Qualified Signals: {best['signals']}/{len(data)} ({best['signals']/len(data)*100:.1f}%)")
print(f"   Win Rate: {best['winrate']:.1f}%")
print(f"   Avg Pips: {best['avg_pips']:.2f}")
print(f"   Total Pips: {best['total_pips']:.1f}")

# Calculate baseline (all signals)
total_wins = sum(1 for d in data if d['win'] == 1)
baseline_winrate = (total_wins / len(data)) * 100
baseline_pips = sum(d['pips'] for d in data) / len(data)

print(f"\n[*] Improvement vs Baseline:")
print(f"   Win Rate: +{best['winrate'] - baseline_winrate:.1f}%")
print(f"   Avg Pips: +{best['avg_pips'] - baseline_pips:.2f}")

# Analyze BUY vs SELL performance
qualified_signals = [d for d in data if d['confidence'] >= best['threshold']]
buy_signals = [s for s in qualified_signals if s['label'] == 'BUY']
sell_signals = [s for s in qualified_signals if s['label'] == 'SELL']

if buy_signals:
    buy_wins = sum(1 for s in buy_signals if s['win'] == 1)
    buy_winrate = (buy_wins / len(buy_signals)) * 100
    buy_pips = sum(s['pips'] for s in buy_signals) / len(buy_signals)
    print(f"\n[*] BUY Signals:")
    print(f"   Count: {len(buy_signals)}")
    print(f"   Win Rate: {buy_winrate:.1f}%")
    print(f"   Avg Pips: {buy_pips:.2f}")

if sell_signals:
    sell_wins = sum(1 for s in sell_signals if s['win'] == 1)
    sell_winrate = (sell_wins / len(sell_signals)) * 100
    sell_pips = sum(s['pips'] for s in sell_signals) / len(sell_signals)
    print(f"\n[*] SELL Signals:")
    print(f"   Count: {len(sell_signals)}")
    print(f"   Win Rate: {sell_winrate:.1f}%")
    print(f"   Avg Pips: {sell_pips:.2f}")

# Save optimal configuration
config = {
    "timestamp": datetime.now().isoformat(),
    "version": "2.0",
    "optimal_threshold": float(best['threshold']),
    "performance": {
        "baseline_winrate": float(baseline_winrate),
        "baseline_avg_pips": float(baseline_pips),
        "optimized_winrate": float(best['winrate']),
        "optimized_avg_pips": float(best['avg_pips']),
        "improvement_winrate": float(best['winrate'] - baseline_winrate),
        "improvement_pips": float(best['avg_pips'] - baseline_pips),
        "qualified_signals": int(best['signals']),
        "total_signals": int(len(data))
    },
    "by_direction": {
        "BUY": {
            "count": int(len(buy_signals)) if buy_signals else 0,
            "winrate": float(buy_winrate) if buy_signals else 0.0,
            "avg_pips": float(buy_pips) if buy_signals else 0.0
        },
        "SELL": {
            "count": int(len(sell_signals)) if sell_signals else 0,
            "winrate": float(sell_winrate) if sell_signals else 0.0,
            "avg_pips": float(sell_pips) if sell_signals else 0.0
        }
    },
    "all_thresholds": results,
    "recommendation": f"Use signals with confidence >= {best['threshold']:.0f} for best performance"
}

config_path = Path("config/optimal_signal_config.json")
config_path.parent.mkdir(exist_ok=True)

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print(f"\n[+] Configuration saved to: {config_path}")
print(f"\n[*] Recommendation: Filter signals with confidence >= {best['threshold']:.0f}")
print("=" * 70)
