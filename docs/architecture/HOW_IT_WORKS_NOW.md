# ⚙️ COME FUNZIONA ADESSO - Configurazione Attuale

**Data**: 2025-10-09
**Status**: Sistema Live

---

## 🔍 DISCONNESSIONE IMPORTANTE

**I 388k segnali arricchiti con weights NON vengono usati per generare NUOVI segnali real-time.**

Sono due sistemi separati:
1. **Sistema Storico** (ml_historical_candles) → Training, Backtest, Analisi
2. **Sistema Real-Time** (generate signals) → Produzione segnali live

---

## 📊 SISTEMA STORICO (ml_historical_candles)

### Tabella Database
```sql
ml_historical_candles (388,612 records arricchiti)
├── Dati OHLCV storici
├── Indicatori (RSI, EMA, ADX, ecc.)
├── Labels ML (BUY/SELL)
├── Trade outcomes (WIN/LOSS, pips)
└── ⭐ Signal weights + recommendation
```

### Uso Attuale
```
✅ TRAINING: Modello TensorFlow trainato su questi dati
✅ BACKTEST: Analisi performance (100% win rate, 39.94 pips avg)
✅ ANALYTICS: Dashboard, statistiche storiche
❌ REAL-TIME: NON usati direttamente per nuovi segnali
```

---

## 🚀 SISTEMA REAL-TIME (Generazione Nuovi Segnali)

### Quando User Clicca "Generate Signal" su Frontend

```typescript
// Frontend (Dashboard.tsx)
handleGenerateSignal('EURUSD')
    ↓
// Service Layer (aiSignalService.ts)
aiSignalService.generateSignal({
  symbol: 'EURUSD',
  strategy: 'hybrid',  // ← Default
  useFallback: true
})
```

### Waterfall Strategy (Ordine di Esecuzione)

```
1️⃣ HYBRID Mode ← Prova per primo
     ↓ (se fallisce)
2️⃣ ML Mode (TensorFlow)
     ↓ (se fallisce)
3️⃣ Comprehensive (AI Edge Function)
     ↓ (se fallisce)
4️⃣ Fast Mode (AI con 15s timeout)
     ↓ (se fallisce)
5️⃣ Fallback (Calcolo tecnico base)
```

---

## 1️⃣ HYBRID MODE (Default)

**File**: `src/services/aiSignalService.ts`

### Cosa Fa

```typescript
async generateHybridSignal(symbol: string) {
  // Step 1: Chiama ML Service
  const mlResult = await mlService.generateSignal({ symbol })

  // Step 2: Chiama AI Edge Function
  const aiResult = await fetch('generate-ai-signals', {
    body: { symbol }
  })

  // Step 3: Confronta risultati
  if (mlResult.direction === aiResult.type) {
    // ✅ AGREEMENT → Alta confidence
    return {
      type: mlResult.direction,
      confidence: max(mlResult.confidence, aiResult.confidence),
      source: 'HYBRID'
    }
  } else {
    // ❌ DISAGREEMENT → HOLD (non tradare)
    return {
      type: 'HOLD',
      confidence: 0,
      reason: 'ML and AI disagree'
    }
  }
}
```

### Dettaglio Step 1: ML Service

**File**: `src/services/mlSignalService.ts`

```typescript
async generateSignal({ symbol }) {
  // 1. Fetch dati OANDA real-time
  const marketData = await fetch('oanda-market-data', {
    body: { symbol, granularity: 'M15' }
  })

  // marketData contiene:
  {
    price: 1.0950,
    volume: 1500,
    rsi: 62.3,
    macd: 0.0015,
    atr: 0.0012,
    sma_20: 1.0945,
    ema_20: 1.0948,
    stoch_k: 65.2,
    stoch_d: 58.1
  }

  // 2. Extract features (11 features)
  const features = featureEngineer.extractFeatures(marketData)

  // 3. TensorFlow prediction
  const prediction = await inferenceEngine.predict(features)

  // prediction output:
  {
    action: { type: 'BUY', size: 0.02 },
    confidence: 0.85,
    uncertainty: {
      epistemic: 0.15,  // Modello
      aleatoric: 0.08,  // Dati
      total: 0.23
    }
  }

  // 4. Convert to signal
  return {
    symbol: 'EURUSD',
    direction: 'BUY',
    confidence: 85,
    positionSize: 0.02
  }
}
```

**NOTA IMPORTANTE**: ❌ **NON usa ml_historical_candles weights**

Il modello TensorFlow è stato **trainato** sui dati storici, ma la predizione usa solo:
- Dati OANDA real-time
- Features estratte live
- Modello pre-trainato

### Dettaglio Step 2: AI Edge Function

**File**: `supabase/functions/generate-ai-signals/index.ts`

