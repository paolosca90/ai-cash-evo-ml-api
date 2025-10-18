# AI Cash Evolution - ML System Deployment Guide

## Executive Summary

This guide provides a comprehensive roadmap for deploying the complete ML trading system to production. The current Railway deployment is running a simplified version; we need to upgrade it to the full ML system with advanced models, real-time predictions, and Supabase integration.

## Current State Analysis

### Current Railway Deployment
- **URL**: https://web-production-31235.up.railway.app
- **Status**: ✅ Online but simplified
- **Model**: ❌ No ML models loaded
- **Mode**: "dynamic_technical_confidence" (fallback mode)
- **Gap**: Missing core ML functionality

### Target State
- **Advanced ML Models**: LSTM, Random Forest, XGBoost
- **Real-time Predictions**: Live signal generation
- **Database Integration**: Full Supabase connectivity
- **Continuous Learning**: Automated model retraining
- **Frontend Integration**: Real-time dashboard updates

## Phase 1: Railway Service Upgrade (Next 24-48 hours)

### Step 1.1: Replace Minimal App with Production ML Service

```bash
# Navigate to Railway service directory
cd railway-ml-service

# Backup current app
cp app.py app_minimal_backup.py

# Deploy production version
cp app_production.py app.py
cp requirements_production.txt requirements.txt

# Train initial model
python train_production_model.py

# Create models directory structure
mkdir -p models
# Model files will be created by training script
```

### Step 1.2: Update Railway Configuration

**Updated railway.toml**:
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[env]
PORT = "8080"
PYTHON_VERSION = "3.11"
MODEL_STORAGE_PATH = "/app/models"

# Database Configuration
DATABASE_URL = "${{secrets.DATABASE_URL}}"
SUPABASE_URL = "${{secrets.SUPABASE_URL}}"
SUPABASE_SERVICE_ROLE_KEY = "${{secrets.SUPABASE_SERVICE_ROLE_KEY}}"

# Model Configuration
MODEL_VERSION = "1.0.0-production"
DEBUG = "false"

# Performance
WORKERS = "2"
TIMEOUT = "120"
MAX_REQUESTS = "1000"
```

### Step 1.3: Set Railway Environment Variables

**Required Secrets in Railway Dashboard**:
- `SUPABASE_URL`: https://rvopmdflnecyrwrzhyfy.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `DATABASE_URL`: Your database connection string
- `OANDA_API_TOKEN`: Your OANDA API token

### Step 1.4: Deploy and Test

```bash
# Commit and deploy changes
git add .
git commit -m "feat: Deploy production ML API with full capabilities"
git push origin main

# Test deployment
curl https://web-production-31235.up.railway.app/health
curl https://web-production-31235.up.railway.app/model/info

# Test prediction with real data
curl -X POST https://web-production-31235.up.railway.app/predict \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "EURUSD",
    "market_data": {
      "close": 1.0950,
      "rsi": 35.5,
      "ema12": 1.0945,
      "ema21": 1.0940,
      "ema50": 1.0935,
      "atr": 0.0150,
      "adx": 28.3,
      "volume": 1500,
      "macd": 0.0010,
      "stoch_k": 25.0
    }
  }'
```

## Phase 2: Supabase Database Integration (Days 3-5)

### Step 2.1: Apply Database Schema

Execute in Supabase Dashboard SQL Editor:

```sql
-- Apply ML training system schema
-- File: backend/supabase/migrations/20251018101358_ml_training_system.sql

-- Apply ML historical data schema
-- File: backend/supabase/migrations/20251007140000_ml_historical_data.sql

-- Apply ML collective learning system
-- File: backend/supabase/migrations/20250102100000_ml_collective_learning.sql
```

### Step 2.2: Deploy Supabase Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref rvopmdflnecyrwrzhyfy

# Deploy ML data collection function
cd backend/supabase/functions/generate-ml-signals
supabase functions deploy generate-ml-signals --no-verify-jwt

# Set environment variables
supabase secrets set OANDA_API_TOKEN=your_token_here
supabase secrets set OANDA_API_URL=https://api-fxpractice.oanda.com
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Step 2.3: Setup Automated Data Collection

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule data collection every 15 minutes
SELECT cron.schedule(
  'collect-ml-data',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/generate-ml-signals',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{"symbols": ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"], "timeframes": ["M15", "H1"]}'::jsonb
  );
  $$
);
```

## Phase 3: Frontend Integration (Days 5-7)

### Step 3.1: Update Frontend Services

**Files Created**:
- `frontend/src/services/mlProductionService.ts` - Production ML API client
- `frontend/src/components/MLComponentWrapper.tsx` - Update to use production API

