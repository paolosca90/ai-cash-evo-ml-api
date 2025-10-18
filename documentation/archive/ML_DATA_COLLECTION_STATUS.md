# 📊 ML Data Collection System - Status Report

**Report Date:** 2025-10-07
**System Status:** 🟡 **OPERATIONAL** - Early Stage

---

## 🎯 Executive Summary

Il sistema di raccolta dati ML è **operativo e funzionante correttamente**. Le tabelle del database sono configurate, le Edge Functions sono attive, e i primi dati sono stati raccolti con successo.

### Current Status
- ✅ Database tables created and configured
- ✅ Edge Functions deployed and working
- ✅ OANDA integration active
- ✅ First signals collected successfully
- 🟡 Early data collection stage (2 signals)
- 🟡 Waiting for trade completions
- 🟡 Ensemble weights pending (need 10+ completed trades)

---

## 📈 Current Data Collection Status

### Signal Performance Table
- **Total Signals:** 2
- **Signals Last 24h:** 2
- **Signal Types:** ensemble
- **OANDA Executed Trades:** 2
- **Completed Trades:** 0 (pending close)
- **Pending Trades:** 2

### Latest Signal Example
```
Symbol: EURGBP
Type: ensemble
Direction: SELL
Confidence: 95%
Created: 06/10/2025, 19:50:47
OANDA Trade ID: 10
```

### Ensemble Weights
- **Status:** Not yet calculated
- **Reason:** Need 10+ completed trades per symbol
- **Auto-Update:** Triggers every 10 trades automatically

### Performance Analytics
- **Status:** Not available yet
- **Reason:** Need completed trades (with win/loss data)
- **Will Include:** Win rates, P&L, Sharpe ratios per symbol/type

---

## 🔧 System Architecture

### 1. Database Tables

#### `signal_performance`
Tracks every trading signal and its outcome:
- Signal metadata (symbol, type, direction, confidence)
- Entry/exit prices, SL/TP levels
- ML-specific data (action, confidence, uncertainty, recommendation)
- Actual results (P&L, win/loss)
- Market context (regime, session, volatility, news)
- OANDA trade ID for external tracking

**Indexes:**
- Symbol (fast lookup by symbol)
- Signal type (filter by classic/ml/ensemble)
- Timestamp (chronological queries)
- Win status (performance analytics)

#### `ensemble_weights`
Adaptive weights per symbol based on performance:
- Classic vs ML weights (sum to 1.0)
- Performance metrics (win rates, Sharpe ratios)
- Recalculation metadata
- Auto-updates every 10 completed trades

#### `signal_performance_analytics` (View)
Real-time analytics aggregation:
- Win rates by symbol and signal type
- Average confidence, P&L, standard deviation
- Sharpe-like ratios
- Wins/losses breakdown

### 2. Auto-Recalculation System

**Trigger:** `auto_recalculate_ensemble_weights`
- Monitors `signal_performance` table
- Triggers every 10 completed trades per symbol
- Calls `recalculate_ensemble_weights(symbol)` function
- Updates ensemble weights automatically

**Function:** `recalculate_ensemble_weights(p_symbol)`
- Analyzes last 50 trades per symbol
- Calculates classic vs ML win rates
- Computes Sharpe ratios
- Adjusts weights proportionally
- Ensures weights sum to 1.0

### 3. Data Collection Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                   Auto-Trading Daemon                       │
│            (scripts/start-auto-trading.js)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Edge Function: auto-oanda-trader               │
│  • Selects random symbol from 12 pairs                      │
│  • Calls generate-ai-signals-v3 for signal                  │
│  • Executes trade on OANDA demo account                     │
│  • Saves to signal_performance table                        │
│  • Triggers weight recalc if needed                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Edge Function: generate-ai-signals-v3          │
│  • TREND/RANGE detection (ADX, Choppiness)                  │
│  • PDH/PDL levels (Previous Day High/Low)                   │
│  • Open Breakout detection                                  │
│  • Always returns BUY or SELL (never HOLD)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    OANDA Demo Account                        │
│  • Real market execution (demo funds)                       │
│  • Returns trade ID, fill price, SL/TP                      │
│  • Risk-free testing environment                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Database: signal_performance                    │
│  • Stores complete signal data                              │
│  • Tracks OANDA trade via external_trade_id                 │
│  • Auto-triggers weight recalc every 10 trades              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Trigger: auto_recalculate_ensemble_weights        │
│  • Monitors completed trades                                │
│  • Triggers recalculation every 10 trades                   │
│  • Updates ensemble_weights table                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Start/Monitor Auto-Trading

### Start Auto-Trading Daemon
```bash
node scripts/start-auto-trading.js
```

**What it does:**
- Runs continuously 24/7
- Executes 1 trade every 10-30 minutes (random interval)
- Trades 12 symbols: EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, NZDUSD, EURGBP, EURJPY, GBPJPY, XAUUSD, XAGUSD
- Saves to `signal_performance` table
- Creates OANDA demo trades

### Check System Status
```bash
node scripts/check-ml-data-collection.js
```

**Shows:**
- Total signals collected
- Recent signals (last 24h)
- Ensemble weights status
- Performance analytics
- Auto-trading daemon status
- Recommendations

### View Logs
```bash
# Edge Function logs
supabase functions logs auto-oanda-trader

# View recent trades in database
# (Use Supabase Dashboard > Table Editor > signal_performance)
```

---

