"""
Re-train ML model from CSV with sklearn 1.5.2 compatibility
Uses existing labeled data in labels_training.csv and labels_testing.csv
"""

import pickle
import json
from datetime import datetime
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, precision_recall_fscore_support

print("[*] Loading training data from CSV...")

# Load CSV files
df_train = pd.read_csv("labels_training.csv")
df_test = pd.read_csv("labels_testing.csv")

print(f"[+] Training samples: {len(df_train)}")
print(f"[+] Testing samples: {len(df_test)}")

# Prepare features and labels
feature_columns = ['open', 'high', 'low', 'close', 'volume', 'rsi', 'ema_12', 'ema_21', 'ema_50', 'atr', 'adx']

# Check available columns
print(f"\n[*] Available columns in training CSV:")
print(df_train.columns.tolist())

# Map CSV columns to feature names (flexible mapping)
column_mapping = {
    'ema12': 'ema_12',
    'ema21': 'ema_21',
    'ema50': 'ema_50'
}

# Rename columns if needed
for old_col, new_col in column_mapping.items():
    if old_col in df_train.columns and new_col not in df_train.columns:
        df_train.rename(columns={old_col: new_col}, inplace=True)
        df_test.rename(columns={old_col: new_col}, inplace=True)

# Extract features
X_train = df_train[feature_columns].fillna(0).values
X_test = df_test[feature_columns].fillna(0).values

# Extract labels
def map_label(label):
    if label == 'BUY':
        return 2
    elif label == 'SELL':
        return 0
    else:  # HOLD or WEAK
        return 1

y_train = df_train['label'].apply(map_label).values
y_test = df_test['label'].apply(map_label).values

print(f"\n[+] Training set - BUY: {np.sum(y_train == 2)} | HOLD: {np.sum(y_train == 1)} | SELL: {np.sum(y_train == 0)}")
print(f"[+] Test set - BUY: {np.sum(y_test == 2)} | HOLD: {np.sum(y_test == 1)} | SELL: {np.sum(y_test == 0)}")

# Train model (same hyperparameters)
print(f"\n[*] Training Random Forest model...")
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

# Save model with protocol 4 for Railway compatibility
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
model_dir = Path("ml_models_railway")
model_dir.mkdir(exist_ok=True)

model_path = model_dir / "model.pkl"
metadata_path = model_dir / "metadata.json"

print(f"\n[*] Saving model with sklearn 1.5.2 compatibility (protocol 4)...")

with open(model_path, 'wb') as f:
    pickle.dump(model, f, protocol=4)

# Save metadata
metadata = {
    "timestamp": timestamp,
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
print(f"   {model_path}")
print(f"   {metadata_path}")
print(f"\n[*] Model size: {model_path.stat().st_size / 1024:.1f} KB")

print(f"\n[*] Next steps:")
print(f"   1. Copy {model_path} to ai-cash-evo-ml-api/models/")
print(f"   2. Push to GitHub")
print(f"   3. Railway will auto-deploy")
print(f"   4. Test ML predictions!")
