# 📡 API Documentation - Generate AI Signals V3

> **Documentazione completa dell'API per la generazione di segnali AI adaptativi**

## 🎯 Overview

L'API Generate AI Signals V3 è un sistema RESTful che fornisce segnali di trading adaptativi basati sulla rilevazione automatica del regime di mercato. L'API è deployata come Supabase Edge Function e supporta tutti i principali simboli Forex e commodities.

---

## 🔗 Base URL

```
https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/generate-ai-signals
```

---

## 🔐 Autenticazione

### Headers Richiesti

```http
Content-Type: application/json
Authorization: Bearer YOUR_ANON_KEY
apikey: YOUR_ANON_KEY
```

### Chiavi API

- **Anon Key**: Per chiamate dal frontend
- **Service Role Key**: Per chiamate server-to-server

---

## 📥 Request

### Endpoint

```http
POST /functions/v1/generate-ai-signals
```

### Request Body

```json
{
  "symbol": "EURUSD",
  "timestamp": "2025-10-07T14:30:00.000Z",
  "requestId": "uuid-v4-optional",
  "debug": false
}
```

#### Parametri

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|-----------|-------------|
| `symbol` | string | ✅ | Simbolo trading (es. EURUSD, GBPUSD, XAUUSD) |
| `timestamp` | string | ❌ | ISO timestamp per richiesta (default: now) |
| `requestId` | string | ❌ | UUID per tracking richiesta |
| `debug` | boolean | ❌ | Abilita logging dettagliato (default: false) |

#### Simboli Supportati

**Major Forex Pairs**:
- EURUSD, GBPUSD, USDJPY, USDCHF
- AUDUSD, USDCAD, NZDUSD

**Minor Pairs**:
- EURGBP, EURJPY, GBPJPY, EURCHF
- AUDCAD, GBPAUD, CADJPY

**Commodities**:
- XAUUSD (Gold), XAGUSD (Silver)
- Oil, Natural Gas (se supportati dal broker)

---

## 📤 Response

### Success Response

```json
{
  "success": true,
  "signal": {
    "id": "sig_20251007_143015_eurusd",
    "symbol": "EURUSD",
    "action": "BUY",
    "confidence": 75,
    "entry_price": 1.1234,
    "stop_loss": 1.1200,
    "take_profit": 1.1300,
    "risk_reward_ratio": 1.94,
    "pips_risk": 34,
    "pips_reward": 66,
    
    "regime": {
      "type": "TREND",
      "adx": 28.5,
      "choppiness": 45.2,
      "strength": "STRONG"
    },
    
    "levels": {
      "pdh": 1.1256,
      "pdl": 1.1198,
      "round_above": 1.1250,
      "round_below": 1.1200,
      "vwap": 1.1220
    },
    
    "session": {
      "current": "LONDON",
      "open_breakout": true,
      "ib_high": 1.1245,
      "ib_low": 1.1210,
      "session_start": "2025-10-07T09:00:00.000Z"
    },
    
    "indicators": {
      "ema12": 1.1225,
      "ema21": 1.1215,
      "ema50": 1.1205,
      "rsi": 62.3,
      "atr": 0.0045,
      "adx": 28.5,
      "choppiness": 45.2
    },
    
    "confluence": {
      "trend_alignment": true,
      "pullback_entry": false,
      "ib_breakout": true,
      "open_breakout": true,
      "pdl_support": true,
      "round_number_near": false
    },
    
    "reasoning": [
      "TREND regime detected (ADX: 28.5, Choppiness: 45.2)",
      "EMA 12/21 bullish cross confirmed",
      "Price above VWAP indicating bullish bias",
      "London open breakout detected (+20% confidence)",
      "PDL support confluence at 1.1198 (+10% confidence)",
      "RSI in bullish momentum zone (62.3)"
    ],
    
    "metadata": {
      "processing_time_ms": 234,
      "data_points": 500,
      "last_candle": "2025-10-07T14:30:00.000Z",
      "signal_version": "v3.0.0"
    },
    
    "created_at": "2025-10-07T14:30:15.123Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "UNCERTAIN_REGIME",
    "message": "Market regime uncertain - no trade recommended",
    "details": {
      "symbol": "EURUSD",
      "adx": 18.2,
      "choppiness": 55.7,
      "regime": "UNCERTAIN",
      "reason": "Market conditions not suitable for trading"
    },
    "timestamp": "2025-10-07T14:30:15.123Z"
  }
}
```

---

## 📊 Response Fields Detail

