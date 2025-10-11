# ✅ Railway ↔️ Supabase Connection

**Status**: 🔴 DA CONFIGURARE (Environment Variables mancanti)

---

## 🔗 Come Funziona la Connessione

Il sistema è composto da **2 repository separate**:

### **1️⃣ Repository Railway (ai-cash-evo-ml-api)**
```
GitHub: https://github.com/paolosca90/ai-cash-evo-ml-api
Branch: master
Deploy: Railway.app
```

**Services in esecuzione 24/7**:
- `auto_signal_generator_service.py` → Genera 100+ segnali/giorno
- `weight_optimizer_service.py` → Ottimizza pesi daily 2AM UTC

---

### **2️⃣ Repository Vercel+Supabase (ai-cash-evo)**
```
GitHub: https://github.com/paolosca90/ai-cash-evo
Branch: main
Deploy: Vercel (frontend) + Supabase (backend)
```

**Componenti**:
- Frontend React/TypeScript su Vercel
- Edge Functions Supabase (generate-ai-signals, mt5-trade-signals)
- Database PostgreSQL su Supabase

---

## 🔌 Connessione Railway → Supabase

### **auto_signal_generator_service.py**

```python
# Linea 20-23
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
```

**Cosa fa**:
1. Legge trade attivi da tabella `signal_performance`:
   ```python
   # Linea 65-68
   response = supabase.table('signal_performance')\
       .select('*', count='exact')\
       .is_('oanda_trade_closed_at', None)\
       .execute()
   ```

2. Chiama Edge Function `generate-ai-signals`:
   ```python
   # Linea 83-93
   url = f"{SUPABASE_URL}/functions/v1/generate-ai-signals"
   response = requests.post(url, json=payload, headers=headers)
   ```

---

### **weight_optimizer_service.py**

```python
# Linea 21-24
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
```

**Cosa fa**:
1. Carica trade chiusi degli ultimi 7 giorni:
   ```python
   # Linea 35-40
   response = supabase.table('signal_performance')\
       .select('*')\
       .not_.is_('oanda_trade_closed_at', 'null')\
       .gte('created_at', cutoff_date.isoformat())\
       .execute()
   ```

2. Salva pesi ottimizzati in `weight_optimization_history`:
   ```python
   # Linea 103-120
   supabase.table('weight_optimization_history')\
       .update({'active': False})\
       .eq('active', True)\
       .execute()

   supabase.table('weight_optimization_history')\
       .insert(config)\
       .execute()
   ```

---

## 🚨 AZIONE RICHIESTA: Configurare Environment Variables

### **Passo 1: Ottieni le Credenziali Supabase**

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard/project/rvopmdflnecyrwrzhyfy)
2. Clicca **Settings** → **API**
3. Copia:
   - **URL**: `https://rvopmdflnecyrwrzhyfy.supabase.co`
   - **service_role key** (NON anon key!) - sezione "Service role" secret

---

### **Passo 2: Aggiungi Environment Variables su Railway**

