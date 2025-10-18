#!/usr/bin/env python3
"""
MODEL VALIDATION
Tests trained model on unseen testing dataset
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
import numpy as np
import pandas as pd
import json
from datetime import datetime

load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_key:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def load_model(model_path, metadata_path):
    """Load trained model"""
    print(f"📥 Loading model from {model_path}...")
    
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    model_type = metadata['model_type']
    
    if model_type == 'keras':
        from tensorflow import keras
        model = keras.models.load_model(model_path)
    else:
        import joblib
        model = joblib.load(model_path)
    
    print(f"   ✅ {model_type.upper()} model loaded")
    return model, metadata

def load_testing_data(symbols=['EURUSD', 'USDCAD', 'USDJPY', 'XAUUSD']):
    """Load labeled testing data"""
    print("\n📥 Loading testing data...")
    
    all_data = []
    offset = 0
    batch_size = 10000
    
    while True:
        result = supabase.table('ml_historical_candles') \
            .select('*') \
            .eq('dataset_type', 'testing') \
            .eq('is_labeled', True) \
            .in_('symbol', symbols) \
            .order('timestamp') \
            .range(offset, offset + batch_size - 1) \
            .execute()
        
        if not result.data:
            break
        
        all_data.extend(result.data)
        offset += len(result.data)
        print(f"   Loaded {len(all_data):,} samples...", end='\r', flush=True)
        
        if len(result.data) < batch_size:
            break
    
    print(f"   ✅ Loaded {len(all_data):,} testing samples")
    return pd.DataFrame(all_data)

def prepare_features(df, feature_names):
    """Prepare features matching training data"""
    print("\n⚙️  Preparing features...")
    
    X = df[feature_names].fillna(0).values
    y_true = (df['label'] == 'BUY').astype(int).values
    confidence = df['label_confidence'].values
    
    print(f"   ✅ Features shape: {X.shape}")
    return X, y_true, confidence

def evaluate_model(model, model_type, X, y_true, confidence):
    """Evaluate model performance"""
    print("\n📊 Evaluating model...")
    
    # Get predictions
    if model_type == 'keras':
        y_pred_proba = model.predict(X, verbose=0).flatten()
        y_pred = (y_pred_proba > 0.5).astype(int)
    else:
        y_pred = model.predict(X)
        y_pred_proba = model.predict_proba(X)[:, 1]
    
    # Calculate metrics
    accuracy = np.mean(y_pred == y_true)
    
    # Precision and Recall for BUY
    buy_mask = y_pred == 1
    if np.sum(buy_mask) > 0:
        buy_precision = np.mean(y_true[buy_mask] == 1)
    else:
        buy_precision = 0.0
    
    buy_recall = np.mean(y_pred[y_true == 1] == 1) if np.sum(y_true == 1) > 0 else 0.0
    
    # Precision and Recall for SELL
    sell_mask = y_pred == 0
    if np.sum(sell_mask) > 0:
        sell_precision = np.mean(y_true[sell_mask] == 0)
    else:
        sell_precision = 0.0
    
    sell_recall = np.mean(y_pred[y_true == 0] == 0) if np.sum(y_true == 0) > 0 else 0.0
    
    # F1 Scores
    buy_f1 = 2 * (buy_precision * buy_recall) / (buy_precision + buy_recall) if (buy_precision + buy_recall) > 0 else 0
    sell_f1 = 2 * (sell_precision * sell_recall) / (sell_precision + sell_recall) if (sell_precision + sell_recall) > 0 else 0
    
    print(f"\n{'='*70}")
    print("VALIDATION RESULTS")
    print(f"{'='*70}")
    print(f"\n📊 Overall Accuracy: {accuracy*100:.2f}%")
    print(f"\n🔵 BUY Signals:")
    print(f"   Precision: {buy_precision*100:.2f}%")
    print(f"   Recall: {buy_recall*100:.2f}%")
    print(f"   F1-Score: {buy_f1*100:.2f}%")
    print(f"\n🔴 SELL Signals:")
    print(f"   Precision: {sell_precision*100:.2f}%")
    print(f"   Recall: {sell_recall*100:.2f}%")
    print(f"   F1-Score: {sell_f1*100:.2f}%")
    
    # Confidence calibration
    print(f"\n📈 Confidence Analysis:")
    for threshold in [0.6, 0.7, 0.8, 0.9]:
        high_conf_mask = confidence >= threshold * 100
        if np.sum(high_conf_mask) > 0:
            high_conf_acc = np.mean(y_pred[high_conf_mask] == y_true[high_conf_mask])
            print(f"   Confidence ≥ {threshold*100:.0f}%: {high_conf_acc*100:.2f}% accuracy ({np.sum(high_conf_mask):,} samples)")
    
    print(f"{'='*70}")
    
    return {
        'accuracy': accuracy,
        'buy_precision': buy_precision,
        'buy_recall': buy_recall,
        'buy_f1': buy_f1,
        'sell_precision': sell_precision,
        'sell_recall': sell_recall,
        'sell_f1': sell_f1
    }

def main():
    print("🚀 MODEL VALIDATION")
    print("="*70)
    print()
    
    # Find latest model
    model_dir = 'ml_models'
    if not os.path.exists(model_dir):
        print(f"❌ Model directory not found: {model_dir}")
        print("   Train a model first: python scripts/train_ml_model.py")
        return
    
    # Find latest model and metadata pair by timestamp in filenames
    models = [f for f in os.listdir(model_dir) if f.startswith('model_')]
    metas = [f for f in os.listdir(model_dir) if f.startswith('metadata_') and f.endswith('.json')]
    if not models or not metas:
        print(f"❌ No models or metadata found in {model_dir}")
        return

    def extract_ts(name):
        parts = name.split('_')
        if len(parts) < 2:
            return None
        # join all parts after the prefix to keep full timestamp (e.g. 20251008_223513)
        ts = '_'.join(parts[1:])
        ts = ts.split('.')[0]
        return ts

    model_map = {extract_ts(m): m for m in models if extract_ts(m)}
    meta_map = {extract_ts(m): m for m in metas if extract_ts(m)}

    common_ts = sorted(set(model_map.keys()).intersection(set(meta_map.keys())))
    if not common_ts:
        print("❌ No matching model/metadata pairs found")
        return

    latest_ts = common_ts[-1]
    model_path = os.path.join(model_dir, model_map[latest_ts])
    metadata_path = os.path.join(model_dir, meta_map[latest_ts])
    
    # Load model
    model, metadata = load_model(model_path, metadata_path)
    
    # Load testing data
    df = load_testing_data()
    
    if len(df) == 0:
        print("\n❌ No labeled testing data found!")
        print("   Make sure labeling is complete.")
        return
    
    # Prepare features
    X, y_true, confidence = prepare_features(df, metadata['feature_names'])
    
    # Evaluate
    results = evaluate_model(model, metadata['model_type'], X, y_true, confidence)
    
    # Save results
    results_path = os.path.join(model_dir, f'validation_results_{latest_ts}.json')
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to: {results_path}")
    
    # Decision
    print(f"\n{'='*70}")
    if results['accuracy'] >= 0.55 and results['buy_f1'] >= 0.50 and results['sell_f1'] >= 0.50:
        print("✅ MODEL READY FOR PRODUCTION!")
        print("   Performance meets minimum requirements")
        print("\n   Next: Deploy to production")
    else:
        print("⚠️  MODEL NEEDS IMPROVEMENT")
        print("   Consider:")
        print("   - Collecting more training data")
        print("   - Tuning hyperparameters")
        print("   - Adding more features")
        print("   - Using a different model architecture")
    print(f"{'='*70}")

if __name__ == '__main__':
    main()
