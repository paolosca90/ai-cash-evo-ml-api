# ML Model Training and Inference Deployment Pipeline

## Overview

This document outlines the complete deployment pipeline for ML model training and inference, including automated workflows, versioning, monitoring, and continuous integration/deployment (CI/CD) processes.

## Pipeline Architecture

### 1. Training Pipeline Flow

```
Data Collection → Feature Engineering → Model Training → Validation →
Versioning → A/B Testing → Production Deployment → Monitoring →
Retraining Trigger (if drift detected)
```

### 2. Inference Pipeline Flow

```
Real-time Data → Feature Processing → Model Selection → Prediction →
Confidence Scoring → Weight Application → Response Generation →
Performance Logging → Model Update
```

## Phase 1: Training Infrastructure Setup

### 1.1 Training Service Dockerfile

```dockerfile
# railway-ml-service/Dockerfile.trainer
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libpq-dev \
    postgresql-client \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy training infrastructure
COPY scripts/ ./scripts/
COPY models/ ./models/
COPY services/ ./services/
COPY utils/ ./utils/
COPY config/ ./config/

# Create necessary directories
RUN mkdir -p logs models/artifacts data/cache data/checkpoints

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV TF_FORCE_GPU_ALLOW_GROWTH=true
ENV TF_CPP_MIN_LOG_LEVEL=2

# Create non-root user
RUN useradd --create-home --shell /bin/bash trainer \
    && chown -R trainer:trainer /app
USER trainer

# Health check for training service
HEALTHCHECK --interval=60s --timeout=30s --start-period=30s --retries=3 \
    CMD python scripts/health_check.py --service trainer || exit 1

# Expose metrics endpoint
EXPOSE 8081

# Run training service
CMD ["python", "scripts/training_service.py"]
```

### 1.2 Training Service Implementation