1. Vai su [Railway Dashboard](https://railway.app/dashboard)
2. Seleziona il tuo progetto **ai-cash-evo-ml-api**
3. Per OGNI service (`auto_signal_generator_service` e `weight_optimizer_service`):
   - Clicca sul service
   - Vai su **Variables** tab
   - Aggiungi:

```bash
SUPABASE_URL=https://rvopmdflnecyrwrzhyfy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<copia-service-role-key-da-supabase>
```

4. Clicca **Deploy** (Railway riavvia i services automaticamente)

---

## ✅ Verifica Connessione

### **Test 1: Check Logs Railway**

Dopo il deploy, vai su Railway → Service → **Logs** e verifica:

```
✅ "Auto Signal Service initialized"
✅ "Weight Optimizer Service initialized"
❌ "Error: SUPABASE_URL not set" (se mancano le env vars)
```

---

### **Test 2: Verifica Database Supabase**

Controlla se i services scrivono dati:

**Query 1 - Check signal_performance**:
```sql
SELECT
  COUNT(*) as total_signals,
  COUNT(CASE WHEN oanda_trade_closed_at IS NULL THEN 1 END) as active_trades,
  MAX(created_at) as last_signal
FROM signal_performance
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**Expected**: Dovresti vedere nuovi segnali creati nell'ultima ora durante trading hours (8-16 UTC)

---

**Query 2 - Check weight_optimization_history**:
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

**Expected**: Nuova riga creata ogni giorno alle 2 AM UTC

---

### **Test 3: Verifica Edge Function Call**

Controlla logs Supabase Edge Function `generate-ai-signals`:

1. Vai su Supabase → **Edge Functions** → `generate-ai-signals`
2. Clicca **Logs**
3. Dovresti vedere chiamate da Railway (Authorization Bearer con service_role_key)

---

## 🔄 Flusso Completo del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway (24/7)                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │ auto_signal_generator_service.py                   │    │
│  │  - Genera segnali ogni 10 min (8-16 UTC)          │    │
│  │  - Target: 100+ signals/day                        │    │
│  └────────────────────────────────────────────────────┘    │
│                         ↓                                   │
│         POST /functions/v1/generate-ai-signals              │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │ generate-ai-signals                                │    │
│  │  - Analizza mercato con AI                         │    │
│  │  - Calcola confidence, SL, TP                      │    │
│  │  - Esegue trade su OANDA (opzionale)              │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL Database                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Table: signal_performance                          │    │
│  │  - Salva ogni segnale generato                     │    │
│  │  - Track trade OANDA (aperto/chiuso)              │    │
│  │  - Pips, win/loss, confidence                      │    │
│  └────────────────────────────────────────────────────┘    │
│                         ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Table: mt5_signals (per MT5 EA)                    │    │
│  │  - Segnali per Expert Advisor MT5                  │    │
│  │  - Polling da VPS ogni 60 sec                      │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                         ↑
┌─────────────────────────────────────────────────────────────┐
│                    Railway (Daily 2AM)                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ weight_optimizer_service.py                        │    │
│  │  - Analizza trade chiusi ultimi 7 giorni          │    │
│  │  - Ottimizza confidence threshold                  │    │
│  │  - Ottimizza SL/TP multipliers                     │    │
│  │  - Salva pesi ottimizzati in DB                    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Tabelle Supabase Usate da Railway

### **1. signal_performance**
```sql
CREATE TABLE signal_performance (
  id UUID PRIMARY KEY,
  symbol TEXT,
  direction TEXT, -- BUY/SELL/HOLD
  confidence DECIMAL,
  entry_price DECIMAL,
  stop_loss DECIMAL,
  take_profit DECIMAL,

  -- OANDA trade tracking
  oanda_trade_id TEXT,
  oanda_trade_opened_at TIMESTAMP,
  oanda_trade_closed_at TIMESTAMP,

  -- Performance
  pips DECIMAL,
  win BOOLEAN,

  created_at TIMESTAMP DEFAULT NOW()
);
```

**Usato da**:
- ✅ `auto_signal_generator_service.py` - Legge trade attivi
- ✅ `weight_optimizer_service.py` - Legge trade chiusi per ottimizzazione

---

### **2. weight_optimization_history**
```sql
CREATE TABLE weight_optimization_history (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP,
  optimal_threshold DECIMAL, -- es. 70.0
  performance_winrate DECIMAL, -- es. 65.5
  performance_avg_pips DECIMAL,
  qualified_signals INTEGER,
  total_signals INTEGER,
  active BOOLEAN,
  source TEXT, -- "railway_auto_optimizer"

  created_at TIMESTAMP DEFAULT NOW()
);
```

**Usato da**:
- ✅ `weight_optimizer_service.py` - Scrive pesi ottimizzati daily

---

### **3. mt5_signals**
```sql
CREATE TABLE mt5_signals (
  id UUID PRIMARY KEY,
  user_id UUID,
  client_id TEXT,
  symbol TEXT,
  signal TEXT, -- BUY/SELL
  confidence DECIMAL,
  entry DECIMAL,
  stop_loss DECIMAL,
  take_profit DECIMAL,
  risk_amount DECIMAL,
  sent BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);
```

**Usato da**:
- ⚠️ Frontend (Vercel) - Scrive segnali per MT5 EA
- ⚠️ MT5 EA (VPS) - Legge segnali via polling

---

## 🎯 Status Checklist

Prima di avviare il sistema, verifica:

- [ ] **Environment Variables configurate su Railway**
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Services Railway deployed**
  - [ ] `auto_signal_generator_service` running
  - [ ] `weight_optimizer_service` running

- [ ] **Database Supabase pronto**
  - [ ] Tabella `signal_performance` esiste
  - [ ] Tabella `weight_optimization_history` esiste
  - [ ] Tabella `mt5_signals` esiste

- [ ] **Edge Function Supabase deployata**
  - [ ] `generate-ai-signals` deployed
  - [ ] `mt5-trade-signals` deployed

- [ ] **Test connessione completati**
  - [ ] Logs Railway mostrano "Service initialized"
  - [ ] Query database mostrano dati recenti
  - [ ] Edge Function logs mostrano chiamate Railway

---

## 🚀 Next Steps

1. **Configura Environment Variables su Railway** (PRIORITÀ MASSIMA)
2. Aspetta che Railway riavvii i services
3. Monitora logs per 30 minuti
4. Verifica database Supabase per nuovi segnali
5. Setup monitoraggio errori (Sentry/Railway logs)

---

**Documentazione creata**: 2025-10-11
**Railway Project**: ai-cash-evo-ml-api
**Supabase Project**: rvopmdflnecyrwrzhyfy
