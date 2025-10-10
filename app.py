"""
AI Cash Evolution - ML Prediction API
FastAPI service for trading signal predictions with dynamic technical confidence
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Cash Evolution ML API",
    description="Real-time predictions for trading signals",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionRequest(BaseModel):
    symbol: str
    features: dict

class PredictionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    prediction: str
    confidence: float
    probabilities: dict
    model_available: bool

@app.get("/")
def root():
    return {
        "service": "AI Cash Evolution ML API",
        "status": "online",
        "version": "1.0.0",
        "mode": "dynamic_technical_confidence"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_available": False,
        "mode": "technical_confidence"
    }

@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    """
    Generate prediction using dynamic technical confidence.
    
    Confidence calculation based on:
    - ADX (trend strength): ±15%
    - RSI (momentum): ±15%  
    - EMA alignment: +10%
    - ATR (volatility): ±8%
    
    Range: 45-85%
    """
    features = request.features
    confidence = 50.0
    
    # ADX (trend strength)
    adx = features.get('adx', 25)
    if adx > 35:
        confidence += 15  # Strong trend
    elif adx > 25:
        confidence += 10  # Good trend
    elif adx < 15:
        confidence -= 10  # Choppy/weak
    
    # Determine signal direction
    close = features.get('close', features.get('price', 1.0))
    ema12 = features.get('ema12', close)
    ema21 = features.get('ema21', close)
    
    bullish = ema12 > ema21
    signal = 'BUY' if bullish else 'SELL'
    
    # RSI (momentum)
    rsi = features.get('rsi', 50)
    
    if bullish:
        if rsi < 30:
            confidence += 15  # Oversold = good for BUY
        elif rsi < 45:
            confidence += 8
        elif rsi > 70:
            confidence -= 10  # Overbought = bad for BUY
    else:
        if rsi > 70:
            confidence += 15  # Overbought = good for SELL
        elif rsi > 55:
            confidence += 8
        elif rsi < 30:
            confidence -= 10  # Oversold = bad for SELL
    
    # EMA alignment
    ema50 = features.get('ema50', close)
    if bullish and ema12 > ema50:
        confidence += 10  # Strong uptrend
    elif not bullish and ema12 < ema50:
        confidence += 10  # Strong downtrend
    
    # ATR (volatility)
    atr = features.get('atr', 0)
    atr_percent = (atr / close * 100) if close > 0 else 0
    
    if 0.05 <= atr_percent <= 0.15:
        confidence += 8  # Optimal volatility
    elif atr_percent > 0.30:
        confidence -= 10  # Too volatile
    elif atr_percent < 0.03:
        confidence -= 8  # Too tight
    
    # Cap confidence to realistic range
    confidence = max(45, min(85, confidence))
    
    # Build probability distribution
    if signal == 'BUY':
        prob_buy = confidence
        prob_sell = 100 - confidence - 10
        prob_hold = 10
    else:
        prob_sell = confidence
        prob_buy = 100 - confidence - 10
        prob_hold = 10
    
    logger.info(f"Technical Confidence: {signal} @ {confidence:.1f}% | ADX:{adx} RSI:{rsi}")
    
    return PredictionResponse(
        prediction=signal,
        confidence=round(confidence, 1),
        probabilities={
            'BUY': round(prob_buy, 1),
            'SELL': round(prob_sell, 1),
            'HOLD': round(prob_hold, 1)
        },
        model_available=False
    )

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
