# Railway Auto-Trading System

## 🎯 Architecture

```
Railway (3 Services)
├── web: ML API (FastAPI)
├── signal_generator: Auto Signal Generator (100/day)
└── weight_optimizer: Weight Optimizer (Daily 2 AM)
    ↓
    Saves optimized weights to Supabase
    ↓
Supabase Edge Functions
└── generate-ai-signals: Uses weights from Railway
```

## 📦 Services

### 1. ML API (web)

**Port**: 8000 (Railway assigns dynamically)
**Purpose**: Serve ML predictions for trading signals

**Endpoints**:
- `GET /` - Service info
- `GET /health` - Health check
- `POST /predict` - Generate ML prediction

### 2. Auto Signal Generator (signal_generator)

**Type**: Background worker
**Purpose**: Generate 100+ signals/day and execute on OANDA

**Features**:
- ✅ Generates signals every 10 minutes (with jitter)
- ✅ Executes on OANDA via Supabase Edge Function
- ✅ Respects trading hours (8 AM - 4 PM UTC)
- ✅ Max 20 concurrent trades
- ✅ Max 120 trades/day
- ✅ Max $200 daily loss

**Logs**: Check Railway logs for:
```
Signal generated for EUR_USD: BUY @ 75.3%
Progress: 45/100 signals today
```

### 3. Weight Optimizer (weight_optimizer)

**Type**: Background worker (scheduled)
**Purpose**: Analyze trades daily and optimize weights

**Schedule**: Daily at 2 AM UTC

**Process**:
1. Load last 7 days of closed trades
2. Optimize confidence threshold (50-95)
3. Optimize ATR multipliers
4. Save results to Supabase `weight_optimization_history`
5. Deactivate old configs, activate new

**Logs**: Check Railway logs for:
```
Loaded 245 closed trades from last 7 days
Optimal threshold: 72 (score: 85.3)
Weights saved to Supabase - Threshold: 72, WR: 52.1%
```

## 🚀 Deployment to Railway

### Step 1: Push to GitHub

```bash
cd ai-cash-evo-ml-api
git add .
git commit -m "feat: add auto signal generator and weight optimizer services"
git push origin main
```

### Step 2: Configure Railway

1. Go to https://railway.app/dashboard
2. Select your `ai-cash-evo-ml-api` project
3. Add environment variables:
   ```
   SUPABASE_URL=https://rvopmdflnecyrwrzhyfy.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Step 3: Enable Multiple Services

Railway will auto-detect the `Procfile` and create 3 services:
- `web` (ML API)
- `signal_generator` (Worker)
- `weight_optimizer` (Worker)

**Note**: Workers don't expose ports, only `web` does.

### Step 4: Deploy

Railway auto-deploys on git push. Check logs:

```bash
# In Railway Dashboard
1. Click on "signal_generator" service
2. Check "Deployments" tab
3. View logs to confirm it's running
```

## 📊 Monitoring

### Check Signal Generation

```sql
-- In Supabase SQL Editor
SELECT
  DATE(created_at) as date,
  COUNT(*) as signals_generated,
  SUM(CASE WHEN win THEN 1 ELSE 0 END) as wins,
  AVG(confidence) as avg_confidence
FROM signal_performance
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Check Active Weights

```sql
SELECT *
FROM weight_optimization_history
WHERE active = true
ORDER BY timestamp DESC
LIMIT 1;
```

### Check Service Health

```bash
# ML API
curl https://web-production-31235.up.railway.app/health

# Response:
{
  "status": "healthy",
  "services": {
    "signal_generator": "running",
    "weight_optimizer": "scheduled"
  }
}
```

## 🔧 Troubleshooting

### Signal Generator Not Running

**Check**:
1. Railway logs for errors
2. Supabase Edge Function `generate-ai-signals` is deployed
3. OANDA API credentials are valid

**Fix**:
```bash
# Redeploy service
railway up signal_generator
```

### Weight Optimizer Not Saving

**Check**:
1. Database table `weight_optimization_history` exists
2. Service has Supabase permissions

**Fix**:
```sql
-- Create table if missing
CREATE TABLE IF NOT EXISTS weight_optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  optimal_threshold DECIMAL NOT NULL,
  performance_winrate DECIMAL NOT NULL,
  performance_avg_pips DECIMAL,
  qualified_signals INT NOT NULL,
  total_signals INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  source VARCHAR DEFAULT 'railway_auto_optimizer'
);
```

### Too Many Signals Generated

**Adjust** `services/auto_signal_generator_service.py`:
```python
CONFIG = {
    'target_signals_per_day': 50,  # Reduce from 100
    'signal_interval_seconds': 1200,  # Increase to 20 minutes
}
```

Then redeploy:
```bash
git commit -am "config: reduce signal generation rate"
git push
```

## 📈 Expected Results

### After 1 Day

```
Signals generated: 100-120
Trades closed: 50-80 (intraday)
Active trades: 20-30
Win rate: ~45-55% (initial)
```

### After 1 Week

```
Total signals: 700-840
Closed trades: 400-600
Win rate: Stabilizing 48-52%
Optimal threshold: Updated daily
```

### After 1 Month

```
Total signals: 3000+
Closed trades: 2000+
Win rate: Optimized 50-55%
ATR multipliers: Symbol-specific
System: Fully auto-optimizing
```

## 🎯 Benefits

1. **Auto-Learning**: System learns from real trades daily
2. **Always On**: Railway keeps services running 24/7
3. **No Manual Work**: Fully automated signal → execute → analyze → optimize
4. **Real Data**: 100% real OANDA trades, no simulations
5. **Continuous Improvement**: Weights updated daily based on performance

## 📝 Files Created

```
ai-cash-evo-ml-api/
├── services/
│   ├── auto_signal_generator_service.py  # Generates 100 signals/day
│   └── weight_optimizer_service.py       # Optimizes weights daily
├── Procfile                               # Railway multi-service config
├── requirements.txt                       # Updated dependencies
├── railway.json                           # Railway configuration
└── README_RAILWAY_SERVICES.md            # This file
```

## ✅ Status

- [x] Auto Signal Generator Service
- [x] Weight Optimizer Service
- [x] Railway Multi-Service Setup
- [ ] Deploy to Railway
- [ ] Verify services running
- [ ] Monitor first 24h
- [ ] Check optimized weights in Supabase

## 🚀 Next Steps

1. **Deploy to Railway**: `git push`
2. **Verify services**: Check Railway dashboard
3. **Monitor logs**: Confirm signals being generated
4. **Wait 24h**: Let system accumulate data
5. **Check results**: Verify weights in Supabase

---

**System Ready** ✅
**Auto-Trading** ✅
**Auto-Learning** ✅
