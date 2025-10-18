# 📊 Ensemble Dashboard Setup

## 🚀 Quick Start

### 1. Applicare le Migrations SQL

Vai su **Supabase Dashboard** → **SQL Editor** e esegui in ordine:

#### Step 1: Performance Tracking Tables
```sql
-- Copia e incolla il contenuto di:
supabase/migrations/20250106000000_signal_performance_tracking.sql
```

#### Step 2: Dashboard Views & Functions
```sql
-- Copia e incolla il contenuto di:
supabase/migrations/20250106000001_ensemble_dashboard.sql
```

---

## 📈 Dashboard Queries

### Quick Summary (Start Here!)

```sql
-- Overall comparison: Classic vs ML vs Ensemble
SELECT * FROM get_ensemble_dashboard_summary();
```

**Output Esempio**:
```
metric          | classic_value | ml_value | ensemble_value
----------------|---------------|----------|---------------
Win Rate %      | 52.30         | 50.10    | 56.80
Sharpe Ratio    | 1.45          | 1.32     | 1.89
Total P&L       | 125.50        | 98.20    | 187.30
Total Signals   | 87            | 64       | 52
```

---

### 1. Performance Overview

```sql
-- Metriche generali per tipo di segnale
SELECT * FROM ensemble_performance_overview;
```

**Cosa mostra**:
- Win rate per tipo (classic, ml, ensemble)
- Sharpe ratio
- P&L totale
- Confidence media
- Ultimo segnale

---

### 2. Symbol Performance

```sql
-- Performance per simbolo
SELECT * FROM symbol_performance_detail
WHERE win_rate > 55
ORDER BY total_pnl DESC;
```

**Usa per**:
- Identificare simboli più profittevoli
- Vedere quale sistema funziona meglio per simbolo
- Ottimizzare allocation capital

---

### 3. Context-Aware Analysis

```sql
-- Performance per contesto di mercato
SELECT * FROM context_performance_matrix
WHERE trades >= 10  -- Almeno 10 trade per rilevanza statistica
ORDER BY win_rate DESC;
```

**Insights**:
- Quali contesti favoriscono classic vs ML?
- TRENDING → classic meglio?
- RANGING → ML meglio?
- Best sessions per trading?

---

### 4. Ensemble Weights Status

```sql
-- Pesi attuali e performance recente
SELECT
  symbol,
  classic_weight,
  ml_weight,
  recent_ensemble_wr,
  sample_size,
  days_since_update
FROM ensemble_weights_status
ORDER BY sample_size DESC;
```

**Check**:
- Quali simboli hanno weights adattati
- Se weights sembrano corretti (classic migliore → weight maggiore)
- Quando ultimo aggiornamento

---

### 5. Confidence Calibration

```sql
-- Verifica calibrazione: confidence predetta vs win rate reale
SELECT * FROM confidence_calibration
ORDER BY signal_type, confidence_bucket DESC;
```

**Calibration Check**:
- Se dice 80% → vince ~80% delle volte? ✅
- Se `calibration_error` > 15 → sistema non calibrato ❌

**Esempio Good**:
```
signal_type | confidence_bucket | avg_confidence | actual_win_rate | calibration_error
------------|-------------------|----------------|-----------------|------------------
ensemble    | 80-100%          | 85.3           | 83.7            | 1.6  ✅
```

**Esempio Bad**:
```
classic     | 70-79%           | 74.2           | 58.3            | 15.9  ❌
```

---

### 6. Recent Activity

```sql
-- Ultimi 20 segnali con dettagli completi
SELECT
  symbol,
  signal_type,
  predicted_direction,
  confidence,
  actual_result,
  win,
  ml_recommendation,
  agreement,
  market_regime,
  session_type,
  created_at
FROM recent_signals_detail;
```

**Debugging**:
- Vedere pattern nei fallimenti
- Check se ML validation sta funzionando
- Identificare condizioni problematiche

---

### 7. ML Validation Effectiveness

```sql
-- Impact della validazione ML
SELECT * FROM ml_validation_effectiveness
ORDER BY win_rate DESC;
```

**Analisi**:
- `agreement=true` + `BOOST` → win rate alto? ✅
- `agreement=false` + `BLOCK` → evita perdite? ✅
- Quale recommendation funziona meglio?

**Esempio Output**:
```
agreement | ml_recommendation | signals | win_rate | avg_pnl
----------|------------------|---------|----------|--------
true      | BOOST            | 34      | 67.6     | 15.2  ✅
false     | BLOCK            | 12      | N/A      | 0.0   ✅ (blocked correctly)
true      | MAINTAIN         | 28      | 57.1     | 8.3
false     | REDUCE           | 19      | 42.1     | -3.2  ❌ (still losing)
```

---

### 8. Temporal Analysis

```sql
-- Best/worst trading hours
SELECT
  day_name,
  hour_utc,
  signals,
  win_rate,
  avg_pnl
FROM temporal_performance
WHERE signals >= 5
ORDER BY win_rate DESC;
```

**Ottimizzazione**:
- Trading solo nelle ore migliori
- Evitare ore con bassa win rate
- Identificare pattern temporali

---

### 9. Drawdown Analysis

```sql
-- Max drawdown per simbolo/tipo
SELECT * FROM pnl_drawdown_analysis
ORDER BY max_drawdown_percent;
```

**Risk Management**:
- Identificare simboli ad alto rischio
- Confrontare drawdown: ensemble < classic? ✅
- Stop trading se drawdown > soglia

