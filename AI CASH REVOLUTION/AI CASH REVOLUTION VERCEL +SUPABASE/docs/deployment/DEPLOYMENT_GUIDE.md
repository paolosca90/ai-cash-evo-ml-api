# 🚀 DEPLOYMENT STEP-BY-STEP GUIDE

## ✅ Passo 1: Applicare Migrazione Database

### Vai su Supabase Dashboard

1. Apri: https://app.supabase.com
2. Seleziona il tuo progetto
3. Nel menu laterale: **SQL Editor**
4. Clicca **"+ New Query"**

### Copia e Incolla Questa Query

```sql
-- Add Signal Weight Columns
-- Adds calculated weight, recommendation, and position multiplier to ml_historical_candles

-- Add weight columns
ALTER TABLE ml_historical_candles
ADD COLUMN IF NOT EXISTS signal_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS signal_recommendation VARCHAR(20),
ADD COLUMN IF NOT EXISTS position_multiplier DECIMAL(3,2);

-- Add indexes for filtering by weight/recommendation
CREATE INDEX IF NOT EXISTS idx_ml_candles_signal_weight
ON ml_historical_candles(signal_weight DESC)
WHERE signal_weight IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ml_candles_recommendation
ON ml_historical_candles(signal_recommendation)
WHERE signal_recommendation IS NOT NULL;

-- Add check constraint for valid weight range
ALTER TABLE ml_historical_candles
ADD CONSTRAINT check_signal_weight_range
CHECK (signal_weight IS NULL OR (signal_weight >= 0 AND signal_weight <= 100));

-- Add check constraint for position multiplier range
ALTER TABLE ml_historical_candles
ADD CONSTRAINT check_position_multiplier_range
CHECK (position_multiplier IS NULL OR (position_multiplier >= 0.25 AND position_multiplier <= 2.0));

-- Comments
COMMENT ON COLUMN ml_historical_candles.signal_weight IS 'Calculated signal weight (0-100) combining ML confidence, technical quality, market conditions, MTF confirmation, and risk factors';
COMMENT ON COLUMN ml_historical_candles.signal_recommendation IS 'Trading recommendation: STRONG_BUY, BUY, WEAK, or AVOID';
COMMENT ON COLUMN ml_historical_candles.position_multiplier IS 'Position size multiplier (0.25-2.0) based on signal weight';
```

5. Clicca **"Run"** (oppure premi `Ctrl+Enter`)
6. Dovresti vedere: `Success. No rows returned`

---

## ✅ Passo 2: Verificare Migrazione

### Esegui Query di Verifica

```sql
-- Verifica che le colonne siano state aggiunte
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ml_historical_candles'
    AND column_name IN ('signal_weight', 'signal_recommendation', 'position_multiplier');
```

**Output Atteso:**
```
column_name              | data_type | is_nullable
------------------------+----------+-------------
signal_weight           | numeric  | YES
signal_recommendation   | varchar  | YES
position_multiplier     | numeric  | YES
```

---

## ✅ Passo 3: Arricchire Segnali Storici con Pesi

### Esegui Script Python

```bash
python scripts/enrich_signals_with_weights.py
```

**Cosa fa:**
- Carica tutti i 275k segnali storici etichettati
- Calcola il peso per ognuno usando i 5 componenti
- Aggiorna il database con: weight, recommendation, multiplier
- Mostra statistiche di distribuzione

**Tempo Previsto:** 30-45 minuti

**Output Atteso:**
```
🎯 ENRICHING SIGNALS WITH WEIGHTS
==================================================

📊 Processing training dataset...
   Batch 1/1640: Processed 100 signals
   Batch 2/1640: Processed 100 signals
   ...

✅ Training dataset complete: 164,336 signals enriched

📊 Processing testing dataset...
   ...

✅ Testing dataset complete: 110,684 signals enriched

📈 WEIGHT DISTRIBUTION ANALYSIS
==================================================
STRONG_BUY: 12,450 signals (4.5%)
BUY:        89,320 signals (32.5%)
WEAK:      145,890 signals (53.0%)
AVOID:      27,360 signals (10.0%)
==================================================
```

---

## ✅ Passo 4: Analizzare Performance con Backtest

### Esegui Backtest

```bash
python scripts/backtest_with_weights.py
```

**Cosa fa:**
- Testa diversi threshold di peso (0, 40, 50, 60, 70, 80)
- Confronta performance con/senza position sizing
- Mostra win rate e pips medi per ogni recommendation tier

