# AI Cash Evolution - ML API

Machine Learning prediction service for AI Cash Evolution trading platform.

## Features

- FastAPI REST API
- scikit-learn Random Forest model
- Real-time trading signal predictions
- Dynamic technical confidence fallback
- CORS enabled for Supabase integration

## Endpoints

### `GET /`
Service info and status

### `GET /health`
Health check
```json
{
  "status": "healthy",
  "model_available": true
}
```

### `POST /predict`
Generate prediction for trading signal

**Request:**
```json
{
  "symbol": "EUR_USD",
  "features": {
    "close": 1.0950,
    "rsi": 55,
    "ema12": 1.0945,
    "ema21": 1.0940,
    "ema50": 1.0930,
    "atr": 0.0015,
    "adx": 28
  }
}
```

**Response:**
```json
{
  "prediction": "BUY",
  "confidence": 72.5,
  "probabilities": {
    "BUY": 65.2,
    "SELL": 24.8,
    "HOLD": 10.0
  },
  "model_available": true
}
```

## Deployment

### Railway

1. Fork this repository
2. Create new project on Railway
3. Connect GitHub repository
4. Railway will auto-detect Python and deploy

### Local Development

```bash
pip install -r requirements.txt
python app.py
```

Server runs on http://localhost:8000

## Model

- **Algorithm**: Random Forest Classifier
- **Features**: OHLC, RSI, EMA12/21/50, ATR, ADX
- **Classes**: BUY, SELL, HOLD
- **Training Data**: 388k+ labeled signals

## Integration

Configure in Supabase Edge Function:

```typescript
const ML_API_URL = Deno.env.get('ML_API_URL') || 'https://your-railway-url.railway.app'
```

## License

MIT
