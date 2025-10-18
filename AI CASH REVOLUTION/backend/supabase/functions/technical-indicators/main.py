#!/usr/bin/env python3
"""
Real Technical Indicators Calculator
Uses OANDA real-time data + TA library for accurate indicators
NO MOCK DATA - 100% Real Market Analysis
"""

import os
import json
import pandas as pd
import numpy as np
from ta import trend, momentum, volatility, volume
import requests
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler

# OANDA Configuration
OANDA_API_KEY = os.environ.get('OANDA_API_KEY')
OANDA_ACCOUNT_ID = os.environ.get('OANDA_ACCOUNT_ID')
OANDA_BASE_URL = 'https://api-fxpractice.oanda.com/v3'

def get_oanda_candles(instrument: str, granularity: str = 'M5', count: int = 200):
    """Fetch real candles from OANDA"""

    # Convert symbol format (EURUSD -> EUR_USD)
    if '_' not in instrument:
        instrument = f"{instrument[:3]}_{instrument[3:]}"

    headers = {
        'Authorization': f'Bearer {OANDA_API_KEY}',
        'Content-Type': 'application/json'
    }

    params = {
        'granularity': granularity,
        'count': count,
        'price': 'MBA'  # Mid, Bid, Ask prices
    }

    url = f"{OANDA_BASE_URL}/instruments/{instrument}/candles"

    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()

    data = response.json()
    candles = data.get('candles', [])

    # Convert to DataFrame
    df_data = []
    for candle in candles:
        if candle['complete']:
            mid = candle['mid']
            df_data.append({
                'time': pd.to_datetime(candle['time']),
                'open': float(mid['o']),
                'high': float(mid['h']),
                'low': float(mid['l']),
                'close': float(mid['c']),
                'volume': int(candle.get('volume', 0))
            })

    df = pd.DataFrame(df_data)
    df.set_index('time', inplace=True)

    return df

def calculate_moving_averages(df: pd.DataFrame):
    """Calculate real moving averages"""

    return {
        'sma9': trend.sma_indicator(df['close'], window=9).iloc[-1],
        'sma20': trend.sma_indicator(df['close'], window=20).iloc[-1],
        'sma50': trend.sma_indicator(df['close'], window=50).iloc[-1],
        'sma100': trend.sma_indicator(df['close'], window=100).iloc[-1],
        'sma200': trend.sma_indicator(df['close'], window=200).iloc[-1],
        'ema12': trend.ema_indicator(df['close'], window=12).iloc[-1],
        'ema21': trend.ema_indicator(df['close'], window=21).iloc[-1],
        'ema50': trend.ema_indicator(df['close'], window=50).iloc[-1]
    }

def calculate_oscillators(df: pd.DataFrame):
    """Calculate real oscillators"""

    # RSI
    rsi_indicator = momentum.RSIIndicator(df['close'], window=14)
    rsi = rsi_indicator.rsi().iloc[-1]

    # MACD
    macd_indicator = trend.MACD(df['close'])
    macd = macd_indicator.macd().iloc[-1]
    macd_signal = macd_indicator.macd_signal().iloc[-1]
    macd_histogram = macd_indicator.macd_diff().iloc[-1]

    # Stochastic
    stoch_indicator = momentum.StochasticOscillator(
        df['high'], df['low'], df['close'], window=14, smooth_window=3
    )
    stoch_k = stoch_indicator.stoch().iloc[-1]
    stoch_d = stoch_indicator.stoch_signal().iloc[-1]

    # Williams %R
    williams_r = momentum.WilliamsRIndicator(
        df['high'], df['low'], df['close'], lbp=14
    ).williams_r().iloc[-1]

    # CCI (Commodity Channel Index)
    cci = trend.CCIIndicator(
        df['high'], df['low'], df['close'], window=20
    ).cci().iloc[-1]

    return {
        'rsi': round(rsi, 2),
        'macd': round(macd, 5),
        'macd_signal': round(macd_signal, 5),
        'macd_histogram': round(macd_histogram, 5),
        'stochastic_k': round(stoch_k, 2),
        'stochastic_d': round(stoch_d, 2),
        'williams_r': round(williams_r, 2),
        'cci': round(cci, 2)
    }

def calculate_volatility_indicators(df: pd.DataFrame):
    """Calculate real volatility indicators"""

    # ATR
    atr_indicator = volatility.AverageTrueRange(
        df['high'], df['low'], df['close'], window=14
    )
    atr = atr_indicator.average_true_range().iloc[-1]

    # Bollinger Bands
    bb_indicator = volatility.BollingerBands(df['close'], window=20, window_dev=2)
    bb_upper = bb_indicator.bollinger_hband().iloc[-1]
    bb_middle = bb_indicator.bollinger_mavg().iloc[-1]
    bb_lower = bb_indicator.bollinger_lband().iloc[-1]
    bb_width = bb_indicator.bollinger_wband().iloc[-1]

    # Keltner Channel
    kc_indicator = volatility.KeltnerChannel(
        df['high'], df['low'], df['close'], window=20
    )
    kc_upper = kc_indicator.keltner_channel_hband().iloc[-1]
    kc_middle = kc_indicator.keltner_channel_mband().iloc[-1]
    kc_lower = kc_indicator.keltner_channel_lband().iloc[-1]

    return {
        'atr': round(atr, 5),
        'atr_percent': round((atr / df['close'].iloc[-1]) * 100, 2),
        'bb_upper': round(bb_upper, 5),
        'bb_middle': round(bb_middle, 5),
        'bb_lower': round(bb_lower, 5),
        'bb_width': round(bb_width, 2),
        'kc_upper': round(kc_upper, 5),
        'kc_middle': round(kc_middle, 5),
        'kc_lower': round(kc_lower, 5)
    }

