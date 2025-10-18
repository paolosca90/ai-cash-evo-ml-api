#!/usr/bin/env python3
"""
ML PREDICTION API - On-Demand Signal Generation
FastAPI endpoint for real-time ML predictions with signal weights
"""

import os
import sys
import pickle
import json
from typing import Optional, Dict, List
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.calculate_signal_weights import SignalWeightCalculator

load_dotenv()

app = FastAPI(title="AI Cash Evolution - ML Prediction API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model cache
MODEL_CACHE = {}
WEIGHT_CALCULATOR = SignalWeightCalculator()

# Request/Response Models
class MarketData(BaseModel):
    symbol: str
    granularity: str
    timestamp: Optional[str] = None
    open: float
    high: float
    low: float
    close: float
    volume: float
    rsi: float
    ema12: float
    ema21: float
    adx: float

class MultiTimeframeSignal(BaseModel):
    symbol: str
    granularity: str
    direction: str
    confidence: float

class PredictionRequest(BaseModel):
    market_data: MarketData
    multi_tf_signals: Optional[List[MultiTimeframeSignal]] = None
    risk_metrics: Optional[Dict] = None

class PredictionResponse(BaseModel):
    symbol: str
    granularity: str
    timestamp: str
    direction: str
    ml_confidence: float
    signal_weight: float
    recommendation: str
    position_multiplier: float
    components: Dict[str, float]
    model_version: str

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: Optional[str] = None
    features_count: int

# Utility Functions
def load_latest_model():
    """Load the most recent trained model"""
    
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'ml_models')
    
    if not os.path.exists(models_dir):
        raise HTTPException(status_code=500, detail="Models directory not found")
    
    # Find latest model
    model_files = [f for f in os.listdir(models_dir) if f.startswith('model_') and f.endswith('.pkl')]
    
    if not model_files:
        raise HTTPException(status_code=500, detail="No trained models found")
    
    latest_model = sorted(model_files)[-1]
    model_path = os.path.join(models_dir, latest_model)
    
    # Load model
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    
    # Load metadata
    timestamp = latest_model.replace('model_', '').replace('.pkl', '')
    metadata_path = os.path.join(models_dir, f'metadata_{timestamp}.json')
    
    metadata = {}
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
    
    return {
        'model': model,
        'version': timestamp,
        'metadata': metadata
    }

def prepare_features(market_data: MarketData) -> np.ndarray:
    """Prepare features for ML prediction"""
    
    features = [
        market_data.open,
        market_data.high,
        market_data.low,
        market_data.close,
        market_data.volume,
        market_data.rsi,
        market_data.ema12,
        market_data.ema21,
        market_data.adx,
        market_data.high - market_data.low,  # range
        market_data.close - market_data.open  # body
    ]
    
    return np.array([features])

# API Endpoints
@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    
    try:
        if 'model' not in MODEL_CACHE:
            MODEL_CACHE.update(load_latest_model())
        
        return HealthResponse(
            status="healthy",
            model_loaded=True,
            model_version=MODEL_CACHE.get('version'),
            features_count=11
        )
    except Exception as e:
        return HealthResponse(
            status="degraded",
            model_loaded=False,
            features_count=11
        )

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Generate ML prediction with signal weights
    
    Returns:
    - ML prediction (BUY/SELL + confidence)
    - Signal weight (0-100)
    - Recommendation (STRONG_BUY/BUY/WEAK/AVOID)
    - Position multiplier (0.25-2.0)
    """
    
    try:
        # Load model if not cached
        if 'model' not in MODEL_CACHE:
            MODEL_CACHE.update(load_latest_model())
        
        model = MODEL_CACHE['model']
        version = MODEL_CACHE['version']
        
        # Prepare features
        features = prepare_features(request.market_data)
        
        # Get prediction
        prediction_proba = model.predict_proba(features)[0]
        prediction_class = model.predict(features)[0]
        
        # Direction and confidence
        direction = 'BUY' if prediction_class == 1 else 'SELL'
        ml_confidence = float(max(prediction_proba) * 100)
        
        # Prepare candle data for weight calculation
        candle_data = {
            'open': request.market_data.open,
            'high': request.market_data.high,
            'low': request.market_data.low,
            'close': request.market_data.close,
            'volume': request.market_data.volume,
            'rsi': request.market_data.rsi,
            'ema12': request.market_data.ema12,
            'ema21': request.market_data.ema21,
            'adx': request.market_data.adx
        }
        
        # Convert multi-TF signals if provided
        mtf_signals = None
        if request.multi_tf_signals:
            mtf_signals = [
                {
                    'symbol': s.symbol,
                    'granularity': s.granularity,
                    'label': s.direction,
                    'label_confidence': s.confidence
                }
                for s in request.multi_tf_signals
            ]
        
        # Calculate signal weight
        weight_result = WEIGHT_CALCULATOR.calculate_weight(
            ml_confidence=ml_confidence,
            signal_direction=direction,
            candle_data=candle_data,
            multi_tf_signals=mtf_signals,
            risk_metrics=request.risk_metrics
        )
        
        return PredictionResponse(
            symbol=request.market_data.symbol,
            granularity=request.market_data.granularity,
            timestamp=request.market_data.timestamp or datetime.utcnow().isoformat(),
            direction=direction,
            ml_confidence=round(ml_confidence, 2),
            signal_weight=round(weight_result['total_weight'], 2),
            recommendation=weight_result['recommendation'],
            position_multiplier=round(weight_result['position_size_multiplier'], 2),
            components={
                'ml_confidence': round(weight_result['components']['ml_confidence'], 2),
                'technical_quality': round(weight_result['components']['technical_quality'], 2),
                'market_conditions': round(weight_result['components']['market_conditions'], 2),
                'mtf_confirmation': round(weight_result['components']['mtf_confirmation'], 2),
                'risk_factors': round(weight_result['components']['risk_factors'], 2)
            },
            model_version=version
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/batch-predict")
async def batch_predict(requests: List[PredictionRequest]):
    """Generate predictions for multiple signals"""
    
    results = []
    
    for req in requests:
        try:
            result = await predict(req)
            results.append(result.dict())
        except Exception as e:
            results.append({
                'symbol': req.market_data.symbol,
                'granularity': req.market_data.granularity,
                'error': str(e)
            })
    
    return {
        'success': True,
        'count': len(results),
        'predictions': results
    }

@app.get("/model/info")
async def model_info():
    """Get information about the loaded model"""
    
    try:
        if 'model' not in MODEL_CACHE:
            MODEL_CACHE.update(load_latest_model())
        
        metadata = MODEL_CACHE.get('metadata', {})
        
        return {
            'version': MODEL_CACHE.get('version'),
            'model_type': metadata.get('model_type', 'unknown'),
            'features': metadata.get('features', []),
            'training_date': metadata.get('timestamp'),
            'features_count': len(metadata.get('features', [])),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/model/reload")
async def reload_model():
    """Reload the latest model (useful after retraining)"""
    
    try:
        MODEL_CACHE.clear()
        MODEL_CACHE.update(load_latest_model())
        
        return {
            'success': True,
            'message': 'Model reloaded successfully',
            'version': MODEL_CACHE.get('version')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv('API_PORT', 8000))
    
    print(f"""
    ╔════════════════════════════════════════════════════════╗
    ║  AI CASH EVOLUTION - ML PREDICTION API                ║
    ║  Real-time signal generation with weights             ║
    ╠════════════════════════════════════════════════════════╣
    ║  URL: http://localhost:{port}                            ║
    ║  Docs: http://localhost:{port}/docs                      ║
    ╚════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=port)