```python
# scripts/training_service.py
"""
ML Training Service - Orchestrates model training and deployment
"""

import os
import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import schedule
import time

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import ML components
from models.lstm_trainer import LSTMTrainer
from models.weight_optimizer import WeightOptimizer
from services.database import DatabaseService
from services.data_processor import DataProcessor
from utils.config import Config
from utils.model_registry import ModelRegistry
from utils.training_monitor import TrainingMonitor
from utils.drift_detector import DriftDetector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/training_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ML Training Service",
    description="Orchestrates model training and deployment for AI Cash Evolution",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global services
config = Config()
db_service = DatabaseService(config)
model_registry = ModelRegistry(config)
training_monitor = TrainingMonitor(config)
drift_detector = DriftDetector(config)

class TrainingOrchestrator:
    """Orchestrates the complete training pipeline"""

    def __init__(self):
        self.is_training = False
        self.current_training_id = None
        self.training_queue = []

    async def execute_training_pipeline(self,
                                      training_request: Dict = None,
                                      force_retrain: bool = False) -> Dict:
        """Execute complete training pipeline"""

        if self.is_training and not force_retrain:
            return {
                'status': 'skipped',
                'message': 'Training already in progress',
                'current_training_id': self.current_training_id
            }

        try:
            self.is_training = True
            training_start = datetime.now()

            # Generate training ID
            self.current_training_id = f"training_{training_start.strftime('%Y%m%d_%H%M%S')}"

            logger.info(f"Starting training pipeline: {self.current_training_id}")

            # Step 1: Data Collection and Validation
            logger.info("Step 1: Collecting and validating training data")
            training_data = await self._collect_training_data()

            if len(training_data) < config.MIN_TRAINING_SAMPLES:
                raise ValueError(f"Insufficient training data: {len(training_data)} samples")

            # Step 2: Feature Engineering
            logger.info("Step 2: Engineering features")
            data_processor = DataProcessor(db_service)
            processed_data = await data_processor.process_training_data(training_data)

            # Step 3: Model Training
            logger.info("Step 3: Training LSTM model")
            lstm_trainer = LSTMTrainer(config)
            model_metrics = await lstm_trainer.train_with_monitoring(
                processed_data,
                training_id=self.current_training_id,
                monitor=training_monitor
            )

            # Step 4: Weight Optimization
            logger.info("Step 4: Optimizing indicator weights")
            weight_optimizer = WeightOptimizer(config, db_service)
            optimized_weights = await weight_optimizer.optimize_weights_comprehensive(
                processed_data,
                model_metrics
            )

            # Step 5: Model Validation
            logger.info("Step 5: Validating model performance")
            validation_results = await self._validate_model_performance(
                lstm_trainer,
                processed_data
            )

            # Step 6: Model Registration
            logger.info("Step 6: Registering new model")
            model_version = await model_registry.register_model(
                lstm_trainer.model,
                model_metrics,
                optimized_weights,
                self.current_training_id
            )

            # Step 7: A/B Testing Setup
            logger.info("Step 7: Setting up A/B testing")
            await self._setup_ab_testing(model_version)

            # Step 8: Database Updates
            logger.info("Step 8: Updating database")
            await self._update_database(
                model_version,
                model_metrics,
                optimized_weights,
                training_data
            )

            # Step 9: Cleanup
            logger.info("Step 9: Cleaning up resources")
            await self._cleanup_training_resources()

            training_duration = (datetime.now() - training_start).total_seconds()

            result = {
                'status': 'success',
                'training_id': self.current_training_id,
                'model_version': model_version,
                'training_duration_seconds': training_duration,
                'training_samples': len(training_data),
                'model_metrics': model_metrics,
                'validation_results': validation_results,
                'timestamp': datetime.now().isoformat()
            }

            logger.info(f"Training pipeline completed successfully: {result}")
            return result

        except Exception as e:
            logger.error(f"Training pipeline failed: {e}")

            # Log failure
            await training_monitor.log_training_failure(
                self.current_training_id,
                str(e)
            )

            return {
                'status': 'error',
                'training_id': self.current_training_id,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
        finally:
            self.is_training = False
            self.current_training_id = None

    async def _collect_training_data(self) -> List[Dict]:
        """Collect training data from various sources"""

        # Get data from database
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)

        training_data = db_service.get_training_samples(start_date, end_date)

        # Additional data sources can be added here
        # - OANDA historical data
        # - External market data feeds
        # - Synthetic data generation

        return training_data

    async def _validate_model_performance(self,
                                        trainer: LSTMTrainer,
                                        data: Dict) -> Dict:
        """Validate model performance against criteria"""

        validation_metrics = trainer.validate_model(data['X_test'], data['y_test'])

        # Check against thresholds
        validation_results = {
            'accuracy_meets_threshold': validation_metrics['accuracy'] >= config.MIN_ACCURACY,
            'win_rate_meets_threshold': validation_metrics.get('win_rate', 0) >= config.MIN_WIN_RATE,
            'validation_metrics': validation_metrics,
            'is_valid_for_production': False
        }

        # Determine if model is ready for production
        validation_results['is_valid_for_production'] = (
            validation_results['accuracy_meets_threshold'] and
            validation_results['win_rate_meets_threshold'] and
            validation_metrics['f1_score'] >= 0.6
        )

        return validation_results

    async def _setup_ab_testing(self, model_version: str):
        """Set up A/B testing for new model"""

        # Configure traffic splitting
        await model_registry.setup_ab_testing(
            new_model_version=model_version,
            traffic_percentage=10  # Start with 10% traffic
        )

    async def _update_database(self,
                             model_version: str,
                             model_metrics: Dict,
                             weights: Dict,
                             training_data: List[Dict]):
        """Update database with training results"""

        # Save training results
        training_id = db_service.save_training_results(
            model_version=model_version,
            training_samples=len(training_data),
            validation_samples=len(training_data) // 5,  # 20% for validation
            metrics=model_metrics,
            weight_changes=weights.get('changes', {}),
            feature_importance=model_metrics.get('feature_importance', {})
        )

        # Update indicator weights if they're better
        if weights.get('improvement_score', 0) > 0:
            db_service.update_weights(
                weights.get('new_weights', {}),
                model_version
            )

    async def _cleanup_training_resources(self):
        """Clean up temporary training resources"""

        # Clean up temporary files
        import shutil
        temp_dirs = ['/app/tmp', '/app/data/cache']
        for temp_dir in temp_dirs:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
                os.makedirs(temp_dir, exist_ok=True)

# Initialize orchestrator
orchestrator = TrainingOrchestrator()

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""

    status = {
        'status': 'healthy',
        'service': 'ml-training-service',
        'timestamp': datetime.now().isoformat(),
        'is_training': orchestrator.is_training,
        'current_training_id': orchestrator.current_training_id
    }

    # Check database connection
    try:
        db_status = db_service.test_connection()
        status['database'] = 'connected' if db_status else 'disconnected'
    except Exception as e:
        status['database'] = f'error: {str(e)}'

    return status

@app.post("/train")
async def trigger_training(background_tasks: BackgroundTasks,
                         force_retrain: bool = False,
                         training_config: Optional[Dict] = None):
    """Trigger model training"""

    if orchestrator.is_training and not force_retrain:
        raise HTTPException(
            status_code=409,
            detail="Training already in progress"
        )

    # Queue training task
    background_tasks.add_task(
        orchestrator.execute_training_pipeline,
        training_config,
        force_retrain
    )

    return {
        'status': 'queued',
        'message': 'Training pipeline queued',
        'training_id': f"training_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    }

@app.get("/training-status")
async def get_training_status():
    """Get current training status"""

    if not orchestrator.is_training:
        return {
            'status': 'idle',
            'message': 'No training in progress'
        }

    # Get detailed status from monitor
    training_status = await training_monitor.get_training_status(
        orchestrator.current_training_id
    )

    return training_status

@app.get("/models")
async def list_models():
    """List all available models"""

    models = await model_registry.list_models()
    return {
        'models': models,
        'count': len(models)
    }

@app.post("/models/{model_version}/promote")
async def promote_model(model_version: str, traffic_percentage: int = 50):
    """Promote model to production"""

    try:
        result = await model_registry.promote_model(
            model_version=model_version,
            traffic_percentage=traffic_percentage
        )

        return {
            'status': 'success',
            'message': f'Model {model_version} promoted with {traffic_percentage}% traffic',
            'result': result
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/drift-detection")
async def trigger_drift_detection():
    """Trigger model drift detection"""

    try:
        drift_results = await drift_detector.detect_drift()

        return {
            'status': 'success',
            'drift_detected': drift_results.get('drift_detected', False),
            'results': drift_results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Scheduled training
def schedule_training():
    """Schedule automatic training"""

    # Weekly training on Sundays at 2 AM UTC
    schedule.every().sunday.at("02:00").do(
        asyncio.run,
        orchestrator.execute_training_pipeline()
    )

    # Daily health check
    schedule.every().day.at("00:00").do(
        asyncio.run,
        drift_detector.detect_drift()
    )

    while True:
        schedule.run_pending()
        time.sleep(60)

# Start scheduled tasks in background
import threading
scheduler_thread = threading.Thread(target=schedule_training, daemon=True)
scheduler_thread.start()

if __name__ == "__main__":
    port = int(os.environ.get('TRAINING_PORT', 8081))

    logger.info(f"Starting ML Training Service on port {port}")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
```

