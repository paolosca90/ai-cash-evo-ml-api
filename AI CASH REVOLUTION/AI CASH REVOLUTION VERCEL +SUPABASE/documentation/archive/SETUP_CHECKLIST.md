# ✅ Setup Checklist - Sistema Ensemble

## 🎯 Stato Attuale

### Edge Functions Deployed ✅
- [x] `generate-ai-signals` (v173) - Main orchestrator con ensemble
- [x] `ml-validate` (v1) - ML validation layer
- [x] `ensemble-adaptive` (v1) - Adaptive weighting
- [x] `context-aware-ensemble` (v1) - Context-aware meta-learning
- [x] `oanda-market-data` (v6) - OANDA data provider

### Database Tables ⏳
**Da applicare manualmente via Supabase Dashboard:**

#### Migration 1: Performance Tracking
```
File: supabase/migrations/20250106000000_signal_performance_tracking.sql
Status: DA APPLICARE
```

**Cosa crea**:
- Table: `signal_performance` - Tracking trade results
- Table: `ensemble_weights` - Dynamic weights per symbol
- View: `signal_performance_analytics` - Performance summary
- Function: `recalculate_ensemble_weights()` - Auto weight update
- Trigger: Auto-recalculate ogni 10 trade

#### Migration 2: Dashboard Analytics
```
File: supabase/migrations/20250106000001_ensemble_dashboard.sql
Status: DA APPLICARE
```

**Cosa crea**:
- 10 analytical views per monitoring
- Summary function per quick check
- Grants per authenticated users

---

## 📋 Procedura Setup Database

### Opzione A: Supabase Dashboard (Raccomandato)

1. **Vai su**: https://supabase.com/dashboard
2. **Login** e seleziona progetto `rvopmdflnecyrwrzhyfy`
3. **Menu laterale** → Click **"SQL Editor"**
4. **New Query** → Copia contenuto `20250106000000_signal_performance_tracking.sql`
5. **Run** → Verifica success
6. **New Query** → Copia contenuto `20250106000001_ensemble_dashboard.sql`
7. **Run** → Verifica success

### Opzione B: Via CLI (se preferisci)

```bash
# Opzione 1: Push migrations (se funziona)
npx supabase db push

# Opzione 2: Reset e apply
npx supabase db reset --linked

# Opzione 3: Manuale SQL file
psql "postgresql://postgres.rvopmdflnecyrwrzhyfy:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/20250106000000_signal_performance_tracking.sql
```

---

## 🧪 Verifica Post-Setup

### Test 1: Tabelle Create

```sql
-- In Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('signal_performance', 'ensemble_weights')
ORDER BY table_name;
```

**Expected Output**:
```
ensemble_weights
signal_performance
```

### Test 2: Dashboard Views

```sql
-- Quick dashboard test
SELECT * FROM get_ensemble_dashboard_summary();
```

**Expected Output**:
```
metric          | classic_value | ml_value | ensemble_value
----------------|---------------|----------|---------------
Win Rate %      | N/A           | N/A      | N/A
Sharpe Ratio    | N/A           | N/A      | N/A
Total P&L       | N/A           | N/A      | N/A
Total Signals   | N/A           | N/A      | N/A
```
(N/A è normale, non ci sono ancora dati)

### Test 3: Edge Functions

```bash
# Test signal generation
curl -X POST "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/generate-ai-signals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"symbol":"EURUSD"}'
```

**Expected**: JSON con segnale BUY/SELL/HOLD + reasoning italiano

### Test 4: ML Validation (interno)

Verifica nei logs Edge Function che vedi:
```
🎯 PHASE 1 Signal Generation
🤖 Calling ML validation for EURUSD...
✅ ML Validation: BUY (85%) - BOOST
⚖️ Calling adaptive ensemble for EURUSD...
```

Se vedi warnings tipo:
```
⚠️ Adaptive ensemble failed, using simple ML adjustment
```
→ Normale! Le tabelle non esistono ancora. Applica migrations.

---

## 🚀 Activation Checklist

### Immediate (5 min)
- [ ] Apply migration 1: `signal_performance_tracking.sql`
- [ ] Apply migration 2: `ensemble_dashboard.sql`
- [ ] Verify tables exist
- [ ] Test dashboard query

### Short-term (1 giorno)
- [ ] Generate 10-20 test signals
- [ ] Manually update some as win/loss per test
- [ ] Check adaptive weights auto-recalculate
- [ ] Verify context-aware queries work

### Medium-term (1 settimana)
- [ ] Collect 50+ real trades
- [ ] Monitor win rate vs confidence (calibration)
- [ ] Review context performance matrix
- [ ] Adjust if needed

---

## 📊 Key Metrics to Monitor

### Daily
```sql
-- Overall performance
SELECT * FROM ensemble_performance_overview;

-- Recent activity
SELECT * FROM recent_signals_detail LIMIT 10;
```

### Weekly
```sql
-- Confidence calibration
SELECT * FROM confidence_calibration;

-- Context performance
SELECT * FROM context_performance_matrix WHERE trades >= 10;

-- Weights status
SELECT * FROM ensemble_weights_status;
```

### Monthly
```sql
-- Full analysis
SELECT * FROM get_ensemble_dashboard_summary();
SELECT * FROM symbol_performance_detail;
SELECT * FROM pnl_drawdown_analysis;
```

---

## ⚠️ Troubleshooting

### Problema: "Table does not exist"
**Soluzione**: Applica le migrations dal Supabase Dashboard SQL Editor

### Problema: "Function does not exist"
**Soluzione**: Verifica di aver eseguito migration 2 (dashboard)

### Problema: ML validation fails
**Soluzione**: Normale se tabelle non esistono. Post-migrations funzionerà.

### Problema: Adaptive ensemble returns error
**Soluzione**: Serve almeno 1 segnale nel DB. Genera un test signal e aggiornalo con risultato.

---

## 📈 Next Steps

### Fase 1: Setup (TODAY)
1. ✅ Edge Functions deployed
2. ⏳ Apply database migrations
3. ⏳ Verify everything works

### Fase 2: Testing (THIS WEEK)
1. Generate 20-50 test signals
2. Simulate results (manual update)
3. Verify adaptive learning works
4. Check dashboard metrics

### Fase 3: Production (NEXT WEEK)
1. Connect to real trading
2. Start collecting actual results
3. Monitor performance daily
4. Optimize based on data

---

## 🎯 Success Criteria

Sistema pronto quando:
- ✅ Tutte le migrations applicate
- ✅ Dashboard queries funzionano
- ✅ Edge Functions ritornano segnali
- ✅ ML validation attiva (no errors)
- ✅ Adaptive weighting operativo
- ✅ Context-aware funzionante

**Current Status**:
- Edge Functions: ✅ DONE
- Database: ⏳ PENDING (apply migrations)
- Dashboard: ⏳ PENDING (post migrations)

---

## 📞 Support

**Documentation**:
- `ENSEMBLE_SYSTEM.md` - Architettura completa
- `DASHBOARD_SETUP.md` - Dashboard queries guide
- `ML_TESTING.md` - ML system testing

**Quick Help**:
- Dashboard not working? → Apply migrations
- ML validation errors? → Check tables exist
- No data in views? → Normal, need trades first
