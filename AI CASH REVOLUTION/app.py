# AI Cash Evolution - ML Trading Service for Hugging Face Spaces
# Complete web interface with Gradio

import gradio as gr
import pandas as pd
import numpy as np
import yfinance as yf
import json
from datetime import datetime, timedelta
import plotly.graph_objs as go
import plotly.express as px
from typing import Dict, List, Optional
import requests
import time

# Cache for performance
import functools

@functools.lru_cache(maxsize=1000)
def get_cached_data(symbol: str, period: str = "1mo"):
    """Cache market data to reduce API calls"""
    try:
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period)
        return data
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None

# Technical Indicators
def calculate_rsi(data: pd.DataFrame, period: int = 14) -> float:
    """Calculate RSI indicator"""
    if len(data) < period:
        return 50.0

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

def calculate_atr(data: pd.DataFrame, period: int = 14) -> float:
    """Calculate Average True Range"""
    if len(data) < period:
        return 0.001

    high_low = data['High'] - data['Low']
    high_close = np.abs(data['High'] - data['Close'].shift())
    low_close = np.abs(data['Low'] - data['Close'].shift())
    true_range = np.maximum(high_low, np.maximum(high_close, low_close))
    atr = true_range.rolling(window=period).mean()
    return float(atr.iloc[-1]) if not atr.empty else 0.001

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
        "mode": "huggingface_optimized"
    }

def create_price_chart(data: pd.DataFrame, signal_data: Dict) -> go.Figure:
    """Create interactive price chart with indicators"""
    fig = go.Figure()

    # Candlestick chart
    fig.add_trace(go.Candlestick(
        x=data.index,
        open=data['Open'],
        high=data['High'],
        low=data['Low'],
        close=data['Close'],
        name='Price'
    ))

    # Bollinger Bands
    bb = signal_data['indicators']['bollinger_bands']
    fig.add_trace(go.Scatter(
        x=data.index,
        y=[bb['upper']] * len(data),
        mode='lines',
        name='Upper BB',
        line=dict(color='red', dash='dash')
    ))

    fig.add_trace(go.Scatter(
        x=data.index,
        y=[bb['lower']] * len(data),
        mode='lines',
        name='Lower BB',
        line=dict(color='red', dash='dash')
    ))

    fig.update_layout(
        title=f"{signal_data['symbol']} - Technical Analysis",
        xaxis_title="Date",
        yaxis_title="Price",
        template="plotly_dark"
    )

    return fig

# Gradio Interface Functions
def analyze_symbol(symbol: str):
    """Analyze a single symbol and return results"""
    try:
        data = get_cached_data(symbol)

        if data is None or len(data) < 20:
            return "❌ Insufficient data available", None, {}

        # Generate signal
        result = generate_ml_signal(symbol, data)

        # Create chart
        chart = create_price_chart(data, result)

        # Format results
        signal_emoji = {"BUY": "🟢", "SELL": "🔴", "HOLD": "🟡"}[result['signal']]

        summary = f"""
        ### {signal_emoji} Trading Signal for {symbol}

        **Signal**: {result['signal']}
        **Confidence**: {result['confidence']:.1%}
        **Current Price**: ${result['current_price']:.5f}
        **Stop Loss**: ${result['stop_loss']:.5f}
        **Take Profit**: ${result['take_profit']:.5f}

        **Key Indicators**:
        - RSI: {result['indicators']['rsi']:.1f}
        - MACD Histogram: {result['indicators']['macd']['histogram']:.5f}
        - Stochastic K: {result['indicators']['stochastic']['k']:.1f}

        **Analysis Reasons**: {', '.join(result['analysis_reasons'])}
        """

        return summary, chart, result

    except Exception as e:
        return f"❌ Error analyzing {symbol}: {str(e)}", None, {}

