"""
AUTOMATIC SIGNAL GENERATOR
Generates 100+ trading signals per day and executes them on OANDA
Runs continuously and analyzes real trade movements
"""

import os
from pathlib import Path
import json
import asyncio
from datetime import datetime, timedelta
import random
import requests
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
OANDA_API_KEY = env_vars.get('OANDA_API_KEY')
OANDA_ACCOUNT_ID = env_vars.get('OANDA_ACCOUNT_ID')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Trading configuration
CONFIG = {
    'symbols': ['EUR_USD', 'GBP_USD', 'USD_JPY', 'AUD_USD', 'USD_CAD', 'NZD_USD'],
    'target_signals_per_day': 100,
    'max_concurrent_trades': 20,
    'trading_hours': {
        'start': 8,   # 8 AM UTC
        'end': 16     # 4 PM UTC
    },
    'signal_interval_minutes': 10,  # Generate signal every 10 minutes
    'max_daily_loss': 200,  # USD
    'max_daily_trades': 120,
}

class AutoSignalGenerator:
    def __init__(self):
        self.daily_signals = 0
        self.daily_loss = 0
        self.active_trades = 0
        self.today = datetime.now().date()

    def reset_daily_counters(self):
        """Reset counters at midnight"""
        current_date = datetime.now().date()
        if current_date != self.today:
            print(f"\n[*] New day started: {current_date}")
            print(f"[*] Yesterday's stats: {self.daily_signals} signals generated")
            self.daily_signals = 0
            self.daily_loss = 0
            self.today = current_date

    def is_trading_hours(self):
        """Check if within trading hours"""
        now = datetime.utcnow()
        hour = now.hour
        return CONFIG['trading_hours']['start'] <= hour < CONFIG['trading_hours']['end']

    def can_generate_signal(self):
        """Check if can generate new signal"""
        if not self.is_trading_hours():
            return False, "Outside trading hours"

        if self.daily_signals >= CONFIG['max_daily_trades']:
            return False, f"Max daily trades reached ({CONFIG['max_daily_trades']})"

        if self.daily_loss >= CONFIG['max_daily_loss']:
            return False, f"Max daily loss reached (${CONFIG['max_daily_loss']})"

        if self.active_trades >= CONFIG['max_concurrent_trades']:
            return False, f"Max concurrent trades ({CONFIG['max_concurrent_trades']})"

        return True, "OK"

    async def generate_signal(self, symbol):
        """Generate signal by calling Supabase Edge Function"""
        try:
            # Call generate-ai-signals Edge Function
            url = f"{SUPABASE_URL}/functions/v1/generate-ai-signals"
            headers = {
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json'
            }
            payload = {
                'symbol': symbol,
                'auto_execute': True  # Execute on OANDA automatically
            }

            response = requests.post(url, json=payload, headers=headers, timeout=10)

            if response.status_code == 200:
                result = response.json()
                self.daily_signals += 1
                return result
            else:
                print(f"[-] Signal generation failed: {response.status_code}")
                return None

        except Exception as e:
            print(f"[-] Error generating signal: {e}")
            return None

    async def run_continuous(self):
        """Run continuously generating signals"""
        print("=" * 80)
        print("AUTO SIGNAL GENERATOR - RUNNING")
        print("=" * 80)
        print(f"\nTarget: {CONFIG['target_signals_per_day']} signals/day")
        print(f"Symbols: {', '.join(CONFIG['symbols'])}")
        print(f"Trading hours: {CONFIG['trading_hours']['start']:02d}:00 - {CONFIG['trading_hours']['end']:02d}:00 UTC")
        print(f"Interval: Every {CONFIG['signal_interval_minutes']} minutes")
        print("\nPress Ctrl+C to stop\n")

        while True:
            try:
                # Reset daily counters if needed
                self.reset_daily_counters()

                # Check if can generate signal
                can_generate, reason = self.can_generate_signal()

                if not can_generate:
                    print(f"[WAIT] {reason} - Sleeping 5 minutes...")
                    await asyncio.sleep(300)
                    continue

                # Select random symbol (round-robin would be better)
                symbol = random.choice(CONFIG['symbols'])

                print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Generating signal for {symbol}...")

                # Generate and execute signal
                result = await self.generate_signal(symbol)

                if result and result.get('success'):
                    signal = result.get('signal', {})
                    print(f"[+] Signal generated: {signal.get('direction')} @ {signal.get('confidence', 0):.1f}%")
                    print(f"[*] Daily progress: {self.daily_signals}/{CONFIG['target_signals_per_day']}")

                    # Update active trades count
                    self.active_trades = self.get_active_trades_count()
                else:
                    print(f"[-] Signal not executed")

                # Wait before next signal
                wait_seconds = CONFIG['signal_interval_minutes'] * 60
                # Add random jitter ±2 minutes
                jitter = random.randint(-120, 120)
                wait_seconds += jitter

                print(f"[*] Waiting {wait_seconds//60} minutes for next signal...")
                await asyncio.sleep(wait_seconds)

            except KeyboardInterrupt:
                print("\n\n[*] Stopping auto signal generator...")
                break
            except Exception as e:
                print(f"[-] Error in main loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error

    def get_active_trades_count(self):
        """Get count of currently active trades"""
        try:
            response = supabase.table('signal_performance')\
                .select('*', count='exact')\
                .is_('oanda_trade_closed_at', None)\
                .execute()

            return response.count or 0
        except:
            return 0

    def get_daily_stats(self):
        """Get today's trading statistics"""
        try:
            today_start = datetime.combine(self.today, datetime.min.time())

            response = supabase.table('signal_performance')\
                .select('*')\
                .gte('created_at', today_start.isoformat())\
                .execute()

            trades = response.data
            total = len(trades)
            wins = sum(1 for t in trades if t.get('win') == True)
            losses = sum(1 for t in trades if t.get('win') == False)

            return {
                'total': total,
                'wins': wins,
                'losses': losses,
                'win_rate': (wins / total * 100) if total > 0 else 0
            }
        except:
            return {'total': 0, 'wins': 0, 'losses': 0, 'win_rate': 0}

# Main execution
if __name__ == "__main__":
    print("=" * 80)
    print("INITIALIZING AUTO SIGNAL GENERATOR")
    print("=" * 80)

    generator = AutoSignalGenerator()

    # Show initial stats
    stats = generator.get_daily_stats()
    print(f"\nToday's stats so far:")
    print(f"  Signals generated: {stats['total']}")
    print(f"  Wins: {stats['wins']}")
    print(f"  Losses: {stats['losses']}")
    print(f"  Win Rate: {stats['win_rate']:.1f}%")

    active = generator.get_active_trades_count()
    print(f"  Active trades: {active}")

    print("\nStarting continuous signal generation...\n")

    # Run async
    asyncio.run(generator.run_continuous())
