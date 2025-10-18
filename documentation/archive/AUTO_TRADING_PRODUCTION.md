# 🚀 Auto Trading System - Production Deployment

## 📋 Sistema Implementato

### **Componenti Principali**

1. **Auto Signal Generator** ✅
   - Genera segnali automaticamente su Major, Minor, Metals
   - Intervalli irregolari (10-30 min) per casualità
   - 2-5 simboli random per batch

2. **Auto Result Updater** ✅
   - Controlla ogni 5 minuti se SL/TP raggiunti
   - Aggiorna automaticamente `signal_performance`
   - Trigger auto-recalcolo weights

3. **Continuous Learning** ✅
   - Weights ensemble auto-aggiornati ogni 10 trade
   - Sistema migliora continuamente
   - Analytics real-time

---

## 🎯 Deployment Step-by-Step

### **Step 1: Applica Migration Database**

```sql
-- In Supabase SQL Editor, copia e incolla:
-- File: supabase/migrations/20250106000002_auto_trading_system.sql
```

**Nota**: Questo richiede `pg_cron` extension. Se non disponibile, usa alternativa manuale (vedi sotto).

### **Step 2: Verifica Edge Functions Deployed**

Le funzioni sono già deployate:
- ✅ `auto-signal-generator`
- ✅ `auto-result-updater`

### **Step 3: Avvia il Sistema**

#### **Opzione A: Con pg_cron (Automatico)** ✅ Raccomandato

Se la migration è applicata, il sistema è **GIÀ ATTIVO**!

```sql
-- Check status
SELECT * FROM auto_trading_system_health;

-- Verifica cron jobs attivi
SELECT * FROM cron.job WHERE jobname LIKE 'auto-%';
```

#### **Opzione B: Senza pg_cron (Manuale)**

Se pg_cron non disponibile, usa questo script Node.js:

```javascript
// scripts/auto-trading-daemon.js
const SUPABASE_URL = 'https://rvopmdflnecyrwrzhyfy.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDc4ODQsImV4cCI6MjA3NDEyMzg4NH0.snlFF1ChbYsA765gXE-cMGb11jHIaF2np_pNxIGLgW8'

async function generateSignals() {
  const symbolsCount = 2 + Math.floor(Math.random() * 4) // 2-5 random

  const res = await fetch(`${SUPABASE_URL}/functions/v1/auto-signal-generator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      mode: 'single',
      symbolsPerBatch: symbolsCount
    })
  })

  const data = await res.json()
  console.log(`✅ Generated ${data.totalSignals} signals`)

  // Random interval 10-30 min
  const nextRun = 600000 + Math.random() * 1200000
  setTimeout(generateSignals, nextRun)
}

async function updateResults() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auto-result-updater`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`
    }
  })

  const data = await res.json()
  console.log(`✅ Updated ${data.updatedCount} signals`)

  // Every 5 minutes
  setTimeout(updateResults, 300000)
}

// Start both loops
generateSignals()
updateResults()
```

**Esegui:**
```bash
node scripts/auto-trading-daemon.js
```

---

## 📊 Monitoring & Control

### **Dashboard Queries**

```sql
-- 1. System Health
SELECT * FROM auto_trading_system_health;

-- 2. Overall Stats
SELECT * FROM get_auto_trading_stats();

-- 3. Recent Signals
SELECT * FROM signal_performance
ORDER BY created_at DESC
LIMIT 20;

-- 4. Ensemble Performance
SELECT * FROM ensemble_performance_overview;

-- 5. Weights Status
SELECT * FROM ensemble_weights_status
ORDER BY sample_size DESC;
```

### **Control Commands**

```sql
-- Pause system
SELECT set_auto_trading_status(false);

-- Resume system
SELECT set_auto_trading_status(true);