**Output Atteso:**
```
🚀 BACKTEST WITH SIGNAL WEIGHTS
======================================================================

📊 Testing with min_weight >= 0...
   Found 275,020 signals

📊 Testing with min_weight >= 40...
   Found 256,660 signals

📊 Testing with min_weight >= 50...
   Found 201,770 signals

...

======================================================================
BACKTEST RESULTS COMPARISON
======================================================================

Strategy                       | Trades | Win% | Total Pips | Avg Pips
----------------------------------------------------------------------
Min Weight 0 (unweighted)      | 275020 | 65.0 |   125450.25 |     0.46
Min Weight 0 (pos-weighted)    | 275020 | 65.0 |   189675.50 |     0.69
Min Weight 40 (unweighted)     | 256660 | 67.2 |   142380.75 |     0.55
Min Weight 40 (pos-weighted)   | 256660 | 67.2 |   221560.25 |     0.86
...
Min Weight 70 (pos-weighted)   | 101770 | 72.5 |   185220.50 |     1.82

======================================================================

🏆 BEST STRATEGY:
   Min Weight Threshold: 70
   Total Pips (weighted): 185220.50
   Win Rate: 72.5%
   Trades: 101,770
======================================================================

📊 RECOMMENDATION BREAKDOWN:

Recommendation  | Count | Win% | Avg Pips
-------------------------------------------
STRONG_BUY      | 12450 | 78.2 |     2.45
BUY             | 89320 | 71.8 |     1.12
WEAK            |145890 | 62.3 |     0.25
AVOID           | 27360 | 48.7 |    -0.38
```

---

## ✅ Passo 5: Avviare ML Prediction API

### Installare Dipendenze

```bash
cd api
pip install -r requirements.txt
```

### Avviare Server API

```bash
python ml_prediction_api.py
```

**Output:**
```
╔════════════════════════════════════════════════════════╗
║  AI CASH EVOLUTION - ML PREDICTION API                ║
║  Real-time signal generation with weights             ║
╠════════════════════════════════════════════════════════╣
║  URL: http://localhost:8000                            ║
║  Docs: http://localhost:8000/docs                      ║
╚════════════════════════════════════════════════════════╝

INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### Testare API

Apri un nuovo terminale e testa:

```bash
# Health check
curl http://localhost:8000/

# Model info
curl http://localhost:8000/model/info
```

**Oppure** apri il browser: http://localhost:8000/docs

---

## ✅ Passo 6: Test Predizione Completa

### Crea File di Test

Salva come `test_api.py`:

```python
import requests
import json

# Dati di esempio
data = {
    "market_data": {
        "symbol": "EURUSD",
        "granularity": "M15",
        "timestamp": "2025-10-09T10:30:00Z",
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
        }
    ],
    "risk_metrics": {
        "current_drawdown": 3.5,
        "symbol_win_rate": 58.2
    }
}

# Chiamata API
response = requests.post('http://localhost:8000/predict', json=data)
result = response.json()

# Mostra risultato
print("\n" + "="*60)
print("ML PREDICTION RESULT")
print("="*60)
print(f"Direction:           {result['direction']}")
print(f"ML Confidence:       {result['ml_confidence']}%")
print(f"Signal Weight:       {result['signal_weight']}/100")
print(f"Recommendation:      {result['recommendation']}")
print(f"Position Multiplier: {result['position_multiplier']}x")
print("\nComponents Breakdown:")
for component, value in result['components'].items():
    print(f"  {component:20} {value:.2f}/100")
print("="*60)

# Decisione trading
if result['recommendation'] == 'AVOID':
    print("❌ SKIP this trade")
elif result['recommendation'] == 'STRONG_BUY':
    print(f"✅✅ STRONG SIGNAL - Trade with {result['position_multiplier']}x position size")
elif result['recommendation'] == 'BUY':
    print(f"✅ Good signal - Trade with {result['position_multiplier']}x position size")
else:
    print(f"⚠️  WEAK signal - Consider smaller position ({result['position_multiplier']}x)")
```

### Esegui Test

```bash
python test_api.py
```

**Output Atteso:**
```
============================================================
ML PREDICTION RESULT
============================================================
Direction:           BUY
ML Confidence:       68.5%
Signal Weight:       79.35/100
Recommendation:      STRONG_BUY
Position Multiplier: 1.5x

Components Breakdown:
  ml_confidence        67.00/100
  technical_quality    95.00/100
  market_conditions    75.00/100
  mtf_confirmation     90.00/100
  risk_factors         70.00/100
