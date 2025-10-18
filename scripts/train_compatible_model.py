"""
Train ML model compatible with Railway (Python 3.10 + sklearn 1.5.2)
Uses existing labeled data from Supabase
"""

import os
from pathlib import Path
import pickle
import json
from datetime import datetime
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from supabase import create_client, Client

# Read .env file
env_path = Path(".env")
env_vars = {}
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env_vars[key.strip()] = value.strip().strip('"')

# Supabase connection
SUPABASE_URL = env_vars.get('VITE_SUPABASE_URL')
SUPABASE_KEY = env_vars.get('VITE_SUPABASE_SERVICE_ROLE_KEY')

print(f"Supabase URL: {SUPABASE_URL}")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("[*] Loading labeled data from Supabase...")

# Load labeled historical candles (from ml_historical_candles)
response = supabase.table('ml_historical_candles')\
    .select('*')\
    .eq('is_labeled', True)\
    .not_.is_('label', 'null')\
    .not_.is_('open', 'null')\
    .not_.is_('high', 'null')\
    .not_.is_('low', 'null')\
    .not_.is_('close', 'null')\
    .not_.is_('rsi', 'null')\
    .not_.is_('ema12', 'null')\
    .not_.is_('ema21', 'null')\
    .not_.is_('ema50', 'null')\
    .not_.is_('atr', 'null')\
    .not_.is_('adx', 'null')\
    .execute()

signals = response.data
print(f"[+] Loaded {len(signals)} labeled candles with complete indicators")

if len(signals) < 1000:
    print("[-] Not enough labeled data. Need at least 1000 signals.")
    exit(1)

# Prepare features and labels
X = []
y = []

for signal in signals:
    # Skip if missing critical data
    if not all([signal.get('open'), signal.get('high'), signal.get('low'), 
                signal.get('close'), signal.get('label')]):
        continue
    
    features = [
        float(signal['open']),
        float(signal['high']),
        float(signal['low']),
        float(signal['close']),
        float(signal.get('volume', 1000)),
        float(signal['rsi']),
        float(signal['ema12']),
        float(signal['ema21']),
        float(signal['ema50']),
        float(signal['atr']),
        float(signal['adx'])
    ]
    
    # Map label to class
    label = signal['label']
    if label == 'BUY':
        label_class = 2
    elif label == 'SELL':
        label_class = 0
    else:  # HOLD or other
        label_class = 1
    
    X.append(features)
    y.append(label_class)

X = np.array(X)
y = np.array(y)

print(f"[+] Prepared {len(X)} samples with {X.shape[1]} features")
print(f"   BUY: {np.sum(y == 2)} | HOLD: {np.sum(y == 1)} | SELL: {np.sum(y == 0)}")

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\n[*] Training Random Forest model...")
print(f"   Training samples: {len(X_train)}")
print(f"   Test samples: {len(X_test)}")

# Train model (same hyperparameters as before)
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
print(f"\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['SELL', 'HOLD', 'BUY']))

# Save model
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
model_dir = Path("ml_models_compatible")
model_dir.mkdir(exist_ok=True)

model_path = model_dir / f"model_{timestamp}.pkl"
metadata_path = model_dir / f"metadata_{timestamp}.json"

# Save with protocol 4 for compatibility
with open(model_path, 'wb') as f:
    pickle.dump(model, f, protocol=4)

# Save metadata
metadata = {
    "timestamp": timestamp,
    "sklearn_version": "compatible",
    "python_version": "3.10_compatible",
    "n_samples": len(X),
    "n_features": X.shape[1],
    "accuracy": float(accuracy),
    "feature_names": [
        "open", "high", "low", "close", "volume",
        "rsi", "ema12", "ema21", "ema50", "atr", "adx"
    ],
    "classes": ["SELL", "HOLD", "BUY"]
}

with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)

print(f"\n[+] Model saved:")
print(f"   {model_path}")
print(f"   {metadata_path}")
print(f"\n[*] Model size: {model_path.stat().st_size / 1024:.1f} KB")

print(f"\n[*] Ready to deploy to Railway!")
print(f"   Copy {model_path} to ML API repository as models/model.pkl")
