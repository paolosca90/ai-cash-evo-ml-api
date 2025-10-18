# ML Training Pipeline - Week 1

## Overview

This is the **Week 1** implementation of the ML Training System: **Historical Data Pipeline**.

The goal is to fetch 6 months of historical OHLCV data from OANDA, label it using backtest simulation, and prepare it for PPO model training.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ML Training Pipeline                      │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐          ┌──────▼──────┐
        │  Data Scraper  │          │ Data Labeler│
        │  (OANDA API)   │          │ (Backtest)  │
        └───────┬────────┘          └──────┬──────┘
                │                           │
                ▼                           ▼
        ┌────────────────────────────────────────┐
        │    ml_historical_candles (Supabase)   │
        │  - OHLCV data                          │
        │  - Technical indicators                │
        │  - ML labels (BUY/SELL/HOLD)          │
        │  - Trade outcomes (WIN/LOSS)          │
        └────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PPO Training  │
                    │  (TensorFlow.js)│
                    └─────────────────┘
```

## Database Schema

### ml_historical_candles
Stores historical OHLCV data with computed indicators and ML labels.

```sql
CREATE TABLE ml_historical_candles (
  id UUID PRIMARY KEY,
  symbol TEXT NOT NULL,
  granularity TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  
  -- OHLCV
  open DECIMAL NOT NULL,
  high DECIMAL NOT NULL,
  low DECIMAL NOT NULL,
  close DECIMAL NOT NULL,
  volume INTEGER,
  
  -- Technical Indicators
  rsi DECIMAL,
  macd DECIMAL,
  macd_signal DECIMAL,
  bb_upper DECIMAL,
  bb_middle DECIMAL,
  bb_lower DECIMAL,
  atr DECIMAL,
  adx DECIMAL,
  ema_20 DECIMAL,
  
  -- ML Labels
  is_labeled BOOLEAN DEFAULT FALSE,
  ml_label_signal TEXT, -- BUY/SELL/HOLD
  ml_label_confidence DECIMAL,
  ml_expected_move_pips DECIMAL,
  
  -- Trade Outcome
  ml_trade_outcome TEXT, -- WIN/LOSS/BREAKEVEN
  ml_actual_pips DECIMAL,
  ml_hit_tp BOOLEAN,
  ml_hit_sl BOOLEAN,
  ml_bars_to_close INTEGER
);
```

### ml_training_batches
Tracks data scraping/labeling batches.

```sql
CREATE TABLE ml_training_batches (
  id UUID PRIMARY KEY,
  batch_name TEXT NOT NULL,
  symbol TEXT,
  granularity TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  total_candles INTEGER DEFAULT 0,
  labeled_candles INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing'
);
```

### ml_model_training_runs
Tracks ML training runs and their performance metrics.

```sql
CREATE TABLE ml_model_training_runs (
  id UUID PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_version TEXT,
  training_batch_id UUID,
  
  -- Training Config
  total_samples INTEGER,
  train_samples INTEGER,
  val_samples INTEGER,
  test_samples INTEGER,
  epochs INTEGER,
  batch_size INTEGER,
  learning_rate DECIMAL,
  
  -- Metrics
  train_accuracy DECIMAL,
  val_accuracy DECIMAL,
  test_accuracy DECIMAL,
  win_rate DECIMAL,
  avg_pips_per_trade DECIMAL,
  sharpe_ratio DECIMAL,
  
  -- Model Storage
  model_url TEXT,
  model_size_bytes INTEGER,
  inference_time_ms DECIMAL
);
```

## Components

### 1. HistoricalDataScraper
**File**: `src/lib/ml-training/HistoricalDataScraper.ts`

Fetches historical candle data from OANDA API.

**Features**:
- Chunked fetching (respects 5000 candle limit per request)
- Rate limiting (500ms between requests)
- Batch tracking
- Multi-symbol, multi-timeframe support
- Upsert logic (avoids duplicates)

**Usage**:
```typescript
const scraper = new HistoricalDataScraper();

const config = {
  symbols: ['EURUSD', 'GBPUSD'],
  granularities: ['M5', 'M15', 'H1'],
  startDate: new Date('2024-04-01'),
  endDate: new Date('2024-10-01'),
  batchSize: 5000
};

const result = await scraper.scrapeHistoricalData(config);
```

### 2. DataLabeler
**File**: `src/lib/ml-training/DataLabeler.ts`

Labels historical candles using backtest simulation.

**Labeling Strategy**:
1. For each candle, look ahead N candles (configurable)
2. Simulate BUY trade: Calculate if TP/SL hit
3. Simulate SELL trade: Calculate if TP/SL hit
4. Choose direction with best outcome
5. Calculate confidence based on pip movement
6. Store label + outcome in database

**Confidence Calculation**:
- `pips >= 3x minMove` → 95% confidence
- `pips >= 2x minMove` → 80-90% confidence
- `pips >= 1x minMove` → 60-80% confidence
- `pips < minMove` → HOLD signal

**Usage**:
```typescript
const labeler = new DataLabeler();

const config = {
  lookAheadCandles: 50,  // Look 50 candles ahead
  takeProfitPips: 30,    // 30 pip TP
  stopLossPips: 15,      // 15 pip SL
  minConfidenceMove: 20  // Min 20 pips for HIGH confidence
};

