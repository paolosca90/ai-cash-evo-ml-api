"""
AI Cash Evolution - ML Prediction API
FastAPI service for real-time trading signal predictions
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import numpy as np
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Cash Evolution ML API",
    description="Real-time ML predictions for trading signals",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load ML model
MODEL_PATH = Path("models/model.pkl")
model = None

try:
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    logger.info(f"✅ Model loaded: {MODEL_PATH}")
except Exception as e:
    logger.warning(f"⚠️ Could not load model: {e}")

# Request/Response models
class PredictionRequest(BaseModel):
    symbol: str
    features: dict

class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    probabilities: dict
    model_available: bool

@app.get("/")
def root():
    return {
        "service": "AI Cash Evolution ML API",
        "status": "online",
        "model_loaded": model is not None,
        "version": "1.0.0"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_available": model is not None
    }

@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    if model is None:
        return calculate_technical_confidence(request)
    
    try:
        features_array = prepare_features(request.features)
        prediction_proba = model.predict_proba([features_array])[0]
        prediction_class = model.predict([features_array])[0]
        
        classes = ['SELL', 'HOLD', 'BUY']
        predicted_action = classes[prediction_class]
        confidence = float(max(prediction_proba) * 100)
        
        probabilities = {
            'BUY': float(prediction_proba[2] * 100),
            'HOLD': float(prediction_proba[1] * 100),
            'SELL': float(prediction_proba[0] * 100)
        }
        
        logger.info(f"ML Prediction: {predicted_action} @ {confidence:.1f}%")
        
        return PredictionResponse(
            prediction=predicted_action,
            confidence=confidence,
            probabilities=probabilities,
            model_available=True
        )
    
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return calculate_technical_confidence(request)

def prepare_features(features: dict) -> np.ndarray:
    close = features.get('close', features.get('price', 1.0))
    return np.array([
        close,
        close * 1.001,
        close * 0.999,
        close,
        features.get('volume', 1000),
        features.get('rsi', 50),
        features.get('ema12', close),
        features.get('ema21', close),
        features.get('ema50', close),
        features.get('atr', close * 0.001),
        features.get('adx', 25)
    ])

def calculate_technical_confidence(request: PredictionRequest) -> PredictionResponse:
    features = request.features
    confidence = 50.0
    
    adx = features.get('adx', 25)
    if adx > 35:
        confidence += 15
    elif adx > 25:
        confidence += 10
    elif adx < 15:
        confidence -= 10
    
    rsi = features.get('rsi', 50)
    close = features.get('close', features.get('price', 1.0))
    ema12 = features.get('ema12', close)
    ema21 = features.get('ema21', close)
    
    bullish = ema12 > ema21
    
    if bullish:
        signal = 'BUY'
        if rsi < 30:
            confidence += 15
        elif rsi < 45:
            confidence += 8
        elif rsi > 70:
            confidence -= 10
    else:
        signal = 'SELL'
        if rsi > 70:
            confidence += 15
        elif rsi > 55:
            confidence += 8
        elif rsi < 30:
            confidence -= 10
    
    ema50 = features.get('ema50', close)
    if bullish and ema12 > ema50:
        confidence += 10
    elif not bullish and ema12 < ema50:
        confidence += 10
    
    atr = features.get('atr', 0)
    atr_percent = (atr / close * 100) if close > 0 else 0
    
    if 0.05 <= atr_percent <= 0.15:
        confidence += 8
    elif atr_percent > 0.30:
        confidence -= 10
    elif atr_percent < 0.03:
        confidence -= 8
    
    confidence = max(45, min(85, confidence))
    
    if signal == 'BUY':
        prob_buy = confidence
        prob_sell = 100 - confidence - 10
        prob_hold = 10
    else:
        prob_sell = confidence
        prob_buy = 100 - confidence - 10
        prob_hold = 10
    
    logger.info(f"Technical Confidence: {signal} @ {confidence:.1f}%")
    
    return PredictionResponse(
        prediction=signal,
        confidence=confidence,
        probabilities={
            'BUY': prob_buy,
            'SELL': prob_sell,
            'HOLD': prob_hold
        },
        model_available=False
    )

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