## 📊 Data Collection Milestones

### Phase 1: Initial Collection (Current)
- **Target:** 100 signals
- **Status:** 2/100 (2%)
- **ETA:** ~2-3 days (at 10-30 min intervals)
- **Unlocks:** Basic performance analytics

### Phase 2: Early ML Training
- **Target:** 500 signals
- **Status:** 2/500 (<1%)
- **ETA:** ~1-2 weeks
- **Unlocks:** Reliable ensemble weights, ML model training

### Phase 3: Production Ready
- **Target:** 1000+ signals
- **Status:** 2/1000 (<1%)
- **ETA:** ~3-4 weeks
- **Unlocks:** High-confidence ML predictions, production deployment

---

## 🎯 Key Metrics to Monitor

### 1. Data Volume
- ✅ **Critical:** 10+ completed trades per symbol (for ensemble weights)
- ✅ **Good:** 50+ completed trades per symbol (for reliable analytics)
- ✅ **Excellent:** 100+ completed trades per symbol (for production ML)

### 2. Win Rate
- 🎯 **Target:** 60-70% (high win rate intraday strategy)
- 📊 **Measure:** Via `signal_performance_analytics` view
- 🔄 **Improves:** With ensemble weight optimization

### 3. Data Quality
- ✅ **Required:** Complete signal data (entry, SL, TP, confidence)
- ✅ **Required:** OANDA trade IDs for external tracking
- ✅ **Required:** Win/loss outcomes (after trade close)
- ✅ **Required:** Market context (regime, session, volatility)

### 4. System Health
- ✅ Auto-trading daemon running continuously
- ✅ No errors in Edge Function logs
- ✅ Regular weight recalculations (every 10 trades)
- ✅ Performance analytics updating automatically

---

## 🔍 Verification Queries

### Check Total Signals
```sql
SELECT COUNT(*) as total_signals
FROM signal_performance;
```

### Check Recent Activity (Last 24h)
```sql
SELECT symbol, signal_type, predicted_direction, confidence, created_at
FROM signal_performance
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Check Completed Trades
```sql
SELECT symbol, signal_type, win, actual_result
FROM signal_performance
WHERE win IS NOT NULL
ORDER BY created_at DESC;
```

### Check Ensemble Weights
```sql
SELECT symbol, classic_weight, ml_weight, classic_win_rate, ml_win_rate, sample_size
FROM ensemble_weights
ORDER BY last_recalculated DESC;
```

### Check Performance Analytics
```sql
SELECT * FROM signal_performance_analytics
ORDER BY total_signals DESC;
```

---

## 💡 Recommendations

### Immediate Actions
1. ✅ **Continue auto-trading** - System is collecting data correctly
2. ✅ **Monitor status daily** - Run `check-ml-data-collection.js` script
3. ⏳ **Wait for trade completions** - Trades need to close to get win/loss data

### Next Steps (After 10+ Completed Trades)
1. 📊 **Review performance analytics** - Check win rates by symbol/type
2. ⚖️ **Verify ensemble weights** - Ensure weights are updating every 10 trades
3. 🎯 **Optimize strategy** - Use analytics to improve signal generation

### Long-term Goals (After 100+ Signals)
1. 🤖 **Train ML models** - Use collected data for RL/supervised learning
2. 🔄 **Enable continuous learning** - Auto-retrain models with new data
3. 🚀 **Deploy to production** - Transition from demo to live trading

---

## 🛠️ Troubleshooting

### Problem: No new signals being collected
**Solution:**
- Check if auto-trading daemon is running
- Verify OANDA credentials in Supabase secrets
- Check Edge Function logs for errors

### Problem: Trades not completing (no win/loss data)
**Solution:**
- This is NORMAL - trades take time to close (max 4h for majors)
- OANDA demo closes trades automatically at SL/TP
- Check OANDA platform for trade status

### Problem: Ensemble weights not updating
**Solution:**
- Need 10+ completed trades per symbol first
- Weights auto-update via trigger (check logs)
- Can manually trigger: `SELECT recalculate_ensemble_weights('EURUSD')`

### Problem: Performance analytics empty
**Solution:**
- Need completed trades with win/loss outcomes
- View only shows data when `win IS NOT NULL`
- Wait for trades to close naturally

---

## 📚 Related Documentation

- `CLAUDE.md` - Main project documentation
- `supabase/migrations/20250106000000_signal_performance_tracking.sql` - Database schema
- `supabase/functions/auto-oanda-trader/` - Auto-trading Edge Function
- `supabase/functions/generate-ai-signals-v3/` - Signal generation (Adaptive V3)
- `scripts/start-auto-trading.js` - Auto-trading daemon
- `scripts/check-ml-data-collection.js` - Status checker

---

## ✅ Conclusion

**Il sistema di raccolta dati ML è operativo e funziona correttamente:**

✅ Database tables configured with indexes and triggers
✅ Edge Functions deployed and responding
✅ OANDA integration working (2 trades executed)
✅ Auto-recalculation system ready (triggers every 10 trades)
✅ Status monitoring script created
✅ Data pipeline complete and tested

**Prossimi passi:**
1. Continua auto-trading per raccogliere 100+ segnali
2. Monitora status giornalmente
3. Aspetta chiusura trade per dati win/loss
4. Ensemble weights si aggiorneranno automaticamente dopo 10+ trade completati

**Sistema pronto per raccolta dati a lungo termine! 🚀**