### Signal Object

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | string | ID univoco del segnale |
| `symbol` | string | Simbolo trading |
| `action` | string | "BUY", "SELL", o "NO_TRADE" |
| `confidence` | number | Livello di fiducia (20-95%) |
| `entry_price` | number | Prezzo di entrata |
| `stop_loss` | number | Livello stop loss |
| `take_profit` | number | Livello take profit |
| `risk_reward_ratio` | number | Rapporto rischio/rendimento |

### Regime Object

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `type` | string | "TREND", "RANGE", "UNCERTAIN" |
| `adx` | number | Valore ADX (0-100) |
| `choppiness` | number | Choppiness Index (0-100) |
| `strength` | string | "WEAK", "MODERATE", "STRONG" |

### Levels Object

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `pdh` | number | Previous Day High |
| `pdl` | number | Previous Day Low |
| `round_above` | number | Round number sopra prezzo corrente |
| `round_below` | number | Round number sotto prezzo corrente |
| `vwap` | number | Volume Weighted Average Price |

### Session Object

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `current` | string | "LONDON", "NY", "ASIAN", "CLOSED" |
| `open_breakout` | boolean | Se c'è breakout nell'apertura sessione |
| `ib_high` | number | Initial Balance High |
| `ib_low` | number | Initial Balance Low |

---

## 🔍 Error Codes

| Codice | Descrizione | Azione Consigliata |
|--------|-------------|-------------------|
| `INVALID_SYMBOL` | Simbolo non supportato | Usa simbolo valido |
| `INSUFFICIENT_DATA` | Dati di mercato insufficienti | Riprova più tardi |
| `UNCERTAIN_REGIME` | Regime di mercato incerto | Attendi condizioni migliori |
| `MARKET_CLOSED` | Mercato chiuso | Attendi apertura mercato |
| `API_RATE_LIMIT` | Tropppe richieste | Riduci frequenza chiamate |
| `INVALID_REQUEST` | Request malformata | Verifica parametri |
| `SERVER_ERROR` | Errore interno | Riprova o contatta supporto |

---

## 💡 Best Practices

### 1. Rate Limiting

- **Max**: 10 richieste/minuto per IP
- **Consigliato**: 1 richiesta ogni 10-15 secondi
- **Burst**: Max 3 richieste in sequenza

### 2. Error Handling

```javascript
async function generateSignal(symbol) {
  try {
    const response = await fetch(`${baseUrl}/generate-ai-signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({ symbol })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      handleError(data.error);
      return null;
    }
    
    return data.signal;
    
  } catch (error) {
    console.error('Signal generation failed:', error);
    return null;
  }
}

function handleError(error) {
  switch (error.code) {
    case 'UNCERTAIN_REGIME':
      console.log('Market conditions uncertain, skipping trade');
      break;
    case 'MARKET_CLOSED':
      console.log('Market closed, waiting for next session');
      break;
    case 'API_RATE_LIMIT':
      console.log('Rate limit exceeded, backing off');
      break;
    default:
      console.error('Unexpected error:', error);
  }
}
```

### 3. Caching

```javascript
const signalCache = new Map();
const CACHE_TTL = 60000; // 1 minuto

async function getCachedSignal(symbol) {
  const cacheKey = `signal_${symbol}`;
  const cached = signalCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.signal;
  }
  
  const signal = await generateSignal(symbol);
  
  if (signal) {
    signalCache.set(cacheKey, {
      signal,
      timestamp: Date.now()
    });
  }
  
  return signal;
}
```

---

## 🧪 Testing Examples

### Basic Test

```bash
curl -X POST "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/generate-ai-signals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"symbol":"EURUSD"}'
```

### Debug Mode Test

```bash
curl -X POST "https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/generate-ai-signals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"symbol":"EURUSD","debug":true}'
```

### JavaScript Test

```javascript
const testSignalGeneration = async () => {
  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'];
  
  for (const symbol of symbols) {
    console.log(`\n📊 Testing ${symbol}...`);
    
    const response = await fetch(`${baseUrl}/generate-ai-signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({ symbol, debug: true })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${symbol}: ${result.signal.action} @ ${result.signal.confidence}%`);
      console.log(`   Regime: ${result.signal.regime.type}`);
      console.log(`   R:R: ${result.signal.risk_reward_ratio}`);
    } else {
      console.log(`❌ ${symbol}: ${result.error.code} - ${result.error.message}`);
    }
  }
};
```

---

## 📈 Usage Patterns

### 1. Real-time Signal Generation

```javascript
// Per trading manuale - 1 chiamata per richiesta utente
const generateManualSignal = async (symbol) => {
  const signal = await generateSignal(symbol);
  
  if (signal && signal.confidence >= 70) {
    displaySignal(signal);
    sendNotification(signal);
  }
};
```

### 2. Automated Trading

```javascript
// Per trading automatico - chiamate periodiche
const autoTradingLoop = async () => {
  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY'];
  
  for (const symbol of symbols) {
    const signal = await generateSignal(symbol);
    
    if (signal && signal.confidence >= 75) {
      await executeTrade(signal);
    }
    
    // Pausa tra chiamate per rispettare rate limits
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
};

// Esegui ogni 5 minuti
setInterval(autoTradingLoop, 5 * 60 * 1000);
```

### 3. Market Scanning

```javascript
// Scanner di mercato - analisi multi-simbolo
const scanMarket = async () => {
  const allSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'XAUUSD'];
  const opportunities = [];
  
  for (const symbol of allSymbols) {
    const signal = await generateSignal(symbol);
    
    if (signal && signal.action !== 'NO_TRADE') {
      opportunities.push({
        symbol,
        signal,
        score: calculateOpportunityScore(signal)
      });
    }
  }
  
  // Ordina per score decrescente
  opportunities.sort((a, b) => b.score - a.score);
  
  return opportunities.slice(0, 3); // Top 3 opportunità
};

