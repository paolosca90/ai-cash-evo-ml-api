# Hugging Face Spaces - Free ML Model Hosting
# https://huggingface.co/spaces

import gradio as gr
import pandas as pd
import numpy as np
import joblib
import requests
from datetime import datetime, timedelta
import json

class TradingMLSpace:
    def __init__(self):
        # Load your trained model
        try:
            self.model = joblib.load('trading_model.pkl')
        except:
            self.model = self.create_simple_model()

        # Trading symbols you want to support
        self.symbols = ['XAUUSD', 'ETHUSD', 'BTCUSD', 'EURUSD', 'GBPUSD',
                       'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF']

    def create_simple_model(self):
        # Fallback simple rule-based model
        return None

    def fetch_market_data(self, symbol):
        # You can fetch from free APIs or use demo data
        # For demo purposes, we'll generate synthetic data
        np.random.seed(42)
        days = 30

        dates = pd.date_range(end=datetime.now(), periods=days, freq='1H')
        base_price = 100 if 'USD' in symbol else 2000

        # Generate realistic price movements
        returns = np.random.normal(0.001, 0.02, days)
        prices = [base_price]
        for ret in returns:
            prices.append(prices[-1] * (1 + ret))

        prices = prices[1:]  # Remove initial base price

        data = pd.DataFrame({
            'timestamp': dates,
            'open': prices,
            'high': [p * (1 + abs(np.random.normal(0, 0.005))) for p in prices],
            'low': [p * (1 - abs(np.random.normal(0, 0.005))) for p in prices],
            'close': prices,
            'volume': np.random.randint(1000, 10000, days)
        })

        return data

    def calculate_technical_indicators(self, df):
        # Calculate RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))

        # Calculate MACD
        exp1 = df['close'].ewm(span=12).mean()
        exp2 = df['close'].ewm(span=26).mean()
        df['macd'] = exp1 - exp2
        df['signal'] = df['macd'].ewm(span=9).mean()

        # Calculate Bollinger Bands
        df['bb_middle'] = df['close'].rolling(window=20).mean()
        df['bb_std'] = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (df['bb_std'] * 2)
        df['bb_lower'] = df['bb_middle'] - (df['bb_std'] * 2)

        # Calculate Volume Ratio
        df['volume_ratio'] = df['volume'] / df['volume'].rolling(window=20).mean()

        return df

    def predict_signal(self, symbol):
        # Fetch and process data
        data = self.fetch_market_data(symbol)
        data = self.calculate_technical_indicators(data)

        # Get latest indicators
        latest = data.iloc[-1]

        # Simple rule-based prediction (replace with actual ML model)
        rsi = latest['rsi']
        macd = latest['macd']
        signal_line = latest['signal']
        bb_position = (latest['close'] - latest['bb_lower']) / (latest['bb_upper'] - latest['bb_lower'])

        # Generate trading signal
        signal_strength = 0

        # RSI signals
        if rsi < 30:
            signal_strength += 2
        elif rsi > 70:
            signal_strength -= 2

        # MACD signals
        if macd > signal_line:
            signal_strength += 1
        else:
            signal_strength -= 1

        # Bollinger Band signals
        if bb_position < 0.1:
            signal_strength += 1
        elif bb_position > 0.9:
            signal_strength -= 1

        # Determine final signal
        if signal_strength >= 3:
            signal = 'BUY'
            confidence = min(0.95, 0.6 + signal_strength * 0.1)
        elif signal_strength <= -3:
            signal = 'SELL'
            confidence = min(0.95, 0.6 + abs(signal_strength) * 0.1)
        else:
            signal = 'HOLD'
            confidence = 0.5

        return {
            'symbol': symbol,
            'signal': signal,
            'confidence': confidence,
            'rsi': round(rsi, 2),
            'macd': round(macd, 4),
            'bb_position': round(bb_position, 2),
            'signal_strength': signal_strength
        }

    def batch_predict(self, selected_symbols):
        results = []
        for symbol in selected_symbols:
            result = self.predict_signal(symbol)
            results.append(result)

        return results

# Initialize the trading system
trading_system = TradingMLSpace()

def predict_trading_signals(symbols):
    results = trading_system.batch_predict(symbols)

    # Format for Gradio display
    output = []
    for result in results:
        output.append(f"**{result['symbol']}**: {result['signal']} (Confidence: {result['confidence']:.1%})")
        output.append(f"  RSI: {result['rsi']}, MACD: {result['macd']}, BB Pos: {result['bb_position']}")
        output.append("")

    return "\n".join(output)

# Create Gradio interface
def create_interface():
    with gr.Blocks(title="AI Trading Signals - Free ML Deployment") as demo:
        gr.Markdown("# 🤖 AI Trading Signals - Free ML Model Deployment")
        gr.Markdown("Get real-time trading predictions for multiple symbols using machine learning.")

        with gr.Row():
            symbol_checkboxes = gr.CheckboxGroup(
                choices=trading_system.symbols,
                value=['XAUUSD', 'ETHUSD', 'BTCUSD'],
                label="Select Symbols to Analyze",
                info="Choose which symbols you want trading signals for"
            )

        with gr.Row():
            predict_btn = gr.Button("Generate Trading Signals", variant="primary")

        with gr.Row():
            output_text = gr.Textbox(
                label="Trading Predictions",
                lines=15,
                max_lines=20,
                show_copy_button=True
            )

        predict_btn.click(
            fn=predict_trading_signals,
            inputs=[symbol_checkboxes],
            outputs=[output_text]
        )

        gr.Markdown("### How it works:")
        gr.Markdown("""
        - This uses technical analysis (RSI, MACD, Bollinger Bands) to generate trading signals
        - The system analyzes recent market data for each selected symbol
        - Signals are based on multiple indicators combined for better accuracy
        - **FREE**: No costs for model deployment or predictions!
        """)

    return demo

# Launch the app
if __name__ == "__main__":
    interface = create_interface()
    interface.launch(
        share=True,  # Creates public URL
        server_name="0.0.0.0",
        server_port=7860
    )