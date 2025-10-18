# Setup Guida - Real-Time Webhook System

## Prerequisiti

- Node.js 18+ e npm/yarn
- Supabase account e project
- Accesso al database PostgreSQL
- Conoscenza base di TypeScript e React

## Step 1: Configurazione Database

### 1.1 Applica le Migration

```bash
# Nella directory del progetto
supabase db push

# oppure copia manualmente il contenuto di:
# supabase/migrations/20250928200000_realtime_webhook_tables.sql
```

### 1.2 Verifica le Tabelle

Accedi al Supabase Dashboard > Database > Table Editor e verifica che le seguenti tabelle siano state create:

- `trade_events_log`
- `user_notifications`
- `webhook_security_log`
- `connection_monitoring`

### 1.3 Configura Environment Variables

Nel tuo file `.env` locale:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Webhook Security
WEBHOOK_SECRET=your_secure_webhook_secret_minimum_32_characters
```

## Step 2: Deploy Edge Function

### 2.1 Deploy della Funzione

```bash
# Nella directory del progetto
supabase functions deploy realtime-trade-webhook --no-verify-jwt
```

### 2.2 Verifica il Deploy

Accedi a Supabase Dashboard > Edge Functions e verifica che `realtime-trade-webhook` sia attiva.

Testa l'endpoint:

```bash
curl https://your-project.supabase.co/functions/v1/realtime-trade-webhook?action=status
```

Dovresti ricevere una risposta simile a:

```json
{
  "status": "online",
  "version": "1.0.0",
  "active_connections": 0,
  "timestamp": "2025-09-28T10:00:00Z",
  "rate_limits": {
    "webhook": { "requests": 100, "windowMs": 60000 },
    "notifications": { "requests": 50, "windowMs": 60000 }
  }
}
```

## Step 3: Integrazione Frontend

### 3.1 Installa i Componenti

Assicurati di avere i seguenti file nella tua codebase:

```typescript
// Hook per notifiche real-time
src/hooks/useRealtimeNotifications.ts

// Componenti UI
src/components/notifications/NotificationCenter.tsx
src/components/monitoring/ConnectionMonitor.tsx

// Pagine e esempi
src/pages/WebhookTestPage.tsx
src/examples/WebhookIntegrationExample.tsx
```

### 3.2 Integra nel Layout Principale

Nel tuo componente layout principale (es. `App.tsx` o `Layout.tsx`):

```tsx
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

function App() {
  return (
    <div>
      {/* Header con notification center */}
      <header>
        <NotificationCenter />
      </header>

      {/* Contenuto principale */}
      <main>
        {/* ... altre componenti ... */}
      </main>
    </div>
  );
}
```

### 3.3 Aggiungi Pagina di Test

```tsx
// In App.tsx routing
import { WebhookTestPage } from '@/pages/WebhookTestPage';

function App() {
  return (
    <Routes>
      <Route path="/webhook-test" element={<WebhookTestPage />} />
      {/* ... altre routes ... */}
    </Routes>
  );
}
```

## Step 4: Configurazione MT5 EA

### 4.1 Codice MQL5 per Webhook

Crea un file MQL5 nel tuo MT5:

```mql5
//+------------------------------------------------------------------+
//|                                                      Webhook.mq5 |
//|                        Copyright 2025, Your Company               |
//|                                             https://yourcompany.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2025, Your Company"
#property link      "https://yourcompany.com"
#property version   "1.00"

string webhookUrl = "https://your-project.supabase.co/functions/v1/realtime-trade-webhook";
string webhookSecret = "your_webhook_secret";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   // Invia heartbeat ogni 30 secondi
   EventSetTimer(30);

   // Invia status connessione
   SendHeartbeat();

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
}

//+------------------------------------------------------------------+
//| Timer function                                                  |
//+------------------------------------------------------------------+
void OnTimer()
{
   // Invia heartbeat periodico
   SendHeartbeat();
}

//+------------------------------------------------------------------+
//| TradeTransaction function                                        |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // Gestisci solo le transazioni completate
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return;

   // Invia evento trade
   SendTradeEvent(trans);
}

//+------------------------------------------------------------------+
//| Invia evento trade                                              |
//+------------------------------------------------------------------+
void SendTradeEvent(const MqlTradeTransaction& trans)
{
   string symbol = trans.symbol;
   double volume = trans.volume;
   double price = trans.price;
   long ticket = trans.deal;

   // Determina il tipo di ordine
   string orderType = "";
   if(trans.deal_type == DEAL_TYPE_BUY)
      orderType = "BUY";
   else if(trans.deal_type == DEAL_TYPE_SELL)
      orderType = "SELL";

   // Crea payload JSON
   string payload = StringFormat(
      "{\"event_type\":\"trade_opened\","
      "\"timestamp\":\"%s\","
      "\"client_id\":\"MT5_%d\","
      "\"account_number\":\"%d\","
      "\"ticket\":%d,"
      "\"symbol\":\"%s\","
      "\"order_type\":\"%s\","
      "\"volume\":%.2f,"
      "\"price\":%.5f,"
      "\"comment\":\"EA Trade\","
      "\"magic_number\":%d}",
      TimeToString(TimeGMT(), TIME_DATE|TIME_SECONDS|TIME_MINUTES|TIME_SECONDS),
      AccountInfoInteger(ACCOUNT_LOGIN),
      AccountInfoInteger(ACCOUNT_LOGIN),
      ticket,
      symbol,
      orderType,
      volume,
      price,
      12345 // Magic number
   );

   // Invia webhook
   SendWebhook(payload);
}

