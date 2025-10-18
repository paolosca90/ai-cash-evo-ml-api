# 🎯 AZIONI IMMEDIATE - Inizia ML Training

## ✅ Cosa Abbiamo Fatto

1. ✅ Creato database schema (`ml_historical_candles`, `ml_training_batches`, ecc.)
2. ✅ Creato script download OANDA (`scripts/download_oanda_data.py`)
3. ✅ Creato script analisi trade (`scripts/analyze_trades.py`)
4. ✅ Committato e pushato su GitHub

## 🚀 Cosa Fare ORA

### STEP 1: Applica Migration (2 minuti)

**Vai a Supabase Dashboard**:
1. Apri https://supabase.com/dashboard
2. Seleziona il tuo progetto
3. Click **SQL Editor** nel menu laterale
4. Click **New query**
5. Apri il file `supabase/migrations/20251007140000_ml_historical_data.sql`
6. Copia **TUTTO** il contenuto
7. Incolla nell'editor SQL di Supabase
8. Click **RUN** (o `Ctrl+Enter`)

**Verifica**:
Esegui questa query:
```sql
SELECT COUNT(*) FROM ml_historical_candles;
```
Dovrebbe tornare `0` (tabella vuota ma esistente).

---

### STEP 2: Installa Python Dependencies (2 minuti)

Apri PowerShell nella root del progetto:

```powershell
# Installa dipendenze
pip install -r scripts/requirements.txt
```

**Verifica**:
```powershell
python -c "import requests; import supabase; print('✅ OK')"
```

---

### STEP 3: Scarica Dati OANDA (15-30 minuti)

```powershell
# Esegui download
python scripts/download_oanda_data.py
```

**Lo script ti chiederà conferma**:
```
🔥 Start download? This will take 15-30 minutes. (y/n):
```
Digita `y` e premi Invio.

**Cosa Scarica**:
- **Training**: Luglio-Settembre 2025 (3 mesi) → ~225k candles
- **Testing**: Ottobre 2025 (1 mese) → ~75k candles
- **Symbols**: EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, NZDUSD
- **Timeframes**: M5, M15, H1, H4

**Output Atteso**:
```
🚀 OANDA Historical Data Download
======================================================================
📊 Configuration:
   Symbols: EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, NZDUSD
   Granularities: M5, M15, H1, H4
   Training: 2025-07-01 to 2025-09-30 (3 months)
   Testing:  2025-10-01 to 2025-10-31 (1 month)
======================================================================

📚 DOWNLOADING TRAINING DATASET (3 months)

📥 EURUSD M5 (TRAINING)
   ✅ 2025-07-01 to 2025-07-17: 4320 candles
   ✅ 2025-07-18 to 2025-08-03: 4320 candles
   ...

[aspetta 15-30 minuti]

✅ Training dataset complete: 225,000 candles
✅ Testing dataset complete: 75,000 candles

🎉 DOWNLOAD COMPLETE!
```

**Se si blocca**:
- Controlla `.env` (OANDA_API_KEY deve esistere)
- Riprova: lo script riprende da dove si era fermato

---

### STEP 4: Verifica Dati (1 minuto)

In Supabase SQL Editor:

```sql
-- Conta candles scaricati
SELECT 
  dataset_type,
  symbol,
  granularity,
  COUNT(*) as candles,
  MIN(timestamp) as from_date,
  MAX(timestamp) as to_date
FROM ml_historical_candles
GROUP BY dataset_type, symbol, granularity
ORDER BY dataset_type, symbol, granularity;
```

**Output Atteso**:
```
dataset_type | symbol  | granularity | candles | from_date           | to_date
-------------|---------|-------------|---------|---------------------|---------------------
training     | AUDUSD  | H1          | 2,208   | 2025-07-01 00:00:00 | 2025-09-30 23:00:00
training     | AUDUSD  | H4          | 552     | 2025-07-01 00:00:00 | 2025-09-30 20:00:00
training     | AUDUSD  | M15         | 8,832   | 2025-07-01 00:00:00 | 2025-09-30 23:45:00
training     | AUDUSD  | M5          | 26,496  | 2025-07-01 00:00:00 | 2025-09-30 23:55:00
training     | EURUSD  | H1          | 2,208   | ...
... (24 righe totali: 6 symbols × 4 timeframes)
testing      | AUDUSD  | H1          | 744     | 2025-10-01 00:00:00 | 2025-10-31 23:00:00
... (24 righe)
```

**Total**: ~300,000 candles

---

## 📊 Cosa Succede Dopo

Una volta completato il download, procederemo con:

### STEP 5: Label Dataset (30-60 min)
```powershell
python scripts/label_dataset.py
```
Questo etichetterà ogni candle con BUY/SELL + confidence basato su backtest.

### STEP 6: Train ML Model (2-4 ore)
```powershell
python scripts/train_ml_model.py
```
Addestra modello PPO su 225k candles di training.

### STEP 7: Validate on Test Set (10 min)
```powershell
python scripts/validate_model.py
```
Testa il modello su Ottobre 2025 (mai visto durante training).

### STEP 8: Deploy to Production (5 min)
```powershell
python scripts/deploy_model.py
```
Carica modello su Supabase Storage e aggiorna `generate-ai-signals`.

---

## 🔧 Troubleshooting

### "OANDA_API_KEY not found"
Crea/modifica `.env` nella root:
```env
OANDA_API_KEY=your_key_here
OANDA_ACCOUNT_ID=your_account_here
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### "pip: command not found"
Installa Python 3.10+:
```powershell
python --version  # Deve essere 3.10+
```
Se non hai Python: https://www.python.org/downloads/

### "requests module not found"
```powershell
pip install requests supabase python-dotenv
```

### "429 Too Many Requests"
OANDA rate limit. Aspetta 1 minuto e riprova.
Lo script ha già delay di 0.5s tra richieste.

---

## 📝 Checklist

- [ ] STEP 1: Migration applicata ✅
- [ ] STEP 2: Dependencies installate ✅
- [ ] STEP 3: Dati scaricati (15-30 min) ⏳
- [ ] STEP 4: Verifica completata ✅
- [ ] STEP 5: Labeling (prossimo)
- [ ] STEP 6: Training (dopo)
- [ ] STEP 7: Validation (dopo)
- [ ] STEP 8: Deploy (dopo)

---

## 🎯 Inizia Ora

```powershell
# 1. Vai su Supabase e applica migration
# 2. Poi esegui:
pip install -r scripts/requirements.txt
python scripts/download_oanda_data.py
```

**Tempo totale**: 20-30 minuti per download + setup

**Poi**: Saremo pronti per training ML! 🚀
