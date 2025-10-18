# 🧠 Sistema Machine Learning - Documentazione Tecnica Completa

## 📖 Indice

1. [Panoramica Generale](#panoramica-generale)
2. [Architettura del Sistema](#architettura-del-sistema)
3. [Algoritmi e Modelli](#algoritmi-e-modelli)
4. [Feature Engineering](#feature-engineering)
5. [Training Pipeline](#training-pipeline)
6. [Inference Engine](#inference-engine)
7. [Gestione Memoria e Performance](#gestione-memoria-e-performance)
8. [Integrazione con Sistema Trading](#integrazione-con-sistema-trading)
9. [Flusso Dati End-to-End](#flusso-dati-end-to-end)
10. [Continuous Learning](#continuous-learning)

---

## 1. Panoramica Generale

### 1.1 Cos'è il Sistema ML

Il sistema di Machine Learning è un **motore di decisione automatico basato su Reinforcement Learning** che:

- **Impara** da migliaia di trade storici
- **Predice** azioni ottimali (BUY, SELL, HOLD)
- **Quantifica** l'incertezza delle predizioni
- **Rispetta** vincoli di sicurezza (risk management)
- **Migliora** continuamente con nuovi dati

### 1.2 Tecnologie Utilizzate

```
TensorFlow.js 4.22.0       → Neural network training/inference
WebGL Backend              → GPU acceleration (fallback CPU)
IndexedDB                  → Model persistence (browser storage)
Supabase                   → Training data storage
React Hooks                → UI integration
```

### 1.3 Architettura High-Level

```
Trading Data → Feature Engineering → [PPO Model, CPPO Model]
                                   → Ensemble Voting
                                   → Uncertainty Estimation
                                   → Constraint Checking
                                   → Trading Action
```

---

## 2. Architettura del Sistema

### 2.1 Componenti Principali

```
┌─────────────────────────────────────────────────────────┐
│                   TRADING SYSTEM                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Feature Engineering Layer                 │   │
│  │  • Technical Indicators (RSI, MACD, ATR...)      │   │
│  │  • Session Features (London, NY, Asian)          │   │
│  │  • Smart Money Concepts (FVG, OB, Break)         │   │
│  │  • Sentiment Analysis                            │   │
│  │  • Market Regime Detection                       │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │            ML Inference Engine                    │   │
│  │                                                   │   │
│  │  ┌─────────────┐        ┌─────────────┐         │   │
│  │  │  PPO Model  │        │ CPPO Model  │         │   │
│  │  │  Policy Net │        │  + Safety   │         │   │
│  │  │  Value Net  │        │  Constraint │         │   │
│  │  └─────────────┘        └─────────────┘         │   │
│  │         ↓                       ↓                │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │      Ensemble Weighted Voting           │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  │         ↓                                        │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │    Uncertainty Quantification            │    │   │
│  │  │    • Epistemic (model uncertainty)       │    │   │
│  │  │    • Aleatoric (data uncertainty)        │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  │         ↓                                        │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │      Constraint Checking                 │    │   │
│  │  │    • Risk limits                         │    │   │
│  │  │    • Position size                       │    │   │
│  │  │    • Market hours                        │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Trading Execution (MT5)                  │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │      Continuous Learning Pipeline                │   │
│  │    • Collect results                             │   │
│  │    • Generate training samples                   │   │
│  │    • Retrain models                              │   │
│  │    • Update weights                              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Flusso Dati

```
1. Market Data Input
   ├── Price (OHLCV)
   ├── Technical Indicators
   ├── Session Info
   └── Market Context

2. Feature Engineering (50 features)
   ├── Normalize values [-1, 1]
   ├── Handle missing data
   └── Create feature vector

3. ML Inference
   ├── PPO prediction
   ├── CPPO prediction
   └── Ensemble voting

4. Action Decision
   ├── BUY / SELL / HOLD
   ├── Confidence score
   ├── Position size
   └── Stop loss / Take profit

5. Execution
   ├── Send to MT5
   ├── Log result
   └── Store for training

6. Learning Loop
   ├── Collect samples
   ├── Calculate rewards
   ├── Retrain model
   └── Update weights
```

---

## 3. Algoritmi e Modelli

### 3.1 PPO (Proximal Policy Optimization)

**PPO è l'algoritmo principale di Reinforcement Learning.**

#### Perché PPO?
- **Stable**: Updates non troppo grandi (clipping)
- **Sample efficient**: Riusa dati con multiple epochs
- **Easy to tune**: Pochi hyperparameter
- **Good performance**: Ottimo per trading

#### Architettura PPO

**Policy Network (Actor)**:
```
Input: State (50 features)
  ↓
Dense(256) + BatchNorm + ReLU + Dropout(0.1)
  ↓
Dense(128) + BatchNorm + ReLU + Dropout(0.1)
  ↓
Dense(64) + BatchNorm + ReLU + Dropout(0.1)
  ↓
Dense(3) + Softmax
  ↓
Output: [P(BUY), P(SELL), P(HOLD)]
```

**Value Network (Critic)**:
```
Input: State (50 features)
  ↓
Dense(256) + BatchNorm + ReLU + Dropout(0.1)
  ↓
Dense(128) + BatchNorm + ReLU + Dropout(0.1)
  ↓
Dense(64) + BatchNorm + ReLU + Dropout(0.1)
  ↓
Dense(1) + Linear
  ↓
Output: V(s) = Expected return
```

#### PPO Loss Function

```typescript
// Policy Loss (clipped objective)
const ratio = exp(log π(a|s) - log π_old(a|s))
const surrogate1 = ratio * advantage
const surrogate2 = clip(ratio, 1-ε, 1+ε) * advantage
policyLoss = -min(surrogate1, surrogate2)

// Value Loss (MSE)
valueLoss = 0.5 * (V(s) - returns)²

// Entropy Bonus (exploration)
entropy = -Σ π(a|s) * log π(a|s)
entropyLoss = -c_entropy * entropy

// Total Loss
totalLoss = policyLoss + c_value * valueLoss + entropyLoss
```

**Hyperparameters**:
- `learningRate`: 0.0003
- `clipRatio` (ε): 0.2
- `gamma` (discount): 0.99
- `lambda` (GAE): 0.95
- `epochs`: 10-20
- `batchSize`: 64

### 3.2 CPPO (Constrained PPO)

**CPPO estende PPO con vincoli di sicurezza.**

#### Constraint Network

```
Input: State (50 features)
  ↓
Dense(128) + BatchNorm + ReLU
  ↓
Dense(64) + BatchNorm + ReLU
  ↓
Dense(1) + Sigmoid
  ↓
Output: P(constraint_violation)
```

#### CPPO Constraint Check

```typescript
// Constraint penalty
const constraintProb = constraintNetwork(state)

if (constraintProb > threshold) {
  // Risky action → reduce confidence or block
  action.confidence *= (1 - constraintProb)

  // Add penalty to reward
  reward -= constraintPenalty * constraintProb
}
```

**Safety Threshold**: 0.3 (30% violation probability)

### 3.3 Ensemble Voting

**Combina PPO e CPPO per decisioni robuste.**

```typescript
// Step 1: Get predictions from both models
const ppoPrediction = await ppoModel.getAction(state)
const cppoPrediction = await cppoModel.getAction(state)

// Step 2: Weighted voting
const votes = new Map()
votes[ppo.action] += ppo.probability
votes[cppo.action] += cppo.probability

// Step 3: Select winner
const finalAction = argmax(votes)
const finalConfidence = average(confidences[finalAction])

// Step 4: Calculate uncertainty
const disagreement = entropy(votes) // Model disagreement
const uncertainty = {
  epistemic: disagreement,
  aleatoric: average(modelUncertainties),
  total: epistemic + aleatoric
}
```

---

## 4. Feature Engineering

### 4.1 Feature Categories (50 features totali)

#### **Technical Features (20)**
```typescript
[
  rsi_value,              // 0-100
  rsi_slope,              // Trend RSI
  macd_value,             // MACD line
  macd_signal,            // Signal line
  macd_histogram,         // Histogram
  atr_value,              // Volatility
  atr_ratio,              // ATR / Price
  sma_9,                  // Short MA
  sma_20,                 // Medium MA
  sma_50,                 // Long MA
  ema_9,                  // Short EMA
  ema_20,                 // Medium EMA
  price_vs_sma9,          // Distance
  price_vs_sma20,
  volume_ratio,           // Current / Avg
  volume_trend,           // Increasing/Decreasing
  momentum,               // Price change rate
  stochastic_k,           // %K oscillator
  stochastic_d,           // %D oscillator
  bollinger_position      // Price vs bands
]
```

#### **Session Features (8)**
```typescript
[
  is_london_session,      // 0/1
  is_ny_session,          // 0/1
  is_asian_session,       // 0/1
  is_overlap,             // London+NY
  session_volume,         // Normalized
  time_of_day,            // 0-1 (0=midnight)
  day_of_week,            // 1-5 (Mon-Fri)
  is_market_open          // 0/1
]
```

#### **Smart Money Features (10)**
```typescript
[
  fvg_present,            // Fair Value Gap
  fvg_direction,          // Bullish/Bearish
  order_block_present,    // Order Block
  ob_direction,           // Bullish/Bearish
  bos_present,            // Break of Structure
  bos_direction,
  liquidity_sweep,        // Liquidity grab
  choch_present,          // Change of Character
  premium_discount,       // Price in premium/discount
  smart_money_score       // Overall SMC score
]
```

#### **Sentiment Features (6)**
```typescript
[
  news_sentiment,         // -1 to 1
  social_sentiment,       // Twitter/Reddit
  fear_greed_index,       // 0-100
  market_mood,            // Bullish/Bearish
  volatility_sentiment,   // Low/High
  institutional_flow      // Buy/Sell pressure
]
```

#### **Regime Features (6)**
```typescript
[
  trend_direction,        // -1, 0, 1 (Down, Ranging, Up)
  trend_strength,         // 0-1
  volatility_regime,      // Low/Med/High
  market_phase,           // Accumulation/Distribution
  cycle_position,         // Where in market cycle
  regime_confidence       // How confident in regime
]
```

### 4.2 Normalizzazione

**Tutti i valori sono normalizzati tra -1 e 1:**

```typescript
// Min-Max normalization
normalized = (value - min) / (max - min) * 2 - 1

// Z-score normalization
normalized = (value - mean) / std

// Examples:
rsi: (rsi - 50) / 50           // 0-100 → -1 to 1
price_change: tanh(change/atr) // Unbounded → -1 to 1
session: boolean ? 1 : -1       // Binary → -1 or 1
```

### 4.3 Feature Vector Generation

```typescript
// In UnifiedFeatureEngineer
const featureVector = {
  technicalFeatures: [20 values],
  sessionFeatures: [8 values],
  smartMoneyFeatures: [10 values],
  sentimentFeatures: [6 values],
  regimeFeatures: [6 values],
  marketContextFeatures: [0 values] // Reserved
}

// Flatten to single array
const features = [
  ...featureVector.technicalFeatures,
  ...featureVector.sessionFeatures,
  ...featureVector.smartMoneyFeatures,
  ...featureVector.sentimentFeatures,
  ...featureVector.regimeFeatures
] // Total: 50 values
```

---

## 5. Training Pipeline

### 5.1 Data Collection

**Training samples vengono raccolti da trade reali:**

```typescript
interface TrainingSample {
  state: number[]       // Feature vector (50)
  action: number        // 0=BUY, 1=SELL, 2=HOLD
  reward: number        // Trade P&L
  nextState: number[]   // Next feature vector
  done: boolean         // Episode terminated
  logProb: number       // log π(a|s)
  value: number         // V(s) estimate
}
```

**Dove vengono raccolti**:
- Database Supabase: `trade_log` table
- Ogni trade eseguito diventa un sample
- Features estratte al momento del trade
- Reward calcolato da P&L finale

### 5.2 Reward Shaping

**Il reward è la metrica che guida l'apprendimento:**

```typescript
// Base reward: P&L normalizzato
const baseReward = pnl / accountBalance

// Bonus per trade vincenti
if (pnl > 0) {
  reward += 0.2 * (pnl / expectedProfit)
}

// Penalty per trade perdenti
if (pnl < 0) {
  reward -= 0.3 * Math.abs(pnl / stopLoss)
}

// Bonus per rispetto risk management
if (positionSize <= maxSize) {
  reward += 0.1
}

// Penalty per violazioni constraint
if (constraintViolation > threshold) {
  reward -= 0.5 * constraintViolation
}

// Risk-adjusted reward (Sharpe-like)
reward = reward / volatility

// Final reward range: -1 to 1
reward = Math.tanh(reward)
```

### 5.3 GAE (Generalized Advantage Estimation)

**GAE calcola l'advantage per ogni sample:**

```typescript
// Advantage = "quanto meglio è questa azione vs la media?"

// Step 1: TD error
δ_t = r_t + γ * V(s_{t+1}) - V(s_t)

// Step 2: GAE (exponentially weighted average)
A_t = δ_t + (γλ) * δ_{t+1} + (γλ)² * δ_{t+2} + ...

// Step 3: Returns
R_t = A_t + V(s_t)

// Normalize advantages
A_t = (A_t - mean(A)) / (std(A) + ε)
```

**Hyperparameters**:
- `gamma` (γ): 0.99 → importance of future rewards
- `lambda` (λ): 0.95 → GAE smoothing

### 5.4 Training Loop

```typescript
// 1. Collect samples (batch)
const samples = await collectTradingSamples(1000)

// 2. Calculate advantages
const { advantages, returns } = calculateGAE(samples)

// 3. Multiple epochs (reuse data)
for (let epoch = 0; epoch < 10; epoch++) {

  // 4. Create mini-batches
  const batches = createBatches(samples, advantages, returns, 64)

  // 5. Update for each batch
  for (const batch of batches) {

    // Forward pass
    const actionProbs = policyNetwork(batch.states)
    const values = valueNetwork(batch.states)

    // Calculate losses
    const policyLoss = calculatePPOLoss(
      actionProbs,
      batch.actions,
      batch.oldLogProbs,
      batch.advantages
    )

    const valueLoss = MSE(values, batch.returns)
    const entropyLoss = -entropy(actionProbs)

    const totalLoss = policyLoss + 0.5*valueLoss + 0.01*entropyLoss

    // Backward pass
    const grads = tape.gradient(totalLoss, weights)

    // Clip gradients
    const clippedGrads = clipByNorm(grads, maxNorm=0.5)

    // Update weights
    optimizer.applyGradients(clippedGrads)
  }
}

// 6. Save updated model
await model.saveModel('ppo-v2')
```

### 5.5 Training Metrics

**Metriche monitorate durante training:**

```typescript
{
  epoch: number
  policyLoss: number      // Should decrease
  valueLoss: number       // Should decrease
  entropyLoss: number     // Should be stable
  totalLoss: number       // Should decrease
  avgReward: number       // Should increase
  avgAdvantage: number    // Should be ~0
  clipFraction: number    // % of clipped ratios (10-30%)
  explainedVariance: number // How well value predicts returns
  kl_divergence: number   // Policy change (should be small)
}
```

---

## 6. Inference Engine

### 6.1 Prediction Flow

```typescript
// Step 1: Prepare state
const tradingState = {
  marketContext: {...},
  portfolio: {...},
  timestamp: Date.now()
}

// Step 2: Extract features
const features = featureEngineer.generateFeatureVector(
  tradingState.marketContext,
  indicators,
  session,
  smartMoney,
  sentiment,
  regime
) // → 50 features

// Step 3: Get predictions from ensemble
const predictions = []

for (const [name, model] of models) {
  const result = await model.getAction(features, deterministic=false)
  predictions.push({
    model: name,
    action: result.action,
    probability: result.probability,
    value: result.value
  })
}

// Step 4: Weighted voting
const actionVotes = new Map()
predictions.forEach(pred => {
  const currentVote = actionVotes.get(pred.action) || 0
  actionVotes.set(pred.action, currentVote + pred.probability)
})

// Step 5: Select best action
const bestAction = argmax(actionVotes)
const confidence = average(predictions
  .filter(p => p.action === bestAction)
  .map(p => p.probability)
)

// Step 6: Calculate uncertainty
const uncertainty = await calculateEnsembleUncertainty(features)

// Step 7: Check constraints
const constraints = await checkConstraints(tradingState, bestAction)

// Step 8: Final decision
return {
  action: {
    type: ['BUY', 'SELL', 'HOLD'][bestAction],
    confidence: confidence,
    intensity: calculatePositionSize(confidence),
    riskLevel: 1 - confidence,
    stopLoss: calculateStopLoss(tradingState),
    takeProfit: calculateTakeProfit(tradingState),
    reasoning: generateReasoning(predictions)
  },
  uncertainty: {
    epistemic: modelDisagreement,
    aleatoric: dataUncertainty,
    total: epistemic + aleatoric,
    confidence: 1 - epistemic
  },
  constraints: [
    { type: 'risk_limit', severity: 'low', ... },
    { type: 'position_size', severity: 'medium', ... }
  ]
}
```

### 6.2 Uncertainty Quantification

**Due tipi di incertezza:**

#### Epistemic Uncertainty (Model Uncertainty)
```typescript
// "Quanto è sicuro il modello della sua predizione?"

// Method 1: Dropout at inference (Monte Carlo)
const predictions = []
for (let i = 0; i < 10; i++) {
  // Enable dropout during inference
  const pred = await model.getAction(state, training=true)
  predictions.push(pred)
}

// Variance = epistemic uncertainty
const epistemic = variance(predictions.map(p => p.probability))
```

#### Aleatoric Uncertainty (Data Uncertainty)
```typescript
// "Quanto è incerto l'ambiente di trading?"

// Method 2: Entropy of action distribution
const actionProbs = await policyNetwork(state)
const entropy = -sum(actionProbs * log(actionProbs))

// Normalize
const aleatoric = entropy / log(numActions)
```

#### Total Uncertainty
```typescript
const totalUncertainty = epistemic + aleatoric
const confidence = 1 - epistemic // High confidence if model is sure
```

### 6.3 Constraint Checking

**Vincoli di sicurezza verificati:**

```typescript
const constraints = []

// 1. CPPO Constraint Network
const constraintProb = await cppoModel.checkConstraint(features)
if (constraintProb > 0.5) {
  constraints.push({
    type: 'safety_constraint',
    severity: constraintProb > 0.8 ? 'high' : 'medium',
    message: `Constraint violation: ${constraintProb.toFixed(2)}`,
    recommendedAction: 'Reduce position or avoid'
  })
}

// 2. Risk Level
if (action.riskLevel > 0.7) {
  constraints.push({
    type: 'risk_limit',
    severity: 'high',
    message: 'Risk exceeds threshold',
    recommendedAction: 'Reduce position size'
  })
}

// 3. Position Size
if (action.intensity > maxPositionSize) {
  constraints.push({
    type: 'position_size',
    severity: 'medium',
    message: 'Position too large',
    recommendedAction: 'Cap at max size'
  })
}

// 4. Market Hours
const hour = new Date().getUTCHours()
if (hour < 8 || hour > 20) {
  constraints.push({
    type: 'market_hours',
    severity: 'low',
    message: 'Outside optimal hours',
    recommendedAction: 'Wait for market open'
  })
}

// 5. Volatility Check
if (atr / price > 0.03) { // 3% ATR
  constraints.push({
    type: 'high_volatility',
    severity: 'medium',
    message: 'Excessive volatility',
    recommendedAction: 'Reduce leverage'
  })
}

return constraints
```

---

## 7. Gestione Memoria e Performance

### 7.1 TensorFlow.js Memory Management

**Ogni operazione TensorFlow.js crea tensori in memoria:**

```typescript
// ❌ BAD: Memory leak
const result = model.predict(input)
// Tensors not disposed → memory leak

// ✅ GOOD: Use tf.tidy()
const result = tf.tidy(() => {
  return model.predict(input)
  // All intermediate tensors auto-disposed
})

// ✅ GOOD: Explicit disposal
const result = model.predict(input)
// ... use result
result.dispose()

// ✅ GOOD: Dispose models
model.dispose()
```

### 7.2 Performance Optimization

**Backend Selection:**
```typescript
// Check available backends
await tf.ready()
const backend = tf.getBackend()

// Prefer WebGL (GPU) over CPU
if (backend !== 'webgl') {
  try {
    await tf.setBackend('webgl')
  } catch {
    console.warn('WebGL not available, using CPU')
  }
}
```

**Batch Processing:**
```typescript
// ❌ BAD: Process one by one
for (const state of states) {
  const pred = await model.predict(tf.tensor2d([state]))
}

// ✅ GOOD: Batch processing
const batch = tf.tensor2d(states) // Shape: [N, 50]
const predictions = await model.predict(batch)
```

**Model Quantization:**
```typescript
// Reduce model size (future improvement)
const quantizedModel = await tf.loadGraphModel(
  'model.json',
  { quantizationBytes: 2 } // 16-bit quantization
)
```

### 7.3 Monitoring

```typescript
// Memory monitoring
setInterval(() => {
  const mem = tf.memory()
  console.log({
    numTensors: mem.numTensors,
    numBytes: mem.numBytes,
    numDataBuffers: mem.numDataBuffers
  })

  // Alert if memory leak
  if (mem.numTensors > 1000) {
    console.warn('Possible memory leak!')
  }
}, 10000) // Every 10s
```

---

## 8. Integrazione con Sistema Trading

### 8.1 AI Signal Service Integration

**Il ML sostituisce/integra il sistema AI signals esistente:**

```typescript
// In aiSignalService.ts

import { TFInferenceEngine } from '@/lib/rl-trading/TFInferenceEngine'
import { useRLModels } from '@/hooks/useRLModels'

class AISignalService {
  private mlEngine: TFInferenceEngine | null = null

  async generateSignal(symbol: string): Promise<AISignal> {
    // 1. Get market data
    const marketData = await fetchMarketData(symbol)

    // 2. Extract features
    const tradingState = this.buildTradingState(marketData)

    // 3. ML Prediction
    const mlPrediction = await this.mlEngine.predict(tradingState)

    // 4. Convert to AI Signal format
    const signal = this.convertToAISignal(mlPrediction, symbol)

    // 5. Apply risk management
    signal.confidence = this.adjustConfidence(
      signal.confidence,
      mlPrediction.uncertainty,
      mlPrediction.constraints
    )

    return signal
  }

  private adjustConfidence(
    baseConfidence: number,
    uncertainty: UncertaintyEstimate,
    constraints: ConstraintViolation[]
  ): number {
    let adjusted = baseConfidence

    // Reduce confidence based on uncertainty
    adjusted *= (1 - uncertainty.epistemic)

    // Reduce for constraint violations
    const highSeverity = constraints.filter(c => c.severity === 'high')
    adjusted *= (1 - highSeverity.length * 0.2)

    // Clamp to valid range
    return Math.max(0.4, Math.min(0.95, adjusted))
  }
}
```

### 8.2 React Component Integration

```typescript
// In TradingInterface.tsx

import { useRLModels } from '@/hooks/useRLModels'

function TradingInterface() {
  const { isReady, inferenceEngine, memoryInfo, error } = useRLModels()
  const [prediction, setPrediction] = useState(null)

  const getPrediction = async () => {
    if (!isReady || !inferenceEngine) return

    // Build trading state from current market data
    const tradingState = buildTradingState()

    // Get ML prediction
    const pred = await inferenceEngine.predict(tradingState)
    setPrediction(pred)

    // Execute trade if confidence high enough
    if (pred.action.confidence > 0.7 && pred.constraints.length === 0) {
      await executeTrade(pred.action)
    }
  }

  return (
    <div>
      {isReady && (
        <Button onClick={getPrediction}>Get ML Signal</Button>
      )}

      {prediction && (
        <div>
          <h3>{prediction.action.type}</h3>
          <p>Confidence: {prediction.action.confidence.toFixed(2)}</p>
          <p>Uncertainty: {prediction.uncertainty.total.toFixed(2)}</p>
          {prediction.constraints.map(c => (
            <Alert severity={c.severity}>{c.message}</Alert>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## 9. Flusso Dati End-to-End

### 9.1 Complete Trading Cycle

```
1. MARKET DATA COLLECTION
   ├── TradingView WebSocket → Real-time prices
   ├── MT5 Integration → Tick data
   └── Supabase → Historical data

2. FEATURE EXTRACTION
   ├── Technical indicators (RSI, MACD, ATR...)
   ├── Session detection (London, NY, Asian)
   ├── Smart Money Concepts (FVG, OB, BOS...)
   ├── Sentiment analysis (News, Social)
   └── Market regime detection

3. FEATURE ENGINEERING
   ├── Normalize all values [-1, 1]
   ├── Handle missing data (forward fill)
   ├── Create feature vector (50 dims)
   └── Validate feature quality

4. ML INFERENCE
   ├── Load models from IndexedDB
   ├── Forward pass through PPO
   ├── Forward pass through CPPO
   ├── Ensemble weighted voting
   ├── Uncertainty quantification
   └── Constraint checking

5. DECISION MAKING
   ├── Select action (BUY/SELL/HOLD)
   ├── Calculate position size
   ├── Set stop loss / take profit
   ├── Apply risk management
   └── Generate reasoning

6. TRADE EXECUTION
   ├── Send signal to MT5
   ├── Log trade to Supabase
   ├── Monitor position
   └── Wait for close

7. RESULT COLLECTION
   ├── Calculate P&L
   ├── Compute reward
   ├── Store training sample
   └── Update statistics

8. CONTINUOUS LEARNING
   ├── Collect batch of samples (1000+)
   ├── Calculate advantages (GAE)
   ├── Retrain model (10 epochs)
   ├── Validate on test set
   └── Deploy updated model

9. LOOP BACK TO STEP 1
```

### 9.2 Data Flow Diagram

```
Market Data → Feature Engineering → ML Models → Trading Decision
     ↓              ↓                    ↓            ↓
  Supabase      Normalized           IndexedDB    MT5 Execution
               Feature Vector                          ↓
                    ↓                                Result
               [50 floats]                             ↓
                    ↓                            Training Sample
              Policy Network                           ↓
                    ↓                            Continuous Learning
              Action Probs                             ↓
                    ↓                           Updated Model
              Ensemble Vote                            ↓
                    ↓                              IndexedDB
              Final Action ←────────────────────────────┘
```

---

## 10. Continuous Learning

### 10.1 Learning Pipeline

**Il sistema impara continuamente dai trade eseguiti:**

```typescript
// Every day / week
async function continuousLearning() {

  // 1. Collect recent trades
  const trades = await supabase
    .from('trade_log')
    .select('*')
    .gte('created_at', sevenDaysAgo)

  // 2. Convert to training samples
  const samples = trades.map(trade => ({
    state: JSON.parse(trade.features),
    action: trade.action_type, // BUY=0, SELL=1, HOLD=2
    reward: calculateReward(trade.pnl, trade.risk),
    nextState: JSON.parse(trade.next_features),
    done: trade.is_closed,
    logProb: trade.log_probability,
    value: trade.value_estimate
  }))

  // 3. Filter quality samples
  const qualitySamples = samples.filter(s =>
    s.reward !== null &&
    !isNaN(s.reward) &&
    s.state.every(v => !isNaN(v))
  )

  // 4. Train model
  const trainer = new TFModelTrainer(model, {
    epochs: 10,
    batchSize: 64,
    learningRate: 0.0001 // Lower LR for fine-tuning
  })

  const metrics = await trainer.train(qualitySamples)

  // 5. Validate on test set
  const testMetrics = await validateModel(model, testSet)

  // 6. Save if improved
  if (testMetrics.avgReward > currentBestReward) {
    await model.saveModel('ppo-v' + Date.now())
    console.log('✅ New best model saved!')
  }

  // 7. Log metrics to Supabase
  await supabase.from('ml_training_metrics').insert({
    timestamp: new Date(),
    train_reward: metrics[metrics.length-1].avgReward,
    test_reward: testMetrics.avgReward,
    samples_count: qualitySamples.length
  })
}

// Schedule
setInterval(continuousLearning, 24 * 60 * 60 * 1000) // Daily
```

### 10.2 Model Versioning

```typescript
// Keep multiple model versions
const modelVersions = [
  'ppo-v1-initial',
  'ppo-v2-week1',
  'ppo-v3-week2',
  'ppo-v4-best'
]

// A/B Testing
async function compareModels(v1: string, v2: string) {
  const model1 = await loadModel(v1)
  const model2 = await loadModel(v2)

  // Test on same data
  const testReward1 = await evaluate(model1, testData)
  const testReward2 = await evaluate(model2, testData)

  console.log(`${v1}: ${testReward1}`)
  console.log(`${v2}: ${testReward2}`)

  return testReward2 > testReward1 ? v2 : v1
}
```

### 10.3 Online Learning (Future)

```typescript
// Update model after each trade (careful!)
async function onlineUpdate(trade: Trade) {

  // Create single sample
  const sample = tradeToSample(trade)

  // Mini-batch update (batch_size=1)
  const loss = await model.trainOnBatch([sample])

  // Exponential moving average of weights (stability)
  model.weights = 0.99 * model.weights + 0.01 * newWeights

  // Save periodically
  if (tradeCount % 100 === 0) {
    await model.saveModel('ppo-online')
  }
}
```

---

## 📊 Performance Benchmarks

### Expected Performance:
- **Inference Latency**: < 100ms per prediction
- **Memory Usage**: < 100MB total
- **Model Size**: ~5MB (IndexedDB)
- **Training Time**: ~30s for 1000 samples (10 epochs)
- **Win Rate**: > 55% (after real training)
- **Sharpe Ratio**: > 1.5
- **Max Drawdown**: < 15%

### Scalability:
- **Concurrent Predictions**: 10+ per second
- **Model Updates**: Daily/Weekly
- **Data Storage**: 100K+ trades in Supabase
- **Feature Extraction**: Real-time (<10ms)

---

## 🔐 Security & Safety

### Model Safety:
- Constraint checking (CPPO)
- Position size limits
- Risk thresholds
- Market hour checks
- Volatility guards

### Data Safety:
- Input validation
- NaN/Inf checks
- Feature bounds checking
- Outlier detection
- Data sanitization

---

## 🎯 Conclusione

Questo sistema ML rappresenta un **trading bot completamente autonomo** che:

1. **Impara** da migliaia di trade storici
2. **Predice** azioni ottimali con confidence scoring
3. **Quantifica** l'incertezza delle decisioni
4. **Rispetta** vincoli di sicurezza automaticamente
5. **Migliora** continuamente con nuovi dati
6. **Si integra** perfettamente con MT5 e React

**Tecnologie chiave**: TensorFlow.js, PPO/CPPO, GAE, Ensemble Learning, IndexedDB

**Pronto per produzione**: ✅ Sì, dopo training con dati reali!
