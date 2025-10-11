# Setup Railway - Guida Completa

## 📋 Step 1: Verifica Deploy

1. Vai su **Railway Dashboard**: https://railway.app/dashboard
2. Seleziona progetto: `ai-cash-evo-ml-api`
3. Verifica che il deploy sia completato (circa 5 minuti)

## 🔑 Step 2: Aggiungi Environment Variables

### Dove Aggiungere le Chiavi

**Railway Dashboard** → Progetto `ai-cash-evo-ml-api` → **Settings** → **Environment Variables**

### Variabili da Aggiungere

Clicca su **"New Variable"** per ognuna:

#### 1. SUPABASE_URL
```
Variable Name: SUPABASE_URL
Value: https://rvopmdflnecyrwrzhyfy.supabase.co
```

#### 2. SUPABASE_SERVICE_ROLE_KEY

**Come trovarla**:
1. Vai su Supabase Dashboard: https://supabase.com/dashboard
2. Seleziona progetto `ai-cash-evo`
3. **Settings** (icona ingranaggio) → **API**
4. Scorri a **"Project API keys"**
5. Copia la chiave **"service_role"** (NON anon/public!)

```
Variable Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (la tua chiave service_role)
```

⚠️ **IMPORTANTE**: Usa la chiave **service_role**, NON la chiave anon!

### Screenshot delle Location

**Supabase**:
```
Dashboard → Tuo Progetto → Settings (⚙️) → API → Project API keys → service_role
```

**Railway**:
```
Dashboard → ai-cash-evo-ml-api → Settings → Variables → New Variable
```

## 🔄 Step 3: Redeploy Servizi

Dopo aver aggiunto le variabili:

1. Railway → `ai-cash-evo-ml-api` → **Deployments**
2. Clicca su **"Redeploy"** o aspetta auto-redeploy (circa 1-2 min)

## ✅ Step 4: Verifica Servizi Running

**Railway Dashboard** → Progetto → Check che tutti e 3 i servizi siano **"Running"**:

- ✅ **web** (ML API)
- ✅ **signal_generator** (Auto Signal Generator)
- ✅ **weight_optimizer** (Weight Optimizer)

### Come Verificare

Clicca su ogni servizio e vai su **"Logs"**:

**web**:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**signal_generator**:
```
Auto Signal Generator Service initialized
AUTO SIGNAL GENERATOR SERVICE - RUNNING ON RAILWAY
Target: 100 signals/day
```

**weight_optimizer**:
```
Weight Optimizer Service initialized
Weight Optimizer Service - Running on Railway
Schedule: Daily at 02:00 UTC
```

## 🧪 Step 5: Test Sistema

### Test 1: ML API Health Check

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

### Test 2: Verifica Segnali Generati (dopo 1 ora)

**Supabase SQL Editor**:
```sql
SELECT COUNT(*) as signals_today
FROM signal_performance
WHERE DATE(created_at) = CURRENT_DATE;
```

**Expected**: 6-10 segnali (dopo prima ora di trading)

### Test 3: Verifica Signal Generator Logs

**Railway** → `signal_generator` → **Logs**:
```
Signal generated for EUR_USD: BUY @ 73.2%
Progress: 5/100 signals today
Waiting 580 seconds for next signal...
```

## ⚠️ Troubleshooting

### Problema: Servizi non partono

**Check**:
1. Verifica Environment Variables sono settate correttamente
2. Controlla Logs per errori
3. Verifica Supabase service_role key è corretta

**Fix**:
```
Railway → Settings → Variables → Verifica tutte le chiavi
Railway → Deployments → Redeploy
```

### Problema: "Permission denied" nei logs

**Causa**: Stai usando chiave `anon` invece di `service_role`

**Fix**:
1. Supabase Dashboard → Settings → API
2. Copia chiave **service_role** (non anon!)
3. Railway → Settings → Variables → SUPABASE_SERVICE_ROLE_KEY
4. Sostituisci valore
5. Redeploy

### Problema: Nessun segnale generato

**Check**:
1. Verifica orario corrente (trading hours: 8 AM - 4 PM UTC)
2. Check logs signal_generator
3. Verifica Edge Function `generate-ai-signals` deployed su Supabase

**Fix**:
```sql
-- Verifica Edge Function deployed
SELECT * FROM pg_catalog.pg_proc
WHERE proname LIKE '%generate%';
```

## 📊 Monitoring

### Dashboard Queries (Supabase)

**Segnali oggi**:
```sql
SELECT COUNT(*) FROM signal_performance
WHERE DATE(created_at) = CURRENT_DATE;
```

**Trade attivi**:
```sql
SELECT COUNT(*) FROM signal_performance
WHERE oanda_trade_closed_at IS NULL;
```

**Performance ultimi 7 giorni**:
```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN win THEN 1 ELSE 0 END) as wins,
  ROUND(AVG(confidence), 1) as avg_conf
FROM signal_performance
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND oanda_trade_closed_at IS NOT NULL;
```

## 🎯 Next Steps

1. ✅ Aggiungi Environment Variables su Railway
2. ✅ Redeploy servizi
3. ✅ Verifica logs per conferma running
4. ⏳ Aspetta 1 ora per primi segnali
5. ⏳ Check performance dopo 24h
6. ⏳ Prima ottimizzazione pesi domani alle 2 AM UTC

---

## ✅ Checklist Completa

- [ ] Environment Variables aggiunte su Railway
- [ ] Servizi redeployed
- [ ] Logs mostrano "Running" per tutti e 3
- [ ] Health check ML API risponde
- [ ] Primo segnale generato (entro 1h)
- [ ] Trade eseguito su OANDA (verifica Supabase)
- [ ] Weight optimizer schedulato (check logs)

**Quando tutto è ✅**: Sistema completamente operativo! 🚀
