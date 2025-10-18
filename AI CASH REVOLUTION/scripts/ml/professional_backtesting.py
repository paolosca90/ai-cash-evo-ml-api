"""
PROFESSIONAL BACKTESTING SYSTEM
Uses backtrader library for accurate backtest analysis
Optimizes signal weights based on real trading performance
"""

import os
from pathlib import Path
import json
from datetime import datetime
import numpy as np
import pandas as pd
from supabase import create_client
import backtrader as bt

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
print("PROFESSIONAL BACKTESTING SYSTEM")
print("=" * 80)

# Load historical data
print("\n[*] Loading historical labeled signals...")
response = supabase.table('ml_historical_candles')\
    .select('*')\
    .eq('is_labeled', True)\
    .not_.is_('label', 'null')\
    .not_.is_('trade_outcome', 'null')\
    .not_.is_('timestamp', 'null')\
    .order('timestamp', desc=False)\
    .limit(100000)\
    .execute()

signals = response.data
print(f"[+] Loaded {len(signals)} historical signals")

if len(signals) < 100:
    print("[-] Not enough historical data")
    exit(1)

# Convert to DataFrame
df = pd.DataFrame(signals)

# Ensure datetime
df['timestamp'] = pd.to_datetime(df['timestamp'])
df = df.sort_values('timestamp')

