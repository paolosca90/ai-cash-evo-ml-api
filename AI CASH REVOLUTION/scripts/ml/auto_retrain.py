#!/usr/bin/env python3
"""
AUTOMATIC MODEL RETRAINING
Checks for new labeled data and retrains model when threshold is reached
"""

import os
import sys
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_key:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def check_retraining_needed():
    """
    Check if retraining is needed based on:
    1. Number of new labeled samples since last training
    2. Time since last training
    3. Performance degradation indicators
    """
    
    print("🔍 Checking if retraining is needed...")
    print("="*70)
    
    # Get last training info
    models_dir = 'ml_models'
    if not os.path.exists(models_dir):
        print("❌ No models directory found")
        return {'needed': True, 'reason': 'No trained model exists'}
    
    model_files = [f for f in os.listdir(models_dir) if f.startswith('model_') and f.endswith('.pkl')]
    
    if not model_files:
        print("❌ No trained models found")
        return {'needed': True, 'reason': 'No trained model exists'}
    
    latest_model = sorted(model_files)[-1]
    timestamp_str = latest_model.replace('model_', '').replace('.pkl', '')
    
    try:
        # Parse timestamp (format: YYYYMMDD_HHMMSS)
        last_training_date = datetime.strptime(timestamp_str, '%Y%m%d_%H%M%S')
        days_since_training = (datetime.now() - last_training_date).days
        
        print(f"📅 Last training: {last_training_date.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"⏰ Days since training: {days_since_training}")
    except:
        print("⚠️  Could not parse training date")
        days_since_training = 999
    
    # Count new labeled samples since last training
    result = supabase.table('ml_historical_candles') \
        .select('id', count='exact') \
        .eq('dataset_type', 'production') \
        .eq('is_labeled', True) \
        .gte('created_at', last_training_date.isoformat()) \
        .execute()
    
    new_samples = result.count if result.count else 0
    
    print(f"📊 New labeled samples: {new_samples}")
    
    # Decision criteria
    reasons = []
    
    # 1. Time-based: Retrain weekly
    if days_since_training >= 7:
        reasons.append(f"Weekly retraining (last: {days_since_training} days ago)")
    
    # 2. Data-based: Retrain every 1000 new samples
    if new_samples >= 1000:
        reasons.append(f"Sufficient new data ({new_samples} samples)")
    
    # 3. Count total production samples
    total_result = supabase.table('ml_historical_candles') \
        .select('id', count='exact') \
        .eq('dataset_type', 'production') \
        .eq('is_labeled', True) \
        .execute()
    
    total_production = total_result.count if total_result.count else 0
    
    print(f"📈 Total production samples: {total_production}")
    
    # 4. If production dataset is substantial, enable continuous learning
    if total_production >= 5000 and new_samples >= 500:
        reasons.append(f"Continuous learning threshold ({new_samples}/{total_production} new)")
    
    print("="*70)
    
    if reasons:
        print(f"✅ RETRAINING NEEDED")
        for reason in reasons:
            print(f"   - {reason}")
        return {
            'needed': True,
            'reasons': reasons,
            'new_samples': new_samples,
            'total_production': total_production,
            'days_since_training': days_since_training
        }
    else:
        print(f"✅ NO RETRAINING NEEDED")
        print(f"   - Only {new_samples} new samples (need 1000)")
        print(f"   - Only {days_since_training} days since last training (need 7)")
        return {
            'needed': False,
            'new_samples': new_samples,
            'total_production': total_production,
            'days_since_training': days_since_training
        }

def trigger_retraining():
    """Execute the retraining pipeline"""
    
    print("\n🚀 Starting retraining pipeline...")
    print("="*70)
    
    # 1. Run training script
    print("\n📊 Step 1: Training new model...")
    exit_code = os.system('python scripts/train_ml_model.py')
    
    if exit_code != 0:
        print("❌ Training failed")
        return False
    
    print("✅ Training completed")
    
    # 2. Run validation
    print("\n📊 Step 2: Validating new model...")
    exit_code = os.system('python scripts/validate_model.py')
    
    if exit_code != 0:
        print("❌ Validation failed")
        return False
    
    print("✅ Validation completed")
    
    # 3. Check if new model is better
    print("\n📊 Step 3: Comparing with previous model...")
    
    # Load validation results
    models_dir = 'ml_models'
    validation_files = [f for f in os.listdir(models_dir) if f.startswith('validation_results_') and f.endswith('.json')]
    
    if len(validation_files) < 2:
        print("⚠️  Not enough validation results to compare, deploying anyway")
        return True
    
    # Compare last two validations
    latest_validations = sorted(validation_files)[-2:]
    
    with open(os.path.join(models_dir, latest_validations[0]), 'r') as f:
        old_results = json.load(f)
    
    with open(os.path.join(models_dir, latest_validations[1]), 'r') as f:
        new_results = json.load(f)
    
    old_accuracy = old_results.get('overall_accuracy', 0)
    new_accuracy = new_results.get('overall_accuracy', 0)
    
    print(f"   Old model accuracy: {old_accuracy:.2f}%")
    print(f"   New model accuracy: {new_accuracy:.2f}%")
    
    if new_accuracy >= old_accuracy - 2:  # Allow 2% tolerance
        print("✅ New model is better or comparable, deploying")
        return True
    else:
        print("⚠️  New model is significantly worse, keeping old model")
        return False

def notify_retraining_complete(success: bool, info: dict):
    """Send notification about retraining completion"""
    
    # This could send email, Slack, Discord, etc.
    # For now, just log
    
    status = "SUCCESS" if success else "FAILED"
    
    notification = f"""
    
    ╔════════════════════════════════════════════════════════╗
    ║  MODEL RETRAINING {status:<35} ║
    ╚════════════════════════════════════════════════════════╝
    
    Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
    New Samples: {info.get('new_samples', 0)}
    Total Production: {info.get('total_production', 0)}
    Days Since Last: {info.get('days_since_training', 0)}
    
    """
    
    print(notification)
    
    # TODO: Send to notification service

def main():
    """Main retraining check and execution"""
    
    print("""
    ╔════════════════════════════════════════════════════════╗
    ║  AUTOMATIC MODEL RETRAINING                           ║
    ║  Continuous Learning System                           ║
    ╚════════════════════════════════════════════════════════╝
    """)
    
    # Check if retraining is needed
    check_result = check_retraining_needed()
    
    if not check_result['needed']:
        print("\n✅ No retraining needed at this time")
        return
    
    # Ask for confirmation (skip in automated mode)
    if '--auto' not in sys.argv:
        response = input("\n🤔 Proceed with retraining? (y/n): ")
        if response.lower() != 'y':
            print("❌ Retraining cancelled")
            return
    
    # Execute retraining
    success = trigger_retraining()
    
    # Notify
    notify_retraining_complete(success, check_result)
    
    if success:
        print("\n✅ Retraining completed successfully!")
        print("💡 Reload the API to use the new model:")
        print("   curl -X POST http://localhost:8000/model/reload")
    else:
        print("\n❌ Retraining failed or new model was not better")

if __name__ == '__main__':
    main()
