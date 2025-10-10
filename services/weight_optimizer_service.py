"""
WEIGHT OPTIMIZER SERVICE - RAILWAY
Runs daily to analyze closed trades and optimize weights
Saves optimized weights to Supabase for signal generation to use
"""

import os
import time
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from scipy.optimize import differential_evolution
from supabase import create_client
import logging
import schedule

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Environment variables
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

class WeightOptimizerService:
    def __init__(self):
        logger.info("Weight Optimizer Service initialized")

    def load_recent_trades(self, days=7):
        """Load closed trades from last N days"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        try:
            response = supabase.table('signal_performance')\
                .select('*')\
                .not_.is_('oanda_trade_closed_at', 'null')\
                .not_.is_('win', 'null')\
                .gte('created_at', cutoff_date.isoformat())\
                .execute()

            trades = response.data
            logger.info(f"Loaded {len(trades)} closed trades from last {days} days")
            return trades

        except Exception as e:
            logger.error(f"Error loading trades: {e}")
            return []

    def optimize_threshold(self, trades):
        """Optimize confidence threshold"""
        df = pd.DataFrame(trades)

        if len(df) < 50:
            logger.warning(f"Not enough trades ({len(df)}/50) for optimization")
            return 70.0  # Default

        thresholds = np.arange(50, 95, 5)
        best_score = -999999
        best_threshold = 70

        for threshold in thresholds:
            qualified = df[df['confidence'] >= threshold]

            if len(qualified) < 10:
                continue

            wins = qualified['win'].sum()
            win_rate = (wins / len(qualified)) * 100 if len(qualified) > 0 else 0

            # Score: balance win rate and number of trades
            score = win_rate * 0.7 + (len(qualified) / len(df) * 100) * 0.3

            if score > best_score:
                best_score = score
                best_threshold = threshold

        logger.info(f"Optimal threshold: {best_threshold} (score: {best_score:.1f})")
        return float(best_threshold)

    def optimize_atr_multipliers(self, trades):
        """Optimize SL/TP multipliers"""
        df = pd.DataFrame(trades)

        if len(df) < 100:
            logger.warning(f"Not enough trades ({len(df)}/100) for ATR optimization")
            return {'sl_multiplier': 1.5, 'tp_multiplier': 3.0}

        # Simplified optimization (would need actual ATR data)
        # For now, return defaults
        # TODO: Implement proper ATR-based optimization

        return {
            'sl_multiplier': 1.5,
            'tp_multiplier': 3.0,
            'risk_reward': 2.0
        }

    def save_weights_to_supabase(self, threshold, atr_multipliers, performance):
        """Save optimized weights to Supabase"""
        try:
            # Deactivate previous configs
            supabase.table('weight_optimization_history')\
                .update({'active': False})\
                .eq('active', True)\
                .execute()

            # Insert new config
            config = {
                'timestamp': datetime.utcnow().isoformat(),
                'optimal_threshold': threshold,
                'performance_winrate': performance['win_rate'],
                'performance_avg_pips': performance.get('avg_pips', 0),
                'qualified_signals': performance['qualified_trades'],
                'total_signals': performance['total_trades'],
                'active': True,
                'source': 'railway_auto_optimizer'
            }

            supabase.table('weight_optimization_history').insert(config).execute()

            logger.info(f"Weights saved to Supabase - Threshold: {threshold}, WR: {performance['win_rate']:.1f}%")

        except Exception as e:
            logger.error(f"Error saving weights: {e}")

    def run_optimization(self):
        """Run full optimization process"""
        logger.info("=" * 80)
        logger.info("RUNNING WEIGHT OPTIMIZATION")
        logger.info("=" * 80)

        # Load trades
        trades = self.load_recent_trades(days=7)

        if len(trades) < 50:
            logger.warning("Not enough trades for optimization. Skipping.")
            return

        # Convert to DataFrame
        df = pd.DataFrame(trades)

        # Calculate performance metrics
        total_trades = len(df)
        wins = df['win'].sum()
        win_rate = (wins / total_trades) * 100 if total_trades > 0 else 0

        logger.info(f"Current performance: {total_trades} trades, {win_rate:.1f}% WR")

        # Optimize threshold
        optimal_threshold = self.optimize_threshold(trades)

        # Optimize ATR multipliers
        atr_multipliers = self.optimize_atr_multipliers(trades)

        # Calculate performance with optimal threshold
        df_optimal = df[df['confidence'] >= optimal_threshold]
        qualified_trades = len(df_optimal)
        qualified_wins = df_optimal['win'].sum()
        qualified_wr = (qualified_wins / qualified_trades * 100) if qualified_trades > 0 else 0

        performance = {
            'total_trades': total_trades,
            'qualified_trades': qualified_trades,
            'win_rate': qualified_wr,
            'avg_pips': 0  # TODO: Calculate from actual data
        }

        # Save to Supabase
        self.save_weights_to_supabase(optimal_threshold, atr_multipliers, performance)

        logger.info("Optimization complete!")
        logger.info("=" * 80)

    def run_forever(self):
        """Run service with daily schedule"""
        logger.info("Weight Optimizer Service - Running on Railway")
        logger.info("Schedule: Daily at 02:00 UTC")

        # Schedule daily optimization at 2 AM UTC
        schedule.every().day.at("02:00").do(self.run_optimization)

        # Run immediately on startup
        self.run_optimization()

        # Main loop
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

# Service entry point
if __name__ == "__main__":
    service = WeightOptimizerService()
    service.run_forever()