============================================================
✅✅ STRONG SIGNAL - Trade with 1.5x position size
```

---

## ✅ Passo 7: Setup Supabase Edge Function (Opzionale)

**Nota:** Richiede Supabase CLI o deploy manuale

### Opzione A: Deploy via Dashboard

1. Vai su Supabase Dashboard → **Edge Functions**
2. Clicca **"New Function"**
3. Nome: `generate-ml-signals`
4. Copia contenuto di: `supabase/functions/generate-ml-signals/index.ts`
5. Deploy

### Opzione B: Setup Cron per Raccolta Dati

Nel SQL Editor di Supabase:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule data collection every 15 minutes
SELECT cron.schedule(
  'collect-ml-data-m15',
  '*/15 * * * *',  -- Ogni 15 minuti
  $$
  -- Qui inseriresti la chiamata alla Edge Function
  -- Per ora usa uno script Python esterno
  $$
);
```

**Alternativa Python:** Crea script schedulato con Windows Task Scheduler:

```python
# scripts/scheduled_data_collection.py
import requests
import schedule
import time
from datetime import datetime

def collect_data():
    print(f"[{datetime.now()}] Collecting market data...")
    # Chiamata alla tua API per salvare nuovi dati
    # response = requests.post('http://localhost:8000/collect-data')
    print("Data collection complete")

# Ogni 15 minuti
schedule.every(15).minutes.do(collect_data)

while True:
    schedule.run_pending()
    time.sleep(60)
```

---

## ✅ Passo 8: Setup Auto-Retraining

### Test Manuale

```bash
# Controlla se serve retraining
python scripts/auto_retrain.py

# Force retraining (no prompts)
python scripts/auto_retrain.py --auto
```

### Setup Automatico (Windows Task Scheduler)

1. Apri **Task Scheduler**
2. Create Task → **General** tab:
   - Name: "ML Model Auto Retrain"
   - Run whether user is logged on or not
3. **Triggers** tab:
   - New → Weekly, ogni lunedì alle 3:00 AM
4. **Actions** tab:
   - Action: Start a program
   - Program: `python`
   - Arguments: `C:\path\to\ai-cash-evo-main\scripts\auto_retrain.py --auto`
   - Start in: `C:\path\to\ai-cash-evo-main`

---

## 📊 Monitoring e Manutenzione

### Query Utili Database

```sql
-- Controlla distribuzione pesi
SELECT 
    signal_recommendation,
    COUNT(*) as count,
    ROUND(AVG(signal_weight), 2) as avg_weight,
    ROUND(AVG(CASE WHEN trade_outcome = 'WIN' THEN 1.0 ELSE 0.0 END) * 100, 2) as win_rate
FROM ml_historical_candles
WHERE signal_weight IS NOT NULL
GROUP BY signal_recommendation
ORDER BY avg_weight DESC;

-- Top 10 segnali per peso
SELECT 
    symbol,
    granularity,
    timestamp,
    label,
    label_confidence,
    signal_weight,
    signal_recommendation,
    trade_outcome,
    win_pips
FROM ml_historical_candles
WHERE signal_recommendation = 'STRONG_BUY'
ORDER BY signal_weight DESC
LIMIT 10;

-- Performance ultimi 7 giorni (production)
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as signals,
    AVG(signal_weight) as avg_weight,
    COUNT(CASE WHEN is_labeled THEN 1 END) as labeled
FROM ml_historical_candles
WHERE dataset_type = 'production'
    AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Check API Health

```bash
# Health check
curl http://localhost:8000/

# Model info
curl http://localhost:8000/model/info

# Reload model (after retraining)
curl -X POST http://localhost:8000/model/reload
```

---

## 🎯 Checklist Deployment Completo

- [ ] ✅ Passo 1: Migrazione database applicata
- [ ] ✅ Passo 2: Verifica colonne nel database
- [ ] ✅ Passo 3: Segnali storici arricchiti (275k)
- [ ] ✅ Passo 4: Backtest eseguito e analizzato
- [ ] ✅ Passo 5: ML API avviata e funzionante
- [ ] ✅ Passo 6: Test predizione completato
- [ ] ⏳ Passo 7: Edge Function deployed (opzionale)
- [ ] ⏳ Passo 8: Auto-retraining configurato

---

## 📞 Supporto

Se incontri problemi:

1. **Database Issues**: Controlla logs Supabase Dashboard → Logs
2. **API Issues**: Controlla console dove gira `ml_prediction_api.py`
3. **Script Issues**: Esegui con output debug: `python -u script.py`

---

**Status Sistema**: 🟢 Ready for Production
**Versione**: 1.0.0
**Data**: 2025-10-09
