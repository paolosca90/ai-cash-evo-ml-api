# 🎯 Guida Strategie Segnali - AI vs ML vs Hybrid

## 📊 Strategie Disponibili

Il sistema ora supporta **5 strategie** di generazione segnali:

### **1. Hybrid (RECOMMENDED)** 🔀
Combina AI tradizionale + Machine Learning

```typescript
const signal = await generateAISignal({
  symbol: 'EURUSD',
  strategy: 'hybrid'
});
```

**Come funziona:**
1. Genera segnale AI (Edge Function con regole)
2. Genera segnale ML (TensorFlow.js neural network)
3. **Se CONCORDANO** → Confidence +20%
4. **Se DISCORDANO** → Confidence -40%
5. **Se uncertainty ML > 50%** → Forza HOLD
6. **Se constraints violated** → Forza HOLD

**Esempio Output:**
```javascript
{
  type: "BUY",
  symbol: "EURUSD",
  confidence: 0.85,  // Boosted (AI 0.70 + ML 0.75 = 0.85)
  reasoning: "RSI oversold, MACD bullish | ✅ ML confirms BUY (75%)",
  mlMetadata: {
    mlAction: "BUY",
    mlConfidence: 0.75,
    uncertainty: { total: 0.18 },
    constraints: [],
    modelVersion: "ppo-v1"
  }
}
```

**Pro:**
- ✅ Doppia validazione
- ✅ Segnali più affidabili
- ✅ Safety layer ML
- ✅ Best of both worlds

**Quando usarlo:**
- Trading reale con capitale vero
- Quando vuoi massima affidabilità
- **DEFAULT per produzione**

---

### **2. ML** 🤖
Solo Machine Learning (TensorFlow.js)

```typescript
const signal = await generateAISignal({
  symbol: 'EURUSD',
  strategy: 'ml'
});
```

**Come funziona:**
1. Raccoglie dati mercato reali
2. Estrae 50 features
3. Inference con PPO + CPPO ensemble
4. Calcola uncertainty
5. Verifica constraints
6. Ritorna predizione pura ML

**Esempio Output:**
```javascript
{
  type: "SELL",
  symbol: "EURUSD",
  confidence: 0.82,
  reasoning: "ML predicts downward movement | High ML confidence (82%) | MACD bearish | London session",
  mlMetadata: {
    uncertainty: {
      epistemic: 0.10,
      aleatoric: 0.08,
      total: 0.18
    },
    constraints: [
      { type: "risk_limit", severity: "low" }
    ]
  }
}
```

**Pro:**
- ✅ Impara dai dati
- ✅ Nessuna regola fissa
- ✅ Migliora continuamente
- ✅ Uncertainty quantification

**Quando usarlo:**
- Dopo 1000+ samples training
- Quando ML ha win rate > 60%
- Testing nuovi modelli

---

### **3. Comprehensive** 📡
AI tradizionale (Edge Function Supabase)

```typescript
const signal = await generateAISignal({
  symbol: 'EURUSD',
  strategy: 'comprehensive'
});
```

**Come funziona:**
1. Chiama Edge Function Supabase
2. Analisi con regole predefinite:
   - RSI > 70 → overbought
   - MACD crossover → trend change
   - Moving averages → trend direction
3. Calcola confidence basata su regole

**Esempio Output:**
```javascript
{
  type: "BUY",
  symbol: "EURUSD",
  confidence: 0.68,
  reasoning: "RSI oversold (32), MACD bullish crossover, Price above SMA20"
}
```

**Pro:**
- ✅ Veloce (15-25s)
- ✅ Stabile
- ✅ Regole testate
- ✅ Funziona sempre

**Quando usarlo:**
- ML non disponibile
- Fallback automatico
- Testing rapido

---

### **4. Fast** ⚡
AI semplificato (più veloce)

```typescript
const signal = await generateAISignal({
  symbol: 'EURUSD',
  strategy: 'fast'
});
```