const result = await labeler.labelBatch(batchId, config);
```

## Setup Instructions

### 1. Apply Database Migration

```bash
# The migration file is already created at:
supabase/migrations/20251007140000_ml_historical_data.sql

# Apply it to your Supabase project using Supabase CLI or Dashboard
```

**Via Supabase Dashboard**:
1. Go to SQL Editor
2. Copy contents of migration file
3. Run the SQL

**Via Supabase CLI**:
```bash
supabase db push
```

### 2. Configure Environment Variables

Make sure these are set in your `.env`:
```env
VITE_OANDA_API_KEY=your_oanda_api_key
VITE_OANDA_ACCOUNT_ID=your_oanda_account_id
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Historical Data Scraper

```bash
npm run scrape-historical
```

This will:
- Fetch 6 months of data for 6 major pairs (EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, NZDUSD)
- Fetch 4 timeframes (M5, M15, H1, H4)
- Store ~500,000 candles in `ml_historical_candles`
- Create batch tracking record

**Expected Time**: ~30-60 minutes (due to rate limiting)

### 4. Label the Data

After scraping completes, run the labeler:

```bash
npm run label-data -- --batch-id <batch_id_from_scraper>
```

**Configuration**:
- Look-ahead: 50 candles
- TP: 30 pips
- SL: 15 pips
- Min confidence move: 20 pips

**Expected Time**: ~10-20 minutes for 500k candles

### 5. Verify Data Quality

Check labeling statistics:

```sql
-- Total labeled candles
SELECT COUNT(*) FROM ml_historical_candles WHERE is_labeled = true;

-- Signal distribution
SELECT ml_label_signal, COUNT(*) 
FROM ml_historical_candles 
WHERE is_labeled = true 
GROUP BY ml_label_signal;

-- Win rate
SELECT 
  ml_trade_outcome,
  COUNT(*) as count,
  ROUND(AVG(ml_label_confidence) * 100, 2) as avg_confidence
FROM ml_historical_candles 
WHERE is_labeled = true 
GROUP BY ml_trade_outcome;

-- Average pips per signal type
SELECT 
  ml_label_signal,
  ROUND(AVG(ml_actual_pips), 2) as avg_pips,
  COUNT(*) as count
FROM ml_historical_candles 
WHERE is_labeled = true AND ml_label_signal != 'HOLD'
GROUP BY ml_label_signal;
```

## Expected Results

After labeling 6 months of data:

| Metric | Expected Value |
|--------|---------------|
| Total Candles | ~500,000 |
| BUY Signals | ~80,000 (16%) |
| SELL Signals | ~80,000 (16%) |
| HOLD Signals | ~340,000 (68%) |
| Win Rate | 55-65% |
| Avg Confidence (BUY/SELL) | 70-80% |
| Avg Pips per Trade | 15-25 |

## Next Steps (Week 2)

Once data is labeled:
1. **Train PPO Model** using TensorFlow.js
2. **Export Model** to Supabase Storage
3. **Integrate Inference** into `generate-ai-signals` Edge Function
4. **Validate Performance** with test set
5. **Deploy to Production**

## Troubleshooting

### OANDA API Rate Limits
If you hit rate limits, increase `RATE_LIMIT_DELAY` in `HistoricalDataScraper.ts`:
```typescript
private readonly RATE_LIMIT_DELAY = 1000; // 1 second
```

### Memory Issues
If scraping large datasets causes memory issues, reduce batch size:
```typescript
const config = {
  ...
  batchSize: 1000 // Reduce from 5000
};
```

### Missing Environment Variables
Ensure `.env` file exists with correct values:
```bash
cat .env | grep OANDA
cat .env | grep SUPABASE
```

### TypeScript Type Errors
The new tables aren't in Supabase types yet. After applying migration, regenerate types:
```bash
npx supabase gen types typescript --project-id <your_project_id> > src/integrations/supabase/types.ts
```

## Files Created

```
src/lib/ml-training/
├── HistoricalDataScraper.ts  # OANDA API scraper
├── DataLabeler.ts            # Backtest labeling logic
└── README.md                 # This file

scripts/ml-training/
└── scrape-historical.ts      # Scraping script

supabase/migrations/
└── 20251007140000_ml_historical_data.sql  # Database schema
```

## Performance Metrics

| Operation | Time | Records |
|-----------|------|---------|
| Scraping (6 months, 6 pairs, 4 TF) | 30-60 min | ~500k candles |
| Labeling (500k candles) | 10-20 min | ~500k labels |
| Training (PPO model) | 2-5 hours | TBD |
| Inference (single prediction) | <50ms | 1 signal |

## Status

✅ **COMPLETED** (Week 1 - Phase 1: Data Pipeline)
- [x] Database schema created
- [x] HistoricalDataScraper implemented
- [x] DataLabeler implemented
- [x] Batch tracking system
- [x] Documentation

🔄 **NEXT** (Week 1 - Phase 2: Model Training)
- [ ] PPO model training script
- [ ] Model evaluation
- [ ] Model deployment to Supabase Storage
- [ ] Integration with signal generation

---

**Questions?** Check the main roadmap: `ML_IMPLEMENTATION_ROADMAP.md`
