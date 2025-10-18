"""
ML Prediction Service - FastAPI
Real-time ML predictions per generate-ai-signals Edge Function
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import numpy as np
from pathlib import Path
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ML Prediction Service",
    description="Real-time ML predictions for trading signals",
    version="1.0.0"
)

# CORS per Supabase Edge Functions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Carica modello (usa path relativo dalla root del progetto)
MODEL_PATH = Path(__file__).parent.parent / "ml_models" / "model_20251008_223513.pkl"
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
    features: dict  # {rsi, ema12, ema21, ema50, atr, adx, ...}

class PredictionResponse(BaseModel):
    prediction: str  # BUY, SELL, HOLD
    confidence: float  # 0-100
    probabilities: dict  # {BUY: 0.6, SELL: 0.3, HOLD: 0.1}
    model_available: bool

@app.get("/")
def root():
    return {
        "service": "ML Prediction Service",
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
    """
    Genera prediction ML in real-time

    Input features richiesti:
    - rsi: 0-100
    - ema12, ema21, ema50: price values
    - atr: average true range
    - adx: 0-100
    - close: current price
    """

    if model is None:
        # Fallback: calcola confidence dagli indicatori
        return calculate_technical_confidence(request)

    try:
        # Prepara features per il modello
        features_array = prepare_features(request.features)

        # ML Prediction
        prediction_proba = model.predict_proba([features_array])[0]
        prediction_class = model.predict([features_array])[0]

        # Map prediction to BUY/SELL/HOLD
        classes = ['SELL', 'HOLD', 'BUY']  # Standard sklearn ordering
        predicted_action = classes[prediction_class]

        # Confidence = max probability * 100
        confidence = float(max(prediction_proba) * 100)

        probabilities = {
            'BUY': float(prediction_proba[2] * 100),
            'HOLD': float(prediction_proba[1] * 100),
            'SELL': float(prediction_proba[0] * 100)
        }

        logger.info(f"ML Prediction: {predicted_action} @ {confidence:.1f}% confidence")

        return PredictionResponse(
            prediction=predicted_action,
            confidence=confidence,
            probabilities=probabilities,
            model_available=True
        )

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        # Fallback su confidence tecnica
        return calculate_technical_confidence(request)

def prepare_features(features: dict) -> np.ndarray:
    """
    Prepara features array per il modello

    Feature order (da metadata):
    open, high, low, close, volume, rsi, ema12, ema21, ema50, atr, adx
    """

    # Usiamo close come proxy per open/high/low se non forniti
    close = features.get('close', features.get('price', 1.0))

    return np.array([
        close,  # open (proxy)
        close * 1.001,  # high (proxy)
        close * 0.999,  # low (proxy)
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
    """
    Fallback: calcola confidence dinamica dagli indicatori tecnici
    quando ML non disponibile
    """

    features = request.features

    # Base confidence
    confidence = 50.0

    # ADX (trend strength)
    adx = features.get('adx', 25)
    if adx > 35:
        confidence += 15  # Strong trend
    elif adx > 25:
        confidence += 10
    elif adx < 15:
        confidence -= 10  # Weak/choppy

    # RSI (momentum)
    rsi = features.get('rsi', 50)
    close = features.get('close', features.get('price', 1.0))
    ema12 = features.get('ema12', close)
    ema21 = features.get('ema21', close)

    # Determine signal direction
    bullish = ema12 > ema21

    if bullish:
        signal = 'BUY'
        # RSI oversold = good for BUY
        if rsi < 30:
            confidence += 15
        elif rsi < 45:
            confidence += 8
        elif rsi > 70:
            confidence -= 10  # Overbought
    else:
        signal = 'SELL'
        # RSI overbought = good for SELL
        if rsi > 70:
            confidence += 15
        elif rsi > 55:
            confidence += 8
        elif rsi < 30:
            confidence -= 10  # Oversold

    # EMA alignment
    ema50 = features.get('ema50', close)
    if bullish and ema12 > ema50:
        confidence += 10  # Strong uptrend
    elif not bullish and ema12 < ema50:
        confidence += 10  # Strong downtrend

    # Volatility (ATR)
    atr = features.get('atr', 0)
    atr_percent = (atr / close * 100) if close > 0 else 0

    if 0.05 <= atr_percent <= 0.15:
        confidence += 8  # Optimal volatility
    elif atr_percent > 0.30:
        confidence -= 10  # Too volatile
    elif atr_percent < 0.03:
        confidence -= 8  # Too tight

    # Cap confidence
    confidence = max(45, min(85, confidence))

    # Fake probabilities based on confidence
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
