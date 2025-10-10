# Azioni Immediate - Railway Setup

## ⚡ Step 1: Configura Environment Variables (ADESSO)

### 1.1 Vai su Railway Dashboard
🔗 **URL**: https://railway.app/dashboard

### 1.2 Seleziona Progetto
- Cerca progetto: `ai-cash-evo-ml-api`
- Clicca sul progetto

### 1.3 Aggiungi Variabili d'Ambiente

**Settings** → **Variables** → **New Variable**

#### Variabile 1: SUPABASE_URL
```
Variable Name: SUPABASE_URL
Value: https://rvopmdflnecyrwrzhyfy.supabase.co
```

#### Variabile 2: SUPABASE_SERVICE_ROLE_KEY

**Come trovarla**:
1. Vai su: https://supabase.com/dashboard
2. Seleziona progetto: `ai-cash-evo`
3. **Settings** (⚙️) → **API**
4. Scorri a **"Project API keys"**
5. Copia chiave **"service_role"** (NON anon!)

```
Variable Name: SUPABASE_SERVICE_ROLE_KEY
Value: [La tua chiave service_role di Supabase]
```

⚠️ **IMPORTANTE**: Usa chiave **service_role**, NON anon/public!

### 1.4 Redeploy (se necessario)
Dopo aver aggiunto le variabili:
- Railway → `ai-cash-evo-ml-api` → **Deployments**
- Aspetta auto-redeploy (1-2 minuti)

---

## ✅ Step 2: Verifica Deploy Completato

### 2.1 Check Servizi Running

**Railway Dashboard** → Progetto `ai-cash-evo-ml-api`

Verifica che tutti e 3 i servizi siano **"Running"**:
- ✅ **web** (ML API)
- ✅ **signal_generator** (Auto Signal Generator)
- ✅ **weight_optimizer** (Weight Optimizer)

### 2.2 Verifica Logs

Clicca su ogni servizio e vai su **"Logs"**:

#### Servizio: web
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### Servizio: signal_generator
```
Auto Signal Generator Service initialized
AUTO SIGNAL GENERATOR SERVICE - RUNNING ON RAILWAY
Target: 100 signals/day
Waiting for trading hours (8 AM - 4 PM UTC)...
```

#### Servizio: weight_optimizer
```
Weight Optimizer Service initialized
Weight Optimizer Service - Running on Railway
Schedule: Daily at 02:00 UTC
Waiting for next optimization run...
```

---

## 🧪 Step 3: Test Sistema (dopo 1 ora)

### 3.1 Test ML API Health

```bash
curl https://web-production-31235.up.railway.app/health
```

**Expected**:
```json
{
  "status": "healthy",
  "model_available": false,
  "mode": "technical_confidence"
}
```

### 3.2 Verifica Primi Segnali Generati

**Supabase SQL Editor**:
```sql
SELECT
  id,
  symbol,
  direction,
  confidence,
  created_at,
  oanda_trade_opened_at
FROM signal_performance
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: 6-10 segnali dopo prima ora di trading

### 3.3 Check Signal Generator Logs

**Railway** → `signal_generator` → **Logs**:
```
Signal generated for EUR_USD: BUY @ 73.2%
Signal executed on OANDA - Trade ID: 12345
Progress: 5/100 signals today
Waiting 582 seconds for next signal...
```

---

## 📊 Step 4: Monitoring Prima 24h

### Query 1: Segnali Oggi
```sql
SELECT COUNT(*) as signals_today
FROM signal_performance
WHERE DATE(created_at) = CURRENT_DATE;
```

**Target**: 100-120 segnali

### Query 2: Trade Attivi
```sql
SELECT
  COUNT(*) as active_trades,
  STRING_AGG(symbol, ', ') as symbols
FROM signal_performance
WHERE oanda_trade_closed_at IS NULL;
```

**Target**: < 20 trade concorrenti

### Query 3: Trade Chiusi (intraday)
```sql
SELECT
  COUNT(*) as closed_trades,
  SUM(CASE WHEN win THEN 1 ELSE 0 END) as wins,
  ROUND(AVG(confidence), 1) as avg_conf
FROM signal_performance
WHERE DATE(created_at) = CURRENT_DATE
  AND oanda_trade_closed_at IS NOT NULL;
