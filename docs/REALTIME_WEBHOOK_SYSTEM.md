# Real-Time Trade Webhook System

## Overview

Il sistema Real-Time Trade Webhook è una soluzione completa per la gestione di eventi trading istantanei da MT5 Expert Advisors (EA) con notifiche push real-time, monitoraggio connessioni e dashboard interattive.

## Architettura del Sistema

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MT5 EA        │───▶│  Edge Function    │───▶│  Supabase DB    │
│   (Client)      │    │  (Webhook)        │    │  (Event Logs)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  React Client   │◀───│  Supabase        │───▶│  Notifications  │
│  (Dashboard)    │    │  Realtime        │    │  (Push/Web)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Componenti Principali

### 1. Edge Function: `realtime-trade-webhook`

**File:** `supabase/functions/realtime-trade-webhook/index.ts`

**Funzionalità:**
- Ricezione webhook da MT5 EA
- Validazione payload e signature verification
- Rate limiting e sicurezza
- Gestione eventi multipli (trade apertura, chiusura, modifica, timeout)
- Broadcast real-time via Supabase Realtime
- Logging completo degli eventi

**Endpoint:**
- `POST /` - Ricezione eventi trade
- `GET /?action=status` - Status servizio
- `GET /?action=connections` - Connessioni attive

### 2. Database Schema

**File:** `supabase/migrations/20250928200000_realtime_webhook_tables.sql`

**Tabelle:**
- `trade_events_log` - Logging completo eventi trade
- `user_notifications` - Notifiche utenti
- `webhook_security_log` - Log sicurezza e rate limiting
- `connection_monitoring` - Monitoraggio connessioni attive

### 3. React Components

#### Hook: `useRealtimeNotifications.ts`
- Gestione sottoscrizioni Supabase Realtime
- Ricezione notifiche push
- Gestione stato notifiche (lette/non lette)
- Supporto notifiche browser

#### Component: `NotificationCenter.tsx`
- Interfaccia utente per notifiche
- Counter notifiche non lette
- Azioni massime (segna tutte come lette, cancella)
- Toast notifications integrate

#### Component: `ConnectionMonitor.tsx`
- Dashboard monitoraggio connessioni
- Status webhook service
- Visualizzazione connessioni attive/offline
- Statistiche in tempo reale

#### Component: `WebhookTestPage.tsx`
- Centro test webhook
- Payload editor con esempi
- Auto-test automatico
- Risultati test con statistiche

## Eventi Supportati

### Trade Events
- `trade_opened` - Nuovo trade aperto
- `trade_closed` - Trade chiuso (con motivo)
- `trade_modified` - Trade modificato (SL, TP, etc.)
- `trade_timeout` - Trade scaduto per timeout
- `heartbeat` - Keep-alive connessione

### Connection Events
- `online` - Client connesso
- `offline` - Client disconnesso
- `reconnected` - Client riconnesso

## Payload Format

### Trade Opened
```json
{
  "event_type": "trade_opened",
  "timestamp": "2025-09-28T10:30:00Z",
  "client_id": "MT5_Client_001",
  "account_number": "12345678",
  "ticket": 12345,
  "symbol": "EURUSD",
  "order_type": "BUY",
  "volume": 0.1,
  "price": 1.2345,
  "stop_loss": 1.2300,
  "take_profit": 1.2400,
  "comment": "AI Signal Trade",
  "magic_number": 888777
}
```

### Trade Closed
```json
{
  "event_type": "trade_closed",
  "timestamp": "2025-09-28T11:45:00Z",
  "client_id": "MT5_Client_001",
  "account_number": "12345678",
  "ticket": 12345,
  "symbol": "EURUSD",
  "profit": 150.50,
  "close_reason": "take_profit"
}
```

### Heartbeat
```json
{
  "event_type": "heartbeat",
  "timestamp": "2025-09-28T10:35:00Z",
  "client_id": "MT5_Client_001",
  "account_number": "12345678",
  "connection_status": "online"
}
```

## Configurazione

### Environment Variables
```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Webhook Security
WEBHOOK_SECRET=your_webhook_secret_key
```

### Rate Limiting
```typescript
const RATE_LIMITS = {
  webhook: { requests: 100, windowMs: 60000 },    // 100 richieste/minuto
  notifications: { requests: 50, windowMs: 60000 } // 50 notifiche/minuto
};
```

## Sicurezza

### 1. Webhook Signature Verification
- HMAC-SHA256 per verificare l'autenticità dei webhook
- Configurabile tramite `WEBHOOK_SECRET`
- Protegge da richieste malevole

### 2. Rate Limiting
- Limiti per IP endpoint
- Memory-based storage con cleanup automatico
- Protezione da abusi e DoS

### 3. Row Level Security (RLS)
- Policies su tutte le tabelle
- Accesso limitato ai propri dati
- Service role per operazioni di sistema

### 4. Input Validation
- Validazione schema payload
- Sanitizzazione dati input
- Type checking con TypeScript