**Come funziona:**
1. Analisi semplificata
2. Meno indicatori
3. Timeout ridotto (15s vs 25s)
4. Calcolo più veloce

**Pro:**
- ✅ Velocità (10-15s)
- ✅ Basso latency
- ✅ Adatto per scalping

**Quando usarlo:**
- Bisogno di velocità
- Scalping rapido
- Testing A/B

---

### **5. Fallback** 🛟
Ultima risorsa (se tutto fallisce)

```typescript
const signal = await generateAISignal({
  symbol: 'EURUSD',
  strategy: 'fallback'
});
```

**Come funziona:**
1. **ERRORE** - Non genera più segnali random
2. Solleva eccezione
3. Chiede di riprovare

**Nota:** Questa strategia ora **blocca** invece di generare dati fake.

---

## 🎯 Quale Strategia Scegliere?

### **Raccomandazioni per Caso d'Uso:**

#### **📈 Trading Reale (Capitale Vero)**
```typescript
strategy: 'hybrid'  // ✅ BEST CHOICE
```
- Doppia validazione
- Safety constraints ML
- Confidence boosting quando concordano

#### **🧪 Testing ML (Dopo Training)**
```typescript
strategy: 'ml'
```
- Testa modelli reali
- Valuta performance
- Confronta con AI

#### **⚡ Scalping / Alta Frequenza**
```typescript
strategy: 'fast'
```
- Minima latency
- Segnali rapidi
- Meno analisi

#### **🔄 Fallback Automatico**
```typescript
strategy: 'comprehensive',
useFallback: true
```
- Prova hybrid → ml → comprehensive → fast
- Degrada automaticamente
- Sempre un segnale

---

## 💡 Come Usare nella Pratica

### **Esempio 1: Trading Dashboard**
```typescript
// In AISignals.tsx

const generateSignal = async () => {
  const result = await generateAISignal({
    symbol,
    strategy: 'hybrid',  // Hybrid per default
    timeout: 30000,
    maxRetries: 2,
    useFallback: true
  });

  if (result.success) {
    console.log(`Signal: ${result.signal.type} (${result.signal.confidence})`);

    // Check if AI and ML agree
    if (result.signal.mlMetadata) {
      const aiAction = result.signal.type;
      const mlAction = result.signal.mlMetadata.mlAction;

      if (aiAction === mlAction) {
        console.log('✅ AI and ML agree!');
      } else {
        console.log(`⚠️ Disagreement: AI=${aiAction}, ML=${mlAction}`);
      }
    }
  }
};
```

### **Esempio 2: Strategia Dinamica**
```typescript
// Scegli strategia basata su condizioni

let strategy: 'hybrid' | 'ml' | 'comprehensive' = 'hybrid';

// Se ML win rate alto → usa ML puro
const mlWinRate = await getMLWinRate();
if (mlWinRate > 0.65) {
  strategy = 'ml';
}

// Se mercato volatile → usa hybrid (più sicuro)
const volatility = await getMarketVolatility();
if (volatility > 0.03) {
  strategy = 'hybrid';
}

const signal = await generateAISignal({ symbol, strategy });
```

### **Esempio 3: A/B Testing**
```typescript
// Genera con entrambe le strategie e confronta

const [aiResult, mlResult] = await Promise.all([
  generateAISignal({ symbol, strategy: 'comprehensive' }),
  generateAISignal({ symbol, strategy: 'ml' })
]);

console.log('AI Signal:', aiResult.signal);
console.log('ML Signal:', mlResult.signal);

// Log per analisi
await logSignalComparison({
  symbol,
  aiAction: aiResult.signal.type,
  mlAction: mlResult.signal.type,
  aiConfidence: aiResult.signal.confidence,
  mlConfidence: mlResult.signal.confidence
});
```

---

## 📊 Logica Hybrid in Dettaglio