### 1.3 Model Registry Service

```python
# utils/model_registry.py
"""
Model Registry - Manages model versioning, deployment, and A/B testing
"""

import os
import json
import pickle
import boto3
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class ModelRegistry:
    """Manages ML model lifecycle"""

    def __init__(self, config):
        self.config = config
        self.s3_client = boto3.client('s3') if config.USE_S3_STORAGE else None
        self.models_dir = '/app/models/registry'
        os.makedirs(self.models_dir, exist_ok=True)

    async def register_model(self,
                           model,
                           metrics: Dict,
                           weights: Dict,
                           training_id: str) -> str:
        """Register a new model version"""

        # Generate model version
        model_version = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Create model metadata
        metadata = {
            'version': model_version,
            'training_id': training_id,
            'created_at': datetime.now().isoformat(),
            'status': 'trained',
            'metrics': metrics,
            'weights': weights,
            'feature_names': self.config.INDICATORS_LIST,
            'model_type': 'LSTM',
            'framework': 'tensorflow'
        }

        # Save model locally
        await self._save_model_locally(model, model_version, metadata)

        # Upload to S3 if configured
        if self.s3_client:
            await self._upload_model_to_s3(model, model_version, metadata)

        # Register in database
        await self._register_in_database(model_version, metadata)

        logger.info(f"Model registered successfully: {model_version}")
        return model_version

    async def _save_model_locally(self, model, version: str, metadata: Dict):
        """Save model to local filesystem"""

        version_dir = os.path.join(self.models_dir, version)
        os.makedirs(version_dir, exist_ok=True)

        # Save model
        model_path = os.path.join(version_dir, 'model.h5')
        model.save(model_path)

        # Save metadata
        metadata_path = os.path.join(version_dir, 'metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        # Save model class weights if applicable
        weights_path = os.path.join(version_dir, 'model_weights.pkl')
        with open(weights_path, 'wb') as f:
            pickle.dump(model.get_weights(), f)

    async def _upload_model_to_s3(self, model, version: str, metadata: Dict):
        """Upload model to S3 storage"""

        bucket = self.config.S3_BUCKET

        try:
            # Upload model file
            model_key = f"models/{version}/model.h5"
            self.s3_client.upload_file(
                f"{self.models_dir}/{version}/model.h5",
                bucket,
                model_key
            )

            # Upload metadata
            metadata_key = f"models/{version}/metadata.json"
            self.s3_client.put_object(
                Bucket=bucket,
                Key=metadata_key,
                Body=json.dumps(metadata, indent=2),
                ContentType='application/json'
            )

            logger.info(f"Model uploaded to S3: s3://{bucket}/{model_key}")

        except Exception as e:
            logger.error(f"Failed to upload model to S3: {e}")
            raise

    async def _register_in_database(self, version: str, metadata: Dict):
        """Register model in database"""

        # This would update the ml_models table in Supabase
        # Implementation depends on your database service
        pass

    async def setup_ab_testing(self, new_model_version: str, traffic_percentage: int):
        """Set up A/B testing for new model"""

        # Configure traffic splitting
        ab_config = {
            'new_model': new_model_version,
            'traffic_percentage': traffic_percentage,
            'enabled': True,
            'created_at': datetime.now().isoformat()
        }

        # Save A/B testing configuration
        config_path = os.path.join(self.models_dir, 'ab_testing_config.json')
        with open(config_path, 'w') as f:
            json.dump(ab_config, f, indent=2)

        logger.info(f"A/B testing configured: {ab_config}")

    async def promote_model(self, model_version: str, traffic_percentage: int):
        """Promote model to production with specified traffic percentage"""

        # Update A/B testing configuration
        await self.setup_ab_testing(model_version, traffic_percentage)

        # If traffic is 100%, make it the active model
        if traffic_percentage >= 100:
            await self._activate_model(model_version)

        return {
            'model_version': model_version,
            'traffic_percentage': traffic_percentage,
            'status': 'promoted'
        }

    async def _activate_model(self, model_version: str):
        """Activate model as primary production model"""

        # Update model status in database
        # Deactivate previous active model
        # Activate new model

        logger.info(f"Model activated as primary: {model_version}")

    async def list_models(self) -> List[Dict]:
        """List all registered models"""

        models = []

        # Scan local models directory
        for version_dir in os.listdir(self.models_dir):
            if os.path.isdir(os.path.join(self.models_dir, version_dir)):
                metadata_path = os.path.join(self.models_dir, version_dir, 'metadata.json')

                if os.path.exists(metadata_path):
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                        models.append(metadata)

        # Sort by creation date (newest first)
        models.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        return models

    async def get_model(self, version: str) -> tuple:
        """Load model by version"""

        model_path = os.path.join(self.models_dir, version, 'model.h5')
        metadata_path = os.path.join(self.models_dir, version, 'metadata.json')

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {version}")

        # Load metadata
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)

        # Load model (implementation depends on framework)
        import tensorflow as tf
        model = tf.keras.models.load_model(model_path)

        return model, metadata

    async def get_active_model(self) -> tuple:
        """Get currently active production model"""

        # This would check database for active model
        # For now, return the latest model
        models = await self.list_models()

        if not models:
            raise ValueError("No models available")

        latest_version = models[0]['version']
        return await self.get_model(latest_version)
```

