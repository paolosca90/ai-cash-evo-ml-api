"""
Populate initial optimization results from config/optimal_signal_config.json
"""

import os
import json
from pathlib import Path
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

# Load optimization config
config_path = Path("config/optimal_signal_config.json")
with open(config_path) as f:
    config = json.load(f)

print("[*] Populating initial weight optimization...")

# Prepare record
record = {
    "timestamp": config["timestamp"],
    "optimal_threshold": config["optimal_threshold"],
    "performance_winrate": config["performance"]["optimized_winrate"],
    "performance_avg_pips": config["performance"]["optimized_avg_pips"],
    "qualified_signals": config["performance"]["qualified_signals"],
    "total_signals": config["performance"]["total_signals"],
    "buy_count": config["by_direction"]["BUY"]["count"],
    "buy_winrate": config["by_direction"]["BUY"]["winrate"],
    "buy_avg_pips": config["by_direction"]["BUY"]["avg_pips"],
    "sell_count": config["by_direction"]["SELL"]["count"],
    "sell_winrate": config["by_direction"]["SELL"]["winrate"],
    "sell_avg_pips": config["by_direction"]["SELL"]["avg_pips"],
    "all_thresholds": config["all_thresholds"],
    "active": True
}

# Insert
response = supabase.table('weight_optimization_history').insert(record).execute()

print("[+] Initial optimization populated!")
print(f"   Optimal Threshold: {config['optimal_threshold']}")
print(f"   Win Rate: {config['performance']['optimized_winrate']:.1f}%")
print(f"   Avg Pips: {config['performance']['optimized_avg_pips']:.2f}")

# Test function
result = supabase.rpc('get_optimal_threshold').execute()
print(f"\n[+] Current optimal threshold from DB: {result.data}")