-- Check next scheduled generation
SELECT next_run_at
FROM signal_generation_schedule
WHERE status = 'pending'
ORDER BY next_run_at
LIMIT 1;
```

---

## 🎯 Expected Behavior

### **Signal Generation**

- **Frequency**: Every 10-30 minutes (random)
- **Symbols per batch**: 2-5 (random)
- **Total symbols pool**: 18 (8 Major + 8 Minor + 2 Metals)
- **Expected output**: 50-100 signals/day

### **Result Update**

- **Frequency**: Every 5 minutes
- **Logic**: Check if current price hit SL or TP
- **Auto-close**: Mark trade as WIN/LOSS
- **Trigger learning**: Recalculate weights every 10 trades

### **Continuous Learning**

- **Auto weight adjustment**: Based on last 50 trades per symbol
- **Adaptive ensemble**: Prefer system with better performance
- **Context-aware**: Learn which contexts favor which system

---

## 📈 Performance Targets

### **Week 1 (Training Phase)**
- 300-500 segnali generati
- Win rate ensemble > 50%
- Tutti i simboli hanno weights calcolati

### **Week 2 (Optimization)**
- 500-1000 segnali totali
- Win rate ensemble > 55%
- Max drawdown < 15%
- Confidence calibration error < 10%

### **Week 3+ (Production)**
- 1000+ segnali
- Win rate ensemble > 58%
- Sistema completamente auto-ottimizzato
- Sharpe ratio > 1.8

---

## 🔧 Troubleshooting

### **Problema: Nessun segnale generato**

```sql
-- Check schedule
SELECT * FROM signal_generation_schedule
ORDER BY created_at DESC
LIMIT 10;

-- Check Edge Function logs
-- Vai su Supabase Dashboard → Functions → auto-signal-generator → Logs
```

### **Problema: Risultati non aggiornati**

```sql
-- Check pending signals
SELECT COUNT(*)
FROM signal_performance
WHERE win IS NULL
  AND created_at > NOW() - INTERVAL '1 hour';

-- Manual trigger
SELECT trigger_result_update();
```

### **Problema: Weights non calcolati**

```sql
-- Manual recalculation
SELECT recalculate_ensemble_weights('EURUSD');
SELECT recalculate_ensemble_weights('GBPUSD');
-- ... per ogni simbolo
```

---

## 🚨 Important Notes

### **Risk Management**
- Sistema genera segnali automaticamente
- **NON** esegue trade reali (solo tracking)
- Per trading live, integrare con MT5

### **Data Quality**
- Intervalli irregolari prevengono pattern detection
- Selezione simboli random previene bias
- Continuous learning adatta il sistema al mercato

### **Monitoring Required**
- Check daily: `auto_trading_system_health`
- Check weekly: `get_auto_trading_stats()`
- Alert se win rate < 45% per 50+ trade consecutivi

---

## ✅ Sistema in Produzione

Il sistema è **COMPLETAMENTE AUTOMATICO**:

1. ✅ Genera segnali 24/7 con intervalli irregolari
2. ✅ Aggiorna risultati automaticamente ogni 5 min
3. ✅ Ricalcola weights ensemble ogni 10 trade
4. ✅ Impara continuamente da risultati reali
5. ✅ Si auto-ottimizza senza intervento umano

**Per verificare che funzioni:**

```sql
-- Run this query, wait 10-30 min, run again
SELECT
  (SELECT COUNT(*) FROM signal_performance) as total_signals,
  (SELECT MAX(created_at) FROM signal_performance) as last_signal_at;
```

Se `total_signals` aumenta → **Sistema Operativo**! 🚀

---

## 🎯 Next Steps

1. **Monitor per 24 ore** → Verifica generazione automatica
2. **Check win rate dopo 100 segnali** → Dovrebbe essere > 50%
3. **Analizza performance per simbolo** → Identifica best performers
4. **Ottimizza SL/TP** → Usa `get_optimal_stop_loss()`
5. **Scale up** → Aumenta simboli o frequenza se necessario

Il sistema è **pronto per produzione continua**! 📈🤖