## Phase 2: Inference Service

### 2.1 Inference Service Implementation

```python
# scripts/inference_service.py
"""
ML Inference Service - Handles real-time predictions
"""

import os
import asyncio
import logging
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
import numpy as np

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import ML components
from models.lstm_trainer import LSTMTrainer
from services.database import DatabaseService
from services.predictor import PredictionService
from utils.config import Config
from utils.model_registry import ModelRegistry
from utils.cache_manager import CacheManager
from utils.performance_monitor import PerformanceMonitor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ML Inference Service",
    description="Real-time ML predictions for AI Cash Evolution",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class PredictionRequest(BaseModel):
    symbol: str
    indicators: Dict[str, float]
    model_version: Optional[str] = None
    include_weights: bool = True

class PredictionResponse(BaseModel):
    symbol: str
    prediction: Dict
    model_version: str
    timestamp: str
    processing_time_ms: int
    cache_hit: bool

# Global services
config = Config()
db_service = DatabaseService(config)
model_registry = ModelRegistry(config)
cache_manager = CacheManager(config)
performance_monitor = PerformanceMonitor(config)

class InferenceEngine:
    """High-performance inference engine"""

    def __init__(self):
        self.current_model = None
        self.current_model_version = None
        self.model_load_time = None
        self.prediction_cache = {}

    async def initialize(self):
        """Initialize inference engine"""
        await self._load_active_model()
        logger.info("Inference engine initialized")

    async def _load_active_model(self, force_reload: bool = False):
        """Load active model"""

        if not force_reload and self.current_model is not None:
            return

        try:
            model, metadata = await model_registry.get_active_model()
            self.current_model = model
            self.current_model_version = metadata['version']
            self.model_load_time = datetime.now()

            logger.info(f"Loaded model: {self.current_model_version}")

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    async def predict(self, request: PredictionRequest) -> Dict:
        """Generate prediction for request"""

        start_time = time.time()

        try:
            # Check cache first
            cache_key = self._generate_cache_key(request)
            cached_result = await cache_manager.get(cache_key)

            if cached_result:
                processing_time = int((time.time() - start_time) * 1000)
                return {
                    **cached_result,
                    'processing_time_ms': processing_time,
                    'cache_hit': True
                }

            # Ensure model is loaded
            await self._load_active_model()

            # Prepare features
            features = self._prepare_features(request.indicators)

            # Generate prediction
            prediction = await self._generate_prediction(
                features,
                request.symbol,
                request.model_version
            )

            # Apply weights if requested
            if request.include_weights:
                weights = await self._get_indicator_weights()
                prediction = self._apply_weights(prediction, weights)

            # Build response
            response = {
                'symbol': request.symbol,
                'prediction': prediction,
                'model_version': self.current_model_version,
                'timestamp': datetime.now().isoformat()
            }

            # Cache result
            await cache_manager.set(cache_key, response, ttl=60)  # 60 seconds TTL

            processing_time = int((time.time() - start_time) * 1000)

            # Log prediction for monitoring
            await performance_monitor.log_prediction(
                symbol=request.symbol,
                model_version=self.current_model_version,
                prediction=prediction,
                processing_time_ms=processing_time,
                cache_hit=False
            )

            return {
                **response,
                'processing_time_ms': processing_time,
                'cache_hit': False
            }

        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    def _prepare_features(self, indicators: Dict[str, float]) -> np.ndarray:
        """Prepare features for model input"""

        feature_order = [
            'adx_value', 'rsi_value', 'ema_12', 'ema_21', 'ema_50',
            'vwap', 'atr_value', 'bollinger_upper', 'bollinger_lower',
            'stoch_k', 'stoch_d', 'macd_line', 'macd_signal',
            'volume_ma', 'price_change_pct', 'volatility'
        ]

        features = []
        for feature_name in feature_order:
            value = indicators.get(feature_name, 0.0)
            features.append(value)

        return np.array([features])  # Add batch dimension

    async def _generate_prediction(self,
                                 features: np.ndarray,
                                 symbol: str,
                                 model_version: Optional[str] = None) -> Dict:
        """Generate prediction using loaded model"""

        if self.current_model is None:
            raise ValueError("No model loaded")

        # Make prediction
        prediction_proba = self.current_model.predict(features)[0]
        predicted_class = np.argmax(prediction_proba)

        # Map class to signal
        class_mapping = {0: 'SELL', 1: 'HOLD', 2: 'BUY'}
        direction = class_mapping[predicted_class]
        confidence = float(prediction_proba[predicted_class]) * 100

        # Create prediction object
        prediction = {
            'direction': direction,
            'confidence': round(confidence, 2),
            'probabilities': {
                'BUY': round(float(prediction_proba[2]) * 100, 2),
                'HOLD': round(float(prediction_proba[1]) * 100, 2),
                'SELL': round(float(prediction_proba[0]) * 100, 2)
            },
            'recommendation': self._generate_recommendation(direction, confidence),
            'position_multiplier': self._calculate_position_multiplier(direction, confidence),
            'risk_level': self._assess_risk_level(direction, confidence)
        }

        return prediction

    def _generate_recommendation(self, direction: str, confidence: float) -> str:
        """Generate trading recommendation"""

        if confidence >= 80:
            return f"STRONG_{direction}"
        elif confidence >= 70:
            return direction
        elif confidence >= 60:
            return f"WEAK_{direction}"
        else:
            return "AVOID"

    def _calculate_position_multiplier(self, direction: str, confidence: float) -> float:
        """Calculate position size multiplier"""

        if direction == 'HOLD':
            return 0.0

        # Scale position size based on confidence
        if confidence >= 85:
            return 2.0
        elif confidence >= 75:
            return 1.5
        elif confidence >= 65:
            return 1.0
        else:
            return 0.5

    def _assess_risk_level(self, direction: str, confidence: float) -> str:
        """Assess risk level"""

        if direction == 'HOLD':
            return 'LOW'

        if confidence >= 80:
            return 'LOW'
        elif confidence >= 70:
            return 'MEDIUM'
        else:
            return 'HIGH'

    async def _get_indicator_weights(self) -> Dict[str, float]:
        """Get current indicator weights"""

        try:
            weights = db_service.get_current_weights()
            return {w['indicator_name']: w['current_weight'] for w in weights}
        except Exception as e:
            logger.error(f"Failed to get weights: {e}")
            return {}

    def _apply_weights(self, prediction: Dict, weights: Dict[str, float]) -> Dict:
        """Apply indicator weights to prediction"""

        # Calculate weighted confidence
        if weights:
            avg_weight = np.mean(list(weights.values()))
            weight_factor = min(2.0, max(0.5, avg_weight))

            # Adjust confidence based on weights
            adjusted_confidence = prediction['confidence'] * weight_factor
            prediction['confidence'] = min(99.0, adjusted_confidence)

            # Update recommendation based on adjusted confidence
            prediction['recommendation'] = self._generate_recommendation(
                prediction['direction'],
                prediction['confidence']
            )

        prediction['weights_applied'] = True
        prediction['weights'] = weights

        return prediction

    def _generate_cache_key(self, request: PredictionRequest) -> str:
        """Generate cache key for request"""

        # Create deterministic key from request data
        key_data = {
            'symbol': request.symbol,
            'indicators': sorted(request.indicators.items()),
            'model_version': request.model_version
        }

        import hashlib
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_str.encode()).hexdigest()

# Initialize inference engine
inference_engine = InferenceEngine()

# API Endpoints
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    await inference_engine.initialize()

@app.get("/health")
async def health_check():
    """Health check endpoint"""

    return {
        'status': 'healthy',
        'service': 'ml-inference-service',
        'timestamp': datetime.now().isoformat(),
        'model_loaded': inference_engine.current_model is not None,
        'model_version': inference_engine.current_model_version,
        'model_load_time': inference_engine.model_load_time.isoformat() if inference_engine.model_load_time else None
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Generate prediction"""

    result = await inference_engine.predict(request)
    return PredictionResponse(**result)

@app.post("/batch-predict")
async def batch_predict(requests: List[PredictionRequest]):
    """Generate predictions for multiple requests"""

    results = []
    errors = []

    # Process requests in parallel
    tasks = [inference_engine.predict(req) for req in requests]
    responses = await asyncio.gather(*tasks, return_exceptions=True)

    for i, response in enumerate(responses):
        if isinstance(response, Exception):
            errors.append({
                'index': i,
                'symbol': requests[i].symbol,
                'error': str(response)
            })
        else:
            results.append(response)

    return {
        'success': True,
        'total_requests': len(requests),
        'successful_predictions': len(results),
        'errors': len(errors),
        'results': results,
        'errors': errors
    }

@app.post("/reload-model")
async def reload_model():
    """Reload current model"""

    try:
        await inference_engine._load_active_model(force_reload=True)

        return {
            'status': 'success',
            'message': 'Model reloaded successfully',
            'model_version': inference_engine.current_model_version
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/info")
async def get_model_info():
    """Get information about current model"""

    if inference_engine.current_model is None:
        raise HTTPException(status_code=404, detail="No model loaded")

    return {
        'model_version': inference_engine.current_model_version,
        'model_load_time': inference_engine.model_load_time.isoformat(),
        'feature_names': config.INDICATORS_LIST,
        'model_type': 'LSTM',
        'framework': 'TensorFlow'
    }

@app.get("/metrics")
async def get_metrics():
    """Get performance metrics"""

    return await performance_monitor.get_metrics()

if __name__ == "__main__":
    port = int(os.environ.get('INFERENCE_PORT', 8080))

    logger.info(f"Starting ML Inference Service on port {port}")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
```