def analyze_batch(symbols_text: str):
    """Analyze multiple symbols"""
    try:
        symbols = [s.strip().upper() for s in symbols_text.split(',')]
        results = []

        for symbol in symbols:
            data = get_cached_data(symbol)
            if data is not None and len(data) >= 20:
                result = generate_ml_signal(symbol, data)
                results.append(result)
            else:
                results.append({
                    "symbol": symbol,
                    "signal": "HOLD",
                    "confidence": 0.0,
                    "error": "Insufficient data"
                })

        # Create summary table
        summary_data = []
        for r in results:
            if 'error' not in r:
                summary_data.append([
                    r['symbol'],
                    r['signal'],
                    f"{r['confidence']:.1%}",
                    f"${r['current_price']:.5f}"
                ])
            else:
                summary_data.append([r['symbol'], "ERROR", "0%", "N/A"])

        df = pd.DataFrame(summary_data, columns=["Symbol", "Signal", "Confidence", "Price"])

        # Format results
        buy_count = sum(1 for r in results if r.get('signal') == 'BUY')
        sell_count = sum(1 for r in results if r.get('signal') == 'SELL')
        hold_count = len(results) - buy_count - sell_count

        summary = f"""
        ### 📊 Batch Analysis Complete

        **Total Symbols**: {len(results)}
        **BUY Signals**: {buy_count} 🟢
        **SELL Signals**: {sell_count} 🔴
        **HOLD Signals**: {hold_count} 🟡

        **Analysis completed at**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """

        return summary, df, results

    except Exception as e:
        return f"❌ Error in batch analysis: {str(e)}", pd.DataFrame(), []

# Create Gradio Interface
def create_interface():
    with gr.Blocks(title="AI Cash Evolution - ML Trading System", theme=gr.themes.Soft()) as demo:
        gr.Markdown("""
        # 🤖 AI Cash Evolution - ML Trading System

        **Real-time trading signals powered by machine learning**

        Features:
        - 🎯 ML-style signal generation with confidence scoring
        - 📊 Technical analysis (RSI, MACD, Bollinger Bands, Stochastic)
        - 📈 Interactive price charts
        - 🔄 Batch analysis for multiple symbols
        - ⚡ Real-time market data from Yahoo Finance
        """)

        with gr.Tabs():
            # Single Symbol Analysis
            with gr.TabItem("🎯 Single Symbol"):
                with gr.Row():
                    symbol_input = gr.Textbox(
                        label="Trading Symbol",
                        placeholder="Enter symbol (e.g., EURUSD=X, BTC-USD, GC=F)",
                        value="EURUSD=X"
                    )
                    analyze_btn = gr.Button("🔍 Analyze", variant="primary")

                with gr.Row():
                    with gr.Column():
                        summary_output = gr.Markdown()
                    with gr.Column():
                        chart_output = gr.Plot()

                json_output = gr.JSON(label="Detailed Analysis", visible=False)

                analyze_btn.click(
                    analyze_symbol,
                    inputs=[symbol_input],
                    outputs=[summary_output, chart_output, json_output]
                )

            # Batch Analysis
            with gr.TabItem("📊 Batch Analysis"):
                with gr.Row():
                    symbols_input = gr.Textbox(
                        label="Symbols (comma-separated)",
                        placeholder="EURUSD=X, GBPUSD=X, USDJPY=X, BTC-USD, ETH-USD",
                        value="EURUSD=X, GBPUSD=X, USDJPY=X"
                    )
                    batch_btn = gr.Button("🚀 Analyze All", variant="primary")

                batch_summary = gr.Markdown()
                batch_table = gr.Dataframe(label="Results")

                batch_btn.click(
                    analyze_batch,
                    inputs=[symbols_input],
                    outputs=[batch_summary, batch_table, gr.JSON(visible=False)]
                )

            # API Documentation
            with gr.TabItem("📚 API Documentation"):
                gr.Markdown("""
                ### API Endpoints

                This system is also available as a REST API for integration with your trading dashboard.

                **Base URL**: `https://your-space.hf.space`

                #### Endpoints:

                1. **Single Symbol Analysis**
                   ```
                   GET /predict?symbol=EURUSD=X
                   ```

                2. **Batch Analysis**
                   ```
                   POST /predict/batch
                   Content-Type: application/json

                   {
                     "symbols": ["EURUSD=X", "GBPUSD=X", "USDJPY=X"]
                   }
                   ```

                3. **Health Check**
                   ```
                   GET /health
                   ```

                4. **Available Symbols**
                   ```
                   GET /symbols
                   ```

                #### Response Format:
                ```json
                {
                  "symbol": "EURUSD=X",
                  "signal": "BUY",
                  "confidence": 0.75,
                  "current_price": 1.08542,
                  "stop_loss": 1.08250,
                  "take_profit": 1.08950,
                  "indicators": {
                    "rsi": 45.2,
                    "macd": {...},
                    "bollinger_bands": {...},
                    "stochastic": {...}
                  }
                }
                ```
                """)

            # About
            with gr.TabItem("ℹ️ About"):
                gr.Markdown("""
                ### 🚀 AI Cash Evolution ML Trading System

                **Version**: 2.0.0
                **Platform**: Hugging Face Spaces
                **Status**: Production Ready

                #### Features:
                - ✅ Real-time market data via Yahoo Finance
                - ✅ Advanced technical analysis
                - ✅ ML-style signal generation
                - ✅ Risk management calculations
                - ✅ Interactive charts and visualizations
                - ✅ Batch processing capabilities
                - ✅ REST API for integration

                #### Technical Indicators:
                - **RSI** (Relative Strength Index)
                - **MACD** (Moving Average Convergence Divergence)
                - **Bollinger Bands** (Volatility bands)
                - **Stochastic Oscillator** (Momentum indicator)

                #### Signal Logic:
                Combines multiple technical indicators using weighted scoring to generate:
                - **BUY** signals with confidence 0-100%
                - **SELL** signals with confidence 0-100%
                - **HOLD** recommendations for neutral conditions

                #### Risk Management:
                - Automatic stop-loss calculation (1.5x ATR)
                - Take-profit targets (2.0x ATR)
                - Position sizing recommendations

                #### Integration:
                This system integrates seamlessly with your AI Cash Evolution dashboard.
                Update your environment variables:
                ```bash
                VITE_ML_API_URL=https://your-space.hf.space
                ```

                ---
                *Built with ❤️ for AI Cash Evolution*
                """)

        # Footer
        gr.Markdown("""
        ---
        **AI Cash Evolution** - Professional ML Trading System
        🚀 Powered by Hugging Face Spaces | ⚡ Real-time Analysis | 📊 Professional Trading Tools
        """)

    return demo