---

### 10. Custom Queries

#### Find Best Contexts for Each System

```sql
-- Dove classic performa meglio
SELECT
  market_regime,
  session_type,
  win_rate,
  trades
FROM context_performance_matrix
WHERE signal_type = 'classic'
  AND trades >= 10
ORDER BY win_rate DESC
LIMIT 5;

-- Dove ML performa meglio
SELECT
  market_regime,
  session_type,
  win_rate,
  trades
FROM context_performance_matrix
WHERE signal_type = 'ml'
  AND trades >= 10
ORDER BY win_rate DESC
LIMIT 5;
```

#### Symbols Needing Weight Adjustment

```sql
-- Simboli dove ML batte classic ma ha weight basso
SELECT
  ew.symbol,
  ew.classic_weight,
  ew.ml_weight,
  ew.classic_win_rate,
  ew.ml_win_rate,
  ew.sample_size
FROM ensemble_weights ew
WHERE ew.ml_win_rate > ew.classic_win_rate + 0.1
  AND ew.ml_weight < ew.classic_weight
  AND ew.sample_size >= 20;
```

#### Recent Losses Analysis

```sql
-- Ultimi 10 trade perdenti: perché?
SELECT
  symbol,
  signal_type,
  predicted_direction,
  confidence,
  actual_result,
  ml_recommendation,
  agreement,
  market_regime,
  session_type,
  volatility_level,
  news_impact
FROM signal_performance
WHERE win = false
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔧 Maintenance Queries

### Check System Health

```sql
-- Verifica che tutto funzioni
SELECT
  (SELECT COUNT(*) FROM signal_performance) as total_signals,
  (SELECT COUNT(*) FROM signal_performance WHERE win IS NOT NULL) as completed_trades,
  (SELECT COUNT(*) FROM ensemble_weights) as symbols_with_weights,
  (SELECT COUNT(*) FROM ensemble_weights WHERE sample_size >= 50) as well_calibrated_symbols;
```

### Recalculate Weights Manually

```sql
-- Forza ricalcolo per un simbolo
SELECT * FROM recalculate_ensemble_weights('EURUSD');

-- Forza ricalcolo per tutti
DO $$
DECLARE
  sym TEXT;
BEGIN
  FOR sym IN SELECT DISTINCT symbol FROM signal_performance
  LOOP
    PERFORM recalculate_ensemble_weights(sym);
  END LOOP;
END $$;
```

### Clean Old Data

```sql
-- Elimina segnali > 6 mesi (opzionale)
DELETE FROM signal_performance
WHERE created_at < NOW() - INTERVAL '6 months';
```

---

## 📊 Visualization Tips

### Export to CSV for Charting

```sql
-- Export performance trend
COPY (
  SELECT
    DATE(created_at) as date,
    signal_type,
    COUNT(*) as signals,
    SUM(actual_result) as daily_pnl,
    AVG(confidence) as avg_confidence
  FROM signal_performance
  WHERE win IS NOT NULL
  GROUP BY DATE(created_at), signal_type
  ORDER BY date, signal_type
) TO '/tmp/performance_trend.csv' CSV HEADER;
```

### Real-time Monitoring Query

```sql
-- Query da eseguire ogni 5 minuti
SELECT
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as signals_last_hour,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour' AND win = true) as wins_last_hour,
  ROUND(AVG(confidence) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')::NUMERIC, 1) as avg_conf_last_hour,
  SUM(actual_result) FILTER (WHERE result_timestamp > NOW() - INTERVAL '1 hour') as pnl_last_hour
FROM signal_performance;
```

---

## 🎯 Key Metrics to Monitor

### Daily Checklist

1. **Win Rate Trend** (target: ensemble > 55%)
```sql
SELECT signal_type, win_rate_percent
FROM ensemble_performance_overview;
```

2. **Confidence Calibration** (error < 10%)
```sql
SELECT * FROM confidence_calibration
WHERE calibration_error > 10;
```

3. **Weights Status** (updated < 7 days ago)
```sql
SELECT * FROM ensemble_weights_status
WHERE days_since_update > 7;
```

4. **Recent Performance** (last 20 trades)
```sql
SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE win=true) as wins
FROM recent_signals_detail
WHERE win IS NOT NULL;
```

---

## 🚨 Alert Conditions

### Performance Degradation

```sql
-- Win rate < 45% negli ultimi 20 trade
SELECT
  signal_type,
  COUNT(*) as recent_trades,
  ROUND(
    COUNT(*) FILTER (WHERE win = true)::FLOAT / COUNT(*) * 100,
    1
  ) as recent_win_rate
FROM (
  SELECT * FROM signal_performance
  WHERE win IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 20
) recent
GROUP BY signal_type
HAVING ROUND(
  COUNT(*) FILTER (WHERE win = true)::FLOAT / COUNT(*) * 100,
  1
) < 45;
```

### Large Drawdown

```sql
-- Drawdown > 20%
SELECT * FROM pnl_drawdown_analysis
WHERE max_drawdown_percent < -20;
```

### Miscalibration

```sql
-- Confidence overstated by >15%
SELECT * FROM confidence_calibration
WHERE avg_confidence - actual_win_rate > 15;
```

---

## 📚 Next Steps

1. **Esegui migrations** su Supabase Dashboard
2. **Testa queries** con dati reali
3. **Crea alerts** per condizioni critiche
4. **Esporta dati** per visualizzazione esterna
5. **Monitor daily** le key metrics

Buon trading! 📈🚀