function calculateOpportunityScore(signal) {
  let score = signal.confidence;
  
  // Bonus per open breakout
  if (signal.session.open_breakout) score += 10;
  
  // Bonus per alto R:R
  if (signal.risk_reward_ratio > 2) score += 5;
  
  // Bonus per trend regime
  if (signal.regime.type === 'TREND') score += 5;
  
  return Math.min(100, score);
}
```

---

## 🔧 Advanced Configuration

### Custom Headers

```javascript
const customHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${anonKey}`,
  'User-Agent': 'AI-Cash-Evo/3.0.0',
  'X-Client-Version': '3.0.0',
  'X-Request-Source': 'web-app'
};
```

### Timeout Configuration

```javascript
const generateSignalWithTimeout = async (symbol, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(`${baseUrl}/generate-ai-signals`, {
      method: 'POST',
      headers: customHeaders,
      body: JSON.stringify({ symbol }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return await response.json();
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    throw error;
  }
};
```

---

## 📊 Monitoring & Analytics

### Response Time Tracking

```javascript
const trackResponseTime = async (symbol) => {
  const startTime = Date.now();
  
  try {
    const signal = await generateSignal(symbol);
    const responseTime = Date.now() - startTime;
    
    // Log metrics
    console.log(`Signal generated for ${symbol} in ${responseTime}ms`);
    
    // Send to analytics
    analytics.track('signal_generated', {
      symbol,
      responseTime,
      confidence: signal?.confidence,
      regime: signal?.regime?.type
    });
    
    return signal;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    analytics.track('signal_error', {
      symbol,
      responseTime,
      error: error.message
    });
    
    throw error;
  }
};
```

### Success Rate Monitoring

```javascript
const monitorSuccessRate = () => {
  const stats = {
    total: 0,
    successful: 0,
    errors: {}
  };
  
  const originalGenerate = generateSignal;
  
  generateSignal = async (symbol) => {
    stats.total++;
    
    try {
      const signal = await originalGenerate(symbol);
      
      if (signal) {
        stats.successful++;
      }
      
      return signal;
      
    } catch (error) {
      stats.errors[error.message] = (stats.errors[error.message] || 0) + 1;
      throw error;
    }
  };
  
  // Report stats ogni 10 minuti
  setInterval(() => {
    const successRate = (stats.successful / stats.total) * 100;
    console.log(`Success Rate: ${successRate.toFixed(2)}% (${stats.successful}/${stats.total})`);
    console.log('Errors:', stats.errors);
  }, 10 * 60 * 1000);
};
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. CORS Errors

```javascript
// Assicurati di includere i headers corretti
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${anonKey}`,
  'apikey': anonKey // Importante per Supabase
};
```

#### 2. Timeout Issues

```javascript
// Implementa retry con backoff
const generateSignalWithRetry = async (symbol, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await generateSignalWithTimeout(symbol, 15000);
    } catch (error) {
      if (i === retries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

#### 3. Rate Limit Handling

```javascript
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.requests = [];
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  async waitIfNeeded() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      console.log(`Rate limit reached, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter();

const generateSignalSafe = async (symbol) => {
  await rateLimiter.waitIfNeeded();
  return await generateSignal(symbol);
};
```

---

## 📞 Support

Per supporto tecnico sull'API:

- 📧 **Email**: api-support@ai-cash-evo.com
- 📖 **Docs**: [Complete Documentation](./GENERATE_AI_SIGNALS_V3_DOCUMENTATION.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/ai-cash-evo/issues)
- 💬 **Discord**: [Developer Community](https://discord.gg/ai-cash-evo-dev)

---

**Generate AI Signals V3 API** - Powerful, Adaptive, Reliable 🚀