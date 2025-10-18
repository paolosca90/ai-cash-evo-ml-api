# 🤖 Cron Jobs Setup - Sistema Completo

## 📋 Cron Jobs Necessari (4 totali)

### 1. 🔍 Price Tick Monitor (ogni minuto)
Monitora segnali aperti tick-by-tick per rilevare TP/SL hits

**URL**: `https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/price-tick-cron`
**Schedule**: `*/1 * * * *` (ogni minuto)
**Method**: POST
**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA
Content-Type: application/json
```

---

### 2. 🧠 ML Auto Retrain (ogni 6 ore)
Riallena il modello ML quando ci sono abbastanza nuovi dati

**URL**: `https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/ml-auto-retrain`
**Schedule**: `0 */6 * * *` (ogni 6 ore: 00:00, 06:00, 12:00, 18:00)
**Method**: POST
**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA
Content-Type: application/json
```

---

### 3. 🎲 Random Signal Scheduler (ogni 5 minuti)
Genera segnali sintetici REALI a intervalli random per training

**URL**: `https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/random-signal-scheduler`
**Schedule**: `*/5 * * * *` (ogni 5 minuti, ma decide random se generare)
**Method**: POST
**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA
Content-Type: application/json
```

**Nota**: Questo cron gira ogni 5 minuti ma ha solo 30% probabilità di generare segnali (random). Genera 1-5 segnali per volta (random).

---

### 4. 🧹 Cleanup Old Signals (giornaliero)
Rimuove segnali vecchi per mantenere il DB pulito

**SQL Query** (da eseguire tramite pg_cron o servizio esterno):
```sql
DELETE FROM collective_signals
WHERE created_at < NOW() - INTERVAL '30 days'
AND status IN ('TP_HIT', 'SL_HIT', 'EXPIRED');
```

**Schedule**: `0 2 * * *` (ogni giorno alle 2 AM)

---

## 🚀 Setup Metodi

### Opzione A: Servizio Esterno (CONSIGLIATO)

Usa **cron-job.org** o **EasyCron.com**:

1. Vai su https://cron-job.org/en/ (registrati gratis)
2. Crea 3 nuovi cron jobs con i dati sopra
3. Verifica che funzionino controllando i log

**Screenshot della configurazione**:
- Title: "Price Tick Monitor"
- URL: (copia da sopra)
- Schedule: (copia da sopra)
- Headers: Aggiungi Authorization header

---

### Opzione B: pg_cron (Supabase Pro)

Se hai Supabase Pro, usa pg_cron nativo:

```sql
-- 1. Price Tick Monitor
SELECT cron.schedule(
  'price-tick-monitor',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/price-tick-cron',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA", "Content-Type": "application/json"}'::jsonb
    );
  $$
);

-- 2. ML Auto Retrain
SELECT cron.schedule(
  'ml-auto-retrain',
  '0 */6 * * *',
  $$
    SELECT net.http_post(
      url := 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/ml-auto-retrain',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA", "Content-Type": "application/json"}'::jsonb
    );
  $$
);

-- 3. Random Signal Scheduler
SELECT cron.schedule(
  'random-signal-scheduler',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/random-signal-scheduler',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA", "Content-Type": "application/json"}'::jsonb
    );
  $$
);

-- 4. Cleanup Old Signals
SELECT cron.schedule(
  'cleanup-old-signals',
  '0 2 * * *',
  $$
    DELETE FROM collective_signals
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('TP_HIT', 'SL_HIT', 'EXPIRED');
  $$
);
```

---

## 🧪 Test Manuale

Testa ogni cron chiamandolo manualmente:

### Test Random Signal Scheduler:
```bash
curl -X POST https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/random-signal-scheduler \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA"
```

### Test Synthetic Generator Diretto:
```bash
curl -X POST https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/synthetic-signal-generator \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA" \
  -H "Content-Type: application/json" \
  -d '{"count": 3}'
```

### Verifica Segnali Generati:
```sql
-- Conta segnali sintetici (user_id = NULL)
SELECT COUNT(*) as synthetic_signals
FROM collective_signals
WHERE user_id IS NULL;

-- Ultimi 5 segnali sintetici
SELECT symbol, signal_type, confidence, entry_price, created_at
FROM collective_signals
WHERE user_id IS NULL
ORDER BY created_at DESC
LIMIT 5;
```

---

## 📊 Monitoring

### Query Utili:

**Segnali per Tipo:**
```sql
SELECT
  CASE WHEN user_id IS NULL THEN 'Synthetic' ELSE 'User' END as source,
  COUNT(*) as count,
  ROUND(AVG(confidence), 2) as avg_confidence
FROM collective_signals
GROUP BY CASE WHEN user_id IS NULL THEN 'Synthetic' ELSE 'User' END;
```

**Performance Sintetici vs Utenti:**
```sql
SELECT
  CASE WHEN user_id IS NULL THEN 'Synthetic' ELSE 'User' END as source,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'TP_HIT' THEN 1 ELSE 0 END) as wins,
  ROUND(100.0 * SUM(CASE WHEN status = 'TP_HIT' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as win_rate
FROM collective_signals
WHERE status IN ('TP_HIT', 'SL_HIT')
GROUP BY CASE WHEN user_id IS NULL THEN 'Synthetic' ELSE 'User' END;
```

---

## ✅ Checklist Setup

- [ ] Cron 1: Price Tick Monitor (ogni minuto)
- [ ] Cron 2: ML Auto Retrain (ogni 6 ore)
- [ ] Cron 3: Random Signal Scheduler (ogni 5 minuti)
- [ ] Cron 4: Cleanup Old Signals (giornaliero)
- [ ] Test manuale dei 3 cron principali
- [ ] Verifica che i segnali sintetici vengano generati
- [ ] Monitoring attivo

---

## 🎯 Funzionamento Sistema

1. **Random Scheduler** gira ogni 5 minuti
2. Ha 30% probabilità di generare segnali
3. Se decide di generare, crea 1-5 segnali random
4. I segnali usano dati di mercato REALI da TradingView
5. **Price Tick Monitor** traccia tutti i segnali (sintetici + utente)
6. **ML Auto Retrain** usa TUTTI i segnali per l'addestramento
7. Il modello migliora sia dai segnali utente che sintetici! 🚀

**Aspettativa**: 50-150 segnali sintetici al giorno (completamente random)

## ⚙️ Configurazione Spread Sintetici

I segnali sintetici usano spread **DOPPI** rispetto al normale:

| Asset | Spread Normale | Spread Sintetico | Motivo |
|-------|----------------|------------------|---------|
| XAUUSD | ~$0.20 | $0.40 | Evita trade troppo corti |
| EURUSD | ~1 pip | 2 pips | Riduce correlazione broker |
| GBPUSD | ~1.5 pips | 3 pips | Trade più robusti |
| BTCUSD | ~$10 | $20 | Slippage realistico |
| ETHUSD | ~$1 | $2 | Condizioni più conservative |

**Vantaggi**:
- ✅ Trade meno sensibili allo spread del broker
- ✅ Modello più generalizzato
- ✅ Evita overfitting su condizioni ideali
- ✅ Performance più realistiche in produzione
