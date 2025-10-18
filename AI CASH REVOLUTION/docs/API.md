# AI Trading System API Documentation

## Overview

The AI Trading System provides RESTful API endpoints for generating professional trading signals using advanced machine learning algorithms, smart money concepts, and multi-timeframe analysis.

## Base URL

```
https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1
```

## Authentication

All API requests require authentication using a bearer token:

```http
Authorization: Bearer YOUR_API_KEY
```

## API Endpoints

### 1. Generate AI Trading Signals

Generates professional trading signals with comprehensive analysis using Phase 1 features.

**Endpoint:** `POST /generate-ai-signals`

**Description:** Creates AI-powered trading signals with market regime detection, news impact analysis, and smart money concepts.

#### Request Headers

```http
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

#### Request Body

```json
{
  "symbol": "EURUSD",
  "trading_mode": "PROFESSIONAL",
  "timeframe": "1h"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | Yes | Trading symbol (e.g., "EURUSD", "XAUUSD", "BTCUSD") |
| `trading_mode` | string | No | Trading strategy: "PROFESSIONAL", "AGGRESSIVE", "CONSERVATIVE" |
| `timeframe` | string | No | Analysis timeframe: "1m", "5m", "15m", "1h", "4h", "1d" |

#### Supported Symbols

**Forex Majors:**
- EURUSD, GBPUSD, USDJPY, USDCHF, USDCAD, AUDUSD, NZDUSD

**Forex Crosses:**
- EURGBP, EURJPY, GBPJPY, EURCHF, AUDJPY, NZDJPY

**Commodities:**
- XAUUSD (Gold), XAGUSD (Silver)

**Cryptocurrencies:**
- BTCUSD, ETHUSD

#### Response

```json
{
  "id": "EURUSD-1759242404954",
  "symbol": "EURUSD",
  "confidence": 95,
  "timestamp": "2025-09-30T14:26:44.954Z",
  "reason": [
    "SUPPORT BOUNCE - Near 1.16854 SUPPORT (0.5%)",
    "Mean Reversion BUY Setup",
    "Market Regime: RANGING (confidence: 75%)",
    "Signal aligns with ranging market regime",
    "Enhanced Risk:Reward 2.40:1 using Dynamic ATR",
    "News Impact: Stop loss widened 1x, risk reduced 0%"
  ],
  "indicators": [
    "RSI N/A",
    "MACD N/A",
    "M15 undefined",
    "NEUTRAL Bias",
    "News: 0"
  ],
  "aiModel": "Professional Multi-Timeframe + Smart Money + News Analysis",
  "analysis": {
    "technical": [
      {
        "indicator": "RSI",
        "value": 50,
        "signal": "NEUTRAL"
      },
      {
        "indicator": "MACD",
        "value": 0,
        "signal": "SELL"
      }
    ],
    "patterns": {
      "pattern": undefined,
      "confidence": 95,
      "type": "STANDARD"
    },
    "priceAction": {
      "session": "NEUTRAL"
    },
    "news": [],
    "volatility": {
      "riskReward": "1:undefined",
      "atr": 0
    },
    "smartMoney": {
      "choc": false,
      "bos": false,
      "liquiditySwept": false,
      "bias": "NEUTRAL",
      "session": "NEUTRAL"
    }
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique signal identifier |
| `symbol` | string | Trading symbol |
| `confidence` | number | Signal confidence (0-100) |
| `timestamp` | string | Signal generation time (ISO 8601) |
| `reason` | string[] | Signal reasoning and factors |
| `indicators` | string[] | Technical indicator summary |
| `aiModel` | string | AI model description |
| `analysis` | object | Detailed technical analysis |

#### Example Request

```bash
curl -X POST "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/generate-ai-signals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "symbol": "EURUSD",
    "trading_mode": "PROFESSIONAL",
    "timeframe": "1h"
  }'