//+------------------------------------------------------------------+
//| Invia heartbeat                                                  |
//+------------------------------------------------------------------+
void SendHeartbeat()
{
   string payload = StringFormat(
      "{\"event_type\":\"heartbeat\","
      "\"timestamp\":\"%s\","
      "\"client_id\":\"MT5_%d\","
      "\"account_number\":\"%d\","
      "\"connection_status\":\"online\"}",
      TimeToString(TimeGMT(), TIME_DATE|TIME_SECONDS|TIME_MINUTES|TIME_SECONDS),
      AccountInfoInteger(ACCOUNT_LOGIN),
      AccountInfoInteger(ACCOUNT_LOGIN)
   );

   SendWebhook(payload);
}

//+------------------------------------------------------------------+
//| Invia webhook                                                    |
//+------------------------------------------------------------------+
void SendWebhook(string payload)
{
   char data[];
   char result[];
   char headers[];

   StringToCharArray(payload, data, 0, StringLen(payload));
   StringToCharArray("Content-Type: application/json\r\n", headers, 0, StringLen("Content-Type: application/json\r\n"));

   int timeout = 10000; // 10 secondi
   int res = WebRequest("POST", webhookUrl, headers, timeout, data, result, headers);

   if(res == 200)
   {
      Print("Webhook inviato con successo: ", payload);
   }
   else
   {
      Print("Errore webhook (", res, "): ", payload);
      // Salva localmente per retry successivo
      SaveFailedWebhook(payload);
   }
}

//+------------------------------------------------------------------+
//| Salva webhook fallito per retry                                   |
//+------------------------------------------------------------------+
void SaveFailedWebhook(string payload)
{
   int handle = FileOpen("failed_webhooks.txt", FILE_READ|FILE_WRITE|FILE_TXT);
   if(handle != INVALID_HANDLE)
   {
      FileSeek(handle, 0, SEEK_END);
      FileWriteString(handle, payload + "\n");
      FileClose(handle);
   }
}
```

### 4.2 Compila e Installa l'EA

1. Copia il codice in MetaEditor
2. Compila il file
3. Installa l'EA sul grafico desiderato
4. Abilita "Allow WebRequest" nelle impostazioni MT5
5. Aggiungi l'URL del webhook nella lista consentita

## Step 5: Testing

### 5.1 Testa l'Edge Function

Visita `https://your-project.supabase.co/functions/v1/realtime-trade-webhook` per verificare che la funzione sia attiva.

### 5.2 Usa il Webhook Test Center

1. Naviga alla pagina `/webhook-test` nella tua app
2. Usa i payload di esempio
3. Verifica che le notifiche arrivino in tempo reale

### 5.3 Testa le Notifiche

1. Apri la dashboard
2. Clicca sull'icona della campanella
3. Verifica che le notifiche appaiano
4. Controlla le notifiche browser se abilitate

## Step 6: Monitoraggio

### 6.1 Monitoraggio Connessioni

Usa il `ConnectionMonitor` per visualizzare:

- Stato del servizio webhook
- Connessioni MT5 attive
- Performance e statistiche

### 6.2 Log e Debug

Accedi a Supabase Dashboard > Logs per:

- Errori edge function
- Query database
- Realtime subscriptions

### 6.3 Database Monitoring

Monitora le tabelle:

```sql
-- Ultimi eventi trade
SELECT * FROM trade_events_log
ORDER BY created_at DESC
LIMIT 10;

-- Notifiche utente
SELECT * FROM user_notifications
ORDER BY created_at DESC
LIMIT 10;

-- Connessioni attive
SELECT * FROM connection_monitoring
WHERE is_active = true
ORDER BY last_activity DESC;
```

## Step 7: Production Checklist

- [ ] Settare WEBHOOK_SECRET in produzione
- [ ] Configurare HTTPS per tutti gli endpoint
- [ ] Abilitare rate limiting appropriato
- [ ] Testare con payload reali da MT5
- [ ] Monitorare performance e memoria
- [ ] Configurare backup e recovery
- [ ] Documentare il sistema per il team
- [ ] Testare failover e retry logic

## Troubleshooting Comuni

### Webhook non arriva
- Verifica l'URL del webhook
- Controlla le impostazioni MT5 WebRequest
- Verifica i firewall e network
- Controlla i logs Supabase

### Notifiche non funzionano
- Verifica le permessi browser
- Controlla connessione Supabase
- Verifica RLS policies
- Controlla Realtime subscriptions

### Connessioni instabili
- Aumenta timeout heartbeat
- Verifica network stability
- Controlla MT5 uptime
- Monitora performance servizio

## Supporto

Per supporto tecnico:

1. Controlla i logs in Supabase Dashboard
2. Usa il Webhook Test Center per debugging
3. Consulta la documentazione completa
4. Contatta il team di sviluppo

---

*Setup Guida v1.0.0 - Ultimo aggiornamento: 28/09/2025*