```typescript
async function generateSignal(symbol) {
  // 1. Fetch OANDA candles (200 bars)
  const candles = await getOANDACandles(symbol, 'M15', 200)
  const price = await getOANDAPrice(symbol)

  // 2. Calcola indicatori
  const rsi = calculateRSI(closes, 14)
  const adx = calculateADX(highs, lows, closes, 14)
  const chop = calculateChoppiness(highs, lows, closes, 14)
  const atr = calculateATR(highs, lows, closes, 14)
  const ema12 = calculateEMA(closes, 12)
  const ema21 = calculateEMA(closes, 21)

  // 3. Detect market regime
  const regime = detectMarketRegime(highs, lows, closes)
  // regime = 'TREND' | 'RANGE' | 'UNCERTAIN'

  // 4. Genera segnale basato su regime
  if (regime === 'TREND' && adx > 25) {
    // Strategy: Breakout + Momentum
    if (price > ibHigh && rsi < 70) {
      return {
        type: 'BUY',
        entry: price,
        stop_loss: price - (2 * atr),
        take_profit: price + (3 * atr),
        confidence: 85,
        regime: 'TREND',
        strategy: 'BREAKOUT_IB'
      }
    }
  } else if (regime === 'RANGE' && chop > 61.8) {
    // Strategy: Mean Reversion
    if (price < ibLow && rsi < 30) {
      return {
        type: 'BUY',
        entry: price,
        stop_loss: ibLow - atr,
        take_profit: vwap,
        confidence: 70,
        regime: 'RANGE',
        strategy: 'MEAN_REVERSION'
      }
    }
  }

  return { type: 'HOLD', confidence: 0 }
}
```

**NOTA IMPORTANTE**: ❌ **NON usa ml_historical_candles weights**

Calcola tutto live da OANDA.

---

## 2️⃣ ML MODE ONLY

```typescript
// Se user specifica strategy: 'ml'
const result = await mlService.generateSignal({ symbol })

// Usa SOLO TensorFlow
// Output:
{
  direction: 'BUY',
  confidence: 85,
  uncertainty: { total: 0.23 },
  source: 'ML'
}
```

---

## 3️⃣ AI MODE ONLY (Comprehensive)

```typescript
// Se user specifica strategy: 'comprehensive'
const result = await fetch('generate-ai-signals', { body: { symbol } })

// Usa SOLO Edge Function
// Output:
{
  type: 'BUY',
  entry: 1.0950,
  stop_loss: 1.0920,
  take_profit: 1.1020,
  confidence: 85,
  regime: 'TREND',
  source: 'AI'
}
```

---

## ❌ COSA NON VIENE USATO (Adesso)

### Signal Weights da ml_historical_candles

```sql
-- Questi 388k record CON weights:
SELECT
  symbol,
  signal_weight,      -- ❌ NON usato in real-time
  signal_recommendation,  -- ❌ NON usato in real-time
  position_multiplier  -- ❌ NON usato in real-time
FROM ml_historical_candles
WHERE signal_weight >= 70
```

**Perché non vengono usati?**

I weights sono **statici** (calcolati una volta su dati storici).

I segnali real-time usano:
- Dati OANDA **live**
- Calcoli **on-the-fly**
- Modello ML **inference** (non weights)

---

## ✅ COSA VIENE SALVATO NEL DB

### Quando Signal Generato

```typescript
// Dopo generazione signal
const { data } = await supabase
  .from('mt5_signals')  // ← Tabella DIVERSA
  .insert({
    user_id: userId,
    symbol: 'EURUSD',
    signal_type: 'BUY',
    entry: 1.0950,
    stop_loss: 1.0920,
    take_profit: 1.1020,
    confidence: 85,
    status: 'PENDING',

    // Metadata
    strategy: 'HYBRID',
    source: 'ML+AI',
    regime: 'TREND',
    adx: 28.5,
    rsi: 62.3,

    // ❌ NON ha signal_weight (campo non esiste in mt5_signals)
  })
```

**Tabelle Separate**:
- `ml_historical_candles` → Training data con weights
- `mt5_signals` → Segnali live produzione

---

## 🔧 COME INTEGRARE I WEIGHTS (TODO)

### Opzione 1: Calcola Weight Real-Time

```typescript
// In mlSignalService.ts - dopo prediction

async generateSignal({ symbol }) {
  // ... prediction esistente ...

  // ⭐ AGGIUNGI: Calcola weight real-time
  const weightResult = calculateSignalWeight({
    ml_confidence: prediction.confidence * 100,
    technical_quality: this.calculateTechnicalQuality(marketData),
    market_conditions: this.assessMarketConditions(marketData),
    mtf_confirmation: await this.fetchMTFConfirmation(symbol),
    risk_factors: this.calculateRiskFactors(marketData)
  })

  return {
    ...signal,
    signal_weight: weightResult.total_weight,
    recommendation: weightResult.recommendation,
    position_multiplier: weightResult.position_size_multiplier
  }
}
```