```

### 2. ML Performance Tracker

Tracks and analyzes machine learning model performance over time.

**Endpoint:** `POST /ml-performance-tracker`

#### Request Body

```json
{
  "symbol": "EURUSD",
  "model_type": "phase1_professional",
  "performance_metrics": {
    "accuracy": 0.75,
    "profit_factor": 1.8,
    "max_drawdown": 0.12
  }
}
```

### 3. ML Trading Optimizer

Optimizes trading parameters based on historical performance.

**Endpoint:** `POST /ml-trading-optimizer`

#### Request Body

```json
{
  "symbol": "EURUSD",
  "optimization_goals": ["profitability", "risk_management"],
  "timeframe": "1h",
  "lookback_days": 30
}
```

### 4. Economic Calendar

Fetches upcoming economic events that may impact trading.

**Endpoint:** `POST /fetch-economic-calendar`

#### Request Body

```json
{
  "currencies": ["USD", "EUR", "GBP"],
  "impact_levels": ["high", "medium"],
  "days_ahead": 7
}
```

### 5. Market Data

Real-time market data and technical indicators.

**Endpoint:** `POST /tradingview-market-data`

#### Request Body

```json
{
  "symbol": "EURUSD",
  "indicators": ["RSI", "MACD", "BB", "SMA"],
  "timeframe": "1h",
  "limit": 100
}
```

## Signal Types and Confidence Levels

### Signal Types

- **BUY**: Bullish signal with expected price appreciation
- **SELL**: Bearish signal with expected price depreciation
- **HOLD**: Neutral signal, no clear directional bias

### Confidence Levels

| Range | Interpretation |
|-------|----------------|
| 90-100 | Very high confidence, strong signal |
| 75-89 | High confidence, reliable signal |
| 60-74 | Moderate confidence, use with caution |
| 50-59 | Low confidence, consider waiting |
| 0-49 | No signal, stay out of market |

## Phase 1 Professional Features

### Market Regime Detection

The system detects current market conditions:

- **trending**: Strong directional movement
- **ranging**: Sideways price action
- **volatile**: High volatility, wide price swings

### News Impact Analysis

Automatic risk adjustment during economic events:

- **Risk Reduction**: Reduces position sizes during high-impact news
- **Stop Loss Widening**: Increases stop loss distance to avoid premature exits
- **Signal Skipping**: Pauses signal generation during extreme volatility

### Smart Money Concepts

Identification of institutional trading patterns:

- **CHoCH (Change of Character)**: Trend reversal patterns
- **BOS (Break of Structure)**: Key level breaks
- **Liquidity Sweeps**: Stop hunting scenarios
- **Session Bias**: Trading session preferences

### Dynamic ATR Calculation

Adaptive volatility measurement using:

- Multi-timeframe analysis (M1, M5, H1)
- Volatility weighting factors
- Session-aware adjustments

## Error Handling

The API implements comprehensive error handling with fallback mechanisms:

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_SYMBOL",
    "message": "Symbol not supported",
    "details": "The symbol 'INVALID' is not in our supported symbol list"
  }
}
```

### Fallback Mechanisms

- **Market Data Fallback**: Uses simulated data when APIs are unavailable
- **Signal Fallback**: Returns conservative HOLD signals on errors
- **Graceful Degradation**: Continues operation with reduced functionality

## Rate Limits

- **Requests per minute**: 60
- **Concurrent requests**: 5
- **Daily limit**: 1000 requests

## SDK and Integration

### JavaScript/TypeScript Example

```typescript
class AITradingClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1';
  }

  async generateSignal(symbol: string, tradingMode: string = 'PROFESSIONAL') {
    const response = await fetch(`${this.baseUrl}/generate-ai-signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        symbol,
        trading_mode: tradingMode
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }
}

// Usage
const client = new AITradingClient('YOUR_API_KEY');
const signal = await client.generateSignal('EURUSD');
console.log(`Signal: ${signal.type} with ${signal.confidence}% confidence`);
```

### Python Example

```python
import requests
import json

class AITradingClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1'

    def generate_signal(self, symbol, trading_mode='PROFESSIONAL'):
        url = f'{self.base_url}/generate-ai-signals'
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        }
        data = {
            'symbol': symbol,
            'trading_mode': trading_mode
        }

        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()

# Usage
client = AITradingClient('YOUR_API_KEY')
signal = client.generate_signal('EURUSD')
print(f"Signal: {signal['type']} with {signal['confidence']}% confidence")
```

## Best Practices

### 1. Signal Validation

Always validate signals before trading:

```typescript
function validateSignal(signal: any): boolean {
  return (
    signal.confidence >= 70 &&
    signal.reason.length > 0 &&
    ['BUY', 'SELL'].includes(signal.type)
  );
}
```

### 2. Risk Management

Implement proper risk management:

```typescript
function calculatePositionSize(
  accountBalance: number,
  riskPercentage: number,
  entryPrice: number,
  stopLoss: number
): number {
  const riskAmount = accountBalance * (riskPercentage / 100);
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  return Math.floor(riskAmount / riskPerShare);
}
```

### 3. Error Handling

Implement robust error handling:

```typescript
async function getSignalWithRetry(symbol: string, maxRetries: number = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.generateSignal(symbol);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Support

For API support and questions:
- **Documentation**: Available in `/docs` directory
- **Testing**: Use provided test suites in `/src/test/`
- **Issues**: Check error logs and fallback mechanisms

## Changelog

### Version 1.0.0
- Initial API release
- Phase 1 professional trading features
- Multi-timeframe analysis
- Smart money concepts integration
- Comprehensive error handling
- Risk management enhancements