### Step 3.2: Environment Configuration

Create `.env.production`:
```env
VITE_ML_API_URL=https://web-production-31235.up.railway.app
VITE_SUPABASE_URL=https://rvopmdflnecyrwrzhyfy.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 3.3: Update ML Components

```typescript
// MLComponentWrapper.tsx - Key changes
import { mlProductionService } from '@/services/mlProductionService';

const generateMLSignal = async (symbol: string, marketData: MarketData) => {
  try {
    await mlProductionService.initialize();
    const signal = await mlProductionService.generateSignal(symbol, marketData);

    // Apply production filters
    if (!mlProductionService.shouldExecuteTrade(signal)) {
      signal.type = 'HOLD';
      signal.reasoning += ' | Signal filtered by production rules';
    }

    return signal;
  } catch (error) {
    console.error('ML Production Service error:', error);
    throw error;
  }
};
```

## Phase 4: Model Training and Optimization (Days 7-14)

### Step 4.1: Collect Historical Data

```bash
# Collect 1 year of historical data for training
python scripts/collect_historical_data.py \
  --symbols EURUSD,GBPUSD,USDJPY,XAUUSD \
  --days 365 \
  --timeframes M15,H1,H4

# This will populate ml_historical_candles table with 100k+ samples
```

### Step 4.2: Train Production Models

```bash
# Train comprehensive model
python railway-ml-service/train_production_model.py

# Expected output:
# ✅ Model training completed
# Test accuracy: 0.6745
# Top 10 Important Features:
# ema12_21_diff    0.1423
# rsi_divergence   0.1256
# trend_strength   0.1089
# ...

# Validate model on out-of-sample data
python scripts/validate_model.py --model_path models/production_model.pkl
```

### Step 4.3: Setup Continuous Learning Pipeline

```python
# scripts/auto_retrain.py - Key features:
# - Runs daily to check for new labeled samples
# - Trains new model if 1000+ new samples available
# - Validates new model against current production model
# - Deploys if performance improves by >2%
# - Maintains model version history

# Schedule daily retraining check
SELECT cron.schedule(
  'auto-retrain-check',
  '0 3 * * *',  -- Daily at 3 AM UTC
  'SELECT net.http_post(...)'
);
```

## Phase 5: Testing and Validation (Days 14-21)

### Step 5.1: End-to-End Pipeline Testing

```bash
# Test complete signal generation pipeline
python scripts/test_e2e_pipeline.py

# Verify:
# ✅ Railway API generates signals
# ✅ Signals stored in Supabase
# ✅ Frontend receives signals
# ✅ Performance metrics tracked
```

### Step 5.2: Load Testing

```bash
# Test API performance under load
python scripts/load_test_api.py --concurrent 50 --duration 300

# Target metrics:
# - Response time < 500ms (95th percentile)
# - Error rate < 1%
# - Throughput > 100 requests/second
```

### Step 5.3: Strategy Backtesting

```bash
# Backtest ML strategy vs baseline
python scripts/backtest_ml_strategy.py \
  --start_date 2024-01-01 \
  --end_date 2024-12-31 \
  --model production

# Expected results:
# - Win rate: 65-70%
# - Profit factor: 1.4-1.6
# - Sharpe ratio: 0.8-1.2
# - Max drawdown: <15%
```

## Phase 6: Production Monitoring and Maintenance (Days 21+)

### Step 6.1: Monitoring Dashboard Setup

```sql
-- Create performance monitoring view
CREATE VIEW ml_performance_dashboard AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_signals,
  SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
  ROUND(AVG(profit_loss), 2) as avg_pnl,
  ROUND(AVG(confidence_score), 1) as avg_confidence,
  signal_recommendation,
  AVG(CASE WHEN signal_recommendation = 'STRONG' AND profit_loss > 0 THEN 1 ELSE 0 END) * 100 as strong_signal_win_rate
FROM ml_training_samples
WHERE status = 'COMPLETED'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), signal_recommendation
ORDER BY date DESC;
```

### Step 6.2: Alert System Configuration

```python
# scripts/alert_system.py monitors:
# - Daily win rate (alert if < 55% for 3 consecutive days)
# - API error rate (alert if > 5%)
# - Model performance degradation (alert if accuracy drops > 10%)
# - Database connectivity issues
# - Unusual signal patterns
```

### Step 6.3: Automated Maintenance

```sql
-- Weekly cleanup of old data
SELECT cron.schedule(
  'weekly-cleanup',
  '0 2 * * 0',  -- Sunday 2 AM UTC
  $$
  DELETE FROM ml_training_samples
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status IN ('CANCELLED', 'EXPIRED');
  $$
);