### Opzione 2: Usa Weights Storici per Validation

```typescript
// Query similar historical patterns
const { data: historicalSignals } = await supabase
  .from('ml_historical_candles')
  .select('signal_weight, trade_outcome, win_pips')
  .eq('symbol', symbol)
  .gte('signal_weight', 70)
  .limit(100)

// Calculate historical success rate
const avgWeight = mean(historicalSignals.map(s => s.signal_weight))
const winRate = historicalSignals.filter(s => s.trade_outcome === 'WIN').length / 100

// Adjust current signal confidence
if (winRate > 0.7 && avgWeight > 70) {
  signal.confidence += 10  // Boost
}
```

---

## 📊 CONFRONTO: Sistema Attuale vs Ideale

### Sistema Attuale

```
User clicks "Generate Signal"
    ↓
HYBRID: ML + AI (real-time data)
    ↓
TensorFlow inference + OANDA live
    ↓
Signal without weights
    ↓
Save to mt5_signals
```

**Pro**:
- ✅ Real-time data
- ✅ Adaptive (regime detection)
- ✅ Fallback strategies

**Contro**:
- ❌ No signal weight validation
- ❌ No historical pattern matching
- ❌ Disconnesso da backtest data (388k signals)

### Sistema Ideale (TODO)

```
User clicks "Generate Signal"
    ↓
HYBRID: ML + AI
    ↓
Calculate signal weight (5 components)
    ↓
Query similar historical patterns (388k)
    ↓
Validate against backtest results
    ↓
Adjust confidence based on history
    ↓
Signal WITH weight + recommendation
    ↓
Filter: Only if weight >= 70
    ↓
Save to mt5_signals
```

**Benefit**:
- ✅ Historical validation
- ✅ Backtest-proven filtering
- ✅ Position sizing automatico
- ✅ Consistenza con backtest (100% win rate)

---

## 🎯 RACCOMANDAZIONE

### Short-term (1 settimana)

**Usa sistema attuale con filter manuale**:

```typescript
// Dopo generazione signal
if (signal.confidence < 75 || signal.type === 'HOLD') {
  // Skip segnale
  return { skip: true, reason: 'Low confidence' }
}

// Calcola position size manuale
const baseSize = 0.01  // 1%
const positionSize = signal.confidence > 85 ? baseSize * 1.5 : baseSize
```

### Mid-term (2-3 settimane)

**Integra weight calculation real-time**:

1. Sposta `calculate_signal_weights.py` logic in TypeScript
2. Aggiungi `signal_weight` a `mt5_signals` table
3. Calcola weight dopo ML/AI prediction
4. Filter automatico: `weight >= 70`

### Long-term (1-2 mesi)

**Full integration con historical data**:

1. Query `ml_historical_candles` per pattern matching
2. Calcola success rate su simili signals storici
3. Adjust confidence based on historical performance
4. Ensemble weighting dinamico

---

## 📈 RIASSUNTO CONFIGURAZIONE ATTUALE

```
┌─────────────────────────────────────────────────────────┐
│              STATO ATTUALE (2025-10-09)                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  TRAINING DATA                      REAL-TIME           │
│  ┌──────────────────┐              ┌──────────┐        │
│  │ ml_historical_   │              │  User    │        │
│  │   candles        │              │  Click   │        │
│  │  (388k signals)  │              └────┬─────┘        │
│  └────────┬─────────┘                   │              │
│           │                             │              │
│     signal_weight ✅                    │              │
│     recommendation ✅                   ↓              │
│     Used for:                    ┌──────────────┐     │
│     - Backtest ✅                │  AI Service  │     │
│     - Training ✅                │   (Hybrid)   │     │
│     - Analytics ✅               └──────┬───────┘     │
│                                         │              │
│     NOT used for:                       │              │
│     - Real-time ❌               ┌──────▼───────┐     │
│                                  │ TensorFlow + │     │
│                                  │ Edge Fn      │     │
│                                  └──────┬───────┘     │
│                                         │              │
│                                  ┌──────▼───────┐     │
│                                  │   Signal     │     │
│                                  │ (NO weight)  │     │
│                                  └──────┬───────┘     │
│                                         │              │
│                                  ┌──────▼───────┐     │
│                                  │ mt5_signals  │     │
│                                  │   (Live)     │     │
│                                  └──────────────┘     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

**Conclusione**: I weights esistono ma **NON sono integrati** nella generazione real-time. Servono solo per analisi storica e backtest.

Per usarli in produzione, serve implementare calcolo weight real-time.
