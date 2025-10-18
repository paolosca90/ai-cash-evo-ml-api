# 🐛 BUG CRITICO: EA non vede i segnali creati da execute-trade

## Problema
- `execute-trade` crea segnale con `sent: false` ✅
- `mt5-trade-signals` GET ritorna `count: 0, signals: []` ❌
- EA MT5 non vede mai i segnali

## Test Eseguiti

### Test 1: execute-trade
```bash
POST /functions/v1/execute-trade
Headers: x-user-email: paoloscardia@gmail.com

Result:
{
  "success": true,
  "signal_id": "df9c3a4e-603e-46cc-bb10-70f096b1471a",
  "volume": 0.55
}
```

### Test 2: mt5-trade-signals GET (2 secondi dopo)
```bash
GET /functions/v1/mt5-trade-signals?email=paoloscardia@gmail.com
Headers: x-user-email: paoloscardia@gmail.com

Result:
{
  "success": true,
  "count": 0,
  "signals": []  ← VUOTO!
}
```

## Analisi Codice

### execute-trade/index.ts (line 42-61)
```typescript
const { data: inserted, error: insertErr } = await supabase
  .from("mt5_signals")
  .insert({
    client_id: email.toLowerCase(),  // ← "paoloscardia@gmail.com"
    user_id: userId,                  // ← "28756d59-415a-4bef-abeb-6ea3821603bc"
    symbol: tradeRequest.symbol,
    signal: tradeRequest.action,
    entry: tradeRequest.entry,
    stop_loss: tradeRequest.stopLoss,
    take_profit: tradeRequest.takeProfit,
    volume: volume,
    risk_amount: tradeRequest.riskAmountEUR,
    eurusd_rate: tradeRequest.eurusdRate,
    confidence: tradeRequest.confidence ?? null,
    timestamp: new Date().toISOString(),
    sent: false,  // ← IMPORTANTE: FALSE
    processed: false,
  })
```

### mt5-trade-signals/index.ts (line 136-143)
```typescript
const { data: signals, error: selectErr } = await supabase
  .from("mt5_signals")
  .select("id, symbol, signal, entry, stop_loss, take_profit, volume, ...")
  .eq("sent", false)                     // ← cerca sent=false
  .eq("client_id", email.toLowerCase())  // ← cerca client_id="paoloscardia@gmail.com"
  .order("timestamp", { ascending: true });
```

## Possibili Cause

### 1. ⚠️ Row Level Security (RLS) - PROBABILE
- Entrambe le funzioni usano `SUPABASE_SERVICE_ROLE_KEY`
- MA potrebbero esserci policy RLS che bloccano la SELECT
- Service role dovrebbe bypassare RLS, ma forse non configurato correttamente

### 2. ⚠️ user_id Mismatch
- execute-trade setta `user_id: "28756d59-415a-4bef-abeb-6ea3821603bc"`
- Se c'è una policy RLS che filtra per `auth.uid() = user_id`, la SELECT fallirebbe
- Service role non ha un `auth.uid()`

### 3. ⚠️ Timestamp/Timezone Issue
- Il segnale viene inserito con `timestamp: new Date().toISOString()`
- Se c'è un filtro temporale nascosto, potrebbe escluderlo

### 4. ⚠️ Colonne mancanti nel SELECT
- La SELECT non include `user_id` o `client_id` nella lista colonne
- Forse c'è un errore silenzioso?

## Test da Fare

### ✅ Test 1: Verificare RLS Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'mt5_signals';
```

### ✅ Test 2: Query diretta con service role
```javascript
const { data, error } = await supabase
  .from("mt5_signals")
  .select("*")
  .eq("id", "df9c3a4e-603e-46cc-bb10-70f096b1471a")
  .single();
```

### ✅ Test 3: Verificare se record esiste
```sql
SELECT id, client_id, user_id, sent, processed, created_at
FROM mt5_signals
WHERE id = 'df9c3a4e-603e-46cc-bb10-70f096b1471a';
```

## Soluzione Temporanea

Modificare `execute-trade` per NON richiedere user_id o settarlo a NULL se la tabella lo permette:

```typescript
const { data: inserted, error: insertErr } = await supabase
  .from("mt5_signals")
  .insert({
    client_id: email.toLowerCase(),
    user_id: null,  // ← Prova senza user_id
    // ... resto uguale
  })
```

## Next Steps

1. Verificare schema tabella `mt5_signals`:
   - È `user_id` required (NOT NULL)?
   - Ci sono policy RLS attive?

2. Testare query diretta con ID specifico

3. Modificare execute-trade per loggare l'errore SELECT se esiste

4. Verificare su Supabase Dashboard:
   - Table Editor → mt5_signals → Ultimi record
   - Authentication → Policies → mt5_signals

---

**Status**: 🔴 BLOCCANTE - EA non può eseguire trade senza vedere segnali
**Priority**: 🔥 CRITICO
**Next Action**: Verificare RLS policies e schema tabella
