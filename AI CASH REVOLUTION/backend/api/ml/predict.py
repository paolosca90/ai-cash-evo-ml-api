"""
Vercel Serverless Function - ML Prediction
Endpoint: /api/ml/predict
"""

from http.server import BaseHTTPRequestHandler
import json
import numpy as np
from typing import Optional
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST /api/ml/predict"""

        try:
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))

            symbol = request_data.get('symbol')
            features = request_data.get('features', {})

            # Calculate technical confidence (ML model not available in serverless)
            result = calculate_technical_confidence(symbol, features)

            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()

            self.wfile.write(json.dumps(result).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Health check"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        response = {
            'status': 'healthy',
            'service': 'ML Prediction API',
            'model_available': False
        }

        self.wfile.write(json.dumps(response).encode('utf-8'))


def calculate_technical_confidence(symbol: str, features: dict) -> dict:
    """
    Calculate dynamic confidence from technical indicators
    """

    confidence = 50.0

    # Extract features
    adx = features.get('adx', 25)
    rsi = features.get('rsi', 50)
    close = features.get('close', features.get('price', 1.0))
    ema12 = features.get('ema12', close)
    ema21 = features.get('ema21', close)
    ema50 = features.get('ema50', close)
    atr = features.get('atr', 0)

    # Determine signal direction
    bullish = ema12 > ema21
    signal = 'BUY' if bullish else 'SELL'

    # ADX (trend strength)
    if adx > 35:
        confidence += 15
    elif adx > 25:
        confidence += 10
    elif adx < 15:
        confidence -= 10

    # RSI (momentum)
    if bullish:
        if rsi < 30:
            confidence += 15  # Oversold
        elif rsi < 45:
            confidence += 8
        elif rsi > 70:
            confidence -= 10  # Overbought
    else:
        if rsi > 70:
            confidence += 15  # Overbought
        elif rsi > 55:
            confidence += 8
        elif rsi < 30:
            confidence -= 10  # Oversold

    # EMA alignment
    if bullish and ema12 > ema50:
        confidence += 10
    elif not bullish and ema12 < ema50:
        confidence += 10

    # Volatility
    atr_percent = (atr / close * 100) if close > 0 else 0

    if 0.05 <= atr_percent <= 0.15:
        confidence += 8
    elif atr_percent > 0.30:
        confidence -= 10
    elif atr_percent < 0.03:
        confidence -= 8

    # Cap confidence
    confidence = max(45, min(85, confidence))

    # Build probabilities
    if signal == 'BUY':
        prob_buy = confidence
        prob_sell = 100 - confidence - 10
        prob_hold = 10
    else:
        prob_sell = confidence
        prob_buy = 100 - confidence - 10
        prob_hold = 10

    return {
        'prediction': signal,
        'confidence': round(confidence, 1),
        'probabilities': {
            'BUY': round(prob_buy, 1),
            'SELL': round(prob_sell, 1),
            'HOLD': round(prob_hold, 1)
        },
        'model_available': False
    }
