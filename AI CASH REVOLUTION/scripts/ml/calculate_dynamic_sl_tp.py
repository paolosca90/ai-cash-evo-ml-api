"""
DYNAMIC SL/TP CALCULATION
Calculates optimal SL/TP for each asset based on:
- ATR (Average True Range) - volatility
- Symbol characteristics
- Market conditions
- Session volatility

Professional approach: SL/TP = ATR * multiplier
Then ML optimizes the multipliers
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
print("DYNAMIC SL/TP CALCULATION SYSTEM")
print("=" * 80)

# Symbol characteristics
SYMBOL_CONFIG = {
    'EUR_USD': {
        'pip_value': 0.0001,
        'typical_spread': 1.0,  # pips
        'min_sl_pips': 10,
        'max_sl_pips': 50,
    },
    'GBP_USD': {
        'pip_value': 0.0001,
        'typical_spread': 1.5,
        'min_sl_pips': 12,
        'max_sl_pips': 60,
    },
    'USD_JPY': {
        'pip_value': 0.01,
        'typical_spread': 1.0,
        'min_sl_pips': 10,
        'max_sl_pips': 50,
    },
    'AUD_USD': {
        'pip_value': 0.0001,
        'typical_spread': 1.2,
        'min_sl_pips': 10,
        'max_sl_pips': 50,
    },
    'USD_CAD': {
        'pip_value': 0.0001,
        'typical_spread': 1.5,
        'min_sl_pips': 10,
        'max_sl_pips': 50,
    },
    'NZD_USD': {
        'pip_value': 0.0001,
        'typical_spread': 1.5,
        'min_sl_pips': 10,
        'max_sl_pips': 50,
    },
    'XAU_USD': {
        'pip_value': 0.1,
        'typical_spread': 30,  # cents
        'min_sl_pips': 50,
        'max_sl_pips': 200,
    },
}

# Default multipliers (will be optimized with ML)
DEFAULT_MULTIPLIERS = {
    'sl_multiplier': 1.5,  # SL = ATR * 1.5
    'tp_multiplier': 3.0,  # TP = ATR * 3.0 (R:R = 2:1)
    'min_rr': 1.5,  # Minimum Risk:Reward
    'max_rr': 3.0,  # Maximum Risk:Reward
}

def calculate_atr_pips(atr_value, symbol):
    """Convert ATR to pips for the symbol"""
    config = SYMBOL_CONFIG.get(symbol, SYMBOL_CONFIG['EUR_USD'])
    pip_value = config['pip_value']

    if symbol == 'XAU_USD':
        # Gold: ATR is in dollars, pip is 0.1
        atr_pips = atr_value / pip_value
    elif symbol == 'USD_JPY':
        # JPY: pip is 0.01
        atr_pips = atr_value / pip_value
    else:
        # Major pairs: pip is 0.0001
        atr_pips = atr_value / pip_value

    return atr_pips

def calculate_dynamic_sl_tp(symbol, atr, close_price, direction='BUY', multipliers=None):
    """
    Calculate dynamic SL/TP based on ATR

    Args:
        symbol: Trading pair (e.g., 'EUR_USD')
        atr: Current ATR value
        close_price: Current close price
        direction: 'BUY' or 'SELL'
        multipliers: Custom multipliers (optional)

    Returns:
        dict with sl_price, tp_price, sl_pips, tp_pips, rr
    """
    if multipliers is None:
        multipliers = DEFAULT_MULTIPLIERS

    config = SYMBOL_CONFIG.get(symbol, SYMBOL_CONFIG['EUR_USD'])

    # Convert ATR to pips
    atr_pips = calculate_atr_pips(atr, symbol)

    # Calculate SL/TP in pips
    sl_pips = atr_pips * multipliers['sl_multiplier']
    tp_pips = atr_pips * multipliers['tp_multiplier']

    # Apply min/max constraints
    sl_pips = max(config['min_sl_pips'], min(sl_pips, config['max_sl_pips']))

    # Ensure minimum R:R ratio
    min_tp_pips = sl_pips * multipliers['min_rr']
    max_tp_pips = sl_pips * multipliers['max_rr']
    tp_pips = max(min_tp_pips, min(tp_pips, max_tp_pips))

    # Convert pips to price
    pip_value = config['pip_value']
    sl_distance = sl_pips * pip_value
    tp_distance = tp_pips * pip_value

    if direction == 'BUY':
        sl_price = close_price - sl_distance
        tp_price = close_price + tp_distance
    else:  # SELL
        sl_price = close_price + sl_distance
        tp_price = close_price - tp_distance

    # Calculate actual R:R
    rr = tp_pips / sl_pips if sl_pips > 0 else 0

    return {
        'sl_price': round(sl_price, 5),
        'tp_price': round(tp_price, 5),
        'sl_pips': round(sl_pips, 1),
        'tp_pips': round(tp_pips, 1),
        'risk_reward': round(rr, 2),
        'atr_pips': round(atr_pips, 1),
        'multipliers_used': multipliers
    }

# Test with sample data
print("\n[*] Testing Dynamic SL/TP Calculation...")
print("\nDefault Multipliers:")
print(f"  SL: ATR × {DEFAULT_MULTIPLIERS['sl_multiplier']}")
print(f"  TP: ATR × {DEFAULT_MULTIPLIERS['tp_multiplier']}")
print(f"  Min R:R: 1:{DEFAULT_MULTIPLIERS['min_rr']}")

print("\n" + "=" * 80)
print("EXAMPLES BY SYMBOL")
print("=" * 80)

# Example calculations
examples = [
    {'symbol': 'EUR_USD', 'atr': 0.0012, 'price': 1.0950, 'direction': 'BUY'},
    {'symbol': 'GBP_USD', 'atr': 0.0018, 'price': 1.2650, 'direction': 'SELL'},
    {'symbol': 'USD_JPY', 'atr': 0.45, 'price': 149.50, 'direction': 'BUY'},
    {'symbol': 'XAU_USD', 'atr': 12.5, 'price': 2025.50, 'direction': 'BUY'},
]

for ex in examples:
    result = calculate_dynamic_sl_tp(
        ex['symbol'],
        ex['atr'],
        ex['price'],
        ex['direction']
    )

    print(f"\n{ex['symbol']} ({ex['direction']}):")
    print(f"  Price: {ex['price']}")
    print(f"  ATR: {ex['atr']} ({result['atr_pips']:.1f} pips)")
    print(f"  SL: {result['sl_price']} ({result['sl_pips']:.1f} pips)")
    print(f"  TP: {result['tp_price']} ({result['tp_pips']:.1f} pips)")
    print(f"  R:R: 1:{result['risk_reward']:.2f}")

# Save configuration
config = {
    "timestamp": datetime.now().isoformat(),
    "version": "1.0_dynamic_sl_tp",
    "method": "ATR-based dynamic calculation",
    "default_multipliers": DEFAULT_MULTIPLIERS,
    "symbol_config": SYMBOL_CONFIG,
    "examples": [
        {
            'symbol': ex['symbol'],
            'atr': ex['atr'],
            'price': ex['price'],
            'direction': ex['direction'],
            'result': calculate_dynamic_sl_tp(ex['symbol'], ex['atr'], ex['price'], ex['direction'])
        }
        for ex in examples
    ],
    "next_step": "Optimize multipliers with real trade data"
}

config_path = Path("config/dynamic_sl_tp_config.json")
config_path.parent.mkdir(exist_ok=True)

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print(f"\n[+] Configuration saved to: {config_path}")

print("\n" + "=" * 80)
print("VOLATILITY ANALYSIS")
print("=" * 80)

# Analyze current market volatility
print("\n[*] Loading recent market data to calculate current ATR...")

# Load recent candles
response = supabase.table('ml_historical_candles')\
    .select('symbol, atr, timestamp')\
    .not_.is_('atr', 'null')\
    .gte('timestamp', (datetime.now() - timedelta(days=7)).isoformat())\
    .order('timestamp', desc=True)\
    .limit(1000)\
    .execute()

if response.data:
    df = pd.DataFrame(response.data)

    print(f"\nCurrent ATR by Symbol (Last 7 days):")
    print(f"{'Symbol':<12} {'Avg ATR':<12} {'ATR Pips':<12} {'Est SL':<12} {'Est TP':<12}")
    print("-" * 70)

    for symbol in df['symbol'].unique():
        symbol_data = df[df['symbol'] == symbol]
        avg_atr = symbol_data['atr'].mean()

        # Get latest price (approximate)
        latest = symbol_data.iloc[0]

        # Calculate example SL/TP
        example_price = 1.0 if 'USD' in symbol else 100.0  # Placeholder
        result = calculate_dynamic_sl_tp(symbol, avg_atr, example_price, 'BUY')

        print(f"{symbol:<12} {avg_atr:<12.5f} {result['atr_pips']:<12.1f} {result['sl_pips']:<12.1f} {result['tp_pips']:<12.1f}")
else:
    print("\n[!] No recent ATR data found")

print("\n" + "=" * 80)
print("NEXT STEPS")
print("=" * 80)
print("1. Integrate dynamic SL/TP into signal generation")
print("2. Collect real trade data with dynamic SL/TP")
print("3. Optimize multipliers with ML (scripts/optimize_atr_multipliers.py)")
print("4. Update multipliers monthly based on performance")
print("=" * 80)