## Notifiche Push

### Canali Supabase Realtime
- `user_notifications:{user_id}` - Notifiche utente specifiche
- `trading_dashboard` - Aggiornamenti dashboard globali

### Tipi Notifiche
- `trade_update` - Aggiornamenti trade
- `system_alert` - Allerte di sistema
- `connection_status` - Stato connessioni

### Priorità
- `low` - Info generali
- `medium` - Aggiornamenti normali
- `high` - Eventi importanti
- `critical` - Eventi critici

## Monitoraggio e Logging

### Event Logging
- Tutti gli eventi trade loggati in `trade_events_log`
- Log sicurezza in `webhook_security_log`
- Monitoraggio connessioni in `connection_monitoring`

### Dashboard
- Status servizio in tempo reale
- Conteggio connessioni attive
- Statistiche performance
- Log errori e warning

### Cleanup Automatico
- Rotazione log (30 giorni security log)
- Cleanup connessioni inattive
- Funzioni manutenzione database

## Integrazione MT5 EA

### Esempio MQL5
```mql5
// Funzione per inviare evento trade
void SendTradeEvent(string eventType, string symbol, double price, double profit = 0) {
    char url[];
    char headers[];
    char result[];
    string params = StringFormat(
        "{\"event_type\":\"%s\",\"timestamp\":\"%s\",\"client_id\":\"%s\","
        "\"account_number\":\"%d\",\"symbol\":\"%s\",\"price\":%.5f,\"profit\":%.2f}",
        eventType, TimeToString(TimeGMT(), TIME_DATE|TIME_SECONDS),
        AccountInfoString(ACCOUNT_LOGIN), AccountInfoInteger(ACCOUNT_LOGIN),
        symbol, price, profit
    );

    StringToCharArray(params, url, 0, StringLen(params));
    StringToCharArray("Content-Type: application/json\r\n", headers, 0, StringLen("Content-Type: application/json\r\n"));

    int timeout = 5000; // 5 secondi
    int res = WebRequest("POST", "https://your-project.supabase.co/functions/v1/realtime-trade-webhook",
                        headers, timeout, url, result, headers);

    if(res == 200) {
        Print("Webhook inviato con successo");
    } else {
        Print("Errore webhook: ", res);
    }
}

// Esempio utilizzo
void OnTradeTransaction(const MqlTradeTransaction& trans, const MqlTradeRequest& request, const MqlTradeResult& result) {
    if(trans.type == TRADE_TRANSACTION_DEAL_ADD) {
        SendTradeEvent("trade_opened", trans.symbol, trans.price);
    }
    else if(trans.type == TRADE_TRANSACTION_DEAL_REMOVE) {
        SendTradeEvent("trade_closed", trans.symbol, trans.price, trans.profit);
    }
}
```

### Error Handling
- Retry automatico per errori di rete
- Fallback su logging locale
- Notifiche errori configurabili

## Performance e Scalabilità

### Ottimizzazioni
- Memory pooling per rate limiting
- Cleanup automatico connessioni inattive
- Database indexing per query veloci
- Payload validation lightweight

### Scalabilità
- Architettura stateless
- Horizontal scaling supportato
- Queue-based processing (future)
- Load balancing ready

## Testing

### Test Automatici
- Component unit tests
- Integration tests
- Load testing capabilities
- Webhook payload validation

### Manual Testing
- Webhook Test Center UI
- Sample payloads per tutti gli eventi
- Real-time response monitoring
- Statistics and performance metrics

## Troubleshooting

### Problemi Comuni

1. **Webhook non ricevuti**
   - Verifica firewall e rete
   - Controlla signature verification
   - Controlla rate limiting

2. **Notifiche non funzionanti**
   - Verifica permessi browser
   - Controlla connessione Supabase
   - Verifica RLS policies

3. **Connessioni instabili**
   - Controlla heartbeat configuration
   - Monitora timeout settings
   - Verifica network stability

### Debug Tools
- Connection Monitor dashboard
- Webhook Test Center
- Supabase logs
- Browser developer tools

## Deployment

### Prerequisiti
- Supabase project configurato
- Environment variables settate
- Migration applicate
- Edge function deployed

### Deploy Steps
1. Applica migration database
2. Deploy edge function
3. Aggiorna frontend components
4. Testa con Webhook Test Center
5. Configura MT5 EA integration

## Future Enhancements

### Short Term
- WebSocket server bidirezionale
- Advanced analytics dashboard
- Mobile app notifications
- Trade signal integration

### Long Term
- Machine learning integration
- Advanced risk management
- Multi-broker support
- API marketplace integration

## Support

Per supporto tecnico:
1. Controlla i logs in Supabase dashboard
2. Usa il Webhook Test Center per debugging
3. Verifica lo stato delle connessioni
4. Consulta la documentazione Supabase Realtime

---

*Documentazione v1.0.0 - Ultimo aggiornamento: 28/09/2025*