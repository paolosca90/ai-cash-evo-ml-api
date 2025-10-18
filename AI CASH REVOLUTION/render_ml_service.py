# Render Free Tier ML Service
# Free: 750 hours/month, 512MB RAM, shared CPU

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import requests
from datetime import datetime, timedelta
import json
import os
from typing import List, Dict
import asyncio

app = FastAPI(title="AI Trading ML Service", version="1.0.0")

# Enable CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Your frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OptimizedTradingML:
    def __init__(self):
        self.cache = {}  # Simple cache to reduce API calls
        self.cache_ttl = 60  # 1 minute cache

        # Trading pairs
        self.symbols = [
            'XAUUSD', 'ETHUSD', 'BTCUSD', 'EURUSD', 'GBPUSD',
            'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'
        ]

    def get_cached_data(self, symbol: str):
        """Get cached data if not expired"""
        if symbol in self.cache:
            data, timestamp = self.cache[symbol]
            if (datetime.now() - timestamp).seconds < self.cache_ttl:
                return data
        return None

    def cache_data(self, symbol: str, data):
        """Cache data with timestamp"""
        self.cache[symbol] = (data, datetime.now())

    async def fetch_alpha_vantage_data(self, symbol: str):
        """Free Alpha Vantage API (500 calls/day)"""
        # Check cache first
        cached = self.get_cached_data(symbol)
        if cached:
            return cached

        try:
            # Alpha Vantage free API (you'd need to get your own API key)
            # This is a demo implementation
            api_key = os.getenv('ALPHA_VANTAGE_KEY', 'demo')

            # For demo, generate synthetic data
            data = self.generate_demo_data(symbol)
            self.cache_data(symbol, data)
            return data

        except Exception as e:
            # Fallback to demo data
            data = self.generate_demo_data(symbol)
            self.cache_data(symbol, data)
            return data

    def generate_demo_data(self, symbol: str):
        """Generate realistic demo data for testing"""
        np.random.seed(hash(symbol) % 1000)

        # Base price depends on symbol type
        if 'XAU' in symbol:
            base_price = 2000
        elif 'BTC' in symbol:
            base_price = 45000
        elif 'ETH' in symbol:
            base_price = 2500
        else:
            base_price = 1.2

        # Generate 100 data points
        periods = 100
        timestamps = pd.date_range(
            end=datetime.now(),
            periods=periods,
            freq='1H'
        )

        # Generate realistic price movements
        returns = np.random.normal(0.0005, 0.015, periods)
        prices = [base_price]

        for ret in returns:
            # Add some trend and mean reversion
            trend = 0.0001 * (1 if len(prices) < 50 else -1)
            mean_reversion = -0.01 * (prices[-1] - base_price) / base_price
            adjusted_ret = ret + trend + mean_reversion
            prices.append(prices[-1] * (1 + adjusted_ret))

        prices = prices[1:]  # Remove initial base price

        # Create OHLC data
        data = []
        for i, (timestamp, close) in enumerate(zip(timestamps, prices)):
            # Generate realistic OHLC
            high = close * (1 + abs(np.random.normal(0, 0.003)))
            low = close * (1 - abs(np.random.normal(0, 0.003)))
            open_price = low + (high - low) * np.random.random()

            # Ensure OHLC relationships are valid
            high = max(high, open_price, close)
            low = min(low, open_price, close)

            data.append({
                'timestamp': timestamp.isoformat(),
                'open': round(open_price, 5),
                'high': round(high, 5),
                'low': round(low, 5),
                'close': round(close, 5),
                'volume': np.random.randint(100, 1000)
            })

        return data

    def calculate_indicators(self, data: List[Dict]):
        """Calculate technical indicators efficiently"""
        df = pd.DataFrame(data)

        if len(df) < 20:
            return None

        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14, min_periods=1).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=1).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))

        # MACD
        exp1 = df['close'].ewm(span=12, adjust=False).mean()
        exp2 = df['close'].ewm(span=26, adjust=False).mean()
        df['macd'] = exp1 - exp2
        df['signal'] = df['macd'].ewm(span=9, adjust=False).mean()

        # Bollinger Bands
        df['bb_middle'] = df['close'].rolling(window=20, min_periods=1).mean()
        df['bb_std'] = df['close'].rolling(window=20, min_periods=1).std()
        df['bb_upper'] = df['bb_middle'] + (df['bb_std'] * 2)
        df['bb_lower'] = df['bb_middle'] - (df['bb_std'] * 2)

        # Volume indicators
        df['volume_sma'] = df['volume'].rolling(window=20, min_periods=1).mean()
        df['volume_ratio'] = df['volume'] / df['volume_sma']

        return df

    def generate_signal(self, df: pd.DataFrame):
        """Generate trading signal from indicators"""
        if df is None or len(df) < 2:
            return {'signal': 'HOLD', 'confidence': 0.5}

        latest = df.iloc[-1]
        previous = df.iloc[-2]

        signal_strength = 0
        reasons = []

        # RSI Analysis
        rsi = latest['rsi']
        if rsi < 30:
            signal_strength += 2
            reasons.append("RSI oversold")
        elif rsi > 70:
            signal_strength -= 2
            reasons.append("RSI overbought")
        elif 40 <= rsi <= 60:
            reasons.append("RSI neutral")

        # MACD Analysis
        macd = latest['macd']
        signal = latest['signal']
        macd_prev = previous['macd']
        signal_prev = previous['signal']

        if macd > signal and macd_prev <= signal_prev:
            signal_strength += 1
            reasons.append("MACD bullish crossover")
        elif macd < signal and macd_prev >= signal_prev:
            signal_strength -= 1
            reasons.append("MACD bearish crossover")

        # Bollinger Bands
        bb_position = (latest['close'] - latest['bb_lower']) / (latest['bb_upper'] - latest['bb_lower'])
        if bb_position < 0.1:
            signal_strength += 1
            reasons.append("Price near lower BB")
        elif bb_position > 0.9:
            signal_strength -= 1
            reasons.append("Price near upper BB")

        # Volume confirmation
        volume_ratio = latest['volume_ratio']
        if volume_ratio > 1.5:
            signal_strength = signal_strength * 1.2  # Boost confidence
            reasons.append("High volume")

        # Determine final signal
        if signal_strength >= 3:
            signal = 'BUY'
            confidence = min(0.9, 0.6 + abs(signal_strength) * 0.1)
        elif signal_strength <= -3:
            signal = 'SELL'
            confidence = min(0.9, 0.6 + abs(signal_strength) * 0.1)
        else:
            signal = 'HOLD'
            confidence = 0.5

        return {
            'signal': signal,
            'confidence': round(confidence, 2),
            'indicators': {
                'rsi': round(rsi, 2),
                'macd': round(macd, 4),
                'bb_position': round(bb_position, 2),
                'volume_ratio': round(volume_ratio, 2)
            },
            'signal_strength': signal_strength,
            'reasons': reasons
        }