### **Caso 1: Concordanza Perfetta**
```
AI: BUY (70%) + ML: BUY (75%)
→ AVG = 72.5%
→ BOOST +20% = 87%
→ Reasoning: "... | ✅ ML confirms BUY (75%)"
```

### **Caso 2: Discordanza**
```
AI: BUY (70%) + ML: SELL (80%)
→ AI confidence -40% = 42%
→ Reasoning: "... | ⚠️ ML disagrees: SELL (80%)"
```

### **Caso 3: Alta Incertezza ML**
```
AI: BUY (70%) + ML: SELL (60%, uncertainty 55%)
→ Uncertainty > 50% → HOLD
→ Confidence = 50%
→ Reasoning: "... | High ML uncertainty → HOLD"
```

### **Caso 4: Safety Constraint**
```
AI: BUY (70%) + ML: BUY (75%, HIGH risk violation)
→ Override to HOLD
→ Confidence = 40%
→ Reasoning: "... | 🛑 ML safety: Risk limit exceeded"
```

---

## 🔧 Configurazione

### **Default per AISignals Component**
Modifica `src/components/AISignals.tsx`:

```typescript
const generateAISignal = async (symbol: string) => {
  const result = await generateSignal({
    symbol,
    strategy: 'hybrid',  // 🔀 Cambia qui la strategia default
    timeout: 30000,
    maxRetries: 2,
    useFallback: true
  });

  return result.signal;
};
```

### **Environment Variable**
```bash
# .env
VITE_DEFAULT_SIGNAL_STRATEGY=hybrid  # hybrid, ml, comprehensive, fast
```

```typescript
// In code
const defaultStrategy = import.meta.env.VITE_DEFAULT_SIGNAL_STRATEGY || 'hybrid';
```

---

## 📈 Metriche di Confronto

Traccia performance di ogni strategia:

```sql
-- Supabase query
SELECT
  signal_strategy,
  COUNT(*) as total_signals,
  AVG(confidence) as avg_confidence,
  COUNT(*) FILTER (WHERE was_executed) as executed,
  AVG(pnl) as avg_pnl,
  COUNT(*) FILTER (WHERE pnl > 0)::FLOAT /
    COUNT(*) FILTER (WHERE pnl IS NOT NULL) as win_rate
FROM trade_signals
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY signal_strategy
ORDER BY win_rate DESC;
```

**Output:**
```
strategy      | total | avg_conf | executed | avg_pnl | win_rate
------------- | ----- | -------- | -------- | ------- | --------
hybrid        | 152   | 0.78     | 89       | +12.5   | 0.64
ml            | 98    | 0.81     | 67       | +15.2   | 0.62
comprehensive | 203   | 0.68     | 124      | +8.3    | 0.56
fast          | 87    | 0.65     | 51       | +6.1    | 0.53
```

---

## ✅ Best Practices

### **1. Produzione**
```typescript
✅ Use: strategy: 'hybrid'
✅ Enable: useFallback: true
✅ Set: timeout: 30000 (30s)
✅ Monitor: mlMetadata per disagreements
```

### **2. Development/Testing**
```typescript
✅ Test: strategy: 'ml' (dopo training)
✅ Compare: Run ml + comprehensive in parallel
✅ Log: Tutti i segnali per analisi
```

### **3. Safety First**
```typescript
// Always check ML constraints
if (signal.mlMetadata?.constraints?.length > 0) {
  const highRisk = signal.mlMetadata.constraints
    .filter(c => c.severity === 'high');

  if (highRisk.length > 0) {
    console.warn('⚠️ High risk constraint detected');
    // Don't execute or reduce position
  }
}
```

---

## 🎉 Conclusione

**Sistema completo con 5 strategie:**

1. **Hybrid** 🔀 → Produzione (AI + ML)
2. **ML** 🤖 → Pure neural network
3. **Comprehensive** 📡 → Traditional AI
4. **Fast** ⚡ → Quick analysis
5. **Fallback** 🛟 → Error handling

**Usa `hybrid` per il miglior risultato! 🚀**
