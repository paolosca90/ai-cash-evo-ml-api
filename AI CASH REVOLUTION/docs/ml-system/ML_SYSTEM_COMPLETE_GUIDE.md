# 🚀 ML TRADING SYSTEM - COMPLETE GUIDE

## 📋 System Architecture

### Hybrid Learning System

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION TRADING                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐     ┌────────────┐ │
│  │   Trading    │─────▶│  ML API      │────▶│   Model    │ │
│  │   Bot/User   │◀─────│  (On-Demand) │◀────│   .pkl     │ │
│  └──────────────┘      └──────────────┘     └────────────┘ │
│         │                     │                             │
│         │                     │                             │
│         ▼                     ▼                             │
│  ┌──────────────────────────────────┐                      │
│  │  Signal + Weights + Recommendation│                      │
│  │  - Direction: BUY/SELL            │                      │
│  │  - ML Confidence: 0-100%          │                      │
│  │  - Signal Weight: 0-100           │                      │
│  │  - Recommendation: STRONG/WEAK    │                      │
│  │  - Position Multiplier: 0.25-2.0x │                      │
│  └──────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              CONTINUOUS LEARNING (Background)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐     ┌────────────┐ │
│  │   Cron Job   │─────▶│  Supabase    │────▶│  Database  │ │
│  │  (Every 15m) │      │  Edge Func   │     │  (Candles) │ │
│  └──────────────┘      └──────────────┘     └────────────┘ │
│         │                                           │        │
│         │                                           │        │
│         ▼                                           ▼        │
│  Fetch OANDA Data                          Label Outcomes   │
│  Calculate Indicators                      (WIN/LOSS/Pips)  │
│  Save to Database                                           │
│                                                              │
│                        ┌────────────────┐                   │
│                        │  Auto Retrain  │                   │
│                        │  (Weekly or    │                   │
│                        │   1k samples)  │                   │
│                        └────────────────┘                   │
│                               │                              │
│                               ▼                              │
│                        New Model Deployed                    │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Components Overview

### 1. **ML Prediction API** (`api/ml_prediction_api.py`)
- **Purpose**: Real-time signal generation with weights
- **Endpoint**: `POST /predict`
- **Input**: Market data (OHLCV + indicators)
- **Output**: Direction, confidence, weight, recommendation, multiplier

### 2. **Supabase Edge Function** (`supabase/functions/generate-ml-signals/`)
- **Purpose**: Automatic data collection for continuous learning
- **Trigger**: Cron job (every 15 minutes)
- **Action**: Fetch OANDA data → Calculate indicators → Save to DB

### 3. **Signal Weight Calculator** (`scripts/calculate_signal_weights.py`)
- **Purpose**: Multi-factor signal quality scoring
- **Components**:
  - ML Confidence (30%)
  - Technical Quality (25%)
  - Market Conditions (20%)
  - Multi-Timeframe Confirmation (15%)
  - Risk Factors (10%)

### 4. **Auto Retraining** (`scripts/auto_retrain.py`)
- **Purpose**: Continuous model improvement
- **Triggers**:
  - Weekly retraining
  - Every 1,000 new labeled samples
  - Manual execution

## 🚀 Setup & Deployment

### Step 1: Apply Database Migration

```bash
# Apply weight columns to database
# Copy content from supabase/migrations/20251008_add_signal_weights.sql
# Execute in Supabase Dashboard SQL Editor
```

### Step 2: Deploy Supabase Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy function
cd supabase/functions/generate-ml-signals
supabase functions deploy generate-ml-signals --no-verify-jwt