## Phase 3: CI/CD Pipeline

### 3.1 GitHub Actions Workflow

```yaml
# .github/workflows/ml-pipeline.yml
name: ML Pipeline CI/CD

on:
  push:
    branches: [main, develop]
    paths: ['railway-ml-service/**', 'scripts/ml/**']
  pull_request:
    branches: [main]
    paths: ['railway-ml-service/**', 'scripts/ml/**']
  schedule:
    # Weekly training trigger
    - cron: '0 2 * * 0'  # Sunday 2 AM UTC
  workflow_dispatch:
    inputs:
      force_retrain:
        description: 'Force model retraining'
        required: false
        default: 'false'
        type: boolean
      deploy_to_production:
        description: 'Deploy to production'
        required: false
        default: 'false'
        type: boolean

env:
  PYTHON_VERSION: '3.11'
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Test and Validation
  test:
    runs-on: ubuntu-latest
    outputs:
      should_train: ${{ steps.decide.outputs.should_train }}

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ env.PYTHON_VERSION }}

    - name: Cache pip dependencies
      uses: actions/cache@v3
      with:
        path: ~/.cache/pip
        key: ${{ runner.os }}-pip-${{ hashFiles('railway-ml-service/requirements.txt') }}
        restore-keys: |
          ${{ runner.os }}-pip-

    - name: Install dependencies
      run: |
        cd railway-ml-service
        pip install -r requirements.txt

    - name: Run unit tests
      run: |
        cd railway-ml-service
        python -m pytest tests/ -v --cov=models --cov=services --cov=utils

    - name: Run integration tests
      run: |
        cd railway-ml-service
        python -m pytest tests/integration/ -v

    - name: Validate model architecture
      run: |
        cd railway-ml-service
        python scripts/validate_model_architecture.py

    - name: Test data processing pipeline
      run: |
        cd railway-ml-service
        python scripts/test_data_processing.py

    - name: Decide on training
      id: decide
      run: |
        if [ "${{ github.event_name }}" = "schedule" ] || [ "${{ github.event.inputs.force_retrain }}" = "true" ]; then
          echo "should_train=true" >> $GITHUB_OUTPUT
        else
          echo "should_train=false" >> $GITHUB_OUTPUT
        fi

  # Build and Push Docker Images
  build:
    needs: test
    runs-on: ubuntu-latest
    if: needs.test.outputs.should_train == 'true' || github.ref == 'refs/heads/main'

    strategy:
      matrix:
        service: [ml-api, ml-trainer, ml-inference]

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-${{ matrix.service }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./railway-ml-service/Dockerfile.${{ matrix.service }}
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  # Model Training
  train:
    needs: [test, build]
    runs-on: ubuntu-latest
    if: needs.test.outputs.should_train == 'true'
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_ml
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ env.PYTHON_VERSION }}

    - name: Install dependencies
      run: |
        cd railway-ml-service
        pip install -r requirements.txt

    - name: Run training
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_ml
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      run: |
        cd railway-ml-service
        python scripts/ml/train_ml_model.py --force-retrain

    - name: Validate trained model
      run: |
        cd railway-ml-service
        python scripts/ml/validate_model.py

    - name: Upload model artifacts
      uses: actions/upload-artifact@v3
      with:
        name: trained-model-${{ github.sha }}
        path: |
          railway-ml-service/models/artifacts/
          railway-ml-service/logs/
        retention-days: 30

  # Deploy to Production
  deploy:
    needs: [test, build, train]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event.inputs.deploy_to_production == 'true'

    environment: production

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Deploy to Railway
      uses: railway-app/railway-action@v1
      with:
        service: ml-api
        api-token: ${{ secrets.RAILWAY_TOKEN }}
        command: up

    - name: Deploy trainer service
      uses: railway-app/railway-action@v1
      with:
        service: ml-trainer
        api-token: ${{ secrets.RAILWAY_TOKEN }}
        command: up

    - name: Deploy inference service
      uses: railway-app/railway-action@v1
      with:
        service: ml-inference
        api-token: ${{ secrets.RAILWAY_TOKEN }}
        command: up

    - name: Wait for deployment
      run: sleep 60

    - name: Run smoke tests
      run: |
        # Test API endpoints
        curl -f ${{ secrets.ML_API_URL }}/health || exit 1
        curl -f ${{ secrets.TRAINING_API_URL }}/health || exit 1
        curl -f ${{ secrets.INFERENCE_API_URL }}/health || exit 1

        # Test prediction endpoint
        curl -X POST -H "Content-Type: application/json" \
          -d '{"symbol":"EURUSD","indicators":{"rsi_value":50}}' \
          ${{ secrets.INFERENCE_API_URL }}/predict || exit 1

    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#ml-deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      if: always()

  # Performance Monitoring
  monitor:
    needs: deploy
    runs-on: ubuntu-latest
    if: always() && needs.deploy.result == 'success'

    steps:
    - name: Monitor deployment health
      run: |
        # Wait for services to be fully ready
        sleep 120

        # Check service health
        for service in ml-api ml-trainer ml-inference; do
          url="${{ secrets.BASE_URL }}/$service/health"
          if ! curl -f "$url"; then
            echo "Service $service is not healthy"
            exit 1
          fi
        done

        echo "All services are healthy"

    - name: Load testing
      run: |
        # Install k6
        sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6

        # Run load tests
        k6 run --vus 10 --duration 60s scripts/load_test.js

    - name: Performance report
      run: |
        echo "Generating performance report..."
        # Additional performance monitoring logic here
```

