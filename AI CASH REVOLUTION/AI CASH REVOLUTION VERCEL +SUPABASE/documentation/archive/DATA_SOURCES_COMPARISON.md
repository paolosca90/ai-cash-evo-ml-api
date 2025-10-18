# 📊 FONTI DATI FOREX GRATUITE - COMPARAZIONE

## 🏆 TOP 5 ALTERNATIVE (Gratuite e Affidabili)

---

## 1. **OANDA API** ⭐⭐⭐⭐⭐ (MIGLIORE)

### Vantaggi:
- ✅ **COMPLETAMENTE GRATUITO** (no limits per dati storici)
- ✅ Dati di altissima qualità (broker istituzionale)
- ✅ API stabile e veloce
- ✅ Spread reali inclusi
- ✅ Dati fino a 5 anni indietro
- ✅ Tutti i timeframe (1min, 5min, 15min, 1h, 1d)

### Come Usare:
```bash
# 1. Registrati (gratis): https://www.oanda.com/demo-account/
# 2. Ottieni API token: https://www.oanda.com/demo-account/tpa/personal_token
# 3. Endpoint API:
GET https://api-fxpractice.oanda.com/v3/instruments/{instrument}/candles?granularity=M5&from=2025-06-01&to=2025-08-31
```

### Esempio Request:
```javascript
const response = await fetch(
  'https://api-fxpractice.oanda.com/v3/instruments/EUR_USD/candles?granularity=M5&from=2025-06-01T00:00:00Z&to=2025-08-31T23:59:59Z&price=M',
  {
    headers: {
      'Authorization': 'Bearer YOUR_OANDA_TOKEN'
    }
  }
);
```

### Simboli Disponibili:
- EUR_USD, GBP_USD, USD_JPY, AUD_USD, USD_CAD, NZD_USD
- GBP_JPY, EUR_GBP, AUD_JPY, EUR_JPY
- XAU_USD (Gold), XAG_USD (Silver)

### Limiti:
- ❌ Max 5000 candles per request (aggirabile con loop su date)
- ✅ No rate limits significativi

---

## 2. **Alpha Vantage** ⭐⭐⭐⭐

### Vantaggi:
- ✅ Gratis fino a 25 requests/day
- ✅ API key gratuita permanente
- ✅ Dati fino a 20 anni indietro
- ✅ Documentazione eccellente

### Come Usare:
```bash
# 1. Ottieni API key: https://www.alphavantage.co/support/#api-key
# 2. Endpoint:
GET https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=EUR&to_symbol=USD&interval=5min&apikey=YOUR_KEY
```

### Limiti:
- ⚠️ 25 requests/day (gratis)
- ⚠️ 500 requests/day ($50/mese premium)
- ⚠️ Solo 1 mese di dati intraday gratis

### Meglio Per:
- Daily/Weekly data (illimitati)
- Backtesting su timeframe > 1h

---

## 3. **Polygon.io** ⭐⭐⭐⭐

### Vantaggi:
- ✅ Piano gratuito: 5 API calls/minuto
- ✅ Dati forex di alta qualità
- ✅ 2 anni di storia gratis
- ✅ WebSocket real-time incluso

### Come Usare:
```bash
# 1. Registrati: https://polygon.io/
# 2. API key gratuita istantanea
# 3. Endpoint:
GET https://api.polygon.io/v2/aggs/ticker/C:EURUSD/range/5/minute/2025-06-01/2025-08-31?apiKey=YOUR_KEY
```

### Limiti:
- ⚠️ 5 calls/minuto (gratis)
- ✅ Unlimited calls a $29/mese (economico)

---

## 4. **Yahoo Finance (yfinance Python)** ⭐⭐⭐⭐

### Vantaggi:
- ✅ **100% GRATUITO** e illimitato
- ✅ No API key richiesta
- ✅ Dati affidabili (fonte: Yahoo Finance)
- ✅ Libreria Python facile da usare

### Come Usare:
```python
import yfinance as yf

# Download forex data
data = yf.download('EURUSD=X', start='2025-06-01', end='2025-08-31', interval='5m')
print(data)
```

### Limiti:
- ⚠️ Solo Python (serve wrapper per Deno/TypeScript)
- ⚠️ Rate limiting implicito (non documentato)
- ⚠️ Meno affidabile di OANDA per dati intraday

### Simboli:
- EURUSD=X, GBPUSD=X, USDJPY=X
- GC=F (Gold), SI=F (Silver)

---

