# Trade Verification System - Setup Guide

## 🎯 Overview

Questo documento spiega come configurare e attivare il sistema completo di Trade Verification che ora include:

1. **Enhanced MT5 EA** con tracking trade in tempo reale
2. **Cron job automatico** per monitoraggio trade
3. **Webhook real-time** per aggiornamenti istantanei
4. **Auto-optimization system** basato su dati reali
5. **Database triggers** per analytics automatiche

## 🚀 Step 1: Aggiornare MT5 EA

### 1.1 Compila e installa l'EA enhanced
```mql5
// Nella MetaEditor:
1. Apri AI_Cash_Revolution_EA.mq5
2. Premi F7 per compilare
3. Installa l'EA sul grafico del tuo conto MT5
```

### 1.2 Configura i parametri dell'EA
```mql5
// Parametri obbligatori:
ServerURL = "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/mt5-trade-signals"
UpdateURL = "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/mt5-trade-update"
UserEmail = "tua-email@registrata.com"
ClientID = "MT5_Client_001"  // Unico per ogni installazione
MagicNumber = 888777        // Deve corrispondere al sistema
MaxTradeDurationMinutes = 480  // 8 ore max per trade
```

### 1.3 Abilita URL nel MT5
1. Vai in `Tools → Options → Expert Advisors`
2. Aggiungi gli URL del tuo progetto Supabase
3. Abilita "Allow WebRequest for listed URL"

## 🗄️ Step 2: Eseguire le Migration Database

### 2.1 Migration per Trade Verification
```sql
-- Esegui in ordine:
1. 20250928185846_trade_monitoring_cron_job.sql
2. 20250928210000_complete_trade_verification.sql
```

### 2.2 Verifica le tabelle create
```sql
-- Controlla che le tabelle esistano:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%trade%';

-- Dovresti vedere:
- trade_events_log
- user_notifications
- mt5_signals (con nuovi campi)
- trading_analytics
```

## ⚙️ Step 3: Configurare Edge Functions

### 3.1 Deploy le nuove edge functions
```bash
# Supabase CLI
supabase functions deploy realtime-trade-webhook
supabase functions deploy trading-auto-optimizer
supabase functions deploy trade-optimization-trigger
```

### 3.2 Configura le variabili d'ambiente
```bash
# Nel dashboard Supabase → Settings → Edge Functions
WEBHOOK_SECRET = "la-tua-secret-key-sicura"
NOTIFICATION_SERVICE_URL = "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/realtime-trade-webhook"
```

## 🔄 Step 4: Testare il Sistema

### 4.1 Test MT5 EA Connection
```mql5
// Nei log dell'EA dovresti vedere:
🤖 AI Cash Revolution EA - Inizializzazione...
✅ AI Cash Revolution EA inizializzato con successo
📡 Server: https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/mt5-trade-signals
📊 Trade Tracking System initialized with X active trades
```

### 4.2 Test Webhook Reception
1. Apri il Webhook Test Center all'indirizzo:
   `https://tuo-dominio.com/webhook-test`
2. Usa il template "trade_opened"
3. Invia il test e verifica che ricevi 200 OK

### 4.3 Test Auto-Optimization
```javascript
// Chiama manualmente l'ottimizzazione:
fetch('https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/trading-auto-optimizer', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    symbol: 'EURUSD',
    action: 'optimize'
  })
});
```

## 📊 Step 5: Monitorare il Sistema

### 5.1 Dashboard Monitoraggio
Visita le pagine:
- `/webhook-test` - Centro test webhook
- `/notifications` - Centro notifiche
- `/connection-monitor` - Stato connessioni

### 5.2 Query utili per il monitoraggio
```sql
-- Trade attivi con stato salute:
SELECT * FROM active_trades_monitoring;

-- Statistiche performance per simbolo:
SELECT * FROM trading_analytics ORDER BY symbol_total_trades DESC;

-- Eventi recenti:
SELECT * FROM trade_events_log ORDER BY created_at DESC LIMIT 100;

-- Notifiche utente:
SELECT * FROM user_notifications ORDER BY created_at DESC LIMIT 50;
```

## 🔧 Step 6: Configurare il Sistema di Notifiche

### 6.1 Abilita Realtime Subscriptions
```javascript
// Nel tuo frontend:
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sottoscrivi agli aggiornamenti trade
const channel = supabase.channel('trade-updates');

channel
  .on('broadcast', { event: 'trade_opened' }, (payload) => {
    console.log('Trade opened:', payload);
    // Mostra notifica
  })
  .on('broadcast', { event: 'trade_closed' }, (payload) => {
    console.log('Trade closed:', payload);
    // Aggiorna dashboard
  })
  .subscribe();
```

### 6.2 Configura Browser Notifications
```javascript
// Chiedi permessi notifiche
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// Mostra notifica
function showTradeNotification(title, body, icon) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon });
  }
}
```

## 🚨 Step 7: Security Configuration

### 7.1 Configura RLS Policies
Le migration includono già le policy, ma verifica:
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('mt5_signals', 'trading_analytics');
```

### 7.2 Webhook Security
```bash
# Configura segreto webhook
export WEBHOOK_SECRET="your-secure-secret-here"

# Nell'EA MT5, aggiungi l'header:
x-webhook-signature: HMAC-SHA256(webhook_secret, payload)
```

## 📈 Performance Tuning

### 7.1 Cron Job Optimization
```sql
-- Adjusta frequenza monitoraggio se necessario
SELECT cron.schedule(
    'trade-monitoring-5min',
    '*/5 * * * *',
    $$SELECT monitor_active_trades()$$
);
```

### 7.2 Database Indexes
Le migration aggiungono gli indici necessari, ma monitora:
```sql
-- Controlla performance query
EXPLAIN ANALYZE SELECT * FROM active_trades_monitoring;
```

## 🔍 Troubleshooting

### Problemi Comuni

**EA non si connette:**
1. Verifica URL in whitelist MT5
2. Controlla email utente registrata
3. Verifica connessione internet

**Webhook non riceve dati:**
1. Controlla signature verification
2. Verifica variabili d'ambiente
3. Controlla log errori

**Auto-optimization non funziona:**
1. Verifica che ci siano trade chiusi
2. Controlla permessi database
3. Verifica logging errori

### Log Utili
```sql
-- Log eventi recenti
SELECT * FROM trade_events_log
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;

-- Statistiche sistema
SELECT
    COUNT(*) as total_signals,
    COUNT(CASE WHEN status = 'opened' THEN 1 END) as active_trades,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_trades,
    AVG(CASE WHEN status = 'closed' AND actual_profit > 0 THEN actual_profit END) as avg_win
FROM mt5_signals;
```

## 🎉 Success!

Dopo aver completato questi step, avrai un sistema completo di Trade Verification che:

✅ **Monitora trade in tempo reale** con MT5 EA enhanced
✅ **Invia aggiornamenti automatici** via webhook real-time
✅ **Calcola profit/loss live** con cron job database
✅ **Ottimizza parametri trading** basato su dati reali
✅ **Notifica eventi importanti** agli utenti
✅ **Mantiene analytics aggiornate** automaticamente

Il sistema è ora pronto per operare in ambiente di produzione con monitoring completo e auto-learning!