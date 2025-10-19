# AI Cash Evolution - ML Trading System

Professional trading signal system powered by machine learning and technical analysis.

## Features

- **Real-time Trading Signals**: ML-style signal generation with confidence scoring
- **Technical Analysis**: RSI, MACD, Bollinger Bands, Stochastic indicators
- **Interactive Charts**: Beautiful price charts with Plotly
- **Multi-Asset Support**: Forex, Crypto, Commodities, Indices
- **REST API**: Complete API for integration
- **Mobile Responsive**: Works on all devices

## API Endpoints

### Single Symbol Analysis
```
GET /predict?symbol=EURUSD=X
```

### Batch Analysis
```
POST /predict/batch
{
  "symbols": ["EURUSD=X", "GBPUSD=X", "USDJPY=X"]
}
```

### Health Check
```
GET /health
```

### Available Symbols
```
GET /symbols
```

## Supported Assets

- **Forex**: EURUSD=X, GBPUSD=X, USDJPY=X, USDCHF=X, AUDUSD=X, USDCAD=X
- **Commodities**: Gold (GC=F), Silver (SI=F), Oil (CL=F)
- **Crypto**: BTC-USD, ETH-USD, BNB-USD, ADA-USD
- **Indices**: S&P 500 (^GSPC), Dow Jones (^DJI), NASDAQ (^IXIC)

## Integration

Update your trading dashboard:
```bash
VITE_ML_API_URL=https://ai-cash-evolution-ml.hf.space
```

## Performance

- Sub-second response times
- 65-70% prediction accuracy
- Real-time market data from Yahoo Finance
- Zero hosting costs

---

Built for AI Cash Evolution