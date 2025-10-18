"""
Enrich labeled candles with indicators and train ML model
Step 1: Calculate technical indicators for labeled candles
Step 2: Train model with sklearn 1.5.2
"""

import os
from pathlib import Path
import pickle
import json
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, precision_recall_fscore_support
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

print("[*] Loading labeled candles from Supabase...")

# Load labeled candles (limit to training dataset)
response = supabase.table('ml_historical_candles')\
    .select('*')\
    .eq('is_labeled', True)\
    .eq('dataset_type', 'training')\
    .not_.is_('label', 'null')\
    .not_.is_('open', 'null')\
    .not_.is_('high', 'null')\
    .not_.is_('low', 'null')\
    .not_.is_('close', 'null')\
    .order('timestamp', desc=False)\
    .limit(50000)\
    .execute()

candles = response.data
print(f"[+] Loaded {len(candles)} labeled candles")

if len(candles) < 1000:
    print("[-] Not enough labeled data")
    exit(1)

# Convert to DataFrame for easier calculation
df = pd.DataFrame(candles)

print("\n[*] Calculating technical indicators...")

# EMA calculation
def calculate_ema(data, period):
    return data.ewm(span=period, adjust=False).mean()

# RSI calculation
def calculate_rsi(data, period=14):
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

# ATR calculation
def calculate_atr(df, period=14):
    high_low = df['high'] - df['low']
    high_close = np.abs(df['high'] - df['close'].shift())
    low_close = np.abs(df['low'] - df['close'].shift())
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    return tr.rolling(window=period).mean()

# ADX calculation (simplified)
def calculate_adx(df, period=14):
    plus_dm = df['high'].diff()
    minus_dm = -df['low'].diff()
    plus_dm[plus_dm < 0] = 0
    minus_dm[minus_dm < 0] = 0

    tr = calculate_atr(df, 1)
    plus_di = 100 * (plus_dm.rolling(window=period).mean() / tr.rolling(window=period).mean())
    minus_di = 100 * (minus_dm.rolling(window=period).mean() / tr.rolling(window=period).mean())

    dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di)
    adx = dx.rolling(window=period).mean()

    return adx

# Group by symbol and calculate indicators
enriched_data = []

for symbol in df['symbol'].unique():
    symbol_df = df[df['symbol'] == symbol].copy()
    symbol_df = symbol_df.sort_values('timestamp')

    # Calculate indicators
    symbol_df['ema12'] = calculate_ema(symbol_df['close'], 12)
    symbol_df['ema21'] = calculate_ema(symbol_df['close'], 21)
    symbol_df['ema50'] = calculate_ema(symbol_df['close'], 50)
    symbol_df['rsi'] = calculate_rsi(symbol_df['close'], 14)
    symbol_df['atr'] = calculate_atr(symbol_df, 14)
    symbol_df['adx'] = calculate_adx(symbol_df, 14)

    # Drop NaN rows (from indicator calculation)
    symbol_df = symbol_df.dropna()

    enriched_data.append(symbol_df)
    print(f"   [{symbol}] {len(symbol_df)} candles with indicators")

# Combine all symbols
df_enriched = pd.concat(enriched_data, ignore_index=True)
print(f"\n[+] Total enriched candles: {len(df_enriched)}")

# Prepare features and labels
feature_columns = ['open', 'high', 'low', 'close', 'volume', 'rsi', 'ema12', 'ema21', 'ema50', 'atr', 'adx']

X = df_enriched[feature_columns].fillna(0).values

# Map labels
def map_label(label):
    if label == 'BUY':
        return 2
    elif label == 'SELL':
        return 0
    else:
        return 1

y = df_enriched['label'].apply(map_label).values

print(f"\n[+] Dataset prepared:")
print(f"   Total samples: {len(X)}")
print(f"   BUY: {np.sum(y == 2)} | HOLD: {np.sum(y == 1)} | SELL: {np.sum(y == 0)}")

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\n[*] Training Random Forest model...")
print(f"   Training samples: {len(X_train)}")
print(f"   Test samples: {len(X_test)}")

# Train model
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    min_samples_split=10,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n[+] Model trained!")
print(f"   Accuracy: {accuracy * 100:.2f}%")

# Detailed metrics
precision, recall, f1, support = precision_recall_fscore_support(y_test, y_pred, average=None, labels=[0, 1, 2])

print(f"\nDetailed Metrics:")
print(f"   SELL - Precision: {precision[0]:.3f}, Recall: {recall[0]:.3f}, F1: {f1[0]:.3f}")
print(f"   HOLD - Precision: {precision[1]:.3f}, Recall: {recall[1]:.3f}, F1: {f1[1]:.3f}")
print(f"   BUY  - Precision: {precision[2]:.3f}, Recall: {recall[2]:.3f}, F1: {f1[2]:.3f}")

print(f"\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['SELL', 'HOLD', 'BUY']))

# Save model
model_dir = Path("ml_models_railway")
model_dir.mkdir(exist_ok=True)

model_path = model_dir / "model.pkl"
metadata_path = model_dir / "metadata.json"

print(f"\n[*] Saving model (sklearn 1.5.2 compatible)...")

with open(model_path, 'wb') as f:
    pickle.dump(model, f, protocol=4)

metadata = {
    "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
    "sklearn_version": "1.5.2_compatible",
    "python_version": "3.10",
    "n_train_samples": len(X_train),
    "n_test_samples": len(X_test),
    "accuracy": float(accuracy),
    "buy_precision": float(precision[2]),
    "buy_recall": float(recall[2]),
    "buy_f1": float(f1[2]),
    "sell_precision": float(precision[0]),
    "sell_recall": float(recall[0]),
    "sell_f1": float(f1[0]),
    "feature_names": feature_columns,
    "classes": ["SELL", "HOLD", "BUY"]
}

with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)

print(f"\n[+] Model saved:")
print(f"   {model_path} ({model_path.stat().st_size / 1024:.1f} KB)")
print(f"   {metadata_path}")

print(f"\n[*] Next: Deploy to Railway ML API")
print(f"   1. cd ../ai-cash-evo-ml-api")
print(f"   2. mkdir -p models")
print(f"   3. cp {model_path} ../ai-cash-evo-ml-api/models/")
print(f"   4. git add, commit, push")