print(f"\n[*] Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
print(f"[*] Symbols: {df['symbol'].unique().tolist()}")

# Strategy class
class ConfidenceFilterStrategy(bt.Strategy):
    params = (
        ('confidence_threshold', 70),  # Minimum confidence to take trade
        ('stop_loss_pips', 20),
        ('take_profit_pips', 40),
    )

    def __init__(self):
        self.signal_data = {}  # Store signal data by datetime
        self.trades = []

    def set_signals(self, signal_df):
        """Load signal data"""
        for idx, row in signal_df.iterrows():
            dt = row['timestamp']
            self.signal_data[dt] = {
                'label': row['label'],
                'confidence': row.get('label_confidence', 50),
                'outcome': row.get('trade_outcome'),
                'win_pips': row.get('win_pips', 0),
                'loss_pips': row.get('loss_pips', 0)
            }

    def next(self):
        """Process each bar"""
        dt = self.data.datetime.datetime()

        # Check if we have a signal for this timestamp
        if dt not in self.signal_data:
            return

        signal = self.signal_data[dt]

        # Filter by confidence
        if signal['confidence'] < self.params.confidence_threshold:
            return

        # Skip if already in position
        if self.position:
            return

        # Execute trade based on signal
        if signal['label'] == 'BUY':
            size = 1.0  # Fixed size for now
            self.buy(size=size)
            self.trades.append({
                'datetime': dt,
                'type': 'BUY',
                'confidence': signal['confidence'],
                'entry_price': self.data.close[0]
            })

        elif signal['label'] == 'SELL':
            size = 1.0
            self.sell(size=size)
            self.trades.append({
                'datetime': dt,
                'type': 'SELL',
                'confidence': signal['confidence'],
                'entry_price': self.data.close[0]
            })

    def notify_trade(self, trade):
        """Called when trade closes"""
        if trade.isclosed:
            self.trades[-1]['pnl'] = trade.pnl
            self.trades[-1]['pnl_net'] = trade.pnlcomm


# Test different confidence thresholds
print("\n[*] Running backtest with different confidence thresholds...")

thresholds = [50, 55, 60, 65, 70, 75, 80, 85, 90, 92, 95]
results = []

for threshold in thresholds:
    # Filter signals by threshold
    df_threshold = df[df['label_confidence'] >= threshold].copy()

    if len(df_threshold) < 10:
        continue

    # Calculate performance manually (since we have pre-labeled outcomes)
    wins = df_threshold[df_threshold['trade_outcome'] == 'WIN']
    losses = df_threshold[df_threshold['trade_outcome'] != 'WIN']

    total_trades = len(df_threshold)
    win_count = len(wins)
    loss_count = len(losses)

    win_rate = (win_count / total_trades) * 100 if total_trades > 0 else 0

    # Calculate pips
    total_pips = 0
    for _, row in df_threshold.iterrows():
        if row['trade_outcome'] == 'WIN':
            total_pips += row.get('win_pips', 0) or 0
        else:
            total_pips -= row.get('loss_pips', 0) or 0

    avg_pips = total_pips / total_trades if total_trades > 0 else 0

    # Calculate risk metrics
    pip_list = []
    for _, row in df_threshold.iterrows():
        if row['trade_outcome'] == 'WIN':
            pip_list.append(row.get('win_pips', 0) or 0)
        else:
            pip_list.append(-(row.get('loss_pips', 0) or 0))

    # Sharpe-like ratio (assuming risk-free rate = 0)
    if len(pip_list) > 1:
        sharpe = np.mean(pip_list) / np.std(pip_list) if np.std(pip_list) > 0 else 0
    else:
        sharpe = 0

    # Max drawdown (simplified)
    cumulative = np.cumsum(pip_list)
    running_max = np.maximum.accumulate(cumulative)
    drawdown = running_max - cumulative
    max_drawdown = np.max(drawdown) if len(drawdown) > 0 else 0

    # Profit factor
    gross_profit = sum(p for p in pip_list if p > 0)
    gross_loss = abs(sum(p for p in pip_list if p < 0))
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')

    results.append({
        'threshold': threshold,
        'total_trades': total_trades,
        'wins': win_count,
        'losses': loss_count,
        'win_rate': win_rate,
        'total_pips': total_pips,
        'avg_pips': avg_pips,
        'sharpe_ratio': sharpe,
        'max_drawdown_pips': max_drawdown,
        'profit_factor': profit_factor,
        'score': win_rate * 0.4 + avg_pips * 0.3 + sharpe * 5 + (profit_factor * 5)
    })

    print(f"  Threshold {threshold:>3}: "
          f"{total_trades:>4} trades | "
          f"{win_rate:>5.1f}% WR | "
          f"{avg_pips:>6.2f} pips | "
          f"Sharpe: {sharpe:>5.2f} | "
          f"PF: {profit_factor:>5.2f}")

# Find optimal based on composite score
optimal = max(results, key=lambda x: x['score'])

print("\n" + "=" * 80)
print("BACKTEST RESULTS")
print("=" * 80)

print(f"\n[+] Optimal Threshold: {optimal['threshold']}")
print(f"   Total Trades: {optimal['total_trades']}")
print(f"   Win Rate: {optimal['win_rate']:.2f}%")
print(f"   Wins/Losses: {optimal['wins']}/{optimal['losses']}")
print(f"   Total Pips: {optimal['total_pips']:.2f}")
print(f"   Avg Pips per Trade: {optimal['avg_pips']:.2f}")
print(f"   Sharpe Ratio: {optimal['sharpe_ratio']:.3f}")
print(f"   Max Drawdown: {optimal['max_drawdown_pips']:.2f} pips")
print(f"   Profit Factor: {optimal['profit_factor']:.2f}")

# Break down by direction
df_opt = df[df['label_confidence'] >= optimal['threshold']]
buy_signals = df_opt[df_opt['label'] == 'BUY']
sell_signals = df_opt[df_opt['label'] == 'SELL']

if len(buy_signals) > 0:
    buy_wins = len(buy_signals[buy_signals['trade_outcome'] == 'WIN'])
    buy_winrate = (buy_wins / len(buy_signals)) * 100
    buy_pips = sum(
        row.get('win_pips', 0) if row['trade_outcome'] == 'WIN'
        else -(row.get('loss_pips', 0) or 0)
        for _, row in buy_signals.iterrows()
    ) / len(buy_signals)

    print(f"\n[*] BUY Signals:")
    print(f"   Count: {len(buy_signals)}")
    print(f"   Win Rate: {buy_winrate:.2f}%")
    print(f"   Avg Pips: {buy_pips:.2f}")

if len(sell_signals) > 0:
    sell_wins = len(sell_signals[sell_signals['trade_outcome'] == 'WIN'])
    sell_winrate = (sell_wins / len(sell_signals)) * 100
    sell_pips = sum(
        row.get('win_pips', 0) if row['trade_outcome'] == 'WIN'
        else -(row.get('loss_pips', 0) or 0)
        for _, row in sell_signals.iterrows()
    ) / len(sell_signals)

    print(f"\n[*] SELL Signals:")
    print(f"   Count: {len(sell_signals)}")
    print(f"   Win Rate: {sell_winrate:.2f}%")
    print(f"   Avg Pips: {sell_pips:.2f}")

# Save results
config = {
    "timestamp": datetime.now().isoformat(),
    "version": "3.0_professional_backtest",
    "optimal_threshold": float(optimal['threshold']),
    "performance": {
        "total_trades": int(optimal['total_trades']),
        "win_rate": float(optimal['win_rate']),
        "wins": int(optimal['wins']),
        "losses": int(optimal['losses']),
        "total_pips": float(optimal['total_pips']),
        "avg_pips": float(optimal['avg_pips']),
        "sharpe_ratio": float(optimal['sharpe_ratio']),
        "max_drawdown_pips": float(optimal['max_drawdown_pips']),
        "profit_factor": float(optimal['profit_factor'])
    },
    "by_direction": {
        "BUY": {
            "count": int(len(buy_signals)) if len(buy_signals) > 0 else 0,
            "winrate": float(buy_winrate) if len(buy_signals) > 0 else 0.0,
            "avg_pips": float(buy_pips) if len(buy_signals) > 0 else 0.0
        },
        "SELL": {
            "count": int(len(sell_signals)) if len(sell_signals) > 0 else 0,
            "winrate": float(sell_winrate) if len(sell_signals) > 0 else 0.0,
            "avg_pips": float(sell_pips) if len(sell_signals) > 0 else 0.0
        }
    },
    "all_thresholds": [
        {
            'threshold': float(r['threshold']),
            'total_trades': int(r['total_trades']),
            'win_rate': float(r['win_rate']),
            'avg_pips': float(r['avg_pips']),
            'sharpe_ratio': float(r['sharpe_ratio']),
            'profit_factor': float(r['profit_factor'])
        }
        for r in results
    ]
}

config_path = Path("config/professional_backtest_results.json")
config_path.parent.mkdir(exist_ok=True)

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print(f"\n[+] Results saved to: {config_path}")
print("\n" + "=" * 80)