```

**Target**: 40-60 trade chiusi, win rate ~45-50%

---

## ⏰ Step 5: Verifica Prima Ottimizzazione (domani 2 AM UTC)

### Check dopo le 2:10 AM UTC

**Query**: Verifica nuovi pesi salvati
```sql
SELECT
  timestamp,
  optimal_threshold,
  performance_winrate,
  qualified_signals,
  total_signals,
  active
FROM weight_optimization_history
ORDER BY timestamp DESC
LIMIT 5;
```

**Expected**: Nuovo record con `active = true`

**Railway Logs** → `weight_optimizer`:
```
Weight Optimizer - Starting daily optimization
Loaded 245 closed trades from last 7 days
Testing thresholds: 50 to 95...
Optimal threshold: 72 (win rate: 52.1%, score: 85.3)
Weights saved to Supabase
Optimization complete!
```

---

## ⚠️ Troubleshooting

### Problema: Servizi non partono

**Check**:
1. Environment Variables configurate correttamente su Railway
2. Logs per messaggi di errore
3. Supabase service_role key è corretta

**Fix**:
```
Railway → Settings → Variables → Verifica SUPABASE_SERVICE_ROLE_KEY
Railway → Deployments → Redeploy
```

### Problema: "Permission denied" nei logs

**Causa**: Stai usando chiave `anon` invece di `service_role`

**Fix**:
1. Supabase Dashboard → Settings → API
2. Copia **service_role** key (non anon!)
3. Railway → Settings → Variables → SUPABASE_SERVICE_ROLE_KEY
4. Sostituisci valore
5. Redeploy

### Problema: Nessun segnale generato

**Check**:
1. Orario corrente è trading hours? (8 AM - 4 PM UTC)
2. Signal generator logs mostrano errori?
3. Edge Function `generate-ai-signals` deployed su Supabase?

**Verifica Edge Function**:
```bash
# Supabase Dashboard → Edge Functions → Verifica "generate-ai-signals" deployed
```

---

## 📋 Checklist Completa

### Setup (ORA)
- [ ] Environment Variables aggiunte su Railway
- [ ] SUPABASE_URL configurata
- [ ] SUPABASE_SERVICE_ROLE_KEY configurata
- [ ] Deploy completato (check Railway dashboard)
- [ ] Tutti e 3 servizi mostrano "Running"

### Verifica Immediata (entro 10 min)
- [ ] Logs web mostrano "Uvicorn running"
- [ ] Logs signal_generator mostrano "initialized"
- [ ] Logs weight_optimizer mostrano "scheduled"
- [ ] Health endpoint risponde correttamente

### Prima Ora (dopo 1h)
- [ ] Primi segnali generati (check Supabase)
- [ ] Trade eseguiti su OANDA (check signal_performance)
- [ ] Logs signal_generator mostrano progress

### Prima 24h
- [ ] 100+ segnali generati
- [ ] 40-60 trade chiusi
- [ ] Win rate ~45-50% (iniziale)
- [ ] Nessun errore critico nei logs

### Prima Ottimizzazione (domani 2 AM)
- [ ] Weight optimizer eseguito con successo
- [ ] Nuovi pesi salvati in weight_optimization_history
- [ ] Threshold ottimale calcolato (es. 70-75)
- [ ] Config precedente deattivata (active = false)
- [ ] Nuova config attivata (active = true)

---

## 🎯 Timeline Prevista

| Timing | Evento | Verifica |
|--------|--------|----------|
| **ORA** | Setup env vars Railway | Dashboard Railway |
| **+10 min** | Deploy completato | Logs mostrano "Running" |
| **+1 ora** | Primi segnali generati | Query Supabase |
| **+24 ore** | 100+ segnali, prima ottimizzazione | Logs + Supabase |
| **+7 giorni** | Sistema stabilizzato | Performance metrics |
| **+30 giorni** | Auto-learning ottimale | Threshold evolution |

---

## ✅ Quando Tutto è OK

Vedrai:
```
✅ Railway: 3 servizi Running
✅ Logs: Nessun errore critico
✅ Supabase: Segnali generati ogni ~10 min
✅ OANDA: Trade eseguiti e tracciati
✅ Ottimizzazione: Pesi aggiornati daily
```

**Sistema completamente operativo! 🚀**

---

## 📞 Prossimo Checkpoint

**Quando**: Tra 1 ora

**Cosa verificare**:
1. Almeno 6-10 segnali generati
2. Nessun errore critico nei logs Railway
3. Trade visibili in signal_performance table

**Se tutto OK**: Sistema funziona! Aspetta 24h per analisi completa.