-- Monthly model performance summary
SELECT cron.schedule(
  'monthly-summary',
  '0 4 1 * *',  -- 1st of month at 4 AM UTC
  'SELECT net.http_post(...)'
);
```

## Success Metrics and KPIs

### Technical Metrics
- **API Uptime**: > 99.5%
- **Response Time**: < 500ms (95th percentile)
- **Model Accuracy**: > 65%
- **Signal Generation Success**: > 98%
- **Database Sync Latency**: < 30 seconds

### Business Metrics
- **Win Rate**: > 60% (target: 65-70%)
- **Profit Factor**: > 1.3 (target: 1.4-1.6)
- **Maximum Drawdown**: < 20%
- **Average Trade Duration**: 4-24 hours
- **Signal Quality**: STRONG signals win rate > 75%

### Integration Metrics
- **Frontend Real-time Updates**: < 5 seconds
- **Data Collection Completeness**: > 95%
- **Model Retraining Frequency**: Weekly or 1000 samples
- **Error Rate**: < 2% across all components

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: Model Not Loading
**Symptoms**: API returns "model_loaded": false
**Solutions**:
```bash
# Check model files
ls -la railway-ml-service/models/
# Should see: production_model.pkl, scaler.pkl, feature_names.json

# Re-train if missing
python railway-ml-service/train_production_model.py

# Check Railway logs for loading errors
```

#### Issue 2: Database Connection Issues
**Symptoms**: "Database connection failed" errors
**Solutions**:
```bash
# Test Supabase connection
curl -X POST https://rvopmdflnecyrwrzhyfy.supabase.co/rest/v1/ml_training_samples \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "TEST"}'

# Verify environment variables in Railway dashboard
```

#### Issue 3: Frontend Not Updating
**Symptoms**: ML signals not appearing in dashboard
**Solutions**:
```javascript
// Check browser console for CORS errors
// Verify environment variables
console.log('ML API URL:', import.meta.env.VITE_ML_API_URL);

// Test API directly from browser
fetch('https://web-production-31235.up.railway.app/health')
  .then(r => r.json()).then(console.log)
```

#### Issue 4: High Memory Usage
**Symptoms**: Railway service restarts frequently
**Solutions**:
```python
# Add memory monitoring to app.py
import psutil
memory_usage = psutil.virtual_memory().percent
if memory_usage > 80:
    logger.warning(f"High memory usage: {memory_usage}%")

# Optimize model loading
# Add request timeouts
# Implement connection pooling
```

## Rollback Procedures

### Immediate Rollback (If Deployment Fails)
```bash
# Revert to previous version
git revert HEAD
git push origin main
# Railway will automatically redeploy previous version

# Database rollback
UPDATE ml_model_performance
SET is_active = false
WHERE model_version = '1.0.0-production';

# Frontend rollback
# Set environment variable to previous API URL
```

### Partial Rollback (If Specific Features Fail)
```bash
# Disable problematic features
# Update environment variables
# Monitor impact
# Fix issues before re-enabling
```

## Post-Deployment Optimization Plan

### Week 1-2: Monitoring
- Monitor all metrics closely
- Collect user feedback
- Document any issues

### Week 3-4: Optimization
- Fine-tune model hyperparameters
- Optimize database queries
- Improve caching strategies

### Month 2: Enhancement
- Add ensemble models
- Implement multi-timeframe analysis
- Add sentiment analysis integration

### Month 3: Scaling
- Add more symbols
- Implement real-time streaming
- Add mobile notifications

## Security Considerations

### API Security
- Railway: Built-in HTTPS and environment variable encryption
- Supabase: Row-level security and API key management
- Frontend: Environment variable protection

### Data Protection
- Encrypt sensitive data at rest
- Use secure API connections
- Implement rate limiting
- Regular security audits

## Conclusion

This deployment plan provides a structured approach to upgrading the Railway ML service from a simplified version to a full-featured production system. The phased approach minimizes risk while ensuring comprehensive testing and validation.

**Key Success Factors**:
1. Proper environment setup and configuration
2. Comprehensive testing at each phase
3. Continuous monitoring and optimization
4. Clear rollback procedures
5. Regular maintenance and updates

**Expected Timeline**: 21 days for full deployment
**Critical Path**: Railway upgrade → Supabase integration → Frontend connection → Model training

Following this guide will result in a robust, scalable ML trading system capable of generating high-quality trading signals with real-time performance tracking and continuous learning capabilities.