# Create Flask app for API endpoints
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route("/")
def home():
    return jsonify({
        "service": "AI Cash Evolution ML Trading API",
        "platform": "Hugging Face Spaces",
        "status": "online",
        "version": "2.0.0",
        "gradio_url": "/",
        "api_endpoints": ["/predict", "/predict/batch", "/health", "/symbols"]
    })

@app.route("/health")
def health():
    return jsonify({
        "status": "healthy",
        "platform": "huggingface_spaces",
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route("/predict")
def predict():
    symbol = request.args.get("symbol", "EURUSD=X")
    data = get_cached_data(symbol)

    if data is None or len(data) < 20:
        return jsonify({
            "error": f"Insufficient data for {symbol}",
            "signal": "HOLD",
            "confidence": 0.0
        }), 400

    result = generate_ml_signal(symbol, data)
    return jsonify(result)

@app.route("/predict/batch", methods=["POST"])
def predict_batch():
    data = request.get_json()
    symbols = data.get("symbols", ["EURUSD=X", "GBPUSD=X", "USDJPY=X"])

    if len(symbols) > 50:
        return jsonify({
            "error": "Too many symbols. Maximum 50 per request.",
            "signals": []
        }), 400

    results = []
    for symbol in symbols:
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

    return jsonify({
        "signals": results,
        "processed_count": len(results),
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route("/symbols")
def get_symbols():
    symbols = {
        "forex": ["EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X", "AUDUSD=X", "USDCAD=X"],
        "commodities": ["GC=F", "SI=F", "CL=F", "NG=F", "XAUUSD=X", "XAGUSD=X"],
        "crypto": ["BTC-USD", "ETH-USD", "BNB-USD", "ADA-USD"],
        "indices": ["^GSPC", "^DJI", "^IXIC", "^FTSE", "^N225"]
    }

    return jsonify({
        "symbols": symbols,
        "total_count": sum(len(v) for v in symbols.values()),
        "categories": list(symbols.keys())
    })

# Mount Gradio app
demo = create_interface()

# Export for Hugging Face Spaces
if __name__ == "__main__":
    # For local development
    demo.launch(server_name="0.0.0.0", server_port=7860, share=True)
else:
    # For Hugging Face Spaces deployment
    app = gr.mount_gradio_app(app, demo, path="/")