# Set environment variables
supabase secrets set OANDA_API_TOKEN=your_token_here
supabase secrets set OANDA_API_URL=https://api-fxpractice.oanda.com
```

### Step 3: Setup Cron Job for Automatic Data Collection

```sql
-- In Supabase Dashboard → Database → Extensions → pg_cron

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule Edge Function every 15 minutes
SELECT cron.schedule(
  'collect-ml-data',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/generate-ml-signals',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{"symbols": ["EURUSD", "USDCAD", "USDJPY", "XAUUSD"], "timeframes": ["M15", "H1"]}'::jsonb
  );
  $$
);
```

### Step 4: Start ML Prediction API

```bash
# Install dependencies
cd api
pip install -r requirements.txt

# Start API
python ml_prediction_api.py

# API will run on http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Step 5: Enrich Historical Signals (One-time)

```bash
# Add weights to existing historical data
python scripts/enrich_signals_with_weights.py

# This processes all 275k labeled candles (30-45 minutes)
```

### Step 6: Run Backtest (Optional)

```bash
# Compare performance with different weight thresholds
python scripts/backtest_with_weights.py

# Shows win rate and pip performance by weight threshold
```

## 📊 Usage Examples

### Example 1: Get Signal from Bot

```python
import requests

# Prepare market data
data = {
    "market_data": {
        "symbol": "EURUSD",
        "granularity": "M15",
        "timestamp": "2025-10-08T10:30:00Z",
        "open": 1.0950,
        "high": 1.0965,
        "low": 1.0945,
        "close": 1.0960,
        "volume": 1500,
        "rsi": 35.5,
        "ema12": 1.0955,
        "ema21": 1.0945,
        "adx": 28.3
    },
    "multi_tf_signals": [
        {
            "symbol": "EURUSD",
            "granularity": "H1",
            "direction": "BUY",
            "confidence": 72.5
        },
        {
            "symbol": "EURUSD",
            "granularity": "M5",
            "direction": "BUY",
            "confidence": 65.0
        }
    ],
    "risk_metrics": {
        "current_drawdown": 3.5,
        "symbol_win_rate": 58.2
    }
}

# Get prediction
response = requests.post('http://localhost:8000/predict', json=data)
result = response.json()

print(f"Direction: {result['direction']}")
print(f"ML Confidence: {result['ml_confidence']}%")
print(f"Signal Weight: {result['signal_weight']}/100")
print(f"Recommendation: {result['recommendation']}")
print(f"Position Multiplier: {result['position_multiplier']}x")

# Trading decision
if result['recommendation'] == 'AVOID':
    print("⛔ SKIP this trade")
elif result['recommendation'] in ['STRONG_BUY', 'BUY']:
    position_size = base_position * result['position_multiplier']
    print(f"✅ TRADE with {position_size} lots")
```

### Example 2: Query Historical Signals by Weight

```sql
-- Get all STRONG_BUY signals
SELECT 
    symbol,
    granularity,
    timestamp,
    label as direction,
    label_confidence,
    signal_weight,
    signal_recommendation,
    position_multiplier,
    trade_outcome
FROM ml_historical_candles
WHERE signal_recommendation = 'STRONG_BUY'
    AND dataset_type = 'testing'
ORDER BY signal_weight DESC
LIMIT 20;

-- Calculate win rate by recommendation
SELECT 
    signal_recommendation,
    COUNT(*) as total_trades,
    SUM(CASE WHEN trade_outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
    ROUND(AVG(CASE WHEN trade_outcome = 'WIN' THEN 1.0 ELSE 0.0 END) * 100, 2) as win_rate,
    ROUND(AVG(win_pips), 2) as avg_win_pips,
    ROUND(AVG(loss_pips), 2) as avg_loss_pips
FROM ml_historical_candles
WHERE is_labeled = true
    AND signal_weight IS NOT NULL
GROUP BY signal_recommendation
ORDER BY win_rate DESC;
```

### Example 3: Automatic Retraining

```bash
# Check if retraining is needed
python scripts/auto_retrain.py

# Force retraining (automated mode, no prompts)
python scripts/auto_retrain.py --auto

# After successful retraining, reload API model
curl -X POST http://localhost:8000/model/reload
```

