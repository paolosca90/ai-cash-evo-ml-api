# AI Cash Evolution - ML Trading Service for Google Cloud Run
# Optimized for free tier and production trading

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import yfinance as yf
import os
import json
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional
import asyncio
from functools import lru_cache

# Configure logging for Cloud Run
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["*"])  # Allow all origins for development

# Global variables for caching
@lru_cache(maxsize=1000)
def get_cached_data(symbol: str, period: str = "1mo"):
    """Cache market data to reduce API calls"""
    try:
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period)
        return data
    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {e}")
        return None

# Technical Indicators (optimized for performance)
def calculate_rsi(data: pd.DataFrame, period: int = 14) -> float:
    """Calculate RSI indicator"""
    if len(data) < period:
        return 50.0  # Default neutral value

    delta = data['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()

    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.iloc[-1] if not rsi.empty else 50.0

def calculate_macd(data: pd.DataFrame) -> Dict:
    """Calculate MACD indicator"""
    if len(data) < 26:
        return {"macd": 0, "signal": 0, "histogram": 0}

    exp1 = data['Close'].ewm(span=12).mean()
    exp2 = data['Close'].ewm(span=26).mean()
    macd = exp1 - exp2
    signal = macd.ewm(span=9).mean()
    histogram = macd - signal

    return {
        "macd": float(macd.iloc[-1]) if not macd.empty else 0,
        "signal": float(signal.iloc[-1]) if not signal.empty else 0,
        "histogram": float(histogram.iloc[-1]) if not histogram.empty else 0
    }

def calculate_bollinger_bands(data: pd.DataFrame, period: int = 20, std_dev: int = 2) -> Dict:
    """Calculate Bollinger Bands"""
    if len(data) < period:
        return {"upper": 0, "middle": 0, "lower": 0}

    sma = data['Close'].rolling(window=period).mean()
    std = data['Close'].rolling(window=period).std()

    upper_band = sma + (std * std_dev)
    lower_band = sma - (std * std_dev)

    return {
        "upper": float(upper_band.iloc[-1]) if not upper_band.empty else 0,
        "middle": float(sma.iloc[-1]) if not sma.empty else 0,
        "lower": float(lower_band.iloc[-1]) if not lower_band.empty else 0
    }

def calculate_stochastic(data: pd.DataFrame, k_period: int = 14, d_period: int = 3) -> Dict:
    """Calculate Stochastic Oscillator"""
    if len(data) < k_period:
        return {"k": 50, "d": 50}

    low_min = data['Low'].rolling(window=k_period).min()
    high_max = data['High'].rolling(window=k_period).max()

    k_percent = 100 * ((data['Close'] - low_min) / (high_max - low_min))
    d_percent = k_percent.rolling(window=d_period).mean()

    return {
        "k": float(k_percent.iloc[-1]) if not k_percent.empty else 50,
        "d": float(d_percent.iloc[-1]) if not d_percent.empty else 50
    }

# ML-style signal generation (simplified but effective)
def generate_ml_signal(symbol: str, data: pd.DataFrame) -> Dict:
    """Generate trading signal with ML-style confidence scoring"""

    # Calculate indicators
    rsi = calculate_rsi(data)
    macd = calculate_macd(data)
    bb = calculate_bollinger_bands(data)
    stoch = calculate_stochastic(data)

    # Get current price
    current_price = float(data['Close'].iloc[-1]) if not data.empty else 0

    # Signal logic (simplified ML ensemble)
    signals = []

    # RSI signals
    if rsi < 30:
        signals.append(("BUY", 0.7, "RSI Oversold"))
    elif rsi > 70:
        signals.append(("SELL", 0.7, "RSI Overbought"))
    elif rsi < 50:
        signals.append(("BUY", 0.4, "RSI Bearish"))
    else:
        signals.append(("SELL", 0.4, "RSI Bullish"))

    # MACD signals
    if macd["histogram"] > 0:
        signals.append(("BUY", 0.6, "MACD Bullish"))
    else:
        signals.append(("SELL", 0.6, "MACD Bearish"))

    # Bollinger Bands signals
    if current_price < bb["lower"]:
        signals.append(("BUY", 0.8, "Below Lower Band"))
    elif current_price > bb["upper"]:
        signals.append(("SELL", 0.8, "Above Upper Band"))

    # Stochastic signals
    if stoch["k"] < 20:
        signals.append(("BUY", 0.5, "Stochastic Oversold"))
    elif stoch["k"] > 80:
        signals.append(("SELL", 0.5, "Stochastic Overbought"))

    # Calculate weighted signal
    buy_weight = sum(weight for action, weight, reason in signals if action == "BUY")
    sell_weight = sum(weight for action, weight, reason in signals if action == "SELL")

    if buy_weight > sell_weight:
        final_signal = "BUY"
        confidence = min(buy_weight / (buy_weight + sell_weight), 0.9)
    elif sell_weight > buy_weight:
        final_signal = "SELL"
        confidence = min(sell_weight / (buy_weight + sell_weight), 0.9)
    else:
        final_signal = "HOLD"
        confidence = 0.5

    # Risk management calculations
    atr = calculate_atr(data)
    stop_loss = atr * 1.5 if final_signal != "HOLD" else 0
    take_profit = atr * 2.0 if final_signal != "HOLD" else 0

    return {
        "symbol": symbol,
        "signal": final_signal,
        "confidence": round(confidence, 3),
        "current_price": current_price,
        "stop_loss": round(stop_loss, 5),
        "take_profit": round(take_profit, 5),
        "indicators": {
            "rsi": round(rsi, 2),
            "macd": {k: round(v, 5) for k, v in macd.items()},
            "bollinger_bands": {k: round(v, 5) for k, v in bb.items()},
            "stochastic": {k: round(v, 2) for k, v in stoch.items()}
        },
        "analysis_reasons": [reason for action, weight, reason in signals if action == final_signal],
        "timestamp": datetime.utcnow().isoformat(),
        "mode": "cloud_run_optimized"
    }

def calculate_atr(data: pd.DataFrame, period: int = 14) -> float:
    """Calculate Average True Range"""
    if len(data) < period:
        return 0.001  # Default small value

    high_low = data['High'] - data['Low']
    high_close = np.abs(data['High'] - data['Close'].shift())
    low_close = np.abs(data['Low'] - data['Close'].shift())

    true_range = np.maximum(high_low, np.maximum(high_close, low_close))
    atr = true_range.rolling(window=period).mean()

    return float(atr.iloc[-1]) if not atr.empty else 0.001

# API Routes
@app.route("/")
def home():
    """Home endpoint"""
    return jsonify({
        "service": "AI Cash Evolution ML Trading API",
        "platform": "Google Cloud Run",
        "status": "online",
        "version": "2.0.0",
        "features": [
            "Real-time technical analysis",
            "ML-style signal generation",
            "Multi-symbol support",
            "Optimized for performance"
        ],
        "endpoints": {
            "/health": "Health check",
            "/predict": "Generate trading signal",
            "/predict/batch": "Multiple symbols at once",
            "/symbols": "Available trading symbols"
        }
    })

@app.route("/health")
def health():
    """Health check endpoint for Cloud Run"""
    return jsonify({
        "status": "healthy",
        "platform": "google_cloud_run",
        "memory_available": "4GB",
        "cpu_available": "variable",
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route("/predict")
def predict():
    """Generate trading signal for a single symbol"""
    try:
        symbol = request.args.get("symbol", "EURUSD=X")

        # Get data (with caching)
        data = get_cached_data(symbol)

        if data is None or len(data) < 20:
            return jsonify({
                "error": f"Insufficient data for {symbol}",
                "signal": "HOLD",
                "confidence": 0.0
            }), 400

        # Generate signal
        result = generate_ml_signal(symbol, data)

        logger.info(f"Generated signal for {symbol}: {result['signal']} ({result['confidence']})")

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error generating prediction: {e}")
        return jsonify({
            "error": str(e),
            "signal": "HOLD",
            "confidence": 0.0
        }), 500

@app.route("/predict/batch", methods=["POST"])
def predict_batch():
    """Generate trading signals for multiple symbols"""
    try:
        data = request.get_json()
        symbols = data.get("symbols", ["EURUSD=X", "GBPUSD=X", "USDJPY=X"])

        if len(symbols) > 50:
            return jsonify({
                "error": "Too many symbols. Maximum 50 per request.",
                "signals": []
            }), 400

        results = []

        for symbol in symbols:
            try:
                symbol_data = get_cached_data(symbol)

                if symbol_data is not None and len(symbol_data) >= 20:
                    result = generate_ml_signal(symbol, symbol_data)
                    results.append(result)
                else:
                    results.append({
                        "symbol": symbol,
                        "signal": "HOLD",
                        "confidence": 0.0,
                        "error": "Insufficient data"
                    })

            except Exception as e:
                logger.error(f"Error processing {symbol}: {e}")
                results.append({
                    "symbol": symbol,
                    "signal": "HOLD",
                    "confidence": 0.0,
                    "error": str(e)
                })

        logger.info(f"Processed batch of {len(symbols)} symbols")

        return jsonify({
            "signals": results,
            "processed_count": len(results),
            "timestamp": datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Error in batch prediction: {e}")
        return jsonify({
            "error": str(e),
            "signals": []
        }), 500

@app.route("/symbols")
def get_symbols():
    """Get available trading symbols"""
    symbols = {
        "forex": [
            "EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X",
            "AUDUSD=X", "USDCAD=X", "NZDUSD=X", "EURGBP=X",
            "EURJPY=X", "GBPJPY=X", "EURCAD=X", "EURAUD=X"
        ],
        "commodities": [
            "GC=F", "SI=F", "CL=F", "NG=F",
            "XAUUSD=X", "XAGUSD=X"
        ],
        "indices": [
            "^GSPC", "^DJI", "^IXIC", "^FTSE", "^N225"
        ]
    }

    return jsonify({
        "symbols": symbols,
        "total_count": sum(len(v) for v in symbols.values()),
        "categories": list(symbols.keys())
    })

# Cloud Run optimization
@app.route("/_ah/warmup")
def warmup():
    """Cloud Run warmup endpoint"""
    return "", 200

# Error handling
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)