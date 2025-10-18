#!/usr/bin/env python3
"""
ML MODEL TRAINING
Trains a reinforcement learning model using labeled historical data
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
import numpy as np
import pandas as pd
from datetime import datetime
import json

load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_key:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def load_training_data(symbols=['EURUSD', 'USDCAD', 'USDJPY', 'XAUUSD']):
    """Load labeled training data from Supabase"""
    print("📥 Loading training data from Supabase...")
    
    all_data = []
    offset = 0
    batch_size = 10000
    
    while True:
        result = supabase.table('ml_historical_candles') \
            .select('*') \
            .eq('dataset_type', 'training') \
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
    
    print(f"   ✅ Loaded {len(all_data):,} training samples")
    return pd.DataFrame(all_data)

def prepare_features(df):
    """Prepare features for ML model"""
    print("\n⚙️  Preparing features...")
    
    # Select relevant features
    feature_cols = [
        'open', 'high', 'low', 'close', 'volume',
        'rsi', 'macd', 'macd_signal', 'macd_histogram',
        'ema12', 'ema21', 'ema50', 'ema200',
        'bb_upper', 'bb_middle', 'bb_lower',
        'atr', 'adx', 'stoch_k', 'stoch_d'
    ]
    
    # Filter only existing columns
    available_features = [col for col in feature_cols if col in df.columns]
    
    X = df[available_features].fillna(0).values
    
    # Labels: 1 for BUY, 0 for SELL
    y = (df['label'] == 'BUY').astype(int).values
    
    # Confidence scores
    confidence = df['label_confidence'].values
    
    print(f"   ✅ Features shape: {X.shape}")
    print(f"   ✅ Labels shape: {y.shape}")
    print(f"   📊 BUY: {np.sum(y):,} ({np.mean(y)*100:.1f}%)")
    print(f"   📊 SELL: {len(y) - np.sum(y):,} ({(1-np.mean(y))*100:.1f}%)")
    
    return X, y, confidence, available_features

def create_simple_model(input_dim):
    """Create a simple neural network model"""
    print("\n🧠 Creating ML model...")
    
    try:
        from tensorflow import keras
        from tensorflow.keras import layers
        
        model = keras.Sequential([
            layers.Dense(128, activation='relu', input_shape=(input_dim,)),
            layers.Dropout(0.3),
            layers.Dense(64, activation='relu'),
            layers.Dropout(0.2),
            layers.Dense(32, activation='relu'),
            layers.Dense(1, activation='sigmoid')  # Binary classification
        ])
        
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        print("   ✅ TensorFlow/Keras model created")
        return model, 'keras'
        
    except ImportError:
        print("   ⚠️  TensorFlow not available, using scikit-learn")
        from sklearn.ensemble import RandomForestClassifier
        
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        
        print("   ✅ Random Forest model created")
        return model, 'sklearn'

def train_model(model, model_type, X, y, confidence):
    """Train the model"""
    print("\n🏋️  Training model...")
    
    # Use confidence as sample weights
    sample_weights = confidence / 100.0
    
    if model_type == 'keras':
        # Split for validation
        split_idx = int(len(X) * 0.8)
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]
        w_train, w_val = sample_weights[:split_idx], sample_weights[split_idx:]
        
        history = model.fit(
            X_train, y_train,
            sample_weight=w_train,
            validation_data=(X_val, y_val, w_val),
            epochs=50,
            batch_size=32,
            verbose=1
        )
        
        train_acc = history.history['accuracy'][-1]
        val_acc = history.history['val_accuracy'][-1]
        
        print(f"\n   ✅ Training accuracy: {train_acc*100:.2f}%")
        print(f"   ✅ Validation accuracy: {val_acc*100:.2f}%")
        
    else:  # sklearn
        from sklearn.model_selection import train_test_split
        
        X_train, X_val, y_train, y_val, w_train, w_val = train_test_split(
            X, y, sample_weights, test_size=0.2, random_state=42
        )
        
        model.fit(X_train, y_train, sample_weight=w_train)
        
        train_acc = model.score(X_train, y_train, sample_weight=w_train)
        val_acc = model.score(X_val, y_val, sample_weight=w_val)
        
        print(f"\n   ✅ Training accuracy: {train_acc*100:.2f}%")
        print(f"   ✅ Validation accuracy: {val_acc*100:.2f}%")
    
    return model

def save_model(model, model_type, feature_names, metadata):
    """Save trained model"""
    print("\n💾 Saving model...")
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    model_dir = 'ml_models'
    os.makedirs(model_dir, exist_ok=True)
    
    if model_type == 'keras':
        model_path = os.path.join(model_dir, f'model_{timestamp}.h5')
        model.save(model_path)
    else:  # sklearn
        import joblib
        model_path = os.path.join(model_dir, f'model_{timestamp}.pkl')
        joblib.dump(model, model_path)
    
    # Save metadata
    metadata_path = os.path.join(model_dir, f'metadata_{timestamp}.json')
    metadata['feature_names'] = feature_names
    metadata['model_type'] = model_type
    metadata['timestamp'] = timestamp
    
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"   ✅ Model saved: {model_path}")
    print(f"   ✅ Metadata saved: {metadata_path}")
    
    return model_path, metadata_path

def save_to_database(model_path, metadata_path, metadata):
    """Save model info to database"""
    print("\n📤 Saving to database...")
    
    # Read model file as bytes
    with open(model_path, 'rb') as f:
        model_bytes = f.read()
    
    # Save to ml_model_training_runs table
    result = supabase.table('ml_model_training_runs') \
        .insert({
            'model_version': metadata['timestamp'],
            'training_samples': metadata['training_samples'],
            'validation_accuracy': metadata['validation_accuracy'],
            'training_accuracy': metadata['training_accuracy'],
            'model_config': metadata,
            'status': 'completed'
        }) \
        .execute()
    
    print("   ✅ Model info saved to database")

def main():
    print("🚀 ML MODEL TRAINING")
    print("="*70)
    print()
    
    # Step 1: Load data
    df = load_training_data()
    
    if len(df) == 0:
        print("\n❌ No labeled training data found!")
        print("   Make sure labeling is complete before training.")
        return
    
    # Step 2: Prepare features
    X, y, confidence, feature_names = prepare_features(df)
    
    # Step 3: Create model
    model, model_type = create_simple_model(X.shape[1])
    
    # Step 4: Train
    model = train_model(model, model_type, X, y, confidence)
    
    # Step 5: Save
    metadata = {
        'training_samples': len(X),
        'training_accuracy': 0.0,  # Will be updated
        'validation_accuracy': 0.0,  # Will be updated
        'symbols': ['EURUSD', 'USDCAD', 'USDJPY', 'XAUUSD'],
        'timeframes': ['M5', 'M15', 'H1', 'H4']
    }
    
    model_path, metadata_path = save_model(model, model_type, feature_names, metadata)
    
    # Step 6: Save to database
    try:
        save_to_database(model_path, metadata_path, metadata)
    except Exception as e:
        print(f"   ⚠️  Could not save to database: {e}")
    
    print("\n" + "="*70)
    print("✅ TRAINING COMPLETE!")
    print("="*70)
    print(f"\n📊 Model saved to: {model_path}")
    print(f"📊 Ready for validation and production deployment")
    print()
    print("Next steps:")
    print("  1. Run validation: python scripts/validate_model.py")
    print("  2. Test on unseen data from testing dataset")
    print("  3. Deploy to production if performance is good")

if __name__ == '__main__':
    main()