## 🔄 Continuous Learning Workflow

### Daily Operations

1. **Automatic** (Every 15 minutes):
   - Supabase Edge Function fetches new candles
   - Calculates indicators
   - Saves to `ml_historical_candles` (unlabeled)

2. **After Trade Closes** (Manual or via webhook):
   ```python
   # Update trade outcome
   supabase.table('ml_historical_candles').update({
       'is_labeled': True,
       'trade_outcome': 'WIN',  # or 'LOSS'
       'win_pips': 25.3,
       'loss_pips': 0
   }).eq('id', candle_id).execute()
   ```

3. **Weekly** (Automated):
   - `auto_retrain.py` checks for new data
   - If threshold reached → Train new model
   - Validate new model
   - Deploy if better than previous

### Model Performance Tracking

```bash
# View validation results
cat ml_models/validation_results_TIMESTAMP.json

# Compare models
ls -lh ml_models/model_*.pkl
```

## 📈 Performance Optimization

### Weight Threshold Tuning

Based on backtest results, adjust production filters:

```python
# Example: Only trade STRONG_BUY signals
if signal_weight >= 75 and recommendation == 'STRONG_BUY':
    execute_trade()

# Example: Scale position by weight
position_size = base_position * position_multiplier

# Example: Different thresholds per timeframe
if granularity == 'M15' and signal_weight >= 70:
    execute_trade()
elif granularity == 'H1' and signal_weight >= 65:
    execute_trade()
```

### Model Retraining Strategy

```python
# Option 1: Weekly retraining
- Pro: Always fresh model
- Con: May overfit to recent market

# Option 2: Every 1000 samples
- Pro: Sufficient new data
- Con: May lag market changes

# Option 3: Performance-triggered
if current_week_win_rate < 55%:
    trigger_retraining()
```

## 🛠️ Troubleshooting

### API Issues

```bash
# Check API health
curl http://localhost:8000/

# Reload model
curl -X POST http://localhost:8000/model/reload

# Get model info
curl http://localhost:8000/model/info
```

### Edge Function Issues

```bash
# View logs
supabase functions logs generate-ml-signals

# Test manually
curl -X POST https://your-project.supabase.co/functions/v1/generate-ml-signals \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["EURUSD"], "timeframes": ["M15"]}'
```

### Database Issues

```sql
-- Check recent unlabeled candles
SELECT COUNT(*) FROM ml_historical_candles 
WHERE dataset_type = 'production' AND is_labeled = false;

-- Check weight distribution
SELECT 
    signal_recommendation, 
    COUNT(*) 
FROM ml_historical_candles 
WHERE signal_weight IS NOT NULL 
GROUP BY signal_recommendation;
```

## 📊 Monitoring Dashboard

### Key Metrics to Track

1. **Model Performance**:
   - Overall accuracy
   - Win rate by recommendation tier
   - Average pips per recommendation tier

2. **Data Collection**:
   - New candles collected (daily)
   - Labeling completion rate
   - Production dataset size

3. **API Health**:
   - Request count
   - Response time
   - Error rate

4. **Trading Results**:
   - Trades executed by weight threshold
   - P&L by recommendation tier
   - Position sizing effectiveness

## 🎯 Next Steps

1. ✅ Apply database migration
2. ✅ Deploy Edge Function
3. ✅ Setup cron job
4. ✅ Start ML API
5. ✅ Enrich historical signals
6. ✅ Run backtest
7. ✅ Integrate with trading bot
8. ✅ Monitor and optimize

## 📚 Additional Resources

- **API Documentation**: http://localhost:8000/docs
- **Supabase Dashboard**: https://app.supabase.com
- **Model Validation Reports**: `ml_models/validation_results_*.json`
- **Weight Analysis**: Run `python scripts/backtest_with_weights.py`

---

**System Status**: ✅ Production Ready
**Last Updated**: 2025-10-08
**Version**: 1.0.0