def calculate_volume_indicators(df: pd.DataFrame):
    """Calculate real volume indicators"""

    current_volume = df['volume'].iloc[-1]
    volume_sma = df['volume'].rolling(window=20).mean().iloc[-1]
    volume_ratio = current_volume / volume_sma if volume_sma > 0 else 1

    # On-Balance Volume
    obv_indicator = volume.OnBalanceVolumeIndicator(df['close'], df['volume'])
    obv = obv_indicator.on_balance_volume().iloc[-1]

    # Volume Weighted Average Price (approximation)
    vwap = (df['close'] * df['volume']).sum() / df['volume'].sum()

    return {
        'current_volume': int(current_volume),
        'volume_sma': round(volume_sma, 0),
        'volume_ratio': round(volume_ratio, 2),
        'obv': round(obv, 0),
        'vwap': round(vwap, 5)
    }

def get_current_price(instrument: str):
    """Get real-time price from OANDA"""

    if '_' not in instrument:
        instrument = f"{instrument[:3]}_{instrument[3:]}"

    headers = {
        'Authorization': f'Bearer {OANDA_API_KEY}',
        'Content-Type': 'application/json'
    }

    url = f"{OANDA_BASE_URL}/accounts/{OANDA_ACCOUNT_ID}/pricing"
    params = {'instruments': instrument}

    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()

    data = response.json()
    prices = data.get('prices', [])

    if prices:
        price_data = prices[0]
        bid = float(price_data['bids'][0]['price'])
        ask = float(price_data['asks'][0]['price'])
        mid = (bid + ask) / 2
        spread = ask - bid

        return {
            'bid': bid,
            'ask': ask,
            'mid': mid,
            'spread': spread,
            'spread_pips': round(spread * 10000, 1) if 'JPY' not in instrument else round(spread * 100, 1)
        }

    return None

def calculate_all_indicators(symbol: str):
    """Calculate ALL indicators with real OANDA data"""

    try:
        # 1. Get current price from OANDA
        current_price = get_current_price(symbol)

        if not current_price:
            raise Exception(f"Failed to get current price for {symbol}")

        # 2. Get historical candles from OANDA (M5 for detailed analysis)
        df_m5 = get_oanda_candles(symbol, 'M5', 200)
        df_m15 = get_oanda_candles(symbol, 'M15', 200)
        df_h1 = get_oanda_candles(symbol, 'H1', 200)
        df_h4 = get_oanda_candles(symbol, 'H4', 200)
        df_d1 = get_oanda_candles(symbol, 'D', 200)

        # 3. Calculate all indicators on M5 timeframe
        ma_m5 = calculate_moving_averages(df_m5)
        oscillators_m5 = calculate_oscillators(df_m5)
        volatility_m5 = calculate_volatility_indicators(df_m5)
        volume_m5 = calculate_volume_indicators(df_m5)

        # 4. Multi-timeframe trend analysis
        trend_m15 = 'BULLISH' if df_m15['close'].iloc[-1] > df_m15['close'].iloc[-10] else 'BEARISH'
        trend_h1 = 'BULLISH' if df_h1['close'].iloc[-1] > df_h1['close'].iloc[-10] else 'BEARISH'
        trend_h4 = 'BULLISH' if df_h4['close'].iloc[-1] > df_h4['close'].iloc[-10] else 'BEARISH'
        trend_d1 = 'BULLISH' if df_d1['close'].iloc[-1] > df_d1['close'].iloc[-10] else 'BEARISH'

        # 5. Support/Resistance from real price action
        recent_highs = df_h1['high'].tail(20).nlargest(3).tolist()
        recent_lows = df_h1['low'].tail(20).nsmallest(3).tolist()

        result = {
            'success': True,
            'symbol': symbol,
            'timestamp': datetime.now().isoformat(),

            # Current Price (REAL from OANDA)
            'current_price': current_price,

            # Moving Averages (REAL calculated)
            'moving_averages': ma_m5,

            # Oscillators (REAL calculated)
            'oscillators': oscillators_m5,

            # Volatility (REAL calculated)
            'volatility': volatility_m5,

            # Volume (REAL calculated)
            'volume': volume_m5,

            # Multi-timeframe trends (REAL from price action)
            'trends': {
                'm15': trend_m15,
                'h1': trend_h1,
                'h4': trend_h4,
                'd1': trend_d1
            },

            # Support/Resistance (REAL from recent highs/lows)
            'levels': {
                'resistance': recent_highs,
                'support': recent_lows
            },

            # OHLC data (REAL)
            'ohlc': {
                'm5_high': float(df_m5['high'].iloc[-1]),
                'm5_low': float(df_m5['low'].iloc[-1]),
                'm15_high': float(df_m15['high'].iloc[-1]),
                'm15_low': float(df_m15['low'].iloc[-1]),
                'h1_high': float(df_h1['high'].iloc[-1]),
                'h1_low': float(df_h1['low'].iloc[-1]),
                'd1_high': float(df_d1['high'].iloc[-1]),
                'd1_low': float(df_d1['low'].iloc[-1])
            }
        }

        return result

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'symbol': symbol
        }

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)

        try:
            request_json = json.loads(post_data.decode('utf-8'))
            symbol = request_json.get('symbol', 'EURUSD')

            result = calculate_all_indicators(symbol)

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_response = {'success': False, 'error': str(e)}
            self.wfile.write(json.dumps(error_response).encode())
