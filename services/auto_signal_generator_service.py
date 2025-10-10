"""
AUTO SIGNAL GENERATOR SERVICE - RAILWAY
Runs on Railway 24/7 generating 100+ signals/day
Executes trades on OANDA and stores results in Supabase
"""

import os
import time
import asyncio
from datetime import datetime, timedelta
import random
import requests
from supabase import create_client
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Environment variables (Railway)
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Configuration
CONFIG = {
    'symbols': ['EUR_USD', 'GBP_USD', 'USD_JPY', 'AUD_USD', 'USD_CAD', 'NZD_USD'],
    'target_signals_per_day': 100,
    'max_concurrent_trades': 20,
    'trading_hours': {'start': 8, 'end': 16},  # UTC
    'signal_interval_seconds': 600,  # 10 minutes
    'max_daily_loss_usd': 200,
    'max_daily_trades': 120,
}

class AutoSignalService:
    def __init__(self):
        self.daily_signals = 0
        self.today = datetime.utcnow().date()
        logger.info("Auto Signal Service initialized")

    def reset_daily_counters(self):
        """Reset counters at midnight UTC"""
        current_date = datetime.utcnow().date()
        if current_date != self.today:
            logger.info(f"New day: {current_date}, Yesterday signals: {self.daily_signals}")
            self.daily_signals = 0
            self.today = current_date

    def is_trading_hours(self):
        """Check if within trading hours"""
        hour = datetime.utcnow().hour
        return CONFIG['trading_hours']['start'] <= hour < CONFIG['trading_hours']['end']

    def can_generate_signal(self):
        """Check if can generate signal"""
        if not self.is_trading_hours():
            return False, "Outside trading hours"

        if self.daily_signals >= CONFIG['max_daily_trades']:
            return False, f"Max daily trades ({CONFIG['max_daily_trades']})"

        # Check active trades
        try:
            response = supabase.table('signal_performance')\
                .select('*', count='exact')\
                .is_('oanda_trade_closed_at', None)\
                .execute()

            active_trades = response.count or 0

            if active_trades >= CONFIG['max_concurrent_trades']:
                return False, f"Max concurrent trades ({CONFIG['max_concurrent_trades']})"

        except Exception as e:
            logger.error(f"Error checking active trades: {e}")

        return True, "OK"

    async def generate_and_execute_signal(self, symbol):
        """Generate signal and execute on OANDA via Supabase Edge Function"""
        try:
            url = f"{SUPABASE_URL}/functions/v1/generate-ai-signals"
            headers = {
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json'
            }
            payload = {
                'symbol': symbol,
                'auto_execute': True
            }

            response = requests.post(url, json=payload, headers=headers, timeout=15)

            if response.status_code == 200:
                result = response.json()
                self.daily_signals += 1
                logger.info(f"Signal generated for {symbol}: {result.get('signal', {}).get('direction')} @ {result.get('signal', {}).get('confidence', 0):.1f}%")
                return result
            else:
                logger.warning(f"Signal generation failed: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error generating signal: {e}")
            return None

    async def run_forever(self):
        """Main service loop"""
        logger.info("=" * 80)
        logger.info("AUTO SIGNAL GENERATOR SERVICE - RUNNING ON RAILWAY")
        logger.info("=" * 80)
        logger.info(f"Target: {CONFIG['target_signals_per_day']} signals/day")
        logger.info(f"Symbols: {', '.join(CONFIG['symbols'])}")
        logger.info(f"Trading hours: {CONFIG['trading_hours']['start']:02d}:00 - {CONFIG['trading_hours']['end']:02d}:00 UTC")
        logger.info("=" * 80)

        while True:
            try:
                # Reset daily counters
                self.reset_daily_counters()

                # Check if can generate
                can_generate, reason = self.can_generate_signal()

                if not can_generate:
                    logger.info(f"Waiting: {reason}")
                    await asyncio.sleep(300)  # Wait 5 minutes
                    continue

                # Select symbol
                symbol = random.choice(CONFIG['symbols'])

                # Generate signal
                result = await self.generate_and_execute_signal(symbol)

                if result and result.get('success'):
                    logger.info(f"Progress: {self.daily_signals}/{CONFIG['target_signals_per_day']} signals today")
                else:
                    logger.warning("Signal not executed")

                # Wait with jitter
                wait_time = CONFIG['signal_interval_seconds']
                jitter = random.randint(-60, 60)
                wait_time += jitter

                logger.info(f"Waiting {wait_time} seconds for next signal...")
                await asyncio.sleep(wait_time)

            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                await asyncio.sleep(60)

# Service entry point
if __name__ == "__main__":
    service = AutoSignalService()
    asyncio.run(service.run_forever())
