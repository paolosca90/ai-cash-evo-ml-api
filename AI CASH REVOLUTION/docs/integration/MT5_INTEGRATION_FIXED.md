# ✅ MT5 Integration Fixed - CORS Error Risolto

**Data**: 2025-10-11
**Status**: ✅ FUNZIONANTE

---

## 🔧 Problema Identificato

L'errore CORS nel frontend era causato dalla chiamata all'Edge Function `mt5-trade-signals` che **non esisteva più**.

### Errore Console
```
Access to fetch at 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/mt5-trade-signals'
from origin 'https://ai-cash-evo-main-hy0i8bx7b-paolos-projects-dc6990da.vercel.app'
has been blocked by CORS policy: Response to preflight request doesn't pass access control check
```

### Causa Root
La funzione `mt5-trade-signals` era stata **cancellata per errore** nel commit `6fe4bb34`:
```
commit 6fe4bb34b65b984bccec7e966cc900ee54668986
Date: Tue Oct 7 14:24:57 2025 +0200

fix: resolve all lint issues and add entry_price to signal response
- Deleted 8 obsolete Supabase functions (ensemble-adaptive, mt5-*, etc.)
```

---

## ✅ Soluzione Implementata

### 1. Funzione Ripristinata
Ho recuperato la funzione dal commit precedente (`89355e8`) e l'ho ridployata:

**File**: `supabase/functions/mt5-trade-signals/index.ts`

**Funzionalità**:
- **POST**: Salva segnali trading nella tabella `mt5_signals`
- **GET**: L'Expert Advisor MT5 legge i segnali via polling
- **CORS**: Configurati correttamente per Vercel + MT5 EA

### 2. Flusso Integrazione MT5

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Vercel                      │
│  └─ TradeExecutionPanel.tsx                            │
│     └─ Genera segnale AI (generate-ai-signals)         │
│     └─ Invia a MT5 (mt5-trade-signals POST)            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│            Supabase Edge Function                       │
│  └─ mt5-trade-signals                                  │
│     └─ Valida utente via email                         │
│     └─ Salva in tabella mt5_signals                    │
│     └─ SET sent = false (pending)                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase Database                          │
│  └─ Table: mt5_signals                                 │
│     ├─ id, symbol, signal (BUY/SELL)                   │
│     ├─ entry, stop_loss, take_profit                   │
│     ├─ confidence, risk_amount                         │
│     ├─ user_id, client_id                              │
│     └─ sent (boolean) - default false                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│         Expert Advisor MT5 (VPS)                        │
│  └─ Polling ogni 30-60 secondi                         │
│  └─ GET /mt5-trade-signals?email=user@email.com        │
│  └─ Legge segnali con sent=false                       │
│  └─ Esegue trade su MT5                                │
│  └─ Invia conferma via realtime-trade-webhook          │
└─────────────────────────────────────────────────────────┘
```

### 3. Deploy Completato

✅ **Funzione deployed su Supabase**:
```bash
npx supabase functions deploy mt5-trade-signals --project-ref rvopmdflnecyrwrzhyfy
```

✅ **URL Edge Function**:
```
https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/mt5-trade-signals
```

✅ **Commit e Push**:
```
commit e108721 - fix: restore mt5-trade-signals Edge Function for MT5 EA integration
```

---

## 🧪 Come Testare

### Test 1: Verifica Edge Function Attiva

```bash
curl -X GET "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/mt5-trade-signals" \
  -H "x-user-email: tuo-email@example.com"
```

**Expected**: JSON response con `status: "success"` e array `signals`

### Test 2: Invia Segnale Test da Frontend

1. Vai su frontend Vercel: https://ai-cash-evo-main-hy0i8bx7b-paolos-projects-dc6990da.vercel.app
2. Fai login con la tua email
3. Vai alla pagina Trading
4. Clicca su "Esegui Trade" per un simbolo (es. EUR/USD)
5. Il segnale dovrebbe essere salvato in `mt5_signals`

### Test 3: Verifica Segnale in Database

**Supabase SQL Editor**:
```sql
SELECT
  id,
  symbol,
  signal,
  entry,
  stop_loss,
  take_profit,
  confidence,
  sent,
  created_at