## 5. **Dukascopy Bank** ⭐⭐⭐⭐⭐

### Vantaggi:
- ✅ **COMPLETAMENTE GRATUITO**
- ✅ Dati tick-by-tick (massima qualità)
- ✅ Fino a 10+ anni di storia
- ✅ Download diretto CSV/JSON

### Come Usare:
```bash
# Download manuale: https://www.dukascopy.com/swiss/english/marketwatch/historical/
# O via API non ufficiale: https://github.com/Leo4815162342/dukascopy-node
```

### JavaScript Library:
```javascript
const { getDukascopyData } = require('@leo4815162342/dukascopy-node');

const data = await getDukascopyData({
  pair: 'eurusd',
  from: '2025-06-01',
  to: '2025-08-31',
  timeframe: 'm5'
});
```

### Limiti:
- ⚠️ API non ufficiale (può cambiare)
- ✅ Ma download CSV sempre disponibile

---

## 📊 COMPARAZIONE RAPIDA

| Fonte | Gratuito | Limite | Qualità | Facilità | Affidabilità |
|-------|----------|--------|---------|----------|--------------|
| **OANDA** | ✅ Sì | 5000 candles/req | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Alpha Vantage** | ✅ Sì | 25 req/day | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Polygon.io** | ✅ Sì | 5 req/min | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Yahoo Finance** | ✅ Sì | Soft limits | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Dukascopy** | ✅ Sì | No limits | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| *Twelve Data* | ⚠️ Demo | 800 calls/day | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎯 RACCOMANDAZIONE

### Per il Tuo Sistema (Best Choice):

**Usa OANDA API** perché:
1. ✅ Gratis e illimitato per dati storici
2. ✅ Qualità istituzionale (spread reali)
3. ✅ API stabile e ben documentata
4. ✅ Facile integrazione con Supabase Edge Functions
5. ✅ No rate limits problematici

### Setup Rapido (5 minuti):

```typescript
// supabase/functions/ml-historical-training/index.ts

async function fetchHistoricalData(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  
  const oandaToken = Deno.env.get("OANDA_API_TOKEN");
  
  // Convert EURUSD → EUR_USD
  const oandaSymbol = symbol === 'XAUUSD' ? 'XAU_USD' : 
                      symbol.replace(/([A-Z]{3})([A-Z]{3})/, '$1_$2');

  const url = `https://api-fxpractice.oanda.com/v3/instruments/${oandaSymbol}/candles?granularity=M5&from=${startDate}T00:00:00Z&to=${endDate}T23:59:59Z&price=M`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${oandaToken}`
    }
  });

  const data = await response.json();
  
  return data.candles.map(c => ({
    datetime: c.time,
    open: c.mid.o,
    high: c.mid.h,
    low: c.mid.l,
    close: c.mid.c,
    volume: c.volume
  }));
}
```

### Come Ottenerlo:

1. **Registrati su OANDA** (gratis, 2 minuti):
   👉 https://www.oanda.com/demo-account/

2. **Genera Personal Token** (1 minuto):
   👉 https://www.oanda.com/demo-account/tpa/personal_token

3. **Aggiungi su Supabase** (1 minuto):
   - Dashboard → Settings → Secrets
   - Nome: `OANDA_API_TOKEN`
   - Valore: il token generato

4. **Deploy e Test**:
   ```bash
   npx supabase functions deploy ml-historical-training
   ```

---

## 🚀 ALTERNATIVA: Pre-Download CSV

Se non vuoi API, puoi **pre-scaricare** dati CSV:

### Fonte: Dukascopy Historical Data
1. Vai su: https://www.dukascopy.com/swiss/english/marketwatch/historical/
2. Seleziona: EUR/USD, 5min, Jun-Aug 2025
3. Download CSV (gratis, no registrazione)
4. Upload su Supabase Storage
5. Funzione legge da storage invece di API

### Vantaggi:
- ✅ Zero API calls
- ✅ Velocissimo (no network latency)
- ✅ 100% affidabile

### Svantaggi:
- ⚠️ Manuale (update mensile)
- ⚠️ Non real-time

---

## ✅ CONCLUSIONE

**Raccomando OANDA** per il tuo sistema perché:
- Gratis e illimitato
- Qualità professionale
- Setup in 5 minuti
- Nessun problema di rate limiting

**Vuoi che implemento OANDA API nel sistema di training storico?** 🚀

Risparmierai i $50/mese di Twelve Data e avrai dati migliori! 💰