### 3.2 Load Testing Script

```javascript
// scripts/load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 10 },    // Stay at 10 users
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],     // Less than 1% failures
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function() {
  // Test health endpoint
  let healthResponse = http.get(`${BASE_URL}/health`);
  check(healthResponse, {
    'health endpoint status is 200': (r) => r.status === 200,
    'health response time < 100ms': (r) => r.timings.duration < 100,
  });

  // Test prediction endpoint
  let predictionPayload = JSON.stringify({
    symbol: 'EURUSD',
    indicators: {
      rsi_value: 45 + Math.random() * 10,
      adx_value: 25 + Math.random() * 10,
      ema_12: 1.0850 + Math.random() * 0.0010,
      ema_21: 1.0845 + Math.random() * 0.0010,
      atr_value: 0.0010 + Math.random() * 0.0005,
    }
  });

  let predictionParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  let predictionResponse = http.post(`${BASE_URL}/predict`, predictionPayload, predictionParams);
  check(predictionResponse, {
    'prediction endpoint status is 200': (r) => r.status === 200,
    'prediction response has direction': (r) => JSON.parse(r.body).prediction.direction !== undefined,
    'prediction confidence is reasonable': (r) => {
      let confidence = JSON.parse(r.body).prediction.confidence;
      return confidence >= 0 && confidence <= 100;
    },
    'prediction response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'performance-summary.json': JSON.stringify(data, null, 2),
  };
}
```