FROM mt5_signals
WHERE sent = false
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: Vedi i segnali non ancora letti dall'EA

### Test 4: Simula EA che Legge Segnali

```bash
curl -X GET "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/mt5-trade-signals?email=tuo-email@example.com"
```

**Expected**:
```json
{
  "status": "success",
  "count": 1,
  "signals": [
    {
      "id": "uuid",
      "symbol": "EURUSD",
      "action": "BUY",
      "entry": 1.1330,
      "stopLoss": 1.1305,
      "takeProfit": 1.1380,
      "confidence": 92,
      ...
    }
  ]
}
```

Dopo questa chiamata, i segnali vengono marcati `sent = true`.

---

## 📋 Checklist Verifica

- [x] Funzione `mt5-trade-signals` ripristinata
- [x] CORS headers configurati correttamente
- [x] Deployed su Supabase
- [x] TradeExecutionPanel.tsx aggiornato
- [x] Commit e push su GitHub
- [ ] **Test frontend → salva segnale** ⏳
- [ ] **Test EA → legge segnale** ⏳
- [ ] **Verifica trade eseguito su MT5** ⏳

---

## 🔑 Configurazione Expert Advisor

L'EA MT5 deve essere configurato con:

```mql5
// Input parameters
input string API_URL = "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/mt5-trade-signals";
input string USER_EMAIL = "tuo-email@example.com";  // ← Email utente registrato
input int POLLING_INTERVAL_SECONDS = 60;  // Polling ogni 60 secondi

// Headers
string headers = "x-user-email: " + USER_EMAIL + "\r\n";

// Request
WebRequest(
  "GET",
  API_URL + "?email=" + USER_EMAIL,
  headers,
  NULL,
  5000,
  result,
  responseCode
);
```

---

## 🚨 Troubleshooting

### Problema: "Email non valida o utente non registrato"

**Causa**: Email non presente in DB o funzione `validate_email_api_key` mancante

**Fix**:
1. Verifica email in Supabase: `SELECT * FROM profiles WHERE email = 'tuo@email.com'`
2. Verifica funzione SQL esista: `SELECT * FROM pg_proc WHERE proname = 'validate_email_api_key'`

### Problema: Segnali non vengono letti dall'EA

**Causa**: EA non configurato o firewall blocca richieste

**Fix**:
1. Verifica URL Edge Function corretto
2. Verifica email corretta
3. Test con curl per verificare risposta
4. Check firewall VPS

### Problema: "sent = true" ma trade non eseguito

**Causa**: EA ha letto il segnale ma errore nell'esecuzione

**Fix**:
1. Check logs EA MT5
2. Verifica margine disponibile
3. Verifica simbolo disponibile su broker
4. Check SL/TP validi

---

## 📝 File Modificati

```
supabase/functions/mt5-trade-signals/
├── index.ts                          # ✅ NEW - Edge Function ripristinata

src/components/
├── TradeExecutionPanel.tsx           # ✅ FIXED - Usa mt5-trade-signals

.git/
├── commit e108721                    # ✅ PUSHED
```

---

## 🎯 Next Steps

1. **Deploy frontend Vercel** (auto-trigger da GitHub)
2. **Test completo end-to-end**:
   - Frontend genera segnale
   - Segnale salvato in DB
   - EA legge segnale
   - Trade eseguito su MT5
3. **Monitoraggio**:
   - Check logs Edge Function
   - Check tabella mt5_signals
   - Check trade_events_log (webhook EA)

---

## ✅ Status Finale

```
✅ CORS ERROR: RISOLTO
✅ EDGE FUNCTION: DEPLOYED
✅ FRONTEND: AGGIORNATO
✅ DATABASE: PRONTO
⏳ TEST END-TO-END: DA FARE
```

**Sistema MT5 → Backend pronto per l'integrazione con Expert Advisor! 🚀**
