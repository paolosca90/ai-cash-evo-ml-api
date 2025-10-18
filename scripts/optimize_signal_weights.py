"""
SIGNAL WEIGHT OPTIMIZATION
Analyzes historical signals to find optimal weights for signal components
Uses backtest results (WIN/LOSS) to optimize weights
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
print("SIGNAL WEIGHT OPTIMIZATION")
print("=" * 70)

# Load historical signals with labels
print("\n[*] Loading historical labeled signals...")
response = supabase.table('ml_historical_candles')\
    .select('*')\
    .eq('is_labeled', True)\
    .not_.is_('label', 'null')\
    .not_.is_('trade_outcome', 'null')\
    .not_.is_('signal_weight', 'null')\
    .not_.is_('weight_components', 'null')\
    .limit(10000)\
    .execute()

signals = response.data
print(f"[+] Loaded {len(signals)} historical signals with outcomes")

if len(signals) < 100:
    print("[-] Not enough historical data for optimization")
    exit(1)

# Extract features and outcomes
print("\n[*] Extracting signal components...")

data = []
for signal in signals:
    try:
        components = signal.get('weight_components', {})
        if not isinstance(components, dict):
            continue

        # Extract components (if available)
        ml_conf = components.get('ml_confidence_score', 50.0)
        tech_qual = components.get('technical_quality_score', 50.0)
        market_cond = components.get('market_conditions_score', 50.0)
        mtf_conf = components.get('mtf_confirmation_score', 50.0)
        risk = components.get('risk_score', 50.0)

        # Outcome
        outcome = signal.get('trade_outcome')
        win = 1 if outcome == 'WIN' else 0
        pips = signal.get('win_pips', 0) if win else -signal.get('loss_pips', 0)

        data.append({
            'ml_confidence': ml_conf,
            'technical_quality': tech_qual,
            'market_conditions': market_cond,
            'mtf_confirmation': mtf_conf,
            'risk_score': risk,
            'win': win,
            'pips': pips,
            'label': signal.get('label')
        })
    except Exception as e:
        continue

print(f"[+] Extracted {len(data)} valid signals")

# Calculate baseline performance
wins = sum(1 for d in data if d['win'] == 1)
total = len(data)
baseline_winrate = (wins / total) * 100
baseline_pips = sum(d['pips'] for d in data) / total

print(f"\n[*] Baseline Performance:")
print(f"   Win Rate: {baseline_winrate:.1f}%")
print(f"   Avg Pips: {baseline_pips:.2f}")

# Define objective function
def calculate_signal_weight(components, weights):
    """Calculate weighted signal score"""
    w_ml, w_tech, w_market, w_mtf, w_risk = weights

    score = (
        components['ml_confidence'] * w_ml +
        components['technical_quality'] * w_tech +
        components['market_conditions'] * w_market +
        components['mtf_confirmation'] * w_mtf +
        components['risk_score'] * w_risk
    )

    return score

def objective_function(weights):
    """
    Objective: Maximize win rate AND average pips for signals above threshold
    """
    threshold = 70  # Only take signals with weight >= 70

    # Filter signals above threshold
    qualified_signals = []
    for d in data:
        weight = calculate_signal_weight(d, weights)
        if weight >= threshold:
            qualified_signals.append(d)

    if len(qualified_signals) < 10:
        # Penalize if too few signals
        return -1000

    # Calculate performance
    wins = sum(1 for s in qualified_signals if s['win'] == 1)
    winrate = (wins / len(qualified_signals)) * 100
    avg_pips = sum(s['pips'] for s in qualified_signals) / len(qualified_signals)

    # Combined objective: 70% winrate + 30% pips
    score = (winrate * 0.7) + (avg_pips * 0.3)

    return -score  # Negative because we minimize

# Optimize weights
print("\n[*] Optimizing weights...")
print("   This may take 1-2 minutes...")

# Bounds: each weight between 0 and 1, must sum to 1
bounds = [(0.0, 1.0)] * 5

# Constraint: weights must sum to 1
def constraint_sum(weights):
    return abs(sum(weights) - 1.0)

# Run optimization
result = differential_evolution(
    objective_function,
    bounds,
    strategy='best1bin',
    maxiter=100,
    popsize=15,
    tol=0.01,
    mutation=(0.5, 1),
    recombination=0.7,
    seed=42,
    workers=1,
    polish=True
)

optimal_weights = result.x
# Normalize to sum to 1
optimal_weights = optimal_weights / optimal_weights.sum()

print("\n" + "=" * 70)
print("OPTIMIZATION RESULTS")
print("=" * 70)

print("\n[+] Optimal Weights:")
print(f"   ML Confidence:      {optimal_weights[0]*100:.1f}%")
print(f"   Technical Quality:  {optimal_weights[1]*100:.1f}%")
print(f"   Market Conditions:  {optimal_weights[2]*100:.1f}%")
print(f"   MTF Confirmation:   {optimal_weights[3]*100:.1f}%")
print(f"   Risk Score:         {optimal_weights[4]*100:.1f}%")

# Test optimal weights
threshold = 70
qualified = []
for d in data:
    weight = calculate_signal_weight(d, optimal_weights)
    if weight >= threshold:
        qualified.append(d)

wins_opt = sum(1 for s in qualified if s['win'] == 1)
winrate_opt = (wins_opt / len(qualified)) * 100 if qualified else 0
avg_pips_opt = sum(s['pips'] for s in qualified) / len(qualified) if qualified else 0

print(f"\n[*] Performance with Optimal Weights (threshold >= 70):")
print(f"   Qualified Signals: {len(qualified)}/{len(data)} ({len(qualified)/len(data)*100:.1f}%)")
print(f"   Win Rate: {winrate_opt:.1f}%")
print(f"   Avg Pips: {avg_pips_opt:.2f}")
print(f"   Improvement: +{winrate_opt - baseline_winrate:.1f}% winrate, +{avg_pips_opt - baseline_pips:.2f} pips")

# Save optimal weights
weights_config = {
    "timestamp": datetime.now().isoformat(),
    "version": "1.0",
    "optimal_weights": {
        "ml_confidence": float(optimal_weights[0]),
        "technical_quality": float(optimal_weights[1]),
        "market_conditions": float(optimal_weights[2]),
        "mtf_confirmation": float(optimal_weights[3]),
        "risk_score": float(optimal_weights[4])
    },
    "performance": {
        "baseline_winrate": float(baseline_winrate),
        "baseline_pips": float(baseline_pips),
        "optimized_winrate": float(winrate_opt),
        "optimized_pips": float(avg_pips_opt),
        "qualified_signals": len(qualified),
        "total_signals": len(data)
    },
    "training_data": {
        "total_signals": len(data),
        "date_range": "historical"
    }
}

config_path = Path("config/optimal_weights.json")
config_path.parent.mkdir(exist_ok=True)

with open(config_path, 'w') as f:
    json.dump(weights_config, f, indent=2)

print(f"\n[+] Optimal weights saved to: {config_path}")
print("\n[*] Next steps:")
print("   1. Update signal calculation to use optimal weights")
print("   2. Deploy to production")
print("   3. Schedule monthly re-optimization")