## Phase 4: Monitoring and Alerting

### 4.1 Performance Monitoring Implementation

```python
# utils/performance_monitor.py
"""
Performance monitoring for ML services
"""

import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List
import asyncio
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class PredictionMetric:
    timestamp: datetime
    symbol: str
    model_version: str
    processing_time_ms: int
    cache_hit: bool
    prediction: Dict

@dataclass
class SystemMetric:
    timestamp: datetime
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    active_connections: int

class PerformanceMonitor:
    """Monitors ML service performance"""

    def __init__(self, config):
        self.config = config
        self.prediction_metrics = []
        self.system_metrics = []
        self.max_metrics = 10000  # Keep last 10k metrics

    async def log_prediction(self,
                           symbol: str,
                           model_version: str,
                           prediction: Dict,
                           processing_time_ms: int,
                           cache_hit: bool):
        """Log a prediction metric"""

        metric = PredictionMetric(
            timestamp=datetime.now(),
            symbol=symbol,
            model_version=model_version,
            processing_time_ms=processing_time_ms,
            cache_hit=cache_hit,
            prediction=prediction
        )

        self.prediction_metrics.append(metric)

        # Trim old metrics
        if len(self.prediction_metrics) > self.max_metrics:
            self.prediction_metrics = self.prediction_metrics[-self.max_metrics:]

        # Alert on slow predictions
        if processing_time_ms > 1000:
            await self._send_alert(
                'slow_prediction',
                f'Slow prediction detected: {processing_time_ms}ms for {symbol}'
            )

    async def log_system_metrics(self):
        """Log system performance metrics"""

        import psutil

        metric = SystemMetric(
            timestamp=datetime.now(),
            cpu_usage=psutil.cpu_percent(),
            memory_usage=psutil.virtual_memory().percent,
            disk_usage=psutil.disk_usage('/').percent,
            active_connections=len(asyncio.all_tasks())
        )

        self.system_metrics.append(metric)

        # Trim old metrics
        if len(self.system_metrics) > self.max_metrics:
            self.system_metrics = self.system_metrics[-self.max_metrics:]

        # Alert on high resource usage
        if metric.cpu_usage > 90:
            await self._send_alert('high_cpu', f'High CPU usage: {metric.cpu_usage}%')

        if metric.memory_usage > 90:
            await self._send_alert('high_memory', f'High memory usage: {metric.memory_usage}%')

    async def get_metrics(self) -> Dict:
        """Get current performance metrics"""

        if not self.prediction_metrics:
            return {
                'total_predictions': 0,
                'avg_processing_time_ms': 0,
                'cache_hit_rate': 0,
                'error_rate': 0
            }

        # Calculate metrics for last hour
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_metrics = [
            m for m in self.prediction_metrics
            if m.timestamp >= one_hour_ago
        ]

        if not recent_metrics:
            recent_metrics = self.prediction_metrics[-100:]  # Last 100 metrics

        total_predictions = len(recent_metrics)
        avg_processing_time = sum(m.processing_time_ms for m in recent_metrics) / total_predictions
        cache_hits = sum(1 for m in recent_metrics if m.cache_hit)
        cache_hit_rate = cache_hits / total_predictions if total_predictions > 0 else 0

        # Calculate error rate (predictions with confidence < 50%)
        low_confidence_predictions = sum(
            1 for m in recent_metrics
            if m.prediction.get('confidence', 0) < 50
        )
        error_rate = low_confidence_predictions / total_predictions if total_predictions > 0 else 0

        # Get top symbols by prediction count
        symbol_counts = {}
        for metric in recent_metrics:
            symbol_counts[metric.symbol] = symbol_counts.get(metric.symbol, 0) + 1

        top_symbols = sorted(symbol_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        return {
            'total_predictions': total_predictions,
            'avg_processing_time_ms': round(avg_processing_time, 2),
            'cache_hit_rate': round(cache_hit_rate * 100, 2),
            'error_rate': round(error_rate * 100, 2),
            'top_symbols': top_symbols,
            'system_metrics': self._get_latest_system_metrics()
        }

    def _get_latest_system_metrics(self) -> Dict:
        """Get latest system metrics"""

        if not self.system_metrics:
            return {}

        latest = self.system_metrics[-1]
        return {
            'cpu_usage': latest.cpu_usage,
            'memory_usage': latest.memory_usage,
            'disk_usage': latest.disk_usage,
            'active_connections': latest.active_connections,
            'timestamp': latest.timestamp.isoformat()
        }

    async def _send_alert(self, alert_type: str, message: str):
        """Send alert notification"""

        logger.warning(f"ALERT [{alert_type}]: {message}")

        # Here you would integrate with your alerting system
        # Examples: Slack, PagerDuty, Email, etc.

        # For now, just log the alert
        alert_data = {
            'type': alert_type,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'service': 'ml-inference-service'
        }

        # Store alert for dashboard
        # await self._store_alert(alert_data)

# Background task for system metrics monitoring
async def system_metrics_monitor(monitor: PerformanceMonitor):
    """Background task to monitor system metrics"""

    while True:
        try:
            await monitor.log_system_metrics()
            await asyncio.sleep(60)  # Every minute
        except Exception as e:
            logger.error(f"System metrics monitoring error: {e}")
            await asyncio.sleep(60)
```

## Implementation Checklist

### Training Pipeline
- [ ] Implement TrainingOrchestrator class
- [ ] Set up ModelRegistry for versioning
- [ ] Create training service API endpoints
- [ ] Implement scheduled training
- [ ] Add training monitoring and logging

### Inference Service
- [ ] Implement InferenceEngine with caching
- [ ] Create high-performance prediction API
- [ ] Add batch prediction support
- [ ] Implement model hot-reloading
- [ ] Add performance monitoring

### CI/CD Pipeline
- [ ] Set up GitHub Actions workflows
- [ ] Implement automated testing
- [ ] Create Docker build and push
- [ ] Set up automated deployment
- [ ] Add load testing

### Monitoring
- [ ] Implement performance monitoring
- [ ] Set up alerting system
- [ ] Create metrics dashboard
- [ ] Add health checks
- [ ] Implement log aggregation

### Security
- [ ] Add API authentication
- [ ] Implement rate limiting
- [ ] Set up security scanning
- [ ] Add audit logging
- [ ] Implement secret management

This comprehensive deployment pipeline provides a robust, scalable, and maintainable infrastructure for the ML trading system, ensuring reliable model training, deployment, and inference in production.