# Initialize ML service
ml_service = OptimizedTradingML()

@app.get("/")
async def root():
    return {"message": "AI Trading ML Service - Free Tier on Render", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "cache_size": len(ml_service.cache)}

@app.post("/predict")
async def predict_signals(symbols: List[str] = None):
    """Generate trading signals for specified symbols"""
    if symbols is None:
        symbols = ['XAUUSD', 'ETHUSD', 'BTCUSD']

    results = {}

    for symbol in symbols:
        try:
            # Fetch market data
            market_data = await ml_service.fetch_alpha_vantage_data(symbol)

            # Calculate indicators
            df = ml_service.calculate_indicators(market_data)

            # Generate signal
            prediction = ml_service.generate_signal(df)

            results[symbol] = {
                'success': True,
                'prediction': prediction,
                'data_points': len(market_data)
            }

        except Exception as e:
            results[symbol] = {
                'success': False,
                'error': str(e)
            }

    return {
        'timestamp': datetime.now().isoformat(),
        'predictions': results,
        'service_info': {
            'platform': 'Render Free Tier',
            'memory_limit': '512MB',
            'cache_enabled': True
        }
    }

@app.get("/symbols")
async def get_available_symbols():
    """Get list of supported trading symbols"""
    return {
        'symbols': ml_service.symbols,
        'count': len(ml_service.symbols)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv('PORT', 10000)))